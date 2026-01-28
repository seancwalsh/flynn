/**
 * Notification API Routes
 * 
 * Manage notification preferences and device registration.
 * 
 * FLY-101: Push notification integration
 */

import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod/v4";
import { db } from "../../../db";
import { notificationPreferences, devices, notificationLogs } from "../../../db/schema";
import { eq, desc } from "drizzle-orm";
import { notificationService, DEFAULT_PREFERENCES } from "../../../services/notification-service";
import { AppError } from "../../../middleware/error-handler";

export const notificationsRoutes = new Hono();

// ============================================================================
// PREFERENCES
// ============================================================================

// Get notification preferences
notificationsRoutes.get("/preferences/:userId", async (c) => {
  const userId = c.req.param("userId");
  
  const [prefs] = await db
    .select()
    .from(notificationPreferences)
    .where(eq(notificationPreferences.userId, userId))
    .limit(1);

  if (!prefs) {
    // Return defaults if no preferences set
    return c.json({ data: DEFAULT_PREFERENCES });
  }

  return c.json({
    data: {
      enabled: prefs.enabled,
      types: prefs.typeSettings || DEFAULT_PREFERENCES.types,
      quietHours: {
        enabled: prefs.quietHoursEnabled,
        start: prefs.quietHoursStart,
        end: prefs.quietHoursEnd,
        timezone: prefs.timezone,
      },
      frequency: {
        maxPerHour: prefs.maxPerHour,
        maxPerDay: prefs.maxPerDay,
      },
    },
  });
});

// Update notification preferences
const updatePreferencesSchema = z.object({
  enabled: z.boolean().optional(),
  types: z.record(z.string(), z.boolean()).optional(),
  quietHours: z.object({
    enabled: z.boolean().optional(),
    start: z.string().regex(/^\d{2}:\d{2}$/).optional(),
    end: z.string().regex(/^\d{2}:\d{2}$/).optional(),
    timezone: z.string().optional(),
  }).optional(),
  frequency: z.object({
    maxPerHour: z.number().min(1).max(100).optional(),
    maxPerDay: z.number().min(1).max(500).optional(),
  }).optional(),
});

notificationsRoutes.put(
  "/preferences/:userId",
  zValidator("json", updatePreferencesSchema),
  async (c) => {
    const userId = c.req.param("userId");
    const body = c.req.valid("json");

    // Check if preferences exist
    const [existing] = await db
      .select()
      .from(notificationPreferences)
      .where(eq(notificationPreferences.userId, userId))
      .limit(1);

    const values = {
      enabled: body.enabled ?? existing?.enabled ?? true,
      typeSettings: body.types ?? existing?.typeSettings,
      quietHoursEnabled: body.quietHours?.enabled ?? existing?.quietHoursEnabled ?? true,
      quietHoursStart: body.quietHours?.start ?? existing?.quietHoursStart ?? "22:00",
      quietHoursEnd: body.quietHours?.end ?? existing?.quietHoursEnd ?? "07:00",
      timezone: body.quietHours?.timezone ?? existing?.timezone ?? "UTC",
      maxPerHour: body.frequency?.maxPerHour ?? existing?.maxPerHour ?? 5,
      maxPerDay: body.frequency?.maxPerDay ?? existing?.maxPerDay ?? 20,
      updatedAt: new Date(),
    };

    if (existing) {
      await db
        .update(notificationPreferences)
        .set(values)
        .where(eq(notificationPreferences.userId, userId));
    } else {
      await db.insert(notificationPreferences).values({
        userId,
        ...values,
      });
    }

    return c.json({ success: true });
  }
);

// ============================================================================
// DEVICE REGISTRATION
// ============================================================================

const registerDeviceSchema = z.object({
  deviceToken: z.string().min(10),
  platform: z.enum(["ios", "android", "web"]),
});

// Register a device for push notifications
notificationsRoutes.post(
  "/devices/:userId",
  zValidator("json", registerDeviceSchema),
  async (c) => {
    const userId = c.req.param("userId");
    const { deviceToken, platform } = c.req.valid("json");

    await notificationService.registerDevice(userId, deviceToken, platform);

    return c.json({ success: true }, 201);
  }
);

// Unregister a device
notificationsRoutes.delete("/devices/:deviceToken", async (c) => {
  const deviceToken = c.req.param("deviceToken");

  await notificationService.unregisterDevice(deviceToken);

  return c.json({ success: true });
});

// List user's registered devices
notificationsRoutes.get("/devices/:userId", async (c) => {
  const userId = c.req.param("userId");

  const userDevices = await db
    .select({
      id: devices.id,
      platform: devices.platform,
      createdAt: devices.createdAt,
    })
    .from(devices)
    .where(eq(devices.userId, userId));

  return c.json({ data: userDevices });
});

// ============================================================================
// NOTIFICATION HISTORY
// ============================================================================

const historyQuerySchema = z.object({
  limit: z.coerce.number().min(1).max(100).default(50),
});

notificationsRoutes.get(
  "/history/:userId",
  zValidator("query", historyQuerySchema),
  async (c) => {
    const userId = c.req.param("userId");
    const { limit } = c.req.valid("query");

    const history = await db
      .select()
      .from(notificationLogs)
      .where(eq(notificationLogs.userId, userId))
      .orderBy(desc(notificationLogs.sentAt))
      .limit(limit);

    return c.json({ data: history });
  }
);

// ============================================================================
// TEST NOTIFICATION (development only)
// ============================================================================

notificationsRoutes.post("/test/:userId", async (c) => {
  const userId = c.req.param("userId");

  const result = await notificationService.sendToUser(userId, {
    type: "daily_digest",
    title: "Test Notification",
    body: "This is a test notification from Flynn AAC",
    priority: "normal",
  });

  return c.json(result);
});
