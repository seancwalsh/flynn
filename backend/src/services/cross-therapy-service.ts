/**
 * Cross-Therapy Coordination Service
 * 
 * Links goals across therapy disciplines and detects correlations.
 * 
 * FLY-103: Cross-therapy goal linking
 */

import { db } from "../db";
import {
  goals,
  goalLinks,
  goalProgress,
  therapySessions,
  dailyMetrics,
  insights,
  children,
  type Goal,
  type GoalLink,
} from "../db/schema";
import { eq, and, gte, lt, desc, inArray, sql } from "drizzle-orm";
import { logger } from "../utils/logger";

// ============================================================================
// TYPES
// ============================================================================

export type TherapyType = "aac" | "aba" | "ot" | "slp" | "pt" | "other";

export type RelationshipType = "supports" | "conflicts" | "prerequisite" | "related";

export interface GoalWithLinks extends Goal {
  linkedGoals: Array<{
    goal: Goal;
    relationship: RelationshipType;
    notes?: string;
  }>;
}

export interface TherapyCorrelation {
  therapyType1: TherapyType;
  therapyType2: TherapyType;
  correlationType: "positive" | "negative" | "none";
  strength: number; // 0-1
  description: string;
  recommendation?: string;
}

export interface ConflictAlert {
  goal1: Goal;
  goal2: Goal;
  conflictType: string;
  description: string;
  recommendation: string;
}

// ============================================================================
// GOAL MANAGEMENT
// ============================================================================

/**
 * Get all goals for a child with their cross-therapy links
 */
export async function getGoalsWithLinks(childId: string): Promise<GoalWithLinks[]> {
  // Get all goals for the child
  const childGoals = await db
    .select()
    .from(goals)
    .where(eq(goals.childId, childId))
    .orderBy(goals.therapyType, goals.createdAt);

  if (childGoals.length === 0) return [];

  // Get all links for these goals
  const goalIds = childGoals.map(g => g.id);
  const links = await db
    .select()
    .from(goalLinks)
    .where(inArray(goalLinks.goalId, goalIds));

  // Build the linked goals map
  const goalsMap = new Map(childGoals.map(g => [g.id, g]));
  
  return childGoals.map(goal => {
    const linkedGoals = links
      .filter(link => link.goalId === goal.id)
      .map(link => ({
        goal: goalsMap.get(link.linkedGoalId)!,
        relationship: link.relationshipType as RelationshipType,
        notes: link.notes || undefined,
      }))
      .filter(lg => lg.goal); // Filter out any missing linked goals

    return {
      ...goal,
      linkedGoals,
    };
  });
}

/**
 * Create a link between two goals
 */
export async function linkGoals(
  goalId: string,
  linkedGoalId: string,
  relationshipType: RelationshipType,
  notes?: string,
  createdBy?: string
): Promise<GoalLink> {
  const [link] = await db
    .insert(goalLinks)
    .values({
      goalId,
      linkedGoalId,
      relationshipType,
      notes,
      createdBy,
    })
    .returning();

  // Create reverse link for bidirectional relationships
  if (relationshipType === "related" || relationshipType === "conflicts") {
    await db.insert(goalLinks).values({
      goalId: linkedGoalId,
      linkedGoalId: goalId,
      relationshipType,
      notes,
      createdBy,
    });
  }

  logger.info(`Linked goals ${goalId} <-> ${linkedGoalId} as ${relationshipType}`);

  return link;
}

/**
 * Get goals grouped by therapy type
 */
export async function getGoalsByTherapy(childId: string): Promise<Record<TherapyType, Goal[]>> {
  const childGoals = await db
    .select()
    .from(goals)
    .where(and(eq(goals.childId, childId), eq(goals.status, "active")));

  const grouped: Record<string, Goal[]> = {};
  
  childGoals.forEach(goal => {
    if (!grouped[goal.therapyType]) {
      grouped[goal.therapyType] = [];
    }
    grouped[goal.therapyType].push(goal);
  });

  return grouped as Record<TherapyType, Goal[]>;
}

// ============================================================================
// CORRELATION DETECTION
// ============================================================================

/**
 * Detect correlations between therapy progress and AAC metrics
 */
