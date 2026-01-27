import { Hono } from "hono";
import { familiesRoutes } from "./families";
import { childrenRoutes } from "./children";
import { caregiversRoutes } from "./caregivers";
import { therapistsRoutes } from "./therapists";
import { usageLogsRoutes } from "./usage-logs";
import { insightsRoutes } from "./insights";

export const apiV1Routes = new Hono();

// Mount all resource routes
apiV1Routes.route("/families", familiesRoutes);
apiV1Routes.route("/children", childrenRoutes);
apiV1Routes.route("/caregivers", caregiversRoutes);
apiV1Routes.route("/therapists", therapistsRoutes);
apiV1Routes.route("/usage-logs", usageLogsRoutes);
apiV1Routes.route("/insights", insightsRoutes);

// API info endpoint
apiV1Routes.get("/", (c) => {
  return c.json({
    name: "Flynn AAC API",
    version: "1.0.0",
    documentation: "/api/v1/docs",
  });
});
