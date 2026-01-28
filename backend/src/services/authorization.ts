/**
 * Authorization Service
 * 
 * Handles access control for resources based on user role and relationships.
 * 
 * Access Rules:
 * - Caregivers can access their family's children and data
 * - Therapists can access their assigned clients
 * - Admins can access everything
 */

import { db } from "../db";
import { caregivers, children, families, therapists, therapistClients, users } from "../db/schema";
import { eq, and } from "drizzle-orm";

export interface AuthContext {
  id: string;        // User's internal ID
  clerkId: string;   // Clerk user ID
  email: string;     // User's email
  role: string;      // caregiver, therapist, admin
}

/**
 * Get the family ID for a caregiver user
 */
export async function getFamilyIdForUser(userEmail: string): Promise<string | null> {
  const [caregiver] = await db
    .select({ familyId: caregivers.familyId })
    .from(caregivers)
    .where(eq(caregivers.email, userEmail))
    .limit(1);
  
  return caregiver?.familyId ?? null;
}

/**
 * Get assigned child IDs for a therapist user
 */
export async function getAssignedChildIdsForTherapist(userEmail: string): Promise<string[]> {
  const results = await db
    .select({ childId: therapistClients.childId })
    .from(therapistClients)
    .innerJoin(therapists, eq(therapistClients.therapistId, therapists.id))
    .where(eq(therapists.email, userEmail));
  
  return results.map(r => r.childId);
}

/**
 * Check if user can access a specific child
 */
export async function canAccessChild(user: AuthContext, childId: string): Promise<boolean> {
  // Admins can access everything
  if (user.role === "admin") {
    return true;
  }
  
  // Get the child's family ID
  const [child] = await db
    .select({ familyId: children.familyId })
    .from(children)
    .where(eq(children.id, childId))
    .limit(1);
  
  if (!child) {
    return false; // Child doesn't exist
  }
  
  // Caregivers: check if user is in the same family
  if (user.role === "caregiver") {
    const userFamilyId = await getFamilyIdForUser(user.email);
    return userFamilyId === child.familyId;
  }
  
  // Therapists: check if child is an assigned client
  if (user.role === "therapist") {
    const assignedChildIds = await getAssignedChildIdsForTherapist(user.email);
    return assignedChildIds.includes(childId);
  }
  
  return false;
}

/**
 * Check if user can access a specific family
 */
export async function canAccessFamily(user: AuthContext, familyId: string): Promise<boolean> {
  // Admins can access everything
  if (user.role === "admin") {
    return true;
  }
  
  // Caregivers: check if user belongs to this family
  if (user.role === "caregiver") {
    const userFamilyId = await getFamilyIdForUser(user.email);
    return userFamilyId === familyId;
  }
  
  // Therapists: check if they have any clients in this family
  if (user.role === "therapist") {
    const assignedChildIds = await getAssignedChildIdsForTherapist(user.email);
    
    if (assignedChildIds.length === 0) {
      return false;
    }
    
    // Check if any assigned child belongs to this family
    const [familyChild] = await db
      .select({ id: children.id })
      .from(children)
      .where(and(
        eq(children.familyId, familyId),
        // drizzle-orm doesn't have inArray directly, use manual check
      ))
      .limit(1);
    
    // Check manually if any assigned child is in this family
    const familyChildren = await db
      .select({ id: children.id })
      .from(children)
      .where(eq(children.familyId, familyId));
    
    const familyChildIds = familyChildren.map(c => c.id);
    return assignedChildIds.some(id => familyChildIds.includes(id));
  }
  
  return false;
}

/**
 * Check if user can access a conversation
 */
export async function canAccessConversation(user: AuthContext, conversationId: string): Promise<boolean> {
  // Admins can access everything
  if (user.role === "admin") {
    return true;
  }
  
  // Get conversation details
  const { conversations } = await import("../db/schema");
  const [conversation] = await db
    .select({
      caregiverId: conversations.caregiverId,
      childId: conversations.childId,
    })
    .from(conversations)
    .where(eq(conversations.id, conversationId))
    .limit(1);
  
  if (!conversation) {
    return false;
  }
  
  // Check if user's caregiver ID matches
  const [userCaregiver] = await db
    .select({ id: caregivers.id })
    .from(caregivers)
    .where(eq(caregivers.email, user.email))
    .limit(1);
  
  if (userCaregiver && userCaregiver.id === conversation.caregiverId) {
    return true;
  }
  
  // Therapists: check if conversation's child is assigned to them
  if (user.role === "therapist" && conversation.childId) {
    return await canAccessChild(user, conversation.childId);
  }
  
  return false;
}

/**
 * Get all child IDs the user can access
 */
export async function getAccessibleChildIds(user: AuthContext): Promise<string[]> {
  // Admins can access all children
  if (user.role === "admin") {
    const allChildren = await db.select({ id: children.id }).from(children);
    return allChildren.map(c => c.id);
  }
  
  // Caregivers: get all children in their family
  if (user.role === "caregiver") {
    const familyId = await getFamilyIdForUser(user.email);
    if (!familyId) {
      return [];
    }
    
    const familyChildren = await db
      .select({ id: children.id })
      .from(children)
      .where(eq(children.familyId, familyId));
    
    return familyChildren.map(c => c.id);
  }
  
  // Therapists: get assigned clients
  if (user.role === "therapist") {
    return await getAssignedChildIdsForTherapist(user.email);
  }
  
  return [];
}

/**
 * Get the user's family ID (for caregivers)
 */
export async function getUserFamilyId(user: AuthContext): Promise<string | null> {
  if (user.role === "caregiver") {
    return await getFamilyIdForUser(user.email);
  }
  return null;
}
