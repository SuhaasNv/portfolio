# AI Knowledge Assistant - Project README Reference

## AI Knowledge Assistant

A production-ready RAG application that transforms PDF documents into queryable knowledge bases using vector embeddings and LLM-powered question answering.

**Tech Stack:** TypeScript, NestJS, Next.js, PostgreSQL

## Overview

This application implements a complete RAG (Retrieval-Augmented Generation) pipeline for document Q&A. Users upload PDFs, which are processed asynchronously into vector embeddings stored in PostgreSQL. Queries use semantic search to retrieve relevant chunks, then generate contextually-grounded answers via Google Gemini.

### Key Capabilities:

- Asynchronous PDF processing with real-time progress tracking
- Vector similarity search using pgvector (768-dimensional embeddings)
- Context-aware Q&A with source-grounded responses
- WebSocket-based real-time updates
- Modern, responsive UI built with Next.js and React 19

## Architecture

```
┌──────────────┐         ┌──────────────┐
│  Next.js UI  │◄──WS───►│  NestJS API  │
│  (Port 3001) │  HTTP   │  (Port 3000) │
└──────────────┘         └──────┬───────┘
                                 │
                    ┌────────────┼────────────┐
                    │            │            │
                    ▼            ▼            ▼
              ┌─────────┐  ┌─────────┐  ┌──────────────┐
              │PostgreSQL│  │  Redis  │  │ Google Gemini│
              │+ pgvector│  │+ BullMQ │  │   (Embedding │
              │          │  │         │  │   + Chat)    │
              └─────────┘  └─────────┘  └──────────────┘
```

## Data Flow

### Document Processing:

1. Upload → Create record → Queue job → Extract text → Chunk (1000 chars, 200 overlap)
2. Generate embeddings (text-embedding-004) → Store in PostgreSQL with pgvector
3. Emit WebSocket progress updates → Update UI in real-time

### Question Answering:

1. Embed question → Vector similarity search (top 5 chunks via cosine distance)
2. Format context → LangChain chain → Gemini 1.5 Flash → Return answer

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 15, React 19, TypeScript, Tailwind CSS, Radix UI, Zustand, Socket.IO Client |
| Backend | NestJS 11, TypeScript, Prisma, BullMQ, Socket.IO |
| Database | PostgreSQL 16 + pgvector, Redis 7 |
| AI/ML | Google Gemini (text-embedding-004, gemini-1.5-flash-latest), LangChain |
| Infrastructure | Docker, Docker Compose |

## Quick Start

### Prerequisites

- Node.js 18+, Docker & Docker Compose
- Google Gemini API Key

### Installation

```bash
# Clone repository
git clone https://github.com/SuhaasNv/ai-knowledge-assistant.git
cd ai-knowledge-assistant

# Start infrastructure
docker-compose up -d

# Setup backend
cd api
npm install
cp .env.example .env  # Configure DATABASE_URL and GOOGLE_API_KEY
npx prisma migrate deploy
npx prisma generate

# Setup frontend
cd ../web
npm install
```

### Running

```bash
# Terminal 1: Backend
cd api && npm run start:dev

# Terminal 2: Frontend
cd web && npm run dev
```

Access at http://localhost:3001

## API Reference

**Base URL:** http://localhost:3000

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/documents` | List all documents |
| GET | `/documents/:id` | Get document by ID |
| POST | `/documents/upload` | Upload PDF (multipart/form-data) |
| POST | `/documents/:id/chat` | Ask question about document |
| DELETE | `/documents/:id` | Delete document |
| DELETE | `/documents` | Delete all documents |

**WebSocket Events (Socket.IO on port 3000):**

- `documentCreated` - New document uploaded
- `documentUpdate` - Processing progress update `{id, status, progress}`
- `documentDeleted` - Document removed
- `allDocumentsDeleted` - All documents cleared

**Example Chat Request:**

```bash
curl -X POST http://localhost:3000/documents/{id}/chat \
  -H "Content-Type: application/json" \
  -d '{"question": "What is the main topic?"}'
```

## AI Pipeline Details

- **Embedding Model:** Google text-embedding-004 (768 dimensions)
  - Converts document chunks and user questions to vectors
  - Stored in PostgreSQL using pgvector extension

- **Chat Model:** Google Gemini gemini-1.5-flash-latest (temperature: 0.3)
  - Generates answers grounded in retrieved context
  - Prompt template enforces context-only responses

- **Retrieval Strategy:**
  - Chunking: RecursiveCharacterTextSplitter (1000 chars, 200 overlap)
  - Search: Cosine similarity via pgvector `<=>` operator
  - Top-K: 5 most relevant chunks per query

- **RAG Flow:**
  - Question → Embed → Vector Search → Format Context → LLM → Answer

## Project Structure

```
├── api/                    # NestJS backend
│   ├── src/
│   │   ├── documents/      # Document module (controller, service, processor)
│   │   ├── events/         # WebSocket gateway
│   │   └── prisma/         # Database service
│   └── prisma/             # Schema & migrations
│
├── web/                    # Next.js frontend
│   ├── src/
│   │   ├── app/            # Pages (home, chat)
│   │   ├── components/     # React components
│   │   └── lib/            # State management (Zustand)
│
├── init-db/                # PostgreSQL initialization
└── docker-compose.yml      # Infrastructure services
```

## Configuration

**Backend Environment Variables (api/.env):**

```
DATABASE_URL="postgresql://myuser:mypassword@localhost:5432/mydatabase"
GOOGLE_API_KEY="your-google-api-key"
```

**Frontend:** Update API base URL from localhost:3000 to production URL or use `NEXT_PUBLIC_API_URL`.

## Security

**Current State:**

- CORS configured for localhost (development)
- Input validation via DTOs (class-validator)
- Temporary file storage (auto-deleted after processing)
- API keys in environment variables

**Production Recommendations:**

- Implement authentication (JWT/OAuth)
- Add rate limiting (@nestjs/throttler)
- Server-side file type/size validation
- Configure CORS for specific domains
- Use HTTPS and API key rotation

## Testing

```bash
# Backend tests
cd api
npm test              # Unit tests
npm run test:cov      # Coverage
npm run test:e2e      # E2E tests
```

Test structure: Jest with ts-jest. Unit tests (*.spec.ts) alongside source files.

## Deployment

**Option 1:** Docker Compose (add Dockerfiles for api/web services)

**Option 2:** PaaS
- Backend: Railway, Render, Fly.io
- Frontend: Vercel, Netlify
- Database: Neon, Supabase (PostgreSQL + pgvector)
- Redis: Upstash, Redis Cloud

**Option 3:** Kubernetes/Docker Swarm for container orchestration

## Limitations

- PDF-only support (no DOCX, TXT, etc.)
- No authentication/authorization
- Single-document queries only
- Chat history not persisted
- No streaming responses
- Fixed chunk size (1000 chars)
- No automatic job retry on failure

## Contributing

1. Fork the repository
2. Create feature branch: `git checkout -b feature/amazing-feature`
3. Follow code style (ESLint, Prettier)
4. Write/update tests
5. Commit: `git commit -m "Add: feature description"`
6. Push and open Pull Request

**Development:**

```bash
docker-compose up -d && cd api && npm run start:dev  # Terminal 1
cd web && npm run dev                                 # Terminal 2
```

Built with NestJS, Next.js, PostgreSQL, and Google Gemini.

