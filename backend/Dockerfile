# Backend API Dockerfile
# Uses Bun runtime for fast performance

FROM oven/bun:1 AS base
WORKDIR /app

# Install dependencies stage
FROM base AS deps
COPY package.json bun.lock* ./
RUN bun install

# Development stage with hot reload
FROM base AS development
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Run migrations on startup, then start the dev server
CMD ["sh", "-c", "bun run db:migrate && bun run --hot src/index.ts"]

# Production build stage
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN bun run build

# Production runtime stage
FROM base AS production
ENV NODE_ENV=production

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/drizzle ./drizzle
COPY --from=builder /app/package.json ./

# Run migrations on startup, then start production server
CMD ["sh", "-c", "bun run db:migrate && bun run start"]

EXPOSE 3000
