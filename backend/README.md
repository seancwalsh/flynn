# Flynn AAC Backend

Backend API for Flynn AAC - an AI-powered platform for child communication development insights.

## Tech Stack

- **Runtime:** [Bun](https://bun.sh/) - Fast JavaScript runtime
- **Framework:** [Hono](https://hono.dev/) - Lightweight, fast web framework
- **Database:** PostgreSQL with [Drizzle ORM](https://orm.drizzle.team/)
- **Validation:** [Zod](https://zod.dev/) - TypeScript-first schema validation
- **Testing:** Bun's built-in test runner

## Quick Start

### Prerequisites

- [Bun](https://bun.sh/) (v1.0+)
- [Docker](https://www.docker.com/) & Docker Compose

### One-Command Setup

```bash
# Install deps, start docker, run migrations
make setup

# Then start developing
make dev
```

Or manually:

```bash
bun install
docker compose up -d
bun run db:migrate
bun run dev
```

### Running Tests

```bash
make test
# or: docker compose up -d postgres-test && bun test
```

The API will be available at `http://localhost:3000`.

### Common Commands

| Command | Description |
|---------|-------------|
| `make setup` | First-time setup (deps + docker + migrations) |
| `make dev` | Start docker + dev server |
| `make test` | Run tests with test database |
| `make stop` | Stop docker services |
| `make logs` | View docker logs |
| `make db-shell` | Open psql to dev database |
| `make clean` | Stop + remove all data |

## Environment Variables

Create a `.env` file (or use defaults):

```env
NODE_ENV=development
PORT=3000
DATABASE_URL=postgres://postgres:postgres@localhost:5432/flynn_aac
REDIS_URL=redis://localhost:6379
LOG_LEVEL=info
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

## Docker

### Development

```bash
# Start all services (Postgres + Redis)
docker compose up -d

# Start only Postgres
docker compose up -d postgres

# View logs
docker compose logs -f

# Stop services
docker compose down

# Reset data
docker compose down -v
```

### Services

| Service | Port | Purpose |
|---------|------|---------|
| `postgres` | 5432 | Primary database |
| `postgres-test` | 5433 | Test database (ephemeral) |
| `redis` | 6379 | Cache/queue (future) |

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
