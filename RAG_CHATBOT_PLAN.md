# RAG Chatbot Plan (Groq) for Portfolio

## Goal
Add a production-safe chatbot to the portfolio that answers questions about Suhaas using retrieval-augmented generation (RAG), with citations to portfolio sections/projects.

## Constraints
- Current site is static HTML/CSS/JS.
- Groq API key must never be exposed in frontend code.
- Keep `main` untouched until feature is validated.

## Proposed Architecture
1. Frontend (existing portfolio):
- Floating chat widget (open/close, message list, input, send).
- Calls backend endpoint: `POST /api/chat`.
- Renders answer + source citations.

2. Backend API (new, minimal):
- Hosted separately (recommended: Vercel serverless function).
- Receives user query and optional short conversation history.
- Performs retrieval over a local JSON knowledge base.
- Builds grounded prompt + calls Groq Chat Completions API.
- Returns structured response JSON.

3. Knowledge base:
- `knowledge/chunks.json` generated from:
  - `index.html`
  - `work/*.html`
  - Resume text (from PDF summary/manual text file for clean quality)
- Each chunk includes:
  - `id`
  - `text`
  - `source_title`
  - `source_url`
  - `section`
  - `tags`

## Retrieval Strategy (MVP)
1. Start with lightweight retrieval (no vector DB):
- Normalize query/chunks.
- Score chunks by keyword overlap + phrase matches.
- Return top 4 chunks.

2. Add optional semantic retrieval later:
- Precomputed embeddings stored in JSON.
- Cosine similarity + hybrid rerank.

## API Contract (MVP)
### Request
```json
{
  "message": "Tell me about your systems projects",
  "history": [
    {"role": "user", "content": "Hi"},
    {"role": "assistant", "content": "Hello"}
  ]
}
```

### Response
```json
{
  "answer": "Short grounded answer...",
  "citations": [
    {"title": "SpaceFlow Case Study", "url": "/work/spaceflow.html", "section": "Architecture"}
  ],
  "retrieved_count": 4
}
```

## Prompting Rules
- Answer only from retrieved context.
- If context is insufficient, explicitly say it is not available in profile content.
- Keep responses concise and recruiter-friendly.
- Prefer bullets for multi-part answers.
- Always include citations when available.

## UI/UX Scope
1. Widget behavior:
- Floating button on all pages.
- Panel opens as right-side drawer on desktop, full-width modal on mobile.
- Keyboard accessible (`Esc` close, focus trap basic support).

2. Chat behavior:
- Starter chips:
  - "Summarize Suhaas in 30 seconds"
  - "Key projects and outcomes"
  - "Skills and tech stack"
  - "Education and certifications"
- Loading state + retry on failure.
- Disclaimer line: "Answers are based on portfolio content."

## Security and Reliability
- Store `GROQ_API_KEY` only in backend environment variables.
- Add request size and rate limits.
- Strip/ignore unsafe instructions from user query where possible.
- No HTML rendering from model output (plain text only).

## Delivery Plan
1. Milestone 1: Foundation
- Add backend folder and basic serverless route.
- Add static knowledge file with curated chunks.
- Implement retrieval + Groq call.

2. Milestone 2: Frontend Integration
- Build chat widget UI in `index.html` + `style.css`.
- Add `chatbot.js` for API interaction and rendering.
- Add citations UI.

3. Milestone 3: Quality Pass
- Tune prompt and retrieval.
- Validate answers for top 20 expected questions.
- Improve responsiveness/accessibility.

4. Milestone 4: Deployment
- Deploy backend (Vercel recommended).
- Configure env vars.
- Point frontend API URL to deployed endpoint.

## Testing Checklist
- Query returns grounded answer with citations.
- Unknown query returns safe fallback.
- Groq API failure shows user-friendly error.
- Mobile and desktop widget layout verified.
- Keyboard navigation works end-to-end.

## Decisions Needed Before Build
1. Backend host:
- Recommended: Vercel serverless.

2. Strictness:
- Recommended: strict profile-only answers (no open-web fallback).

3. Tone:
- Recommended: professional + concise (not casual).

4. First-page scope:
- Recommended: add chatbot only to `index.html` first, then reuse on case-study pages.
