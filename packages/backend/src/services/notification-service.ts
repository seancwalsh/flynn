/**
 * Notification Service
 * 
 * Manages push notifications to caregivers. Supports multiple providers
 * (Expo, Firebase, APNs) with preference management and quiet hours.
 * 
 * FLY-101: Push notification integration
 */

import { db } from "../db";
import { devices, users, notificationPreferences, notificationLogs, children, caregivers } from "../db/schema";
import { eq, and, inArray } from "drizzle-orm";
import { logger } from "../utils/logger";

// ============================================================================
// TYPES
// ============================================================================

export type NotificationType =
  | "daily_digest"
  | "weekly_report"
  | "anomaly_warning"
  | "anomaly_critical"
  | "milestone"
  | "reminder";

export type NotificationPriority = "low" | "normal" | "high" | "critical";

export interface NotificationPayload {
  type: NotificationType;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  priority?: NotificationPriority;
  badge?: number;
  sound?: string;
  childId?: string;
  insightId?: string;
}

export interface NotificationPreferences {
  enabled: boolean;
  types: {
    [K in NotificationType]?: boolean;
  };
  quietHours?: {
    enabled: boolean;
    start: string; // "22:00"
    end: string; // "07:00"
    timezone: string;
  };
  frequency?: {
    maxPerHour?: number;
    maxPerDay?: number;
  };
}

export interface SendResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export interface NotificationProvider {
  name: string;
  send(token: string, payload: NotificationPayload): Promise<SendResult>;
  sendBatch(tokens: string[], payload: NotificationPayload): Promise<SendResult[]>;
}

// ============================================================================
// NOTIFICATION LOG
// ============================================================================

interface NotificationLogEntry {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  sentAt: Date;
  success: boolean;
  error?: string;
}

// In-memory log for now (would be a table in production)
const notificationLog: NotificationLogEntry[] = [];

// ============================================================================
// DEFAULT PREFERENCES
// ============================================================================

export const DEFAULT_PREFERENCES: NotificationPreferences = {
  enabled: true,
  types: {
    daily_digest: true,
    weekly_report: true,
    anomaly_warning: true,
    anomaly_critical: true,
    milestone: true,
    reminder: true,
  },
  quietHours: {
    enabled: true,
    start: "22:00",
    end: "07:00",
    timezone: "Europe/Sofia", // Sean's timezone
  },
  frequency: {
    maxPerHour: 5,
    maxPerDay: 20,
  },
};

// ============================================================================
// MOCK PROVIDER (for development)
// ============================================================================

class MockNotificationProvider implements NotificationProvider {
  name = "mock";

  async send(token: string, payload: NotificationPayload): Promise<SendResult> {
    logger.info(`[MOCK] Push notification to ${token.slice(0, 10)}...`, {
      title: payload.title,
      body: payload.body.slice(0, 50),
    });
    return { success: true, messageId: `mock-${Date.now()}` };
  }

  async sendBatch(tokens: string[], payload: NotificationPayload): Promise<SendResult[]> {
    return Promise.all(tokens.map((token) => this.send(token, payload)));
  }
}

// ============================================================================
// APNs PROVIDER (placeholder - needs Apple Push Notification credentials)
// ============================================================================
// 
// The iOS app is native Swift, so we use APNs (not Expo).
// Blocked on: FLY-108 - APNs push setup (Team ID, Key ID, auth key from Apple Developer)
// 
// Implementation options:
// 1. Use @parse/node-apn (HTTP/2 based)
// 2. Use firebase-admin with FCM for iOS
// 3. Direct HTTP/2 to APNs

class ApnsNotificationProvider implements NotificationProvider {
  name = "apns";

  async send(token: string, payload: NotificationPayload): Promise<SendResult> {
    // Blocked on FLY-108: APNs credentials needed
    // Once available, implement with @parse/node-apn:
    //
    // const apn = require('@parse/node-apn');
    // const provider = new apn.Provider({
    //   token: {
    //     key: process.env.APNS_KEY_PATH,
    //     keyId: process.env.APNS_KEY_ID,
    //     teamId: process.env.APNS_TEAM_ID,
    //   },
    //   production: process.env.NODE_ENV === 'production',
    // });
    // const notification = new apn.Notification();
    // notification.alert = { title: payload.title, body: payload.body };
    // notification.badge = payload.badge;
    // notification.sound = payload.sound || 'default';
    // notification.payload = payload.data;
    // const result = await provider.send(notification, token);

    logger.warn(`APNs provider not implemented. Token: ${token.slice(0, 10)}...`);
    return { success: false, error: "APNs provider not implemented - awaiting FLY-108" };
  }

  async sendBatch(tokens: string[], payload: NotificationPayload): Promise<SendResult[]> {
    return Promise.all(tokens.map((token) => this.send(token, payload)));
  }
}

// ============================================================================
// NOTIFICATION SERVICE
// ============================================================================

class NotificationService {
  private provider: NotificationProvider;
  private preferences: Map<string, NotificationPreferences> = new Map();

