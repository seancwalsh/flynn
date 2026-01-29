# Flynn AAC

AI-powered platform for child communication development insights.

## Overview

Flynn is a comprehensive AAC (Augmentative and Alternative Communication) platform with:
- 📱 **iOS AAC App** - Native Swift app for child communication
- 🌐 **Caregiver Web Portal** - React-based insights dashboard
- 🚀 **Backend API** - Bun + Hono REST API

## Quick Start

### Prerequisites

- [Docker](https://www.docker.com/) & Docker Compose
- Git

*Optional for native development:*
- [Bun](https://bun.sh/) (v1.0+) - Backend
- Node.js 20+ - Frontend
- Xcode 15+ - iOS (macOS only)

### One-Command Setup (Recommended)

```bash
# Clone repository
git clone <repository-url>
cd flynn-app

# Copy environment template
cp .env.example .env
# Edit .env and add your API keys (Clerk, Anthropic)

# Start all services
docker compose up -d

# View logs
docker compose logs -f
```

Access points:
- Backend API: http://localhost:3000
- Caregiver Portal: http://localhost:3001
- Health Check: http://localhost:3000/health

### Alternative: Native Development

```bash
# Backend
cd backend
bun install
docker compose up -d postgres redis
bun run db:migrate
bun run dev

# Caregiver Web (new terminal)
cd caregiver-web
npm install
npm run dev
```

## Tech Stack

### Backend
- **Runtime:** [Bun](https://bun.sh/) - Fast JavaScript runtime
- **Framework:** [Hono](https://hono.dev/) - Lightweight web framework
- **Database:** PostgreSQL 16 with pgvector
- **ORM:** [Drizzle](https://orm.drizzle.team/)
- **Auth:** Clerk
- **Cache:** Redis 7

### Caregiver Web
- **Framework:** React 18.3
- **Build:** Vite 6.0
- **Router:** TanStack Router
- **State:** TanStack Query
- **Styling:** Tailwind CSS
- **Testing:** Vitest, Playwright

### iOS App
- **Language:** Swift 5.9
- **Framework:** SwiftUI
- **Min Version:** iOS 17.0+
- **Auth:** Clerk iOS SDK

## Common Commands

```bash
# Start all services
docker compose up -d

# View logs (all services)
docker compose logs -f

# View specific service logs
docker compose logs -f backend
docker compose logs -f caregiver-web

# Stop all services
docker compose down

# Clean restart (removes data)
docker compose down -v && docker compose up -d

# Run backend tests
docker compose exec backend bun test

# Run frontend tests
docker compose exec caregiver-web npm run test

# Database shell
docker compose exec postgres psql -U postgres -d flynn_aac

# Rebuild after changes
docker compose up -d --build
```

For more commands and workflows, see [DEVELOPMENT.md](./DEVELOPMENT.md).

## Environment Variables

Copy `.env.example` to `.env` and configure:

```bash
# Required
CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
CLERK_WEBHOOK_SECRET=whsec_...
ANTHROPIC_API_KEY=sk-ant-...

# Optional
LINEAR_API_KEY=lin_api_...
```

## API Endpoints

### Health & Status
- `GET /health` - Full health check with service status
- `GET /live` - Liveness probe (always 200 if server is running)
- `GET /ready` - Readiness probe (200 only if database is connected)

### API v1

All API routes are prefixed with `/api/v1`.

| Resource | Endpoints |
|----------|-----------|
| Families | `GET, POST /families`, `GET, PATCH, DELETE /families/:id` |
| Children | `GET, POST /children`, `GET, PATCH, DELETE /children/:id` |
| Caregivers | `GET, POST /caregivers`, `GET, PATCH, DELETE /caregivers/:id` |
| Therapists | `GET, POST /therapists`, `GET, PATCH, DELETE /therapists/:id` |
| Usage Logs | `GET, POST /usage-logs`, `GET /usage-logs/:id`, `POST /usage-logs/bulk` |
| Insights | `GET, POST /insights`, `GET /insights/:id`, `GET /insights/daily/:childId` |

## Development

### Scripts

```bash
# Development server with hot reload
bun run dev

# Production start
bun run start

# Build for production
bun run build

# Run tests
bun test

# Run tests in watch mode
bun test --watch

# Run tests with coverage
bun test --coverage

# Linting
bun run lint
bun run lint:fix

# Formatting
bun run format
bun run format:check

# Type checking
bun run typecheck

# Database commands
bun run db:generate  # Generate migrations
bun run db:migrate   # Run migrations
bun run db:push      # Push schema (dev only)
bun run db:studio    # Open Drizzle Studio
```

### Testing

We use Bun's built-in test runner for fast, reliable tests.

**Test Structure:**
- `src/tests/unit/` - Unit tests (no database required)
- `src/tests/integration/` - Integration tests (require database)
- `src/tests/fixtures/` - Test data factories

**Running Tests:**

```bash
# Start test database
docker compose up -d postgres-test

# Run all tests
bun test

# Run specific test file
bun test src/tests/integration/health.test.ts

# Run with coverage
bun test --coverage
```

### Database

**Schema:** `src/db/schema.ts` - Drizzle ORM schema definitions

**Core Tables:**
- `families` - Family units (primary organizational entity)
- `children` - Children using the AAC app
- `caregivers` - Parents, guardians, etc.
- `therapists` - Speech-language pathologists
- `therapist_clients` - Junction table for therapist-child relationships
- `usage_logs` - Symbol usage tracking (synced from CloudKit)
- `insights` - AI-generated daily digests, reports, and alerts

## Services

| Service | Container | Port | Description |
|---------|-----------|------|-------------|
| Backend API | `flynn-aac-backend` | 3000 | Hono REST API |
| Caregiver Web | `flynn-aac-caregiver-web` | 3001 | React portal |
| PostgreSQL | `flynn-aac-postgres` | 5434 | Main database |
| PostgreSQL Test | `flynn-aac-postgres-test` | 5433 | Test database |
| Redis | `flynn-aac-redis` | 6379 | Cache & queues |

## Architecture

```
src/
├── app.ts              # Hono app setup
├── index.ts            # Entry point
├── config/
│   └── env.ts          # Environment config with Zod validation
├── db/
│   ├── index.ts        # Database connection
│   ├── schema.ts       # Drizzle schema
│   └── migrate.ts      # Migration runner
├── middleware/
│   ├── logger.ts       # Request logging
│   └── error-handler.ts # Error handling
├── routes/
│   ├── health.ts       # Health endpoints
│   └── api/v1/         # Versioned API routes
├── services/           # Business logic (future)
├── utils/              # Utilities (future)
└── tests/
    ├── setup.ts        # Test helpers
    ├── fixtures/       # Test data
    ├── unit/           # Unit tests
    └── integration/    # Integration tests
```

## Contributing

1. Create a feature branch
2. Write tests for new functionality
3. Ensure all tests pass: `bun test`
4. Ensure linting passes: `bun run lint`
5. Ensure types are correct: `bun run typecheck`
6. Submit a PR

## License

Private - Flynn Child Development Platform
