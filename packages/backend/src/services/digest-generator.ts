/**
 * Daily Digest Generator Service
 * 
 * Uses Claude to generate human-readable daily summaries from metrics data.
 * 
 * FLY-100: AI-generated daily digest
 */

import { db } from "../db";
import {
  dailyMetrics,
  weeklyMetrics,
  anomalies,
  insights,
  children,
  type DailyMetric,
} from "../db/schema";
import { eq, and, gte, lt, desc } from "drizzle-orm";
import { ClaudeService } from "./claude";
import { logger } from "../utils/logger";

// ============================================================================
// TYPES
// ============================================================================

interface DigestData {
  childName: string;
  today: DailyMetric | null;
  yesterday: DailyMetric | null;
  weekAverage: WeeklyAverage | null;
  anomaliesToday: AnomalySummary[];
  newSymbols: string[];
}

interface WeeklyAverage {
  avgDailyTaps: number;
  avgUniqueSymbols: number;
  avgSessions: number;
}

interface AnomalySummary {
  type: string;
  severity: string;
  metricName: string;
  message: string;
}

interface DigestResult {
  title: string;
  body: string;
  data: DigestData;
}

// ============================================================================
// PROMPTS
// ============================================================================

const DAILY_DIGEST_SYSTEM_PROMPT = `You are an assistant helping parents track their child's AAC (Augmentative and Alternative Communication) progress.

Generate a brief, warm daily summary based on the provided metrics. 

Guidelines:
- Use the child's name naturally (provided in the data)
- Lead with celebration if there's positive news
- Keep it to 2-3 short paragraphs
- If there are concerns (anomalies), frame them constructively with actionable suggestions
- Use specific numbers from the data when relevant
- End with an encouraging note
- Use emojis sparingly but warmly (1-2 max)
- Address the caregiver directly (2nd person: "you", "your")

Do NOT:
- Make up data that wasn't provided
- Be overly clinical or technical
- Use jargon the parent wouldn't understand
- Be preachy or condescending

Respond with ONLY the summary text. No titles, headers, or metadata.`;

// ============================================================================
// DIGEST GENERATION
// ============================================================================

/**
 * Generate a daily digest for a child
 */
export async function generateDailyDigest(
  childId: string,
  date: Date,
  claudeService?: ClaudeService
): Promise<DigestResult> {
  const dateStr = date.toISOString().split('T')[0];
  logger.info(`Generating daily digest for child ${childId} on ${dateStr}`);

  // Gather all the data
  const data = await gatherDigestData(childId, date);

  // If no metrics for today, return a simple message
  if (!data.today || data.today.totalTaps === 0) {
    return {
      title: "Daily Summary",
      body: `No AAC activity recorded for ${data.childName} today. That's okay - every day is different! 💙`,
      data,
    };
  }

  // Use Claude to generate the summary
  const claude = claudeService || new ClaudeService();
  
  const userMessage = formatDataForClaude(data);

  try {
    const response = await claude.chat({
      model: "haiku", // Cost-effective for digests
      system: DAILY_DIGEST_SYSTEM_PROMPT,
      messages: [{ role: "user", content: userMessage }],
      maxTokens: 500,
      temperature: 0.7,
    });

    const body = response.content
      .filter((block) => block.type === "text")
      .map((block) => (block as { type: "text"; text: string }).text)
      .join("\n");

    // Generate a title based on the data
    const title = generateTitle(data);

    logger.info(`Generated digest for child ${childId}: ${body.length} chars`);

    return { title, body, data };
  } catch (error) {
    logger.error(`Failed to generate digest with Claude:`, error);
    // Fallback to rule-based summary
    return {
      title: "Daily Summary",
      body: generateFallbackSummary(data),
      data,
    };
  }
}

/**
 * Generate and save digest as an insight
 */
export async function generateAndSaveDigest(
  childId: string,
  date: Date,
  claudeService?: ClaudeService
): Promise<void> {
  const digest = await generateDailyDigest(childId, date, claudeService);

  await db.insert(insights).values({
    childId,
    type: "daily_digest",
    severity: digest.data.anomaliesToday.length > 0 ? "info" : null,
    title: digest.title,
    body: digest.body,
    content: {
      version: 1,
      generatedBy: "claude",
      date: date.toISOString().split('T')[0],
      metrics: {
        totalTaps: digest.data.today?.totalTaps || 0,
        uniqueSymbols: digest.data.today?.uniqueSymbols || 0,
        sessionCount: digest.data.today?.sessionCount || 0,
      },
      comparison: {
        vsYesterday: compareMetrics(digest.data.today, digest.data.yesterday),
        vsWeekAvg: digest.data.weekAverage ? {
          tapsPercent: digest.data.today?.totalTaps && digest.data.weekAverage.avgDailyTaps
            ? ((digest.data.today.totalTaps - digest.data.weekAverage.avgDailyTaps) / digest.data.weekAverage.avgDailyTaps * 100).toFixed(1)
            : null,
        } : null,
      },
      anomalies: digest.data.anomaliesToday,
      newSymbols: digest.data.newSymbols,
    },
    generatedAt: new Date(),
  });

  logger.info(`Saved daily digest for child ${childId}`);
}

