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
import { requireAdmin } from "../../../middleware/authorization";

export const notificationsRoutes = new Hono();

// ============================================================================
// PREFERENCES
// ============================================================================

// Get notification preferences (users can only access their own)
notificationsRoutes.get("/preferences/:userId", async (c) => {
  const userId = c.req.param("userId");
  const user = c.get("user");
  
  // Users can only access their own preferences (unless admin)
  if (user.role !== "admin" && user.id !== userId) {
    throw new AppError("You can only access your own notification preferences", 403, "FORBIDDEN");
  }
  
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
    const user = c.get("user");
    
    // Users can only update their own preferences (unless admin)
    if (user.role !== "admin" && user.id !== userId) {
      throw new AppError("You can only update your own notification preferences", 403, "FORBIDDEN");
    }

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

// Register a device for push notifications (users can only register for themselves)
notificationsRoutes.post(
  "/devices/:userId",
  zValidator("json", registerDeviceSchema),
  async (c) => {
    const userId = c.req.param("userId");
    const { deviceToken, platform } = c.req.valid("json");
    const user = c.get("user");
    
    // Users can only register devices for themselves (unless admin)
    if (user.role !== "admin" && user.id !== userId) {
      throw new AppError("You can only register devices for yourself", 403, "FORBIDDEN");
    }

    await notificationService.registerDevice(userId, deviceToken, platform);

    return c.json({ success: true }, 201);
  }
);

// Unregister a device (verify ownership via device lookup)
notificationsRoutes.delete("/devices/:deviceToken", async (c) => {
  const deviceToken = c.req.param("deviceToken");
  const user = c.get("user");
  
  // Look up device to verify ownership
  const [device] = await db
    .select()
    .from(devices)
    .where(eq(devices.deviceToken, deviceToken))
    .limit(1);
  
  if (device && user.role !== "admin" && device.userId !== user.id) {
    throw new AppError("You can only unregister your own devices", 403, "FORBIDDEN");
  }

  await notificationService.unregisterDevice(deviceToken);

  return c.json({ success: true });
});

// List user's registered devices
notificationsRoutes.get("/devices/:userId", async (c) => {
  const userId = c.req.param("userId");
  const user = c.get("user");
  
  // Users can only list their own devices (unless admin)
  if (user.role !== "admin" && user.id !== userId) {
    throw new AppError("You can only view your own devices", 403, "FORBIDDEN");
  }

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
    const user = c.get("user");
    
    // Users can only view their own history (unless admin)
    if (user.role !== "admin" && user.id !== userId) {
      throw new AppError("You can only view your own notification history", 403, "FORBIDDEN");
    }

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
// TEST NOTIFICATION (admin only)
// ============================================================================

notificationsRoutes.post("/test/:userId", requireAdmin(), async (c) => {
  const userId = c.req.param("userId");

  const result = await notificationService.sendToUser(userId, {
    type: "daily_digest",
    title: "Test Notification",
    body: "This is a test notification from Flynn AAC",
    priority: "normal",
  });

  return c.json(result);
});
