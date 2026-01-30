import { Hono } from "hono";
import { getDbStatus } from "../db";

export const healthRoutes = new Hono();

healthRoutes.get("/health", async (c) => {
  const dbStatus = await getDbStatus();
  
  const health = {
    status: dbStatus.connected ? "healthy" : "degraded",
    timestamp: new Date().toISOString(),
    version: process.env["npm_package_version"] ?? "0.1.0",
    services: {
      database: dbStatus,
      redis: { connected: false, message: "Not implemented yet" },
    },
  };

  const statusCode = health.status === "healthy" ? 200 : 503;
  return c.json(health, statusCode);
});

// Simple liveness probe (always returns 200 if server is running)
healthRoutes.get("/live", (c) => {
  return c.json({ status: "alive" });
});

// Readiness probe (returns 200 only if ready to serve traffic)
healthRoutes.get("/ready", async (c) => {
  const dbStatus = await getDbStatus();
  
  if (dbStatus.connected) {
    return c.json({ status: "ready" });
  }
  
  return c.json({ status: "not ready", reason: "Database not connected" }, 503);
});
