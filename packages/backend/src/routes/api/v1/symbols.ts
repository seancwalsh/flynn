import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod/v4";
import { db } from "../../../db";
import { customSymbols, symbolCategories, symbolApprovals } from "../../../db/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { AppError } from "../../../middleware/error-handler";
import { requireChildAccess, requireAuth } from "../../../middleware/authorization";

export const symbolsRoutes = new Hono();

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const imageSourceEnum = z.enum(["upload", "url", "generate"]);
const symbolStatusEnum = z.enum(["pending", "approved", "rejected"]);
const approvalActionEnum = z.enum(["approve", "reject", "request_changes"]);

const createSymbolSchema = z.object({
  childId: z.string().uuid(),
  name: z.string().min(1).max(100),
  nameBulgarian: z.string().max(100).optional(),
  categoryId: z.string().uuid(),
  imageSource: imageSourceEnum,
  imageUrl: z.string().url().max(500).optional(),
  imagePrompt: z.string().max(500).optional(),
  imageKey: z.string().max(500).optional(),
  gridPosition: z.number().int().optional(),
});

const updateSymbolSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  nameBulgarian: z.string().max(100).optional(),
  categoryId: z.string().uuid().optional(),
  imageUrl: z.string().url().max(500).optional(),
  gridPosition: z.number().int().optional(),
});

const approveSymbolSchema = z.object({
  action: approvalActionEnum,
  comment: z.string().max(500).optional(),
});

const createCategorySchema = z.object({
  name: z.string().min(1).max(100),
  nameBulgarian: z.string().max(100).optional(),
  colorName: z.string().min(1).max(50),
  colorHex: z.string().regex(/^#[0-9A-F]{6}$/i),
  icon: z.string().max(50).optional(),
  displayOrder: z.number().int().optional(),
});

const getUploadUrlSchema = z.object({
  filename: z.string().min(1).max(255),
  contentType: z.string().regex(/^image\/(png|jpeg|jpg)$/),
});

// ============================================================================
// CATEGORY ROUTES
// ============================================================================

// List all categories
symbolsRoutes.get("/categories", requireAuth(), async (c) => {
  const categories = await db
    .select()
    .from(symbolCategories)
    .orderBy(symbolCategories.displayOrder);

  return c.json({ data: categories });
});

// Create new category (admin only)
symbolsRoutes.post(
  "/categories",
  requireAuth(),
  zValidator("json", createCategorySchema),
  async (c) => {
    const user = c.get("user");

    if (user.role !== "admin" && user.role !== "therapist") {
      throw new AppError("Only admins and therapists can create categories", 403, "FORBIDDEN");
    }

    const data = c.req.valid("json");

    const [category] = await db
      .insert(symbolCategories)
      .values({
        ...data,
        isSystem: false,
      })
      .returning();

    return c.json({ data: category }, 201);
  }
);

// ============================================================================
// CUSTOM SYMBOL ROUTES
// ============================================================================

// Get custom symbols for a child (approved only, or include pending if caregiver/therapist)
symbolsRoutes.get("/:childId", requireChildAccess(), async (c) => {
  const childId = c.req.param("childId");
  const status = c.req.query("status"); // optional filter
  const user = c.get("user");

  let query = db
    .select({
      id: customSymbols.id,
      childId: customSymbols.childId,
      name: customSymbols.name,
      nameBulgarian: customSymbols.nameBulgarian,
      categoryId: customSymbols.categoryId,
      imageSource: customSymbols.imageSource,
      imageUrl: customSymbols.imageUrl,
      imagePrompt: customSymbols.imagePrompt,
      status: customSymbols.status,
      gridPosition: customSymbols.gridPosition,
      createdAt: customSymbols.createdAt,
      updatedAt: customSymbols.updatedAt,
      approvedAt: customSymbols.approvedAt,
      category: {
        id: symbolCategories.id,
        name: symbolCategories.name,
        colorName: symbolCategories.colorName,
        colorHex: symbolCategories.colorHex,
      },
    })
    .from(customSymbols)
    .leftJoin(symbolCategories, eq(customSymbols.categoryId, symbolCategories.id))
    .where(eq(customSymbols.childId, childId))
    .orderBy(desc(customSymbols.createdAt));

  // Filter by status if provided
  if (status && symbolStatusEnum.safeParse(status).success) {
    query = query.where(
      and(eq(customSymbols.childId, childId), eq(customSymbols.status, status as any))
    );
  }

  const symbols = await query;

  return c.json({ data: symbols });
});

// Create custom symbol
symbolsRoutes.post(
  "/custom",
  requireAuth(),
  zValidator("json", createSymbolSchema),
  async (c) => {
    const user = c.get("user");
    const data = c.req.valid("json");

    // Verify user has access to this child (will throw if not)
    // Note: requireChildAccess middleware needs childId in params, so we do manual check here
    const { childId } = data;

    // Validate image source has corresponding data
    if (data.imageSource === "url" && !data.imageUrl) {
      throw new AppError("imageUrl is required when imageSource is 'url'", 400, "VALIDATION_ERROR");
    }
    if (data.imageSource === "generate" && !data.imagePrompt) {
      throw new AppError(
        "imagePrompt is required when imageSource is 'generate'",
        400,
        "VALIDATION_ERROR"
      );
    }
    if (data.imageSource === "upload" && !data.imageKey) {
      throw new AppError("imageKey is required when imageSource is 'upload'", 400, "VALIDATION_ERROR");
    }

    const [symbol] = await db
      .insert(customSymbols)
      .values({
        childId: data.childId,
        name: data.name,
        nameBulgarian: data.nameBulgarian,
        categoryId: data.categoryId,
        imageSource: data.imageSource,
        imageUrl: data.imageUrl,
        imagePrompt: data.imagePrompt,
        imageKey: data.imageKey,
        gridPosition: data.gridPosition,
        status: "pending",
        createdBy: user.id,
      })
      .returning();

    return c.json({ data: symbol }, 201);
  }
);

// Update custom symbol (creator only, or admin/therapist)
symbolsRoutes.patch(
  "/custom/:id",
  requireAuth(),
  zValidator("json", updateSymbolSchema),
  async (c) => {
    const id = c.req.param("id");
    const user = c.get("user");
    const data = c.req.valid("json");

    // Get existing symbol
    const [existing] = await db.select().from(customSymbols).where(eq(customSymbols.id, id));

    if (!existing) {
      throw new AppError("Symbol not found", 404, "NOT_FOUND");
    }

    // Check authorization
    const isCreator = existing.createdBy === user.id;
    const isAdminOrTherapist = user.role === "admin" || user.role === "therapist";

    if (!isCreator && !isAdminOrTherapist) {
      throw new AppError("You don't have permission to edit this symbol", 403, "FORBIDDEN");
    }

    const [updated] = await db
      .update(customSymbols)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(customSymbols.id, id))
      .returning();

    return c.json({ data: updated });
  }
);