  constructor(provider?: NotificationProvider) {
    // Use mock provider until APNs is configured (FLY-108)
    this.provider = provider || new MockNotificationProvider();
    logger.info(`Notification service initialized with ${this.provider.name} provider`);
  }

  /**
   * Send a notification to a user
   */
  async sendToUser(
    userId: string,
    payload: NotificationPayload
  ): Promise<{ sent: boolean; reason?: string }> {
    // Check preferences
    const prefs = await this.getPreferences(userId);
    
    if (!prefs.enabled) {
      return { sent: false, reason: "Notifications disabled" };
    }

    if (prefs.types[payload.type] === false) {
      return { sent: false, reason: `${payload.type} notifications disabled` };
    }

    // Check quiet hours (unless critical)
    if (payload.priority !== "critical" && this.isQuietHours(prefs)) {
      return { sent: false, reason: "Quiet hours active" };
    }

    // Get user's device tokens
    const userDevices = await db
      .select()
      .from(devices)
      .where(eq(devices.userId, userId));

    if (userDevices.length === 0) {
      return { sent: false, reason: "No registered devices" };
    }

    // Send to all devices
    let success = false;
    for (const device of userDevices) {
      const result = await this.provider.send(device.deviceToken, payload);
      if (result.success) {
        success = true;
      }

      // Log the notification to database
      await this.logNotification(userId, payload, result);
    }

    return { sent: success };
  }

  /**
   * Send notification to all caregivers of a child
   */
  async sendToChildCaregivers(
    childId: string,
    payload: NotificationPayload
  ): Promise<number> {
    // Get the child's family
    const child = await db.query.children.findFirst({
      where: eq(children.id, childId),
      columns: { familyId: true },
    });

    if (!child) {
      logger.warn(`Child not found: ${childId}`);
      return 0;
    }

    // Get all caregivers in this family
    const familyCaregivers = await db
      .select({ email: caregivers.email })
      .from(caregivers)
      .where(eq(caregivers.familyId, child.familyId));

    if (familyCaregivers.length === 0) {
      logger.info(`No caregivers found for child ${childId}`);
      return 0;
    }

    // Find user IDs for these caregivers (by email)
    const caregiverEmails = familyCaregivers.map((c) => c.email);
    const caregiverUsers = await db
      .select({ id: users.id })
      .from(users)
      .where(inArray(users.email, caregiverEmails));

    // Send to each user
    let sentCount = 0;
    for (const user of caregiverUsers) {
      const result = await this.sendToUser(user.id, { ...payload, childId });
      if (result.sent) {
        sentCount++;
      }
    }

    logger.info(`Sent notification to ${sentCount} caregivers for child ${childId}`);
    return sentCount;
  }

  /**
   * Send daily digest notification
   */
  async sendDigestNotification(
    userId: string,
    childName: string,
    insightId: string
  ): Promise<{ sent: boolean; reason?: string }> {
    return this.sendToUser(userId, {
      type: "daily_digest",
      title: `${childName}'s Daily Summary`,
      body: "Tap to see today's AAC progress",
      priority: "normal",
      data: { insightId },
      insightId,
    });
  }

  /**
   * Send anomaly alert notification
   */
  async sendAnomalyNotification(
    userId: string,
    childName: string,
    severity: "warning" | "critical",
    message: string,
    insightId?: string
  ): Promise<{ sent: boolean; reason?: string }> {
    const type = severity === "critical" ? "anomaly_critical" : "anomaly_warning";
    const priority = severity === "critical" ? "critical" : "high";

    return this.sendToUser(userId, {
      type,
      title: severity === "critical" 
        ? `⚠️ ${childName}: Needs Attention`
        : `${childName}: Something to Watch`,
      body: message,
      priority,
      sound: severity === "critical" ? "alert" : "default",
      data: { insightId },
      insightId,
    });
  }

  /**
   * Send milestone notification
   */
  async sendMilestoneNotification(
    userId: string,
    childName: string,
    milestone: string,
    insightId?: string
  ): Promise<{ sent: boolean; reason?: string }> {
    return this.sendToUser(userId, {
      type: "milestone",
      title: `🎉 ${childName} reached a milestone!`,
      body: milestone,
      priority: "normal",
      data: { insightId },
      insightId,
    });
  }

  /**
   * Get user's notification preferences
   */
  async getPreferences(userId: string): Promise<NotificationPreferences> {
    // Check cache first
    if (this.preferences.has(userId)) {
      return this.preferences.get(userId)!;
    }

    // Load from database
    const [prefs] = await db
      .select()
      .from(notificationPreferences)
      .where(eq(notificationPreferences.userId, userId))
      .limit(1);

    if (!prefs) {
      // Return defaults if not set
      return DEFAULT_PREFERENCES;
    }

    // Convert DB format to service format
    const result: NotificationPreferences = {
      enabled: prefs.enabled,
      types: (prefs.typeSettings as Record<string, boolean>) || DEFAULT_PREFERENCES.types,
      quietHours: {
        enabled: prefs.quietHoursEnabled ?? true,
        start: prefs.quietHoursStart ?? "22:00",
        end: prefs.quietHoursEnd ?? "07:00",
        timezone: prefs.timezone ?? "UTC",
      },
      frequency: {
        maxPerHour: prefs.maxPerHour ?? 5,
        maxPerDay: prefs.maxPerDay ?? 20,
      },
    };

    // Cache for future requests
    this.preferences.set(userId, result);
    return result;
  }

