/**
 * create_custom_symbol Tool
 *
 * Add a custom symbol to a child's AAC vocabulary with approval workflow.
 *
 * Implemented features:
 * - Custom symbol storage in PostgreSQL
 * - Symbol approval workflow (pending → approved/rejected)
 * - Category management
 * - Image URLs and upload support
 *
 * Future enhancements:
 * - AI image generation integration
 * - Push notifications on approval
 */

import { z } from "zod/v4";
import type { Tool, ToolContext, ToolResult } from "@/types/claude";
import { verifyChildAccess } from "../authorization";
import { db } from "@/db";
import { customSymbols, symbolCategories } from "@/db/schema";
import { eq } from "drizzle-orm";

// ============================================================================
// Types
// ============================================================================

export type ImageSource = "generate" | "url" | "upload";

export interface CreatedSymbol {
  id: string;
  childId: string;
  name: string;
  nameBulgarian: string | null;
  categoryId: string;
  imageSource: ImageSource;
  imageUrl: string | null;
  imagePrompt: string | null;
  imageKey: string | null;
  status: "pending" | "approved" | "rejected";
  createdAt: Date;
  updatedAt: Date;
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
    imageSource: z.enum(["generate", "url", "upload"]),
    imagePrompt: z
      .string()
      .min(10, "Image prompt must be at least 10 characters for good results")
      .max(500, "Image prompt cannot exceed 500 characters")
      .optional(),
    imageUrl: z.url("Invalid URL format").optional(),
    imageKey: z
      .string()
      .max(500, "Image key cannot exceed 500 characters")
      .optional(),
    gridPosition: z.number().int().optional(),
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
    // If imageSource is "upload", imageKey is required
    if (data.imageSource === "upload" && !data.imageKey) {
      ctx.addIssue({
        code: "custom",
        message: "Image key is required when imageSource is 'upload'",
        path: ["imageKey"],
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

  // 2. Verify category exists
  const [category] = await db
    .select()
    .from(symbolCategories)
    .where(eq(symbolCategories.id, input.categoryId))
    .limit(1);

  if (!category) {
    return {
      success: false,
      error: `Category with ID ${input.categoryId} not found. Please use a valid category ID.`,
    };
  }

  // 3. Handle AI image generation (if requested)
  let finalImageUrl = input.imageUrl ?? null;
  if (input.imageSource === "generate") {
    // TODO: Implement AI image generation with OpenAI DALL-E or similar
    // For now, return error indicating feature is not yet available
    return {
      success: false,
      error:
        "AI image generation is not yet implemented. Please use imageSource 'url' or 'upload' instead.",
    };
  }

  // 4. Construct image URL from imageKey if upload
  if (input.imageSource === "upload" && input.imageKey) {
    // TODO: Replace with actual R2 public URL once storage is configured
    finalImageUrl = `https://placeholder-cdn.com/${input.imageKey}`;
  }

  // 5. Create custom symbol record
  const [createdSymbol] = await db
    .insert(customSymbols)
    .values({
      childId: input.childId,
      name: input.name,
      nameBulgarian: input.nameBulgarian,
      categoryId: input.categoryId,
      imageSource: input.imageSource,
      imageUrl: finalImageUrl,
      imagePrompt: input.imagePrompt,
      imageKey: input.imageKey,
      gridPosition: input.gridPosition,
      status: "pending", // Custom symbols require approval
      createdBy: context.userId,
    })
    .returning();

  const actionDescription =
    input.imageSource === "upload"
      ? "uploaded image"
      : input.imageSource === "url"
        ? "provided image URL"
        : "AI-generated image";

  return {
    success: true,
    data: {
      symbol: createdSymbol,
      message: `Successfully created custom symbol "${input.name}" in category "${category.name}" using ${actionDescription}. Status: Pending approval by therapist/admin.`,
      nextSteps: [
        "Symbol is pending approval and will not appear in the AAC app yet",
        "A therapist or admin must review and approve the symbol",
        "Once approved, it will automatically sync to the iPad app",
      ],
    },
  };
}

// ============================================================================
// Export
// ============================================================================

export const createCustomSymbolTool: Tool<CreateCustomSymbolInput> = {
  name: "create_custom_symbol",
  description:
    "Add a custom symbol to a child's AAC vocabulary. Symbols can be created by providing an image URL, uploading an image (via imageKey), or generating an image using AI (coming soon). Custom symbols require therapist/admin approval before appearing in the child's AAC app.",
  inputSchema,
  execute: createCustomSymbol,
};
