/**
 * get_child Tool
 * 
 * Get detailed information about a child including their profile,
 * settings, current goals, and associated therapists.
 */

import { z } from "zod/v4";
import { eq } from "drizzle-orm";
import { createReadOnlyTool } from "@/services/tool-executor";
import type { ToolContext } from "@/types/claude";
import { verifyChildAccess } from "../authorization";
import type { Child } from "@/db/schema";

// ============================================================================
// Types
// ============================================================================

export interface ChildProfile {
  id: string;
  name: string;
  birthDate: string | null;
  ageInMonths: number | null;
  familyId: string;
  createdAt: string;
  
  // Computed/related fields
  therapists: TherapistSummary[];
  activeGoalsCount: number;
  totalSymbolsUsed: number;
  
  // Settings (future - currently placeholder)
  settings: ChildSettings;
}

export interface TherapistSummary {
  id: string;
  name: string;
  email: string;
  assignedAt: string;
}

export interface ChildSettings {
  // Placeholder for future AAC settings
  preferredSymbolSet: string;
  voiceEnabled: boolean;
  gridSize: "small" | "medium" | "large";
}

// ============================================================================
// Input Schema
// ============================================================================

const inputSchema = z.object({
  childId: z.uuid("Invalid child ID format"),
});

type GetChildInput = z.infer<typeof inputSchema>;

// ============================================================================
// Tool Implementation
// ============================================================================

async function getChild(
  input: GetChildInput,
  context: ToolContext
): Promise<ChildProfile> {
  // Verify access first - this will throw if unauthorized
  await verifyChildAccess(input.childId, context);

  // Import db dynamically to avoid circular deps and for test injection
  const { db } = await import("@/db");
  const { children, therapists, therapistClients, usageLogs } = await import("@/db/schema");

  // Fetch the child with related data
  const child = await db.query.children.findFirst({
    where: eq(children.id, input.childId),
  }) as Child | undefined;

  if (!child) {
    // This shouldn't happen since verifyChildAccess checks existence
    throw new Error(`Child not found: ${input.childId}`);
  }

  // Fetch assigned therapists
  const assignments = await db
    .select({
      therapistId: therapistClients.therapistId,
      grantedAt: therapistClients.grantedAt,
      therapistName: therapists.name,
      therapistEmail: therapists.email,
    })
    .from(therapistClients)
    .innerJoin(therapists, eq(therapistClients.therapistId, therapists.id))
    .where(eq(therapistClients.childId, input.childId)) as Array<{
      therapistId: string;
      grantedAt: Date;
      therapistName: string;
      therapistEmail: string;
    }>;

  // Count active goals - TODO: Goals table doesn't exist yet
  const activeGoalsCount = 0;

  // Count unique symbols used
  const symbolUsage = await db
    .select({ symbolId: usageLogs.symbolId })
    .from(usageLogs)
    .where(eq(usageLogs.childId, input.childId))
    .groupBy(usageLogs.symbolId) as Array<{ symbolId: string }>;

  const totalSymbolsUsed = symbolUsage.length;

  // Calculate age in months
  let ageInMonths: number | null = null;
  if (child.birthDate) {
    const birthDate = new Date(child.birthDate);
    const today = new Date();
    ageInMonths = Math.floor(
      (today.getTime() - birthDate.getTime()) / (1000 * 60 * 60 * 24 * 30.44)
    );
  }

  return {
    id: child.id,
    name: child.name,
    birthDate: child.birthDate,
    ageInMonths,
    familyId: child.familyId,
    createdAt: child.createdAt.toISOString(),
    
    therapists: assignments.map((a) => ({
      id: a.therapistId,
      name: a.therapistName,
      email: a.therapistEmail,
      assignedAt: a.grantedAt.toISOString(),
    })),
    
    activeGoalsCount,
    totalSymbolsUsed,
    
    // Default settings (future: fetch from child_settings table)
    settings: {
      preferredSymbolSet: "pcs", // Picture Communication Symbols
      voiceEnabled: true,
      gridSize: "medium",
    },
  };
}

// ============================================================================
// Export
// ============================================================================

export const getChildTool = createReadOnlyTool(
  "get_child",
  "Get detailed information about a child including their profile, settings, assigned therapists, and summary statistics. Use this to understand a specific child's setup and current status.",
  inputSchema,
  getChild
);
