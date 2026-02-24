const fs = require("fs");
const path = require("path");

const STOPWORDS = new Set([
  "a",
  "an",
  "and",
  "are",
  "as",
  "at",
  "be",
  "by",
  "for",
  "from",
  "has",
  "he",
  "in",
  "is",
  "it",
  "its",
  "of",
  "on",
  "that",
  "the",
  "to",
  "was",
  "were",
  "will",
  "with",
  "you",
  "your",
  "i",
  "me",
  "my",
  "we",
  "our",
  "about",
  "what",
  "which",
  "who",
  "how",
  "when",
  "where",
  "why",
  "can",
  "do",
  "does"
]);

let cache = null;

function loadKnowledgeChunks() {
  if (cache) return cache;

  const chunksPath = path.join(__dirname, "..", "..", "knowledge", "chunks.json");
  const raw = fs.readFileSync(chunksPath, "utf-8");
  const parsed = JSON.parse(raw);

  if (!Array.isArray(parsed)) {
    throw new Error("chatbot/knowledge/chunks.json must be an array");
  }

  cache = parsed;
  return cache;
}

function normalizeText(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenize(text) {
  return normalizeText(text)
    .split(" ")
    .filter((token) => token.length > 1 && !STOPWORDS.has(token));
}

function scoreChunk(query, queryTokens, chunk) {
  const chunkText = normalizeText(chunk.text);
  if (!chunkText) return 0;

  const chunkTokens = new Set(tokenize(chunk.text));
  const querySet = new Set(queryTokens);

  let overlap = 0;
  querySet.forEach((token) => {
    if (chunkTokens.has(token)) overlap += 1;
  });

  const overlapRatio = querySet.size ? overlap / querySet.size : 0;
  const phraseBoost = chunkText.includes(normalizeText(query)) ? 0.45 : 0;

  const tagText = normalizeText((chunk.tags || []).join(" "));
  const tagBoost = queryTokens.some((token) => tagText.includes(token)) ? 0.2 : 0;

  return overlapRatio + phraseBoost + tagBoost;
}

function retrieveRelevantChunks(query, limit = 4) {
  const chunks = loadKnowledgeChunks();
  const queryTokens = tokenize(query);
  if (!queryTokens.length) return [];

  const ranked = chunks
    .map((chunk) => ({
      chunk,
      score: scoreChunk(query, queryTokens, chunk)
    }))
    .filter((item) => item.score > 0.05)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((item) => item.chunk);

  return ranked;
}

module.exports = {
  retrieveRelevantChunks
};