/**
 * Run digest generation for all children
 */
export async function runDigestGenerationJob(
  date?: Date,
  claudeService?: ClaudeService
): Promise<{ generated: number; skipped: number; failed: number }> {
  const targetDate = date || new Date(Date.now() - 24 * 60 * 60 * 1000); // Yesterday

  logger.info(`Starting digest generation for ${targetDate.toISOString().split('T')[0]}`);

  const allChildren = await db.select({ id: children.id }).from(children);
  
  let generated = 0;
  let skipped = 0;
  let failed = 0;

  for (const child of allChildren) {
    try {
      // Check if we already have a digest for this date
      const dateStr = targetDate.toISOString().split('T')[0];
      const existing = await db
        .select()
        .from(insights)
        .where(
          and(
            eq(insights.childId, child.id),
            eq(insights.type, "daily_digest"),
            gte(insights.generatedAt, new Date(dateStr)),
            lt(insights.generatedAt, new Date(new Date(dateStr).getTime() + 24 * 60 * 60 * 1000))
          )
        )
        .limit(1);

      if (existing.length > 0) {
        logger.info(`Digest already exists for child ${child.id} on ${dateStr}`);
        skipped++;
        continue;
      }

      await generateAndSaveDigest(child.id, targetDate, claudeService);
      generated++;
    } catch (error) {
      logger.error(`Failed to generate digest for child ${child.id}:`, error);
      failed++;
    }
  }

  logger.info(`Digest generation complete: ${generated} generated, ${skipped} skipped, ${failed} failed`);

  return { generated, skipped, failed };
}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Gather all data needed for digest generation
 */