export async function detectTherapyCorrelations(
  childId: string
): Promise<TherapyCorrelation[]> {
  const correlations: TherapyCorrelation[] = [];
  
  // Get therapy sessions in last 30 days
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  
  const sessions = await db
    .select()
    .from(therapySessions)
    .where(
      and(
        eq(therapySessions.childId, childId),
        gte(therapySessions.sessionDate, thirtyDaysAgo.toISOString().split('T')[0])
      )
    )
    .orderBy(therapySessions.sessionDate);

  // Get daily metrics for the same period
  const metrics = await db
    .select()
    .from(dailyMetrics)
    .where(
      and(
        eq(dailyMetrics.childId, childId),
        gte(dailyMetrics.date, thirtyDaysAgo.toISOString().split('T')[0])
      )
    )
    .orderBy(dailyMetrics.date);

  if (sessions.length < 3 || metrics.length < 7) {
    return correlations;
  }

  // Analyze OT sessions impact on AAC accuracy/usage
  const otSessions = sessions.filter(s => s.therapyType === "ot");
  if (otSessions.length >= 2) {
    const correlation = analyzeSessionImpact(otSessions, metrics, "ot");
    if (correlation) {
      correlations.push(correlation);
    }
  }

  // Analyze SLP sessions impact on vocabulary
  const slpSessions = sessions.filter(s => s.therapyType === "slp");
  if (slpSessions.length >= 2) {
    const correlation = analyzeSessionImpact(slpSessions, metrics, "slp");
    if (correlation) {
      correlations.push(correlation);
    }
  }

  // Analyze ABA sessions impact on usage consistency
  const abaSessions = sessions.filter(s => s.therapyType === "aba");
  if (abaSessions.length >= 2) {
    const correlation = analyzeSessionImpact(abaSessions, metrics, "aba");
    if (correlation) {
      correlations.push(correlation);
    }
  }

  return correlations;
}

/**
 * Analyze the impact of therapy sessions on AAC metrics
 */
function analyzeSessionImpact(
  sessions: typeof therapySessions.$inferSelect[],
  metrics: typeof dailyMetrics.$inferSelect[],
  therapyType: TherapyType
): TherapyCorrelation | null {
  // Simple correlation: compare metrics on days with sessions vs without
  const sessionDates = new Set(sessions.map(s => s.sessionDate));
  
  const metricsWithSession = metrics.filter(m => sessionDates.has(m.date));
  const metricsWithoutSession = metrics.filter(m => !sessionDates.has(m.date));

  if (metricsWithSession.length < 2 || metricsWithoutSession.length < 2) {
    return null;
  }

  // Calculate average taps on session days vs non-session days
  const avgWithSession = metricsWithSession.reduce((sum, m) => sum + (m.totalTaps || 0), 0) / metricsWithSession.length;
  const avgWithoutSession = metricsWithoutSession.reduce((sum, m) => sum + (m.totalTaps || 0), 0) / metricsWithoutSession.length;

  if (avgWithoutSession === 0) return null;

  const percentDiff = ((avgWithSession - avgWithoutSession) / avgWithoutSession) * 100;
  const strength = Math.min(1, Math.abs(percentDiff) / 50);

  // Only report meaningful correlations
  if (Math.abs(percentDiff) < 10) return null;

  const isPositive = percentDiff > 0;
  const therapyName = therapyType.toUpperCase();

  return {
    therapyType1: therapyType,
    therapyType2: "aac",
    correlationType: isPositive ? "positive" : "negative",
    strength,
    description: isPositive
      ? `AAC usage is ${percentDiff.toFixed(0)}% higher on ${therapyName} session days`
      : `AAC usage is ${Math.abs(percentDiff).toFixed(0)}% lower on ${therapyName} session days`,
    recommendation: isPositive
      ? `${therapyName} sessions seem to boost AAC engagement. Consider this when scheduling.`
      : `Consider incorporating AAC practice into ${therapyName} sessions to maintain engagement.`,
  };
}

// ============================================================================
// CONFLICT DETECTION
// ============================================================================

/**
 * Detect potential conflicts between goals across therapies
 */
export async function detectGoalConflicts(childId: string): Promise<ConflictAlert[]> {
  const conflicts: ConflictAlert[] = [];
  
  const activeGoals = await db
    .select()
    .from(goals)
    .where(and(eq(goals.childId, childId), eq(goals.status, "active")));

  // Check for common conflict patterns
  for (let i = 0; i < activeGoals.length; i++) {
    for (let j = i + 1; j < activeGoals.length; j++) {
      const goal1 = activeGoals[i];
      const goal2 = activeGoals[j];

      // Different therapies, check for conflicts
      if (goal1.therapyType !== goal2.therapyType) {
        const conflict = checkForConflict(goal1, goal2);
        if (conflict) {
          conflicts.push(conflict);
        }
      }
    }
  }

  return conflicts;
}

