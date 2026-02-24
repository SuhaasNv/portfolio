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
const VECTOR_DIM = 128;

const QUERY_REWRITE_SYNONYMS = {
  cv: ["resume"],
  resume: ["cv"],
  projects: ["project", "case study", "work"],
  stack: ["tech stack", "technology", "tools"],
  skills: ["strengths", "capabilities"],
  education: ["degree", "academic", "university"],
  certs: ["certifications", "certification"],
  rag: ["retrieval augmented generation", "knowledge assistant"],
  ai: ["artificial intelligence", "llm", "model"],
  cloud: ["aws", "azure"],
  experience: ["background", "profile", "about"],
  outcomes: ["impact", "results"],
  architecture: ["system design", "service boundaries"]
};

function loadKnowledgeChunks() {
  if (cache) return cache;

  const chunksPath = path.join(__dirname, "..", "..", "knowledge", "chunks.json");
  const raw = fs.readFileSync(chunksPath, "utf-8");
  const parsed = JSON.parse(raw);

  if (!Array.isArray(parsed)) {
    throw new Error("chatbot/knowledge/chunks.json must be an array");
  }

  cache = parsed.map((chunk) => {
    const chunkText = normalizeText(
      [chunk.text, chunk.source_title, chunk.section, (chunk.tags || []).join(" ")].join(" ")
    );
    const tokens = tokenize(chunkText);
    return {
      ...chunk,
      _tokens: tokens,
      _tokenSet: new Set(tokens),
      _vector: vectorizeTokens(tokens)
    };
  });
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

function hashToken(token) {
  let hash = 0;
  for (let i = 0; i < token.length; i += 1) {
    hash = (hash * 31 + token.charCodeAt(i)) >>> 0;
  }
  return hash;
}

function vectorizeTokens(tokens) {
  const vec = new Array(VECTOR_DIM).fill(0);
  if (!tokens.length) return vec;

  for (const token of tokens) {
    const h = hashToken(token);
    const idx = h % VECTOR_DIM;
    const sign = h % 2 === 0 ? 1 : -1;
    vec[idx] += sign;
  }

  let norm = 0;
  for (let i = 0; i < VECTOR_DIM; i += 1) norm += vec[i] * vec[i];
  norm = Math.sqrt(norm) || 1;
  for (let i = 0; i < VECTOR_DIM; i += 1) vec[i] /= norm;
  return vec;
}

function cosineSimilarity(a, b) {
  let sum = 0;
  for (let i = 0; i < VECTOR_DIM; i += 1) {
    sum += (a[i] || 0) * (b[i] || 0);
  }
  return sum;
}

function rewriteQuery(rawQuery) {
  const normalized = normalizeText(rawQuery);
  const originalTokens = tokenize(normalized);
  const expanded = new Set(originalTokens);

  for (const token of originalTokens) {
    const synonyms = QUERY_REWRITE_SYNONYMS[token];
    if (!synonyms) continue;
    for (const synonym of synonyms) {
      tokenize(synonym).forEach((t) => expanded.add(t));
    }
  }

  return Array.from(expanded);
}

function keywordScore(queryText, queryTokens, chunk) {
  if (!chunk._tokens || !chunk._tokens.length) return 0;
  const querySet = new Set(queryTokens);
  const chunkSet = chunk._tokenSet;

  let overlap = 0;
  querySet.forEach((token) => {
    if (chunkSet.has(token)) overlap += 1;
  });

  const overlapRatio = querySet.size ? overlap / querySet.size : 0;
  const phraseBoost = normalizeText(chunk.text).includes(queryText) ? 0.45 : 0;

  const tagText = normalizeText((chunk.tags || []).join(" "));
  const tagBoost = queryTokens.some((token) => tagText.includes(token)) ? 0.2 : 0;

  return overlapRatio + phraseBoost + tagBoost;
}

function retrieveRelevantChunks(query, limit = 4) {
  const chunks = loadKnowledgeChunks();
  const queryTokens = rewriteQuery(query);
  if (!queryTokens.length) return [];
  const queryText = queryTokens.join(" ");
  const queryVector = vectorizeTokens(queryTokens);

  const ranked = chunks
    .map((chunk) => ({
      chunk,
      score: 0.6 * keywordScore(queryText, queryTokens, chunk) + 0.4 * cosineSimilarity(queryVector, chunk._vector)
    }))
    .filter((item) => item.score > 0.05)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((item) => item.chunk);

  return ranked;
}

module.exports = {
  retrieveRelevantChunks,
  rewriteQuery
};