async function gatherDigestData(childId: string, date: Date): Promise<DigestData> {
  const dateStr = date.toISOString().split('T')[0];
  const yesterdayStr = new Date(date.getTime() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  // Get child name
  const [child] = await db
    .select({ name: children.name })
    .from(children)
    .where(eq(children.id, childId))
    .limit(1);

  const childName = child?.name || "your child";

  // Get today's metrics
  const [today] = await db
    .select()
    .from(dailyMetrics)
    .where(and(eq(dailyMetrics.childId, childId), eq(dailyMetrics.date, dateStr)))
    .limit(1);

  // Get yesterday's metrics
  const [yesterday] = await db
    .select()
    .from(dailyMetrics)
    .where(and(eq(dailyMetrics.childId, childId), eq(dailyMetrics.date, yesterdayStr)))
    .limit(1);

  // Get weekly average (most recent week)
  const [latestWeek] = await db
    .select()
    .from(weeklyMetrics)
    .where(eq(weeklyMetrics.childId, childId))
    .orderBy(desc(weeklyMetrics.weekStart))
    .limit(1);

  const weekAverage: WeeklyAverage | null = latestWeek
    ? {
        avgDailyTaps: parseFloat(latestWeek.avgDailyTaps || "0"),
        avgUniqueSymbols: latestWeek.totalUniqueSymbols / Math.max(1, latestWeek.activeDays),
        avgSessions: parseFloat(latestWeek.avgSessionsPerDay || "0"),
      }
    : null;

  // Get today's anomalies
  const todayAnomalies = await db
    .select()
    .from(anomalies)
    .where(
      and(
        eq(anomalies.childId, childId),
        eq(anomalies.detectedForDate, dateStr)
      )
    );

  const anomaliesToday: AnomalySummary[] = todayAnomalies.map((a) => ({
    type: a.type,
    severity: a.severity,
    metricName: a.metricName,
    message: formatAnomalyMessage(a),
  }));

  // Get new symbols used today
  const newSymbols = (today?.newSymbolsUsed as string[]) || [];

  return {
    childName,
    today: today || null,
    yesterday: yesterday || null,
    weekAverage,
    anomaliesToday,
    newSymbols,
  };
}

/**
 * Format data for Claude prompt
 */
function formatDataForClaude(data: DigestData): string {
  const parts: string[] = [];

  parts.push(`Child's name: ${data.childName}`);
  parts.push("");

  if (data.today) {
    parts.push("TODAY'S METRICS:");
    parts.push(`- Total AAC taps: ${data.today.totalTaps}`);
    parts.push(`- Unique symbols used: ${data.today.uniqueSymbols}`);
    parts.push(`- Number of sessions: ${data.today.sessionCount}`);
    if (data.today.topSymbols) {
      const top = data.today.topSymbols as Array<{ symbolId: string; count: number }>;
      if (top.length > 0) {
        parts.push(`- Top symbols: ${top.slice(0, 5).map(s => `"${s.symbolId}" (${s.count}x)`).join(", ")}`);
      }
    }
    parts.push("");
  }

  if (data.yesterday) {
    parts.push("YESTERDAY'S METRICS (for comparison):");
    parts.push(`- Total taps: ${data.yesterday.totalTaps}`);
    parts.push(`- Unique symbols: ${data.yesterday.uniqueSymbols}`);
    parts.push("");
  }

  if (data.weekAverage) {
    parts.push("WEEKLY AVERAGE:");
    parts.push(`- Daily taps average: ${data.weekAverage.avgDailyTaps.toFixed(1)}`);
    parts.push(`- Daily unique symbols average: ${data.weekAverage.avgUniqueSymbols.toFixed(1)}`);
    parts.push("");
  }

  if (data.newSymbols.length > 0) {
    parts.push(`NEW SYMBOLS USED TODAY: ${data.newSymbols.slice(0, 10).join(", ")}`);
    parts.push("");
  }

  if (data.anomaliesToday.length > 0) {
    parts.push("CONCERNS TO ADDRESS:");
    data.anomaliesToday.forEach((a) => {
      parts.push(`- ${a.message}`);
    });
    parts.push("");
  }

  return parts.join("\n");
}

/**
 * Generate title based on data
 */
function generateTitle(data: DigestData): string {
  if (data.anomaliesToday.some((a) => a.severity === "critical")) {
    return "Daily Summary - Needs Attention";
  }
  if (data.newSymbols.length > 0) {
    return "Daily Summary - New Words! 🎉";
  }
  if (data.today && data.yesterday && data.today.totalTaps > data.yesterday.totalTaps * 1.2) {
    return "Daily Summary - Great Progress!";
  }
  return "Daily Summary";
}

/**
 * Format anomaly into human-readable message
 */
function formatAnomalyMessage(anomaly: typeof anomalies.$inferSelect): string {
  const severity = anomaly.severity === "critical" ? "⚠️ " : "";
  
  switch (anomaly.type) {
    case "usage_drop":
      return `${severity}AAC usage was lower than usual (${anomaly.actualValue} vs expected ${parseFloat(anomaly.expectedValue).toFixed(0)})`;
    case "vocabulary_regression":
      return `${severity}Fewer unique words used than usual (${anomaly.actualValue} vs expected ${parseFloat(anomaly.expectedValue).toFixed(0)})`;
    case "session_drop":
      return `${severity}Fewer AAC sessions than usual`;
    default:
      return `${severity}${anomaly.type.replace(/_/g, " ")}`;
  }
}

/**
 * Compare two days of metrics
 */
function compareMetrics(today: DailyMetric | null, yesterday: DailyMetric | null): Record<string, number | null> {
  if (!today || !yesterday) return {};

  const tapsChange = yesterday.totalTaps
    ? ((today.totalTaps - yesterday.totalTaps) / yesterday.totalTaps) * 100
    : null;

  const symbolsChange = yesterday.uniqueSymbols
    ? ((today.uniqueSymbols - yesterday.uniqueSymbols) / yesterday.uniqueSymbols) * 100
    : null;

  return {
    tapsPercent: tapsChange ? Math.round(tapsChange) : null,
    symbolsPercent: symbolsChange ? Math.round(symbolsChange) : null,
  };
}

/**
 * Generate a simple rule-based summary as fallback
 */
function generateFallbackSummary(data: DigestData): string {
  const parts: string[] = [];

  if (data.today) {
    parts.push(
      `${data.childName} had ${data.today.totalTaps} AAC taps across ${data.today.sessionCount} sessions today, ` +
      `using ${data.today.uniqueSymbols} different symbols.`
    );

    if (data.yesterday) {
      const tapsDiff = data.today.totalTaps - data.yesterday.totalTaps;
      if (tapsDiff > 5) {
        parts.push(`That's ${tapsDiff} more taps than yesterday - great progress! 🎉`);
      } else if (tapsDiff < -5) {
        parts.push(`That's ${Math.abs(tapsDiff)} fewer taps than yesterday, but every day is different.`);
      }
    }

    if (data.newSymbols.length > 0) {
      parts.push(`New words used: ${data.newSymbols.slice(0, 5).join(", ")}.`);
    }
  }

  if (data.anomaliesToday.length > 0) {
    parts.push("\n" + data.anomaliesToday.map((a) => a.message).join(" "));
  }

  parts.push("\nKeep up the great work! 💙");

  return parts.join(" ");
}

// ============================================================================
// EXPORTS
// ============================================================================

export const digestGenerator = {
  generateDailyDigest,
  generateAndSaveDigest,
  runDigestGenerationJob,
};
