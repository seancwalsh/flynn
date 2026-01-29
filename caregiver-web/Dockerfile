# Caregiver Web Portal Dockerfile
# Multi-stage build for Vite + React app

FROM node:20-alpine AS base
WORKDIR /app

# Install dependencies stage
FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci

# Development stage with hot reload
FROM base AS development
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Expose Vite dev server with HMR
EXPOSE 3001
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "3001"]

# Build stage
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# Production stage with static file server
FROM node:20-alpine AS production
WORKDIR /app

# Install a simple HTTP server for serving static files
RUN npm install -g serve

COPY --from=builder /app/dist ./dist

EXPOSE 3001
CMD ["serve", "-s", "dist", "-l", "3001"]