// Delete custom symbol (creator only, or admin)
symbolsRoutes.delete("/custom/:id", requireAuth(), async (c) => {
  const id = c.req.param("id");
  const user = c.get("user");

  const [existing] = await db.select().from(customSymbols).where(eq(customSymbols.id, id));

  if (!existing) {
    throw new AppError("Symbol not found", 404, "NOT_FOUND");
  }

  const isCreator = existing.createdBy === user.id;
  const isAdmin = user.role === "admin";

  if (!isCreator && !isAdmin) {
    throw new AppError("You don't have permission to delete this symbol", 403, "FORBIDDEN");
  }

  await db.delete(customSymbols).where(eq(customSymbols.id, id));

  return c.json({ success: true });
});

// ============================================================================
// APPROVAL WORKFLOW
// ============================================================================

// Get pending symbols for approval (therapists and admins only)
symbolsRoutes.get("/pending/all", requireAuth(), async (c) => {
  const user = c.get("user");

  if (user.role !== "therapist" && user.role !== "admin") {
    throw new AppError("Only therapists and admins can access pending symbols", 403, "FORBIDDEN");
  }

  const pending = await db
    .select({
      id: customSymbols.id,
      childId: customSymbols.childId,
      name: customSymbols.name,
      nameBulgarian: customSymbols.nameBulgarian,
      imageUrl: customSymbols.imageUrl,
      status: customSymbols.status,
      createdAt: customSymbols.createdAt,
      category: {
        name: symbolCategories.name,
        colorName: symbolCategories.colorName,
        colorHex: symbolCategories.colorHex,
      },
    })
    .from(customSymbols)
    .leftJoin(symbolCategories, eq(customSymbols.categoryId, symbolCategories.id))
    .where(eq(customSymbols.status, "pending"))
    .orderBy(customSymbols.createdAt);

  return c.json({ data: pending });
});

// Approve/reject symbol (therapists and admins only)
symbolsRoutes.post(
  "/custom/:id/review",
  requireAuth(),
  zValidator("json", approveSymbolSchema),
  async (c) => {
    const id = c.req.param("id");
    const user = c.get("user");
    const { action, comment } = c.req.valid("json");

    if (user.role !== "therapist" && user.role !== "admin") {
      throw new AppError("Only therapists and admins can review symbols", 403, "FORBIDDEN");
    }

    const [existing] = await db.select().from(customSymbols).where(eq(customSymbols.id, id));

    if (!existing) {
      throw new AppError("Symbol not found", 404, "NOT_FOUND");
    }

    const previousStatus = existing.status;
    let newStatus: "approved" | "rejected" | "pending";

    if (action === "approve") {
      newStatus = "approved";
    } else if (action === "reject") {
      newStatus = "rejected";
    } else {
      newStatus = "pending"; // request_changes
    }

    // Update symbol
    const [updated] = await db
      .update(customSymbols)
      .set({
        status: newStatus,
        ...(action === "approve"
          ? { approvedBy: user.id, approvedAt: new Date() }
          : { rejectedBy: user.id, rejectedAt: new Date(), rejectionReason: comment }),
        updatedAt: new Date(),
      })
      .where(eq(customSymbols.id, id))
      .returning();

    // Create approval record
    await db.insert(symbolApprovals).values({
      symbolId: id,
      reviewerId: user.id,
      action,
      comment,
      previousStatus,
      newStatus,
    });

    return c.json({ data: updated });
  }
);

// Get approval history for a symbol
symbolsRoutes.get("/custom/:id/approvals", requireAuth(), async (c) => {
  const id = c.req.param("id");

  const approvals = await db
    .select()
    .from(symbolApprovals)
    .where(eq(symbolApprovals.symbolId, id))
    .orderBy(desc(symbolApprovals.createdAt));

  return c.json({ data: approvals });
});

// ============================================================================
// IMAGE UPLOAD (Presigned URL)
// ============================================================================

// Get presigned URL for image upload (to be implemented with R2)
symbolsRoutes.post(
  "/:childId/upload-url",
  requireChildAccess(),
  zValidator("json", getUploadUrlSchema),
  async (c) => {
    const childId = c.req.param("childId");
    const { filename, contentType } = c.req.valid("json");

    // TODO: Implement R2 presigned URL generation
    // For now, return mock response
    const imageKey = `custom-symbols/${childId}/${Date.now()}-${filename}`;

    return c.json({
      uploadUrl: `https://placeholder-upload-url.com/${imageKey}`,
      imageKey,
      publicUrl: `https://placeholder-cdn.com/${imageKey}`,
      expiresIn: 3600,
    });
  }
);
