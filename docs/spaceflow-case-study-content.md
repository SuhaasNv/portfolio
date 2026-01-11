# SpaceFlow Case Study Content

## Overview

SpaceFlow is a modular, service-oriented platform for managing workplace spaces—meeting rooms, desks, collaboration areas. I built it to explore how product needs shape system design decisions. The project focuses on space booking, occupancy tracking, analytics, and AI-assisted insights, with each concern isolated in its own service.

The core problem I wanted to understand: How do you design a system where booking workflows, real-time occupancy data, analytics, and AI insights all need to work together without creating tight coupling? This is a learning project, not a production system. The goal was to practice architectural reasoning and see how product requirements translate into service boundaries and API contracts.

I approached this over several months, focusing on system design and API contracts rather than building a polished end-user interface. The scope is intentionally limited—no production IAM, no billing workflows, no IoT device management. This let me focus on the architectural questions that matter: service boundaries, data ownership, and how services communicate.

## User Needs & Product Intent

The platform serves a few user types, each with different needs. Employees need to book spaces quickly and reliably. Facility managers need to understand how spaces are actually used—not just what's booked, but what's occupied. Operations teams need insights to optimize space allocation and identify trends.

I prioritized four core capabilities: booking workflows, occupancy tracking, analytics aggregation, and AI-assisted insights. The booking service handles the transactional work—creating reservations, checking conflicts, enforcing capacity rules. The occupancy service tracks what's actually happening in real time, separate from what's scheduled. The analytics service aggregates this data into queryable views without impacting transactional performance. The AI engine consumes this data to generate higher-level insights.

I explicitly chose not to build end-user UIs, production authentication, billing systems, or IoT device management. These are important for a real product, but they would have distracted from the architectural questions I wanted to explore. Instead, I focused on API contracts and service boundaries—the foundation that any client application would build on.

This product-first thinking shaped technical decisions. For example, I separated occupancy from booking because they serve different user needs: booking is about scheduling, occupancy is about reality. Analytics is isolated because facility managers need to query historical data without slowing down booking transactions. The AI engine is replaceable because different organizations might want different AI capabilities, and the core platform shouldn't depend on a specific AI implementation.

## System Architecture

SpaceFlow is built as four independent services, each owning its domain and data. The booking service handles all reservation workflows. The occupancy service tracks real-time and historical occupancy signals. The analytics service aggregates data from bookings and occupancy into query-friendly views. The AI engine provides AI-backed capabilities via HTTP API, consuming data from other services to generate insights.

Each service is independently deployable and owns its own data store. There are no shared databases and no shared application code. Integration happens exclusively through explicit APIs and documented contracts. Services communicate using HTTP APIs, with contracts defined in documentation before implementation.

The data flow is straightforward: booking and occupancy services write transactional data. The analytics service reads from these services (or consumes events) to build aggregated views. The AI engine reads from analytics and other services to generate insights. The frontend, when present, calls these services via their HTTP APIs. This separation means each service can evolve independently, and failures in one area don't cascade.

I kept the infrastructure deliberately simple. Each service runs in Docker containers, orchestrated with Docker Compose for local development. There's no Kubernetes, no service mesh, no hidden frameworks. The infrastructure choices are explicit and minimal—this is about understanding service boundaries, not mastering orchestration tools.

## Key Decisions & Trade-offs

**Service Independence Over Shared Code**

I chose to make each service completely independent—separate codebases, separate databases, no shared libraries. This means more code duplication, but it also means services can evolve independently. If I need to change how booking works, I don't risk breaking analytics. If I want to replace the AI engine, I can do it without touching other services. The trade-off is more code to maintain, but for a learning project, the clarity of boundaries was worth it.

**API-First Design Over Implementation-First**

I defined API contracts in documentation before writing implementation code. This forced me to think about what each service should expose and how clients would use it. The downside is that documentation can drift from implementation, but the discipline of thinking through contracts first helped me understand service boundaries better. In production, I'd use something like OpenAPI specs with code generation, but for learning, explicit documentation worked.

**Simple Infrastructure Over Production-Grade Tooling**

I used Docker Compose instead of Kubernetes, plain Docker builds instead of complex CI/CD pipelines, explicit configuration instead of convention-based magic. This means the system won't scale to thousands of services or handle complex deployments, but it also means I can understand every piece of infrastructure. The trade-off is that I'm not learning production orchestration, but I am learning service design, which was the goal.

**Read-Optimized Analytics Over Real-Time Queries**

The analytics service aggregates data into query-friendly views rather than querying transactional systems directly. This means analytics data might be slightly stale, but it also means analytical queries don't impact booking performance. The trade-off is eventual consistency in analytics, but for utilization trends and reports, this is acceptable. In production, I'd add event streaming for near-real-time updates, but for learning, batch aggregation was sufficient.

**Replaceable AI Engine Over Tight Integration**

