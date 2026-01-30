/**
 * create_custom_symbol Tool
 *
 * Add a custom symbol to a child's AAC vocabulary.
 *
 * IMPORTANT: This is a placeholder implementation. Full implementation
 * depends on FLY-81 (Custom Card Epic) which covers:
 * - Custom symbol storage in CloudKit
 * - AI image generation integration
 * - Symbol approval workflow
 * - Category management
 *
 * Current behavior: Returns a mock response to validate the tool interface.
 * The actual symbol creation will be implemented when the infrastructure
 * from FLY-81 is ready.
 */

import { z } from "zod/v4";
import type { Tool, ToolContext, ToolResult } from "@/types/claude";
import { verifyChildAccess } from "../authorization";

// ============================================================================
// Types
// ============================================================================

export type ImageSource = "generate" | "url";

export interface CreatedSymbol {
  id: string;
  childId: string;
  name: string;
  nameBulgarian: string | null;
  categoryId: string;
  imageSource: ImageSource;
  imageUrl: string | null;
  imagePrompt: string | null;
  status: "pending" | "approved" | "rejected";
  createdAt: string;
  updatedAt: string;
  _mock: boolean;
  _pendingImplementation: boolean;
}

// ============================================================================
// Input Schema
// ============================================================================

const inputSchema = z
  .object({
    childId: z.uuid("Invalid child ID format"),
    name: z
      .string()
      .min(1, "Symbol name is required")
      .max(100, "Symbol name cannot exceed 100 characters"),
    nameBulgarian: z
      .string()
      .max(100, "Bulgarian name cannot exceed 100 characters")
      .optional(),
    categoryId: z.uuid("Invalid category ID format"),
    imageSource: z.enum(["generate", "url"]),
    imagePrompt: z
      .string()
      .min(10, "Image prompt must be at least 10 characters for good results")
      .max(500, "Image prompt cannot exceed 500 characters")
      .optional(),
    imageUrl: z.url("Invalid URL format").optional(),
  })
  .superRefine((data, ctx) => {
    // If imageSource is "generate", imagePrompt is required
    if (data.imageSource === "generate" && !data.imagePrompt) {
      ctx.addIssue({
        code: "custom",
        message: "Image prompt is required when imageSource is 'generate'",
        path: ["imagePrompt"],
      });
    }
    // If imageSource is "url", imageUrl is required
    if (data.imageSource === "url" && !data.imageUrl) {
      ctx.addIssue({
        code: "custom",
        message: "Image URL is required when imageSource is 'url'",
        path: ["imageUrl"],
      });
    }
  });

type CreateCustomSymbolInput = z.infer<typeof inputSchema>;

// ============================================================================
// Tool Implementation
// ============================================================================

async function createCustomSymbol(
  input: CreateCustomSymbolInput,
  context: ToolContext
): Promise<ToolResult> {
  // 1. Verify authorization
  await verifyChildAccess(input.childId, context);

  // 2. Validate image source consistency (Zod superRefine handles basic validation,
  //    but we can add additional checks here if needed)

  // Note: categoryId validation blocked on symbols/categories sync from iOS CloudKit

  // FLY-81: Full implementation blocked on iOS integration, will include:
  // - Calling AI image generation service if imageSource === 'generate'
  // - Uploading generated/provided image to CloudKit
  // - Creating symbol record in CloudKit
  // - Syncing to child's AAC vocabulary
  // - Handling approval workflow (parent/therapist approval)

  // For now, return a mock response to validate the interface
  const now = new Date().toISOString();
  const mockSymbol: CreatedSymbol = {
    id: `symbol-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    childId: input.childId,
    name: input.name,
    nameBulgarian: input.nameBulgarian ?? null,
    categoryId: input.categoryId,
    imageSource: input.imageSource,
    imageUrl: input.imageUrl ?? null,
    imagePrompt: input.imagePrompt ?? null,
    status: "pending", // Custom symbols start as pending until approved
    createdAt: now,
    updatedAt: now,
    _mock: true,
    _pendingImplementation: true, // Flag to indicate this awaits FLY-81
  };

  const actionDescription =
    input.imageSource === "generate"
      ? `AI-generated image from prompt: "${input.imagePrompt?.slice(0, 50)}${(input.imagePrompt?.length ?? 0) > 50 ? "..." : ""}"`
      : `using provided image URL`;

  return {
    success: true,
    data: {
      symbol: mockSymbol,
      message: `Successfully created custom symbol "${input.name}" (pending approval). Image: ${actionDescription}`,
      notice:
        "Note: Full custom symbol creation is coming soon (FLY-81). This is a placeholder response.",
    },
  };
}

// ============================================================================
// Export
// ============================================================================

export const createCustomSymbolTool: Tool<CreateCustomSymbolInput> = {
  name: "create_custom_symbol",
  description:
    "Add a custom symbol to a child's AAC vocabulary. Symbols can be created by providing an image URL or by generating an image using AI. Custom symbols require approval before appearing in the child's AAC app. Note: Full implementation pending FLY-81.",
  inputSchema,
  execute: createCustomSymbol,
};
