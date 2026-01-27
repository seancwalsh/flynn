# Flynn AAC Deployment Guide

This guide covers deploying Flynn AAC from local development to production.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Local Development](#local-development)
3. [Staging Deployment](#staging-deployment-railway)
4. [Production Deployment](#production-deployment)
5. [Environment Variables Reference](#environment-variables-reference)
6. [Database Migrations](#database-migrations)
7. [Monitoring](#monitoring)
8. [Rollback](#rollback)
9. [Troubleshooting](#troubleshooting)

---

## Prerequisites

Before you begin, ensure you have the following installed:

- **Bun** (v1.0+): [Install Bun](https://bun.sh/)
- **Docker** & **Docker Compose**: [Install Docker](https://docs.docker.com/get-docker/)
- **Git**: [Install Git](https://git-scm.com/)
- **Railway CLI** (for deployment): `npm install -g @railway/cli`

### Accounts Required

- [GitHub](https://github.com) - Repository hosting
- [Railway](https://railway.app) - Hosting platform
- [Sentry](https://sentry.io) - Error monitoring (optional but recommended)

---

## Local Development

### 1. Clone the Repository

```bash
git clone https://github.com/YOUR_USERNAME/flynn-aac.git
cd flynn-aac
```

### 2. Configure Environment

```bash
cd backend
cp .env.example .env
```

Edit `.env` with your local settings (defaults work for Docker setup).

### 3. Start Infrastructure

```bash
docker-compose up -d
```

This starts:
- **PostgreSQL** (port 5432) - Main database with pgvector
- **PostgreSQL Test** (port 5433) - Ephemeral test database
- **Redis** (port 6379) - Caching and queues

### 4. Install Dependencies & Run Migrations

```bash
bun install
bun run db:migrate
```

### 5. Start Development Server

```bash
bun run dev
```

The API is now running at `http://localhost:3000`.

### 6. Run Tests

```bash
# Run all tests
bun test

# Run tests in watch mode
bun test:watch

# Run with coverage
bun test:coverage
```

### 7. Verify Setup

```bash
# Health check
curl http://localhost:3000/health

# Should return:
# {"status":"healthy","timestamp":"...","version":"0.1.0"}
```

---

## Staging Deployment (Railway)

### 1. Create Railway Project

```bash
railway login
railway init
```

Or create via [Railway Dashboard](https://railway.app/dashboard).

### 2. Add Services

In Railway Dashboard, add:

1. **PostgreSQL Database**
   - Click "New" → "Database" → "PostgreSQL"
   - Note: For pgvector support, use a custom Dockerfile or Railway's Postgres with extensions

2. **Redis**
   - Click "New" → "Database" → "Redis"

### 3. Connect GitHub Repository

1. In Railway Dashboard, click "New" → "GitHub Repo"
2. Select your `flynn-aac` repository
3. Set root directory to `/backend`

### 4. Configure Environment Variables

In Railway service settings, add:

```
NODE_ENV=staging
PORT=3000
LOG_LEVEL=info
DATABASE_URL=${{Postgres.DATABASE_URL}}
REDIS_URL=${{Redis.REDIS_URL}}
SENTRY_DSN=your-sentry-dsn-here
```

Railway automatically injects `DATABASE_URL` and `REDIS_URL` from linked services.

### 5. Configure Build & Start Commands

In service settings:

- **Build Command**: `bun install`
- **Start Command**: `bun run db:migrate && bun run start`

### 6. Deploy

Railway auto-deploys on push to your default branch. Manual deploy:

```bash
railway up
```

### 7. Verify Deployment

```bash
curl https://your-app.railway.app/health
```

---

## Production Deployment

Production follows the same pattern as staging with additional considerations:

### 1. Create Separate Railway Project

Keep production isolated from staging:

```bash
railway init --name flynn-aac-production
```

### 2. Add Production Services

Same as staging:
- PostgreSQL (consider Railway's managed Postgres for backups)
- Redis

### 3. Environment Configuration

```
NODE_ENV=production
PORT=3000
LOG_LEVEL=warn
DATABASE_URL=${{Postgres.DATABASE_URL}}
REDIS_URL=${{Redis.REDIS_URL}}
SENTRY_DSN=your-production-sentry-dsn
```

### 4. Custom Domain Setup

1. In Railway Dashboard → Service → Settings → Domains
2. Click "Add Custom Domain"
3. Enter your domain (e.g., `api.flynn-aac.com`)
4. Add the provided CNAME record to your DNS:
   ```
   CNAME api.flynn-aac.com → your-app.railway.app
   ```

### 5. SSL Configuration

Railway automatically provisions and renews SSL certificates via Let's Encrypt. No configuration needed.

### 6. Production Checklist

Before going live:

- [ ] Environment variables set correctly
- [ ] Database migrations run successfully
- [ ] Health check endpoint responds
- [ ] Sentry configured and receiving test errors
- [ ] Custom domain configured with SSL
- [ ] Backups enabled for PostgreSQL
- [ ] Rate limiting configured (if applicable)

---

## Environment Variables Reference

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `NODE_ENV` | No | `development` | Environment: `development`, `staging`, `production`, `test` |
| `PORT` | No | `3000` | HTTP server port |
| `LOG_LEVEL` | No | `info` | Log level: `debug`, `info`, `warn`, `error` |
| `DATABASE_URL` | **Yes** | - | PostgreSQL connection string |
| `REDIS_URL` | No | - | Redis connection string (for caching/queues) |
| `SENTRY_DSN` | No | - | Sentry DSN for error tracking |
| `TEST_DATABASE_URL` | No | - | Test database connection (local dev only) |
| `CLERK_SECRET_KEY` | **Yes** | - | Clerk secret key (from dashboard.clerk.com) |
| `CLERK_PUBLISHABLE_KEY` | **Yes** | - | Clerk publishable key |
| `CLERK_WEBHOOK_SECRET` | **Yes** | - | Clerk webhook signing secret |

### Clerk Authentication Setup

Flynn uses [Clerk](https://clerk.com) for authentication. To set up:

1. Create a Clerk application at [dashboard.clerk.com](https://dashboard.clerk.com)
2. Copy your API keys from the Clerk Dashboard → API Keys
3. Set up webhooks:
   - Go to Webhooks in Clerk Dashboard
   - Add endpoint: `https://your-api.com/api/v1/auth/webhook`
   - Subscribe to: `user.created`, `user.updated`, `user.deleted`
   - Copy the signing secret

**For iOS app:**
- Add `CLERK_PUBLISHABLE_KEY` to the iOS app configuration

**For web app:**
- Add `VITE_CLERK_PUBLISHABLE_KEY` to the environment

### Generating Database URLs

**PostgreSQL format:**
```
postgres://USER:PASSWORD@HOST:PORT/DATABASE
```

**Redis format:**
```
redis://HOST:PORT
```

---

## Database Migrations

### Running Migrations

```bash
# Local
bun run db:migrate

# Production (via Railway CLI)
railway run bun run db:migrate
```

### When to Run Migrations

- **Automatically**: Configure start command to run migrations before starting the server:
  ```
  bun run db:migrate && bun run start
  ```

- **Manually**: For complex migrations, run separately before deploying:
  ```bash
  railway run bun run db:migrate
  ```

### Creating New Migrations

```bash
# Generate migration from schema changes
bun run db:generate

# Push schema directly (dev only, not recommended for production)
bun run db:push
```

### Migration Best Practices

1. **Test migrations locally first** against a copy of production data
2. **Make migrations reversible** when possible
3. **Run migrations before deploying** new code that depends on schema changes
4. **Back up database** before running migrations in production

---

## Monitoring

### Sentry Error Tracking

Sentry captures unhandled exceptions automatically. Configure by setting `SENTRY_DSN`.

**Sentry Dashboard:**
- View errors at [sentry.io](https://sentry.io)
- Set up alerts for new issues
- Track error trends over time

**What's Captured:**
- 5xx server errors (not 4xx client errors)
- Request path and method
- Stack traces
- Environment info

### Railway Logs

View logs in Railway Dashboard or CLI:

```bash
# Stream logs
railway logs

# View recent logs
railway logs --tail 100
```

### Health Check Endpoint

Monitor application health:

```bash
curl https://your-app.railway.app/health
```

Response:
```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "version": "0.1.0"
}
```

### Recommended Monitoring Setup

1. **Uptime monitoring**: Use Railway's built-in health checks or external services (Pingdom, UptimeRobot)
2. **Error alerts**: Configure Sentry to notify on new errors
3. **Log aggregation**: Use Railway's log viewer or export to external service

---

## Rollback

### Rollback via Railway

Railway maintains deployment history. To rollback:

1. Go to Railway Dashboard → Your Service → Deployments
2. Find the last working deployment
3. Click "Redeploy" on that deployment

Or via CLI:

```bash
# List deployments
railway deployments

# Rollback to previous
railway rollback
```

### Rollback Database Migrations

Drizzle doesn't have built-in rollback. Options:

**Option 1: Restore from Backup**
```bash
# Railway managed Postgres has point-in-time recovery
# Contact Railway support for restoration
```

**Option 2: Manual Rollback Script**
Create a `down` migration:

```bash
# Create rollback migration manually
# Apply with: bun run src/db/rollback.ts
```

**Option 3: Forward-Fix**
Create a new migration that undoes the problematic changes.

### Rollback Best Practices

1. **Always back up** before migrations
2. **Test rollback procedure** in staging
3. **Keep migrations small** and reversible
4. **Document breaking changes** in migration files

---

## Troubleshooting

### Common Issues

#### Database Connection Failed

**Symptoms:** `ECONNREFUSED` or `Connection refused`

**Solutions:**
1. Check if PostgreSQL container is running:
   ```bash
   docker ps | grep postgres
   ```
2. Verify `DATABASE_URL` is correct
3. Ensure database exists:
   ```bash
   docker exec -it flynn-aac-postgres psql -U postgres -c '\l'
   ```

#### Migrations Fail

**Symptoms:** Migration errors or schema conflicts

**Solutions:**
1. Check migration status:
   ```bash
   bun run db:studio
   ```
2. Reset local database (dev only):
   ```bash
   docker-compose down -v
   docker-compose up -d
   bun run db:migrate
   ```

#### Container Won't Start

**Symptoms:** Container exits immediately

**Solutions:**
1. Check logs:
   ```bash
   docker-compose logs postgres
   ```
2. Remove volumes and restart:
   ```bash
   docker-compose down -v
   docker-compose up -d
   ```

#### Railway Build Fails

**Symptoms:** Deployment fails during build

**Solutions:**
1. Check build logs in Railway Dashboard
2. Verify `bun.lockfile` is committed
3. Ensure root directory is set correctly (`/backend`)

#### Redis Connection Issues

**Symptoms:** Cache/queue operations fail

**Solutions:**
1. Verify Redis is running:
   ```bash
   docker exec -it flynn-aac-redis redis-cli ping
   ```
2. Check `REDIS_URL` format
3. Ensure Redis service is linked in Railway

#### High Memory Usage

**Symptoms:** OOM errors or slow performance

**Solutions:**
1. Check for memory leaks in logs
2. Increase Railway service memory
3. Review database query efficiency

### Getting Help

1. **Check logs first**: `railway logs` or `docker-compose logs`
2. **Search existing issues**: [GitHub Issues](https://github.com/YOUR_USERNAME/flynn-aac/issues)
3. **Railway support**: [Railway Discord](https://discord.gg/railway)
4. **Create an issue**: Include logs, environment, and steps to reproduce

---

## Quick Reference

```bash
# Local Development
docker-compose up -d          # Start infrastructure
bun install                   # Install dependencies
bun run dev                   # Start dev server
bun test                      # Run tests
bun run db:migrate           # Run migrations

# Railway
railway login                 # Authenticate
railway up                    # Deploy
railway logs                  # View logs
railway run <cmd>            # Run command in production
railway rollback             # Rollback deployment

# Database
bun run db:generate          # Generate migrations
bun run db:migrate           # Apply migrations
bun run db:studio            # Open Drizzle Studio
```