The AI engine is designed to be replaceable—it's just another HTTP API consumer. This means the core platform doesn't depend on any specific AI implementation. The trade-off is that I'm not building deeply integrated AI features, but I am learning how to design systems where AI is a component, not the center. This reflects how many real systems work: AI capabilities are often added later or swapped out as technology evolves.

## Technical Implementation Highlights

I built the backend services in Java with Spring Boot, using Maven for builds. Each service has its own codebase and can be built and run independently. The frontend is a simple React application using Vite, primarily for testing API integrations. All services are containerized with Docker, and Docker Compose orchestrates them for local development.

The booking service enforces core domain rules: time conflicts, capacity limits, basic validation. It exposes REST APIs for creating, updating, and cancelling bookings. The occupancy service tracks occupancy signals and serves APIs for current state and time series data. The analytics service aggregates booking and occupancy data into utilization metrics and trends. The AI engine consumes analytics data and generates insights via HTTP API.

I set up a CI pipeline that runs tests and builds Docker images for all services. The pipeline is straightforward—Maven tests run in parallel, then Docker builds verify that each service can be containerized. This isn't production-grade CI/CD, but it ensures services can be built and tested independently.

The biggest technical challenge was understanding how services should communicate. In Docker Compose, services use service names as hostnames (e.g., `analytics-service:8080`), but the frontend runs in a browser and must use `localhost` with exposed ports. This distinction between server-to-server and browser-to-server communication required explicit configuration and taught me about network boundaries in containerized systems.

I implemented basic authentication and authorization, but it's intentionally minimal—just enough to demonstrate how auth fits into the architecture. In a real system, this would integrate with organizational identity providers. I also built a simple frontend to test API integrations, but the focus was on backend services and contracts, not UI polish.

What's implemented: all four core services with basic functionality, API contracts documented, Docker containerization, CI pipeline, and a simple frontend for testing. What's conceptual: production-grade auth, event streaming, advanced analytics queries, and comprehensive error handling. The goal was to understand architecture, not build a complete product.

## Learnings & Reflections

This project taught me that service boundaries are the hardest part of system design. It's easy to say "separate concerns," but deciding where to draw boundaries requires understanding both the domain and how different parts of the system will evolve. Separating booking from occupancy made sense because they serve different user needs and change at different rates. Separating analytics from transactional services made sense because they have different performance requirements.

I learned that API-first design forces better thinking. Writing API contracts before implementation made me consider what each service should expose, what data it needs, and how clients will use it. This discipline helped me see coupling that I might have missed if I'd started with implementation. In production, I'd use OpenAPI specs with code generation, but the principle of contracts-first remains valuable.

The trade-off between simplicity and production-readiness became clear. Using Docker Compose instead of Kubernetes meant I could understand every piece of infrastructure, but it also meant the system wouldn't scale to production needs. For learning, this was the right choice—I needed to understand service design, not orchestration complexity. But I also learned that production systems require more infrastructure thinking than I initially appreciated.

I realized that "boring code" is a feature, not a bug. Each service is straightforward, with clear responsibilities and minimal abstractions. This made the system easier to understand and modify. In a team environment, this would make onboarding easier and reduce the risk of clever code that becomes technical debt.

If I started over, I'd add event streaming earlier. Right now, analytics pulls data from other services, but event-driven updates would be cleaner and more scalable. I'd also spend more time on error handling and API versioning—these are important for real systems, and I glossed over them to focus on architecture. Finally, I'd document the "why" behind each service boundary more explicitly, not just the "what."

This project shaped how I think about systems and products together. I see now that product requirements directly inform architectural decisions—the need for real-time occupancy tracking led to a separate occupancy service, and the need for historical analytics led to an isolated analytics service. Understanding user needs helped me draw better service boundaries.

## What's Next

If I continued this project, I'd explore event-driven architecture more deeply. Right now, services communicate via synchronous HTTP calls, but adding an event stream would make the system more resilient and scalable. I'd use something like Apache Kafka or a simpler message queue to decouple services further.

I'd also add more sophisticated analytics capabilities. Right now, analytics are basic aggregations, but I'd want to explore time-series databases, more complex queries, and real-time dashboards. This would help me understand how analytical systems differ from transactional ones and how to design for both.

On the AI side, I'd explore how to make the AI engine more sophisticated while keeping it replaceable. This might mean designing better data contracts for AI consumption, or exploring how to version AI capabilities without breaking the core platform. I'm curious about how AI systems integrate into larger architectures, and this would be a good place to experiment.

I'd also spend time on production concerns I intentionally skipped: proper authentication and authorization, API versioning, comprehensive error handling, monitoring and observability. These aren't as interesting architecturally, but they're essential for real systems, and I should understand how they fit into service-oriented designs.

Finally, I'd consider how this architecture would need to change at scale. What happens with hundreds of services? How do you handle distributed transactions? How do you ensure consistency across services? These are questions I haven't fully explored, and they'd be valuable learning areas.

The core learning from SpaceFlow was understanding how product needs shape system design. I'd want to apply this thinking to other domains—maybe a different type of platform or a different set of constraints—to see if the principles hold and where they break down.

