# AI Knowledge Assistant Case Study Content

## Overview

AI Knowledge Assistant is a RAG (Retrieval-Augmented Generation) system that transforms PDF documents into queryable knowledge bases. Users upload PDFs, which are processed into vector embeddings and stored in PostgreSQL. When users ask questions, the system retrieves relevant document chunks and generates contextually-grounded answers using an LLM.

I built this to understand how AI components fit into real systems. It's not a research project about model performance—it's about designing a system where document processing, vector search, and language models work together reliably. The goal was to learn RAG architecture: how retrieval pipelines work, how to design for latency, and how AI capabilities integrate with traditional backend systems.

This is a learning project focused on system design, not a production application. I intentionally kept the scope limited: PDF-only support, single-document queries, no authentication. This let me focus on the architectural questions: how do you design a system where document processing is asynchronous but queries need to be fast? How do you balance retrieval quality with latency? How do you make AI components replaceable?

## User Needs & Product Intent

The system serves users who need to query documents quickly. They upload a PDF, wait for it to process, then ask questions and get answers grounded in the document content. The core need is speed and accuracy—users want answers fast, and they want those answers to be based on the actual document, not hallucinated.

I prioritized three capabilities: asynchronous document processing, fast semantic search, and contextually-grounded answers. Document processing happens in the background because PDF parsing and embedding generation can take time—users shouldn't have to wait. Semantic search uses vector similarity to find relevant chunks, not keyword matching. Answers are generated with retrieved context, so the LLM can cite specific parts of the document.

I explicitly chose not to build multi-document queries, chat history persistence, or streaming responses. These are valuable features, but they would have distracted from the core architectural challenge: designing a RAG pipeline that's fast and reliable. Instead, I focused on getting the retrieval and generation pipeline right—the foundation that other features would build on.

This product-first thinking shaped technical decisions. For example, I separated document processing from query handling because they have different latency requirements: processing can be slow and asynchronous, but queries need to be fast and synchronous. I used WebSockets for processing updates because users need to know when their document is ready, but the query API is REST because answers should be immediate. The vector database is PostgreSQL with pgvector, not a specialized vector DB, because I wanted to understand how vector search works in a familiar database context.

## System Architecture

The system has three main components: a Next.js frontend, a NestJS backend API, and supporting infrastructure (PostgreSQL with pgvector, Redis with BullMQ). The frontend handles document uploads and question interfaces. The backend orchestrates the RAG pipeline: document processing, vector storage, retrieval, and answer generation.

Document processing is asynchronous. When a user uploads a PDF, the backend creates a database record, queues a processing job in BullMQ, and returns immediately. A worker process extracts text, chunks it into overlapping segments (1000 characters with 200-character overlap), generates embeddings using Google's text-embedding-004 model, and stores vectors in PostgreSQL using pgvector. WebSocket events notify the frontend of processing progress in real time.

Query handling is synchronous and optimized for latency. When a user asks a question, the system embeds the question, performs vector similarity search using cosine distance to find the top 5 most relevant chunks, formats those chunks as context, and sends them to Google Gemini 1.5 Flash along with the question. The LLM generates an answer grounded in the retrieved context, and the response is returned to the user.

The architecture separates concerns: document processing is isolated in background jobs, vector storage is in PostgreSQL, job queuing is in Redis, and the query pipeline is in the API service. This separation means processing failures don't block queries, and query performance isn't impacted by document ingestion. The LLM and embedding models are external API calls, making them replaceable without changing the core system.

## Key Decisions & Trade-offs

**Vector Search in PostgreSQL Over Specialized Vector Database**

I chose PostgreSQL with pgvector instead of a dedicated vector database like Pinecone or Weaviate. This means I'm using a general-purpose database for vector operations, which might not be as optimized as specialized systems. But it also means I understand how vector search works in a familiar context, and I don't need to manage another service. The trade-off is potentially slower queries at scale, but for learning, understanding pgvector was more valuable than learning a specialized tool.

**Asynchronous Processing Over Synchronous Upload**

I made document processing asynchronous using BullMQ job queues. Users upload a PDF and get an immediate response, then processing happens in the background with WebSocket progress updates. The alternative would be synchronous processing—users wait for the entire document to be processed before getting a response. The trade-off is more complexity (job queues, workers, WebSocket connections), but better user experience. Users don't want to wait 30 seconds for a large PDF to process.

**Fixed Chunking Strategy Over Adaptive Chunking**

I use fixed-size chunks (1000 characters with 200-character overlap) rather than semantic chunking or adaptive sizing. This is simpler to implement and reason about, but it might split important concepts across chunks or include irrelevant content. The trade-off is that some queries might miss context that spans chunk boundaries, but fixed chunking is predictable and easier to debug. In production, I'd explore semantic chunking, but for learning, fixed chunks helped me understand the retrieval pipeline first.

**Top-5 Retrieval Over Dynamic K**

I retrieve exactly 5 chunks for every query, regardless of query complexity or document size. This means simple queries might include irrelevant chunks, and complex queries might miss important context. The alternative would be dynamic retrieval—more chunks for complex queries, fewer for simple ones. The trade-off is that fixed K is simpler and more predictable, but dynamic K might improve answer quality. For learning, fixed K helped me understand how retrieval quality affects answer quality.

**Single LLM Call Over Multi-Step Reasoning**

I use a single LLM call with retrieved context, not multi-step reasoning or iterative refinement. This means the system can't break down complex questions or refine answers based on initial results. The trade-off is lower latency and simpler architecture, but potentially lower answer quality for complex queries. For learning, single-step generation helped me understand the core RAG pattern before adding complexity.

