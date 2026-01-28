/**
 * add_note Tool
 *
 * Add a quick note without creating a full session.
 * Useful for capturing observations, milestones, or concerns.
 */

import { z } from "zod/v4";
import type { Tool, ToolContext, ToolResult } from "@/types/claude";
import { verifyChildAccess } from "../authorization";
import { db } from "../../db";
import { notes, users } from "../../db/schema";
import { eq } from "drizzle-orm";

// ============================================================================
// Types
// ============================================================================

export type NoteType = "observation" | "milestone" | "concern" | "general";

export interface CreatedNote {
  id: string;
  childId: string;
  authorId: string | null;
  type: NoteType;
  content: string;
  createdAt: string;
  updatedAt: string;
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

  // 3. Look up user ID from email (context.userId is email)
  let authorId: string | null = null;
  if (context.userId) {
    const user = await db.query.users.findFirst({
      where: eq(users.email, context.userId),
      columns: { id: true },
    });
    authorId = user?.id ?? null;
  }

  // 4. Create note in database
  const [note] = await db
    .insert(notes)
    .values({
      childId: input.childId,
      authorId,
      type: input.type ?? "general",
      content: trimmedContent,
    })
    .returning();

  // Craft a contextual success message
  const typeLabel = {
    observation: "observation",
    milestone: "milestone",
    concern: "concern",
    general: "note",
  }[note.type];

  return {
    success: true,
    data: {
      note: {
        id: note.id,
        childId: note.childId,
        authorId: note.authorId,
        type: note.type as NoteType,
        content: note.content,
        createdAt: note.createdAt.toISOString(),
        updatedAt: note.updatedAt.toISOString(),
      },
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
