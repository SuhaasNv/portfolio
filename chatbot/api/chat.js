const { retrieveRelevantChunksDetailed, rewriteQuery, getQueryCoverage } = require("./lib/knowledge");

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const REQUEST_LIMIT_PER_MINUTE = 20;

const requestWindow = new Map();

function json(res, statusCode, payload) {
  res.statusCode = statusCode;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(payload));
}

function getClientIp(req) {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded.length > 0) {
    return forwarded.split(",")[0].trim();
  }
  return req.socket?.remoteAddress || "unknown";
}

function isRateLimited(ip) {
  const now = Date.now();
  const minuteAgo = now - 60 * 1000;
  const entries = requestWindow.get(ip) || [];
  const recent = entries.filter((timestamp) => timestamp > minuteAgo);
  recent.push(now);
  requestWindow.set(ip, recent);
  return recent.length > REQUEST_LIMIT_PER_MINUTE;
}

function parseBody(req) {
  if (typeof req.body === "object" && req.body !== null) return req.body;
  if (typeof req.body === "string") {
    try {
      return JSON.parse(req.body);
    } catch (error) {
      return {};
    }
  }
  return {};
}

function buildPrompt(message, chunks, rewrittenTokens) {
  const context = chunks
    .map((chunk, index) => {
      return [
        `Source ${index + 1}: ${chunk.source_title}`,
        `URL: ${chunk.source_url}`,
        `Section: ${chunk.section}`,
        `Content: ${chunk.text}`
      ].join("\n");
    })
    .join("\n\n");

  return [
    "User question:",
    message,
    rewrittenTokens && rewrittenTokens.length ? `Rewritten query tokens: ${rewrittenTokens.join(", ")}` : "",
    "",
    "Retrieved profile context:",
    context
  ]
    .filter(Boolean)
    .join("\n");
}

function summarizeSnippet(text, maxLen = 220) {
  const clean = String(text || "").replace(/\s+/g, " ").trim();
  if (clean.length <= maxLen) return clean;
  return clean.slice(0, maxLen).trimEnd() + "...";
}

function computeConfidence(chunksDetailed, coverage) {
  if (!chunksDetailed.length) return 0;
  const top = chunksDetailed[0].score || 0;
  const avgTop = chunksDetailed.slice(0, 3).reduce((sum, item) => sum + item.score, 0) / Math.min(3, chunksDetailed.length);
  const raw = 0.6 * Math.min(1, top / 1.4) + 0.3 * Math.min(1, avgTop / 1.2) + 0.1 * Math.min(1, coverage);
  return Math.max(0.05, Math.min(0.99, raw));
}

function buildWhyAnswerLine({ strictOnlySources, coverage, chunks }) {
  if (!chunks.length) {
    return "No relevant profile chunks were matched for this question.";
  }
  const sources = chunks
    .slice(0, 3)
    .map((c) => c.chunk.source_title)
    .filter(Boolean)
    .join(", ");
  const coveragePct = Math.round(coverage * 100);
  return `Matched ${chunks.length} profile chunks (${coveragePct}% query token coverage) from: ${sources}. Strict mode: ${strictOnlySources ? "on" : "off"}.`;
}