**WebSocket Updates Over Polling**

I use WebSockets for real-time processing updates instead of polling. This means the frontend maintains a persistent connection and receives push updates, not constant HTTP requests. The trade-off is more complexity (connection management, reconnection logic), but better user experience and lower server load. Users see progress immediately, not after polling intervals.

## Technical Implementation Highlights

I built the backend in NestJS with TypeScript, using Prisma for database access and BullMQ for job processing. The frontend is Next.js with React 19, using Zustand for state management and Socket.IO client for WebSocket connections. PostgreSQL stores document metadata and vector embeddings via pgvector. Redis handles job queuing and BullMQ workers process documents asynchronously.

The document processing pipeline extracts text from PDFs using a PDF parsing library, chunks text using LangChain's RecursiveCharacterTextSplitter, generates embeddings via Google's text-embedding-004 API, and stores vectors in PostgreSQL. The query pipeline embeds user questions, performs cosine similarity search using pgvector's `<=>` operator, retrieves top-5 chunks, formats context with LangChain, and generates answers using Gemini 1.5 Flash.

I implemented WebSocket events for real-time updates: document creation, processing progress, completion, and deletion. The frontend connects to the backend WebSocket gateway and updates the UI as processing progresses. This required handling connection lifecycle, reconnection logic, and state synchronization between WebSocket events and REST API calls.

The biggest technical challenge was understanding vector similarity search. I had to learn how embeddings work, how cosine distance measures similarity, and how pgvector indexes vectors for fast queries. I also had to balance chunk size—too small and you lose context, too large and retrieval is less precise. The 1000-character chunks with 200-character overlap came from experimentation, not theory.

What's implemented: complete RAG pipeline with PDF processing, vector storage, semantic search, and answer generation; asynchronous job processing with progress tracking; WebSocket real-time updates; basic frontend for uploads and queries. What's conceptual: multi-document queries, chat history, streaming responses, adaptive chunking, and production-grade error handling. The goal was to understand RAG architecture, not build a complete product.

## Learnings & Reflections

This project taught me that RAG is more than "retrieval plus generation"—it's a system design problem. The retrieval pipeline affects answer quality more than the LLM choice. If you retrieve irrelevant chunks, even the best LLM will generate poor answers. If you retrieve the right chunks, a simpler LLM can generate good answers. This means chunking strategy, embedding quality, and similarity search are as important as the language model.

I learned that latency matters in AI systems. Users expect fast answers, but RAG requires multiple steps: embedding the question, searching vectors, retrieving chunks, formatting context, and calling the LLM. Each step adds latency. I had to think about which operations can be parallelized, which can be cached, and which are bottlenecks. The embedding step and LLM call are external API calls, so network latency is a factor. Vector search in PostgreSQL is fast, but it still takes time.

The trade-off between retrieval quality and latency became clear. Retrieving more chunks might improve answer quality, but it also increases latency and token costs. Using a more sophisticated chunking strategy might improve retrieval, but it adds processing time. I had to balance these concerns, and I learned that "good enough" retrieval with fast queries is often better than perfect retrieval with slow queries.

I realized that AI components should be replaceable. The system uses Google Gemini, but it could use OpenAI, Anthropic, or open-source models. The embedding model could be swapped. The vector database could be replaced. This replaceability requires careful API design—the system shouldn't depend on model-specific features. This is similar to the SpaceFlow principle of replaceable services, applied to AI components.

If I started over, I'd add more observability. Right now, I can't easily see why a query retrieved certain chunks or how retrieval quality varies across documents. I'd add logging for retrieval results, answer quality metrics, and latency breakdowns. I'd also experiment more with chunking strategies—maybe semantic chunking or hybrid search combining vector and keyword matching.

This project shaped how I think about AI systems. I see now that AI capabilities are system components, not magic. They have latency, they have failure modes, they have trade-offs. Designing AI systems requires the same architectural thinking as traditional systems: separation of concerns, error handling, performance optimization. The AI part is just another service in the architecture.

## What's Next

If I continued this project, I'd explore hybrid search strategies. Right now, retrieval is purely semantic (vector similarity), but combining vector search with keyword matching might improve results. Some queries are better served by keyword search, others by semantic search. A hybrid approach could use both and merge results.

I'd also experiment with different chunking strategies. Fixed-size chunks are simple, but semantic chunking (splitting on sentence boundaries, preserving paragraphs) might improve retrieval quality. I'd want to measure how chunking affects answer quality across different document types and query types.

On the system side, I'd add streaming responses. Right now, users wait for the complete answer, but streaming would provide immediate feedback. This requires changes to both the API (streaming responses) and the frontend (incremental rendering). I'd also add chat history persistence, so users can reference previous questions and answers.

I'd explore multi-document queries. Right now, each query is scoped to a single document, but users might want to ask questions across multiple documents. This requires changes to retrieval (searching across document boundaries) and context formatting (indicating which document each chunk comes from).

Finally, I'd add more production concerns: authentication and authorization, rate limiting, comprehensive error handling, monitoring and observability. These aren't as interesting architecturally, but they're essential for real systems. I'd also want to understand how this system scales—what happens with thousands of documents, millions of vectors, high query volume?

The core learning from this project was understanding RAG as a system architecture problem, not just an AI technique. I'd want to apply this thinking to other AI system patterns—maybe agentic workflows, or multi-modal RAG with images, or RAG with structured data. The principles of retrieval, latency, and replaceability would apply across these variations.

