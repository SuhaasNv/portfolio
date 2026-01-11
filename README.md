# Portfolio — Systems Engineer with Product Intent

A personal portfolio website demonstrating systems design thinking, architectural decision-making, and product-aware engineering. Built to showcase learning-focused projects that explore how technical decisions connect to user needs.

---

## Overview

This portfolio represents my approach to systems engineering: understanding how architecture, AI systems, and product reasoning intersect. The site itself is intentionally minimal—focusing on clear communication, scannable content, and restrained design choices.

**Purpose:** To demonstrate systems thinking, architectural reasoning, and the ability to make technical decisions that serve real problems—not just build features.

**Audience:** Recruiters, hiring managers, and engineers evaluating candidates for systems engineering, backend/platform engineering, and AI-adjacent roles.

**Scope:** This is a learning portfolio. Projects are explorations of architectural concepts, not production systems. The site prioritizes clarity and honesty over polish.

---

## Key Focus Areas

- **Systems Design Thinking** — Understanding service boundaries, data ownership, and how components communicate
- **Architectural Decision-Making** — Evaluating trade-offs, scalability, and maintainability as first-class concerns
- **AI Systems Architecture** — Designing systems where AI components (RAG pipelines, vector search) are replaceable and well-architected
- **Product-Aware Engineering** — Connecting technical decisions to user needs and business outcomes
- **Learning-Driven Approach** — Honest about scope, focused on understanding principles over production deployment

---

## Featured Case Studies

### SpaceFlow — Smart Workplace Platform

A system design exploration of space booking, occupancy analytics, and AI-assisted insights. Built to understand how product needs shape architectural decisions.

**Problem Explored:** How do you design a system where booking workflows, real-time occupancy data, analytics, and AI insights work together without tight coupling?

**What It Demonstrates:**
- Service-oriented architecture with four independent services
- API-first design with explicit contracts
- Separation of concerns: booking, occupancy, analytics, AI
- Architectural reasoning about service boundaries and data ownership

**Case Study:** [View Full Case Study](work/spaceflow.html)

---

### AI Knowledge Assistant — RAG-Based System

A RAG (Retrieval-Augmented Generation) system that transforms PDF documents into queryable knowledge bases. Built to understand how AI components fit into real systems.

**Problem Explored:** How do you design a system where document processing is asynchronous but queries need to be fast? How do you balance retrieval quality with latency?

**What It Demonstrates:**
- Complete RAG pipeline: PDF processing → vector embeddings → semantic search → answer generation
- Asynchronous processing with WebSocket updates
- Vector search using PostgreSQL with pgvector
- Designing systems where AI capabilities are replaceable components

**Case Study:** [View Full Case Study](work/ai-knowledge-assistant.html)

---

## Tech Stack

### Frontend
- HTML5 (semantic markup)
- CSS3 (custom properties, flexbox, grid)
- Vanilla JavaScript (no frameworks)
- Font Awesome icons

### Backend / Systems
- EmailJS (contact form integration)
- No server-side code (static site)

### AI / Data
- Case studies document AI system architectures (RAG, vector search)
- No live AI integrations in the portfolio site itself

### Tooling & Dev Practices
- Accessibility-first (ARIA labels, reduced motion support, semantic HTML)
- Responsive design (mobile-first approach)
- Form validation and error handling
- Clean, maintainable CSS structure

---

## Design & Engineering Principles

### Minimalism by Intent
The site is intentionally minimal—no unnecessary animations, no complex frameworks, no feature bloat. This reflects a principle: **restraint is a design decision**. The focus is on content and clarity, not visual effects.

### Restrained Motion
Animations are subtle and purposeful. Section reveals use IntersectionObserver for performance. All animations respect `prefers-reduced-motion`. Motion supports content, never distracts.

### Accessibility First
- Semantic HTML structure
- ARIA labels on interactive elements
- Keyboard navigation support
- Reduced motion preferences respected
- Form validation with clear error messages
- Alt text on all images

### Scannability-First Design
- Constrained content widths (max-width: 800px for intro, 720px for tabs)
- Clear visual hierarchy
- Section headers for quick navigation
- TL;DR boxes in case studies for recruiter scanning
- Highlight strips for key strengths

### Engineering Maturity Signals
- Clean, readable code structure
- No unnecessary dependencies
- Proper error handling
- Maintainable CSS organization
- Semantic HTML throughout

---

## Contact & Usage

**Author:** Suhaas Nadukooru  
**Email:** nvijayasuhaas@gmail.com  
**LinkedIn:** [linkedin.com/in/suhaas-nv-a33684230](https://www.linkedin.com/in/suhaas-nv-a33684230)  
**GitHub:** [github.com/SuhaasNv](https://github.com/SuhaasNv)

**Live Site:** [suhaasnv.github.io/portfolio](https://suhaasnv.github.io/portfolio/)

Feedback, questions, or discussions about systems design, architectural reasoning, or AI systems architecture are welcome. This portfolio is a work in progress and will evolve as I learn.

---

## Local Development

To run this portfolio locally:

1. Clone the repository:
   ```bash
   git clone [repository-url]
   cd portfolio
   ```

2. Open `index.html` in a web browser, or use a local server:
   ```bash
   # Using Python
   python -m http.server 8000
   
   # Using Node.js (http-server)
   npx http-server
   ```

3. Navigate to `http://localhost:8000` (or the port your server uses)

**Note:** The contact form requires EmailJS configuration. For local testing, you may need to set up your own EmailJS account or mock the form submission.

---

## Education & Credentials

- **M.Tech (Software Engineering)** — National University of Singapore | GPA: 4/5
- **B.Tech (Information Technology)** — Vellore Institute of Technology | CGPA: 8.21/10

**Certifications:** AWS Cloud Practitioner, Microsoft Azure AZ-104, IBM Generative AI, Atlassian Agile with Jira, NUS ISS Learning Festival 2025

---

## License

This portfolio is personal work. Code is available for reference, but please respect intellectual property and don't copy the design or content directly.

---

**Last Updated:** 2025

