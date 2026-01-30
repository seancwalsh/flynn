import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "./middleware/logger";
import { errorHandler } from "./middleware/error-handler";
import { rateLimiter } from "./middleware/rate-limiter";
import { healthRoutes } from "./routes/health";
import { apiV1Routes } from "./routes/api/v1";
import { env } from "./config/env";

export const app = new Hono();

// Global middleware
app.use("*", cors({
  origin: env.NODE_ENV === "production" 
    ? ["https://flynnapp.com", "capacitor://localhost", "ionic://localhost"] 
    : "*",
  credentials: true,
}));
app.use("*", logger());
app.onError(errorHandler);

// Global rate limiting for API routes (100 req/min per IP)
app.use("/api/*", rateLimiter({ windowMs: 60000, max: 100 }));

// Health check (outside versioned API)
app.route("/", healthRoutes);

// Versioned API routes
app.route("/api/v1", apiV1Routes);

// 404 handler
app.notFound((c) => {
  return c.json(
    {
      error: "Not Found",
      message: `Route ${c.req.method} ${c.req.path} not found`,
    },
    404
  );
});

export type AppType = typeof app;
