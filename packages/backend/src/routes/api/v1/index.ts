import { Hono } from "hono";
import { requireAuth } from "../../../middleware/auth";
import { familiesRoutes } from "./families";
import { childrenRoutes } from "./children";
import { caregiversRoutes } from "./caregivers";
import { therapistsRoutes } from "./therapists";
import { usageLogsRoutes } from "./usage-logs";
import { insightsRoutes } from "./insights";
import { conversationsRoutes } from "./conversations";
import { notificationsRoutes } from "./notifications";
import { authRoutes } from "./auth";
import { goalsRoutes } from "./goals";
import { sessionsRoutes } from "./sessions";
import { adminRoutes } from "./admin";
import { symbolsRoutes } from "./symbols";

export const apiV1Routes = new Hono();

// API info endpoint (public)
apiV1Routes.get("/", (c) => {
  return c.json({
    name: "Flynn AAC API",
    version: "1.0.0",
    documentation: "/api/v1/docs",
  });
});

// Auth routes (handles its own auth - webhook is public, /me requires auth)
apiV1Routes.route("/auth", authRoutes);

// Apply authentication to ALL routes below this point
// This is a critical security measure - all API routes require valid JWT
apiV1Routes.use("/*", requireAuth());

// Mount all resource routes (all protected by requireAuth above)
apiV1Routes.route("/families", familiesRoutes);
apiV1Routes.route("/children", childrenRoutes);
apiV1Routes.route("/caregivers", caregiversRoutes);
apiV1Routes.route("/therapists", therapistsRoutes);
apiV1Routes.route("/usage-logs", usageLogsRoutes);
apiV1Routes.route("/insights", insightsRoutes);
apiV1Routes.route("/goals", goalsRoutes);
apiV1Routes.route("/sessions", sessionsRoutes);
apiV1Routes.route("/conversations", conversationsRoutes);
apiV1Routes.route("/notifications", notificationsRoutes);
apiV1Routes.route("/admin", adminRoutes);
apiV1Routes.route("/symbols", symbolsRoutes);
