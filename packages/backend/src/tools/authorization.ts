/**
 * Authorization helpers for tools
 * 
 * Provides consistent authorization checks across all tools.
 * A user can access a child if:
 * - They are a caregiver in the child's family
 * - They are a therapist assigned to the child
 * - They are an admin (future)
 */

import { eq, and } from "drizzle-orm";
import type { ToolContext } from "@/types/claude";
import { UnauthorizedError, ChildNotFoundError, UserIdRequiredError } from "./errors";

/**
 * Get the database instance (lazy loaded to avoid circular deps)
 */
async function getDb() {
  const { db } = await import("@/db");
  return db;
}

/**
 * Verify that a user has access to a specific child
 * 
 * @param childId - The child's UUID
 * @param context - The tool execution context containing user info
 * @throws {UnauthorizedError} If the user doesn't have access
 * @throws {ChildNotFoundError} If the child doesn't exist
 * @throws {UserIdRequiredError} If no user ID is provided
 */
export async function verifyChildAccess(
  childId: string,
  context: ToolContext
): Promise<{ childId: string; familyId: string }> {
  if (!context.userId) {
    throw new UserIdRequiredError();
  }

  const db = await getDb();
  const { children, caregivers, therapistClients } = await import("@/db/schema");

  // First, verify the child exists and get the family ID
  const child = await db.query.children.findFirst({
    where: eq(children.id, childId),
    columns: { id: true, familyId: true },
  }) as { id: string; familyId: string } | null;

  if (!child) {
    throw new ChildNotFoundError(childId);
  }

  // Check if user is a caregiver in this family
  const caregiver = await db.query.caregivers.findFirst({
    where: and(
      eq(caregivers.familyId, child.familyId),
      eq(caregivers.email, context.userId) // Using email as user identifier for now
    ),
  });

  if (caregiver) {
    return { childId: child.id, familyId: child.familyId };
  }

  // Check if user is a therapist assigned to this child
  // We need to check the therapists table to see if the user's email matches
  const { therapists } = await import("@/db/schema");
  
  // First find if there's a therapist with this email
  const therapist = await db.query.therapists.findFirst({
    where: eq(therapists.email, context.userId),
    columns: { id: true },
  });

  if (therapist) {
    // Check if this therapist is assigned to the child
    const assignment = await db.query.therapistClients.findFirst({
      where: and(
        eq(therapistClients.therapistId, therapist.id),
        eq(therapistClients.childId, childId)
      ),
    });

    if (assignment) {
      return { childId: child.id, familyId: child.familyId };
    }
  }

  // If context already has the family ID and it matches, allow access
  // This handles cases where the user's family is pre-verified
  if (context.familyId && context.familyId === child.familyId) {
    return { childId: child.id, familyId: child.familyId };
  }

  throw new UnauthorizedError(`You don't have access to this child`);
}

/**
 * Get all children the user has access to
 * 
 * @param context - The tool execution context containing user info
 * @returns Array of child IDs the user can access
 */
export async function getAccessibleChildIds(context: ToolContext): Promise<string[]> {
  if (!context.userId) {
    throw new UserIdRequiredError();
  }

  const db = await getDb();
  const { children, caregivers } = await import("@/db/schema");

  const accessibleChildIds: string[] = [];

  // Get children from families where user is a caregiver
  const caregiverFamilies = await db.query.caregivers.findFirst({
    where: eq(caregivers.email, context.userId),
    columns: { familyId: true },
  }) as { familyId: string } | null;

  if (caregiverFamilies) {
    const familyChildren = await db
      .select({ id: children.id })
      .from(children)
      .where(eq(children.familyId, caregiverFamilies.familyId)) as { id: string }[];

    accessibleChildIds.push(...familyChildren.map((c) => c.id));
  }

  // Get children where user is an assigned therapist
  const { therapists, therapistClients } = await import("@/db/schema");
  
  const therapist = await db.query.therapists.findFirst({
    where: eq(therapists.email, context.userId),
    columns: { id: true },
  });

  if (therapist) {
    const assignedChildren = await db
      .select({ childId: therapistClients.childId })
      .from(therapistClients)
      .where(eq(therapistClients.therapistId, therapist.id)) as { childId: string }[];

    for (const assignment of assignedChildren) {
      if (!accessibleChildIds.includes(assignment.childId)) {
        accessibleChildIds.push(assignment.childId);
      }
    }
  }

  // Fallback: if familyId is in context, also include those children
  if (context.familyId) {
    const contextFamilyChildren = await db
      .select({ id: children.id })
      .from(children)
      .where(eq(children.familyId, context.familyId)) as { id: string }[];

    for (const child of contextFamilyChildren) {
      if (!accessibleChildIds.includes(child.id)) {
        accessibleChildIds.push(child.id);
      }
    }
  }

  return accessibleChildIds;
}

/**
 * Check if a user has access to a child without throwing
 * 
 * @returns true if the user has access, false otherwise
 */
export async function hasChildAccess(
  childId: string,
  context: ToolContext
): Promise<boolean> {
  try {
    await verifyChildAccess(childId, context);
    return true;
  } catch {
    return false;
  }
}