async function callGroq({ apiKey, model, prompt, history, strictOnlySources }) {
  const body = buildGroqBody({ model, prompt, history, stream: false, strictOnlySources });

  const response = await fetch(GROQ_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Groq error (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  const answer = data?.choices?.[0]?.message?.content?.trim();
  return answer || "I could not generate a response at the moment.";
}

function buildGroqBody({ model, prompt, history, stream, strictOnlySources }) {
  const safeHistory = Array.isArray(history)
    ? history
        .filter((item) => item && (item.role === "user" || item.role === "assistant"))
        .slice(-6)
        .map((item) => ({
          role: item.role,
          content: String(item.content || "").slice(0, 800)
        }))
    : [];

  const strictInstruction = strictOnlySources
    ? "Strict mode is ON. Use only the retrieved profile context. If context is insufficient, say exactly that and ask for a narrower question. Do not infer beyond provided sources."
    : "Strict mode is OFF. Prefer retrieved context first. You may provide light general framing, but label it as inference when context is incomplete.";

  return {
    model,
    temperature: 0.2,
    max_tokens: 450,
    stream: Boolean(stream),
    messages: [
      {
        role: "system",
        content:
          "You are Suhaas' portfolio assistant. Keep answers concise, professional, and recruiter-friendly. Use short bullet points for multi-part answers. Do not fabricate facts. " +
          strictInstruction
      },
      ...safeHistory,
      {
        role: "user",
        content: prompt
      }
    ]
  };
}

function writeStreamEvent(res, payload) {
  res.write(JSON.stringify(payload) + "\n");
}

async function callGroqStream({ apiKey, model, prompt, history, onToken, strictOnlySources }) {
  const body = buildGroqBody({ model, prompt, history, stream: true, strictOnlySources });

  const response = await fetch(GROQ_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Groq stream error (${response.status}): ${errorText}`);
  }

  if (!response.body) {
    throw new Error("No response body from Groq stream.");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let fullAnswer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line.startsWith("data:")) continue;
      const dataPart = line.slice(5).trim();
      if (!dataPart || dataPart === "[DONE]") continue;

      let parsed;
      try {
        parsed = JSON.parse(dataPart);
      } catch (error) {
        continue;
      }

      const delta = parsed?.choices?.[0]?.delta?.content || "";
      if (!delta) continue;
      fullAnswer += delta;
      onToken(delta);
    }
  }

  return fullAnswer.trim() || "I could not generate a response at the moment.";
}

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.statusCode = 204;
    return res.end();
  }

  if (req.method !== "POST") {
    return json(res, 405, { error: "Method not allowed" });
  }

  const clientIp = getClientIp(req);
  if (isRateLimited(clientIp)) {
    return json(res, 429, { error: "Too many requests. Please try again in a minute." });
  }

  const { message, history, stream, strict_only_sources } = parseBody(req);
  const question = String(message || "").trim();
  const strictOnlySources = strict_only_sources !== false;

  if (!question) {
    return json(res, 400, { error: "Message is required." });
  }

  if (question.length > 1200) {
    return json(res, 400, { error: "Message is too long. Keep it under 1200 characters." });
  }

  const groqKey = process.env.GROQ_API_KEY;
  if (!groqKey) {
    return json(res, 500, { error: "Server is missing GROQ_API_KEY." });
  }

  const model = process.env.GROQ_MODEL || "llama-3.1-8b-instant";
  const rewrittenTokens = rewriteQuery(question);
  const retrievedDetailed = retrieveRelevantChunksDetailed(question, 4);
  const retrievedChunks = retrievedDetailed.map((item) => item.chunk);

  if (retrievedChunks.length === 0) {
    return json(res, 200, {
      answer:
        "I could not find that in Suhaas' portfolio knowledge base yet. Try asking about projects, tech stack, education, or certifications.",
      citations: [],
      retrieved_count: 0,
      confidence: 0,
      why_this_answer: "No relevant profile chunks were found for this query.",
      top_retrieved_chunks: []
    });
  }

  try {
    const prompt = buildPrompt(question, retrievedChunks, rewrittenTokens);
    const citations = retrievedChunks.map((chunk) => ({
      title: chunk.source_title,
      url: chunk.source_url,
      section: chunk.section,
      snippet: summarizeSnippet(chunk.text)
    }));
    const coverage = getQueryCoverage(rewrittenTokens, retrievedDetailed);
    const confidence = computeConfidence(retrievedDetailed, coverage);
    const whyThisAnswer = buildWhyAnswerLine({
      strictOnlySources,
      coverage,
      chunks: retrievedDetailed
    });
    const topRetrievedChunks = retrievedDetailed.map((item) => ({
      id: item.chunk.id,
      title: item.chunk.source_title,
      section: item.chunk.section,
      url: item.chunk.source_url,
      snippet: summarizeSnippet(item.chunk.text, 260),
      score: Number(item.score.toFixed(3)),
      keyword_score: Number(item.keywordScore.toFixed(3)),
      semantic_score: Number(item.semanticScore.toFixed(3))
    }));

    if (stream) {
      res.statusCode = 200;
      res.setHeader("Content-Type", "application/x-ndjson; charset=utf-8");
      res.setHeader("Cache-Control", "no-cache, no-transform");

      writeStreamEvent(res, {
        type: "start",
        citations,
        retrieved_count: retrievedChunks.length,
        strict_only_sources: strictOnlySources,
        confidence,
        why_this_answer: whyThisAnswer,
        top_retrieved_chunks: topRetrievedChunks
      });
      const streamedAnswer = await callGroqStream({
        apiKey: groqKey,
        model,
        prompt,
        history,
        onToken: (delta) => writeStreamEvent(res, { type: "token", delta }),
        strictOnlySources
      });
      writeStreamEvent(res, {
        type: "done",
        answer: streamedAnswer,
        citations,
        retrieved_count: retrievedChunks.length,
        strict_only_sources: strictOnlySources,
        query_rewrite: rewrittenTokens,
        confidence,
        why_this_answer: whyThisAnswer,
        top_retrieved_chunks: topRetrievedChunks
      });
      return res.end();
    }

    const answer = await callGroq({
      apiKey: groqKey,
      model,
      prompt,
      history,
      strictOnlySources
    });

    return json(res, 200, {
      answer,
      citations,
      retrieved_count: retrievedChunks.length,
      strict_only_sources: strictOnlySources,
      query_rewrite: rewrittenTokens,
      confidence,
      why_this_answer: whyThisAnswer,
      top_retrieved_chunks: topRetrievedChunks
    });
  } catch (error) {
    return json(res, 502, {
      error: "LLM request failed.",
      details: error.message
    });
  }
};
