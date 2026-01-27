import * as Sentry from "@sentry/node";
import { app } from "./app";
import { env } from "./config/env";

// Initialize Sentry (only if DSN is provided)
Sentry.init({
  dsn: process.env["SENTRY_DSN"],
  environment: env.NODE_ENV,
  enabled: !!process.env["SENTRY_DSN"],
  tracesSampleRate: env.NODE_ENV === "production" ? 0.1 : 1.0,
});

const server = Bun.serve({
  port: env.PORT,
  fetch: app.fetch,
});

console.log(`🚀 Flynn AAC Backend running on http://localhost:${server.port}`);
