import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "./middleware/logger";
import { errorHandler } from "./middleware/error-handler";
import { healthRoutes } from "./routes/health";
import { apiV1Routes } from "./routes/api/v1";

export const app = new Hono();

// Global middleware
app.use("*", cors());
app.use("*", logger());
app.onError(errorHandler);

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
