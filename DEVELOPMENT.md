# Flynn AAC Development Guide

Quick start guide for local development with the Flynn AAC application.

## Prerequisites

- **Docker & Docker Compose** - For running all services
- **Git** - Version control
- *Optional for native development:*
  - Bun 1.0+ (Backend)
  - Node.js 20+ (Frontend)
  - Xcode 15+ (iOS, macOS only)

## Quick Start (Docker - Recommended)

### 1. Clone and Setup

```bash
git clone <repository-url>
cd flynn-app

# Copy environment template
cp .env.example .env

# Edit .env and add your API keys
# Required: CLERK_PUBLISHABLE_KEY, CLERK_SECRET_KEY, ANTHROPIC_API_KEY
```

### 2. Start Everything

```bash
# Start all services (postgres, redis, backend, caregiver-web)
docker compose up -d

# View logs
docker compose logs -f

# Or view specific service logs
docker compose logs -f backend
docker compose logs -f caregiver-web
```

### 3. Access Applications

- **Backend API**: http://localhost:3000
- **Caregiver Web Portal**: http://localhost:3001
- **API Health Check**: http://localhost:3000/health

### 4. Stop Everything

```bash
docker compose down

# To also remove database volumes (fresh start)
docker compose down -v
```

## Architecture Overview

Flynn is a monorepo with three applications:

```
flynn-app/
├── backend/              # API server (Bun + Hono)
│   ├── src/             # TypeScript source
│   ├── drizzle/         # Database migrations
│   └── Dockerfile       # Backend container
├── caregiver-web/       # Web portal (React + Vite)
│   ├── app/routes/      # File-based routing
│   ├── src/             # Components & utilities
│   └── Dockerfile       # Frontend container
├── aac-ios/             # iOS app (Swift + SwiftUI)
│   └── Sources/         # Swift source code
├── docker-compose.yml   # Service orchestration
└── .env.example         # Environment template
```

### Service Ports

| Service | Port | Description |
|---------|------|-------------|
| Backend API | 3000 | Hono REST API |
| Caregiver Web | 3001 | React web portal |
| PostgreSQL (dev) | 5434 | Main database |
| PostgreSQL (test) | 5433 | Test database |
| Redis | 6379 | Cache & queues |

## Environment Variables

Copy `.env.example` to `.env` and configure:

### Required
```bash
# Clerk Authentication
CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
CLERK_WEBHOOK_SECRET=whsec_...

# AI Services
ANTHROPIC_API_KEY=sk-ant-...
```

### Optional
```bash
# Issue Tracking
LINEAR_API_KEY=lin_api_...
```

## Development Workflows

### Database Management

**Run Migrations**
```bash
docker compose exec backend bun run db:migrate
```

**Generate New Migration**
```bash
cd backend
bun run db:generate
```

**Access Database Shell**
```bash
# Development database
docker compose exec postgres psql -U postgres -d flynn_aac

# Test database
docker compose exec postgres-test psql -U postgres -d flynn_aac_test
```

**Reset Database**
```bash
docker compose down -v  # Remove volumes
docker compose up -d    # Restart
docker compose exec backend bun run db:migrate  # Re-run migrations
```

### Testing

**Backend Tests**
```bash
# Via Docker
docker compose exec backend bun test

# Native (requires Bun)
cd backend && bun test
```

**Frontend Unit Tests**
```bash
# Via Docker
docker compose exec caregiver-web npm run test

# Native
cd caregiver-web && npm run test
```

**Frontend E2E Tests**
```bash
cd caregiver-web
npm run test:e2e
```

### Rebuilding After Changes

```bash
# Rebuild all services
docker compose up -d --build

# Rebuild specific service
docker compose up -d --build backend
docker compose up -d --build caregiver-web
```

### iOS Development

iOS development requires macOS and Xcode:

```bash
cd aac-ios

# Install XcodeGen (if needed)
brew install xcodegen

# Generate Xcode project
xcodegen generate

# Open in Xcode
open Flynn.xcodeproj
```

Build and run using Xcode's standard workflow.

## Native Development (Without Docker)

If you prefer running services natively:

### Backend
```bash
cd backend

# Install dependencies
bun install

# Start PostgreSQL & Redis via Docker
docker compose up -d postgres redis

# Run migrations
bun run db:migrate

# Start dev server with hot reload
bun run dev
```

### Caregiver Web
```bash
cd caregiver-web

# Install dependencies
npm install

# Start dev server
npm run dev
```

## Troubleshooting

### Port Already in Use

```bash
# Check what's using the port
lsof -i :3000
lsof -i :3001
lsof -i :5434

# Kill the process
kill -9 <PID>
```

### Database Connection Issues

```bash
# Check postgres health
docker compose ps postgres

# View logs
docker compose logs postgres

# Restart postgres
docker compose restart postgres
```

### Backend Not Starting

```bash
# Check environment variables
docker compose exec backend env | grep CLERK

# Verify database migration
docker compose exec backend bun run db:migrate

# Rebuild backend
docker compose up -d --build backend
```

### Clean Reset

```bash
# Nuclear option: remove everything
docker compose down -v
docker system prune -a
docker volume prune

# Start fresh
docker compose up -d
```

## API Documentation

### Health Endpoints

- `GET /health` - Overall health status
- `GET /live` - Liveness probe
- `GET /ready` - Readiness probe

### Core API Routes (all under `/api/v1`)

- `/auth` - Authentication & user management
- `/families` - Family CRUD operations
- `/children` - Child profile management
- `/caregivers` - Caregiver management
- `/therapists` - Therapist operations
- `/usage-logs` - AAC symbol usage tracking
- `/insights` - AI-generated communication insights
- `/conversations` - Conversation history
- `/notifications` - Push notification management

## Tech Stack Reference

### Backend
- **Runtime**: Bun 1.0+
- **Framework**: Hono 4.11+
- **Database**: PostgreSQL 16 with pgvector
- **ORM**: Drizzle
- **Auth**: Clerk
- **Cache**: Redis 7
- **AI**: Anthropic Claude

### Frontend (Web)
- **Framework**: React 18.3
- **Build Tool**: Vite 6.0
- **Router**: TanStack Router
- **State**: TanStack Query
- **Styling**: Tailwind CSS
- **Auth**: Clerk React
- **Testing**: Vitest, Playwright

### iOS
- **Language**: Swift 5.9
- **Framework**: SwiftUI
- **Min Version**: iOS 17.0+
- **Auth**: Clerk iOS SDK
- **TTS**: ElevenLabs API

## Common Commands Reference

```bash
# Start everything
docker compose up -d

# View logs
docker compose logs -f

# Stop everything
docker compose down

# Rebuild services
docker compose up -d --build

# Run backend tests
docker compose exec backend bun test

# Run frontend tests
docker compose exec caregiver-web npm run test

# Database shell
docker compose exec postgres psql -U postgres -d flynn_aac

# Run migrations
docker compose exec backend bun run db:migrate

# Generate migration
cd backend && bun run db:generate

# Clean restart
docker compose down -v && docker compose up -d
```

## Getting Help

- **Project Skill**: Use `/flynn-dev-env` with Claude Code for environment help
- **Issues**: Report bugs via GitHub Issues
- **Documentation**: See `DEPLOYMENT.md` for production deployment

## Next Steps

1. Configure your `.env` file with API keys
2. Start services: `docker compose up -d`
3. Access caregiver portal: http://localhost:3001
4. Check API health: http://localhost:3000/health
5. Review the project skill: `.claude/skills/flynn-dev-env.md`

Happy coding! 🚀
