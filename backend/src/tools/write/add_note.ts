/**
 * add_note Tool
 *
 * Add a quick note without creating a full session.
 * Useful for capturing observations, milestones, or concerns.
 *
 * NOTE: The notes table doesn't exist yet. This implementation returns
 * mock data and is structured to work correctly once the table is created.
 *
 * TODO: Create notes table with schema:
 * - id: UUID
 * - childId: UUID (FK to children)
 * - authorId: UUID (FK to caregivers or therapists)
 * - type: enum('observation', 'milestone', 'concern', 'general')
 * - content: text
 * - createdAt: timestamp
 * - updatedAt: timestamp
 */

import { z } from "zod/v4";
import type { Tool, ToolContext, ToolResult } from "@/types/claude";
import { verifyChildAccess } from "../authorization";

// ============================================================================
// Types
// ============================================================================

export type NoteType = "observation" | "milestone" | "concern" | "general";

export interface CreatedNote {
  id: string;
  childId: string;
  authorId: string;
  type: NoteType;
  content: string;
  createdAt: string;
  updatedAt: string;
  _mock: boolean;
}

// ============================================================================
// Input Schema
// ============================================================================

const inputSchema = z.object({
  childId: z.uuid("Invalid child ID format"),
  content: z
    .string()
    .min(1, "Note content is required")
    .max(5000, "Note content cannot exceed 5,000 characters"),
  type: z
    .enum(["observation", "milestone", "concern", "general"])
    .optional()
    .default("general"),
});

type AddNoteInput = z.infer<typeof inputSchema>;

// ============================================================================
// Tool Implementation
// ============================================================================

async function addNote(
  input: AddNoteInput,
  context: ToolContext
): Promise<ToolResult> {
  // 1. Verify authorization
  await verifyChildAccess(input.childId, context);

  // 2. Validate content is not just whitespace
  const trimmedContent = input.content.trim();
  if (trimmedContent.length === 0) {
    return {
      success: false,
      error: "Note content cannot be empty or just whitespace",
    };
  }

  // TODO: Create note in database once table exists
  // const { db } = await import("@/db");
  // const { notes } = await import("@/db/schema");
  //
  // const [note] = await db.insert(notes).values({
  //   childId: input.childId,
  //   authorId: context.userId,
  //   type: input.type,
  //   content: trimmedContent,
  // }).returning();

  // Return mock data for MVP
  const now = new Date().toISOString();
  const mockNote: CreatedNote = {
    id: `note-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    childId: input.childId,
    authorId: context.userId,
    type: input.type ?? "general",
    content: trimmedContent,
    createdAt: now,
    updatedAt: now,
    _mock: true,
  };

  // Craft a contextual success message
  const typeLabel = {
    observation: "observation",
    milestone: "milestone",
    concern: "concern",
    general: "note",
  }[mockNote.type];

  return {
    success: true,
    data: {
      note: mockNote,
      message: `Successfully added ${typeLabel}`,
    },
  };
}

// ============================================================================
// Export
// ============================================================================

export const addNoteTool: Tool<AddNoteInput> = {
  name: "add_note",
  description:
    "Add a quick note about a child without creating a full therapy session. Use for observations, milestones, concerns, or general notes. Ideal for capturing moments, behavioral observations, or parent insights that don't fit into a formal session log.",
  inputSchema,
  execute: addNote,
};