  /**
   * Update user's notification preferences
   */
  async updatePreferences(
    userId: string,
    updates: Partial<NotificationPreferences>
  ): Promise<NotificationPreferences> {
    const current = await this.getPreferences(userId);
    const updated = { ...current, ...updates };
    
    // Prepare database values
    const dbValues = {
      enabled: updated.enabled,
      typeSettings: updated.types,
      quietHoursEnabled: updated.quietHours?.enabled ?? true,
      quietHoursStart: updated.quietHours?.start ?? "22:00",
      quietHoursEnd: updated.quietHours?.end ?? "07:00",
      timezone: updated.quietHours?.timezone ?? "UTC",
      maxPerHour: updated.frequency?.maxPerHour ?? 5,
      maxPerDay: updated.frequency?.maxPerDay ?? 20,
      updatedAt: new Date(),
    };

    // Check if preferences exist
    const [existing] = await db
      .select()
      .from(notificationPreferences)
      .where(eq(notificationPreferences.userId, userId))
      .limit(1);

    if (existing) {
      // Update existing
      await db
        .update(notificationPreferences)
        .set(dbValues)
        .where(eq(notificationPreferences.userId, userId));
    } else {
      // Insert new
      await db.insert(notificationPreferences).values({
        userId,
        ...dbValues,
      });
    }
    
    // Update cache
    this.preferences.set(userId, updated);
    
    return updated;
  }

  /**
   * Check if it's currently quiet hours for user
   */
  private isQuietHours(prefs: NotificationPreferences): boolean {
    if (!prefs.quietHours?.enabled) return false;

    // Get current time in user's timezone
    const timezone = prefs.quietHours.timezone || "UTC";
    let userTime: Date;
    
    try {
      // Format current time in user's timezone
      const now = new Date();
      const formatter = new Intl.DateTimeFormat("en-US", {
        timeZone: timezone,
        hour: "numeric",
        minute: "numeric",
        hour12: false,
      });
      const parts = formatter.formatToParts(now);
      const hourPart = parts.find((p) => p.type === "hour");
      const minutePart = parts.find((p) => p.type === "minute");
      const currentHour = parseInt(hourPart?.value || "0", 10);
      const currentMinute = parseInt(minutePart?.value || "0", 10);
      const currentTime = currentHour * 60 + currentMinute;

      const [startHour, startMin] = prefs.quietHours.start.split(":").map(Number);
      const [endHour, endMin] = prefs.quietHours.end.split(":").map(Number);
      const startTime = (startHour || 0) * 60 + (startMin || 0);
      const endTime = (endHour || 0) * 60 + (endMin || 0);

      // Handle overnight quiet hours (e.g., 22:00 - 07:00)
      if (startTime > endTime) {
        return currentTime >= startTime || currentTime < endTime;
      }

      return currentTime >= startTime && currentTime < endTime;
    } catch (error) {
      // If timezone parsing fails, default to not quiet hours
      logger.warn(`Failed to parse timezone ${timezone}:`, error);
      return false;
    }
  }

  /**
   * Log notification for history (saves to database)
   */
  private async logNotification(
    userId: string,
    payload: NotificationPayload,
    result: SendResult
  ): Promise<void> {
    try {
      await db.insert(notificationLogs).values({
        userId,
        type: payload.type,
        title: payload.title,
        body: payload.body,
        success: result.success,
        error: result.error,
        messageId: result.messageId,
        insightId: payload.insightId,
        childId: payload.childId,
      });
    } catch (error) {
      // Log error but don't fail the notification
      logger.error("Failed to log notification", { error, userId, type: payload.type });
    }
  }

  /**
   * Get notification history for user
   */
  getHistory(userId: string, limit = 50): NotificationLogEntry[] {
    return notificationLog
      .filter((entry) => entry.userId === userId)
      .slice(-limit);
  }

  /**
   * Register a device token
   */
  async registerDevice(
    userId: string,
    deviceToken: string,
    platform: "ios" | "android" | "web"
  ): Promise<void> {
    // Check if device already registered
    const existing = await db
      .select()
      .from(devices)
      .where(
        and(
          eq(devices.userId, userId),
          eq(devices.deviceToken, deviceToken)
        )
      )
      .limit(1);

    if (existing.length === 0) {
      await db.insert(devices).values({
        userId,
        deviceToken,
        platform,
      });
      logger.info(`Registered device for user ${userId}: ${platform}`);
    }
  }

  /**
   * Unregister a device token
   */
  async unregisterDevice(deviceToken: string): Promise<void> {
    await db.delete(devices).where(eq(devices.deviceToken, deviceToken));
    logger.info(`Unregistered device: ${deviceToken.slice(0, 10)}...`);
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const notificationService = new NotificationService();

export { NotificationService, MockNotificationProvider, ApnsNotificationProvider };
