# SpaceFlow - Project README Reference

## SpaceFlow

SpaceFlow is a modular, service-oriented platform for managing modern workplaces. It focuses on booking, occupancy, analytics, and AI-assisted workflows around physical spaces, while keeping each concern isolated in its own service.

## Purpose

- Optimize space usage: Understand how meeting rooms, desks, and collaboration areas are actually used.
- Streamline booking flows: Provide reliable booking and scheduling primitives that other clients and systems can build on.
- Enable data-driven decisions: Offer analytics over utilization, trends, and anomalies.
- Augment operations with AI: Use an AI engine for higher-level insights and automation while keeping it strictly API-driven and replaceable.

## Services and Responsibilities

All services live under `services/`, are independently deployable, and own their data and persistence.

### AI Engine (services/ai-engine)

- Provides AI-backed capabilities via a well-defined HTTP API.
- Consumes events and data from other services (e.g., bookings, occupancy, analytics aggregates) to generate insights or recommendations.
- Designed to be replaceable or upgradable without impacting core transactional flows.

### Booking Service (services/booking-service)

- Owns all booking and reservation workflows for spaces (rooms, desks, etc.).
- Exposes APIs for creating, updating, and cancelling bookings.
- Enforces core domain rules around time conflicts, capacity, and basic validation.

### Analytics Service (services/analytics-service)

- Aggregates data from transactional systems (bookings, occupancy) into query-friendly views.
- Provides utilization metrics, trends, and reports through a read-optimized API.
- Isolates analytical workloads from transactional services to avoid cross-impact.

### Occupancy Service (services/occupancy-service)

- Tracks real-time and historical occupancy signals (e.g., sensor data, check-ins).
- Serves APIs for current occupancy state and time series per space.
- Acts as the source of truth for actual usage vs. scheduled bookings.

## Key Architectural Decisions

### Service Independence

- Each service is deployed independently and owns its own data store.
- No shared databases and no shared application code across services.
- Integration happens exclusively through explicit APIs and well-defined contracts in `docs/api-contracts/`.

### API-First Design

- API contracts are defined and versioned before implementation.
- Documentation under `docs/api-contracts/` is the primary interface for clients and for service-to-service interaction.
- Backwards compatibility is treated as an explicit design concern.

### Simple, Explicit Infrastructure

- Containerization via Docker for each service.
- Docker Compose is the only orchestration mechanism for local and simple multi-service setups.
- No Kubernetes, service mesh, or hidden frameworks; infrastructure choices are deliberately minimal.

### Clear Boundaries and Boring Code

- Each service is responsible for a single cohesive domain area.
- Preference for clear, readable implementations over abstractions or clever patterns.
- Configuration is explicit (environment variables, config files) rather than convention-based magic.

## CI/CD Pipeline

The CI pipeline (`.github/workflows/ci.yml`) runs on every push and pull request with three main jobs:

- **Lint**: Runs frontend linter (optional, continues on error)
- **Test**: Runs Maven tests for all backend services in parallel
- **Docker Build**: Builds Docker images for all services

### How CI Works

- **Deterministic builds**: Each service is built explicitly with `docker build -f <service>/Dockerfile <service>`
- **Fail-fast validation**: CI verifies all Dockerfiles exist before attempting builds
- **Plain Docker**: Uses standard `docker build` (not buildx) to avoid unnecessary complexity
- **Working directories**: All commands use explicit `working-directory` to avoid path confusion

### Why These Choices

- **Explicit paths**: Every Dockerfile path is hardcoded to prevent "file not found" errors
- **No buildx**: We don't need multi-platform builds or registry pushes in CI, so plain `docker build` is sufficient
- **Separate test/build**: Tests run before Docker builds to catch issues early without building images
- **Matrix strategy**: Backend services are tested in parallel for faster feedback

## Running Locally

### Option 1: Docker Compose (All Services)

**Prerequisites:**
- Docker and Docker Compose installed

**Start all services:**
```bash
docker-compose up --build
```

**Service URLs:**
- Frontend: http://localhost:3000
- Auth Service: http://localhost:8080
- Booking Service: http://localhost:8081
- Occupancy Service: http://localhost:8082
- Analytics Service: http://localhost:8083
- AI Engine: http://localhost:8084

**Notes:**
- Services communicate internally using Docker Compose service names (e.g., `analytics-service:8080`)
- Frontend makes browser requests to `localhost` ports (browser can't resolve Docker service names)
- The `ai-engine` connects to `analytics-service` using the service name (server-to-server communication)

**View logs:**
```bash
docker-compose logs -f <service-name>
```

**Stop services:**
```bash
docker-compose down
```

### Option 2: Local Development (Frontend Only)

**Prerequisites:**
- Node.js 20+
- Backend services running (via Docker Compose or individually)

**Setup:**

Create `frontend/.env.local`:
```env
# Frontend environment variables for local development
VITE_AUTH_API_BASE_URL=http://localhost:8080
VITE_ANALYTICS_API_BASE_URL=http://localhost:8083
```

**Install dependencies:**
```bash
cd frontend
npm install
```

**Start dev server:**
```bash
npm run dev
```

Frontend will run on http://localhost:5173 and connect to backend services on their exposed ports.

**Why separate env file?**
- Vite embeds environment variables at build time
- `.env.local` is gitignored, so each developer can customize
- Docker Compose uses build args to set these values during image build

### Option 3: Backend Services Individually

**Prerequisites:**
- Java 17
- Maven 3.9+
- PostgreSQL (for auth-service)

**Run tests:**
```bash
cd services/<service-name>
mvn clean test
```

**Build and run:**
```bash
cd services/<service-name>
mvn clean package
java -jar target/<service-name>-*.jar
```

## Service Communication

### How Services Talk to Each Other

**In Docker Compose:**
- Services use Docker Compose service names as hostnames
- Example: `ai-engine` connects to `analytics-service:8080` (not `localhost:8083`)
- This works because containers are on the same Docker network

**From Browser (Frontend):**
- Browser requests must use `localhost` with exposed ports
- Example: Frontend calls `http://localhost:8080` for auth-service
- This is because the browser runs on the host machine, not in Docker

**Key Principle:**
- **Server-to-server**: Use service names (`analytics-service:8080`)
- **Browser-to-server**: Use `localhost` with exposed ports (`localhost:8080`)

### Service Dependencies

- `auth-service` → `auth-db` (PostgreSQL)
- `ai-engine` → `analytics-service` (HTTP API)
- `frontend` → `auth-service`, `analytics-service` (HTTP APIs)

All other services are independent and can run standalone.

## Intentional Out-of-Scope Areas

The current scope of SpaceFlow does not include:

- **End-user UI**: No production-ready web or mobile frontends; the focus is on service APIs and contracts.
- **Production-grade IAM and SSO**: Authentication and authorization are intentionally minimal or stubbed; any real deployment is expected to integrate with an organizational identity provider.
- **Billing, invoicing, and chargeback**: Financial workflows are not modeled; analytics focus on utilization and operational metrics only.
- **IoT device management**: The platform assumes occupancy and sensor data ingress exists but does not manage device lifecycle, firmware, or provisioning.
- **Complex orchestration tooling**: No Kubernetes, service mesh, or autoscaling logic; scale-out concerns are left to the deployment environment.

This repository is intended to demonstrate clear service boundaries, API-first contracts, and pragmatic infrastructure choices for a smart workplace platform, rather than to be a fully featured product.

