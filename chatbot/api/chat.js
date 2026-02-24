const { retrieveRelevantChunks } = require("./lib/knowledge");

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

function buildPrompt(message, chunks) {
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
    "",
    "Retrieved profile context:",
    context
  ].join("\n");
}

function summarizeSnippet(text, maxLen = 220) {
  const clean = String(text || "").replace(/\s+/g, " ").trim();
  if (clean.length <= maxLen) return clean;
  return clean.slice(0, maxLen).trimEnd() + "...";
}

async function callGroq({ apiKey, model, prompt, history }) {
  const safeHistory = Array.isArray(history)
    ? history
        .filter((item) => item && (item.role === "user" || item.role === "assistant"))
        .slice(-6)
        .map((item) => ({
          role: item.role,
          content: String(item.content || "").slice(0, 800)
        }))
    : [];

  const body = {
    model,
    temperature: 0.2,
    max_tokens: 450,
    messages: [
      {
        role: "system",
        content:
          "You are Suhaas' portfolio assistant. Answer only from the provided context. If the answer is not in context, clearly say so. Keep answers concise, professional, and recruiter-friendly. Use short bullet points for multi-part answers. Do not fabricate facts."
      },
      ...safeHistory,
      {
        role: "user",
        content: prompt
      }
    ]
  };

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

  const { message, history } = parseBody(req);
  const question = String(message || "").trim();

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
  const retrievedChunks = retrieveRelevantChunks(question, 4);

  if (retrievedChunks.length === 0) {
    return json(res, 200, {
      answer:
        "I could not find that in Suhaas' portfolio knowledge base yet. Try asking about projects, tech stack, education, or certifications.",
      citations: [],
      retrieved_count: 0
    });
  }

  try {
    const prompt = buildPrompt(question, retrievedChunks);
    const answer = await callGroq({
      apiKey: groqKey,
      model,
      prompt,
      history
    });

    const citations = retrievedChunks.map((chunk) => ({
      title: chunk.source_title,
      url: chunk.source_url,
      section: chunk.section,
      snippet: summarizeSnippet(chunk.text)
    }));

    return json(res, 200, {
      answer,
      citations,
      retrieved_count: retrievedChunks.length
    });
  } catch (error) {
    return json(res, 502, {
      error: "LLM request failed.",
      details: error.message
    });
  }
};