/**
 * Check if two goals might conflict
 */
function checkForConflict(goal1: Goal, goal2: Goal): ConflictAlert | null {
  const title1 = goal1.title.toLowerCase();
  const title2 = goal2.title.toLowerCase();
  const desc1 = (goal1.description || "").toLowerCase();
  const desc2 = (goal2.description || "").toLowerCase();

  // Check for pointing vs AAC device conflict
  if (
    (title1.includes("point") || desc1.includes("point")) &&
    (title2.includes("device") || title2.includes("aac") || desc2.includes("device"))
  ) {
    return {
      goal1,
      goal2,
      conflictType: "communication_method",
      description: `${goal1.therapyType.toUpperCase()} is working on pointing while ${goal2.therapyType.toUpperCase()} focuses on AAC device use. These approaches may compete for the child's attention.`,
      recommendation: "Discuss with both therapists to align on primary communication method during this phase, or clearly define when each method should be used.",
    };
  }

  // Check for motor skill conflicts
  if (
    (goal1.category === "motor" && goal2.category === "communication") ||
    (goal2.category === "motor" && goal1.category === "communication")
  ) {
    // No conflict for motor + communication - they often support each other
    return null;
  }

  return null;
}

// ============================================================================
// INSIGHTS GENERATION
// ============================================================================

/**
 * Generate cross-therapy insights for a child
 */
export async function generateCrossTherapyInsights(childId: string): Promise<number> {
  logger.info(`Generating cross-therapy insights for child ${childId}`);

  let insightsGenerated = 0;

  // Get correlations
  const correlations = await detectTherapyCorrelations(childId);
  
  for (const corr of correlations) {
    if (corr.strength >= 0.3) { // Only report meaningful correlations
      await db.insert(insights).values({
        childId,
        type: "suggestion",
        severity: "info",
        title: `${corr.therapyType1.toUpperCase()}-AAC Connection`,
        body: `${corr.description}\n\n**Suggestion:** ${corr.recommendation}`,
        content: {
          insightType: "therapy_correlation",
          correlation: corr,
        },
        generatedAt: new Date(),
      });
      insightsGenerated++;
    }
  }

  // Check for conflicts
  const conflicts = await detectGoalConflicts(childId);
  
  for (const conflict of conflicts) {
    await db.insert(insights).values({
      childId,
      type: "suggestion",
      severity: "warning",
      title: "Potential Goal Conflict Detected",
      body: `${conflict.description}\n\n**Recommendation:** ${conflict.recommendation}`,
      content: {
        insightType: "goal_conflict",
        conflict: {
          goal1Id: conflict.goal1.id,
          goal2Id: conflict.goal2.id,
          conflictType: conflict.conflictType,
        },
      },
      generatedAt: new Date(),
    });
    insightsGenerated++;
  }

  logger.info(`Generated ${insightsGenerated} cross-therapy insights for child ${childId}`);

  return insightsGenerated;
}

/**
 * Run cross-therapy analysis for all children
 */
export async function runCrossTherapyAnalysisJob(): Promise<{
  childrenProcessed: number;
  insightsGenerated: number;
}> {
  logger.info("Starting cross-therapy analysis job");

  const allChildren = await db.select({ id: children.id }).from(children);
  let totalInsights = 0;

  for (const child of allChildren) {
    try {
      const count = await generateCrossTherapyInsights(child.id);
      totalInsights += count;
    } catch (error) {
      logger.error(`Cross-therapy analysis failed for child ${child.id}:`, error);
    }
  }

  logger.info(`Cross-therapy analysis complete: ${allChildren.length} children, ${totalInsights} insights`);

  return {
    childrenProcessed: allChildren.length,
    insightsGenerated: totalInsights,
  };
}

// ============================================================================
// EXPORTS
// ============================================================================

export const crossTherapyService = {
  getGoalsWithLinks,
  linkGoals,
  getGoalsByTherapy,
  detectTherapyCorrelations,
  detectGoalConflicts,
  generateCrossTherapyInsights,
  runCrossTherapyAnalysisJob,
};
