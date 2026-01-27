/**
 * search_vocabulary Tool
 * 
 * Search for symbols in a child's AAC vocabulary with usage statistics.
 * 
 * NOTE: The symbols/vocabulary table doesn't exist yet. This implementation
 * uses the usageLogs table to find symbols that have been used, and generates
 * mock metadata. Once a proper symbols table exists, this can be enhanced
 * with actual symbol names, images, and categories.
 * 
 * TODO: Create symbols table with schema:
 * - id: UUID
 * - symbolId: varchar(255) - external ID from symbol library
 * - name: varchar(255)
 * - category: varchar(100)
 * - subcategory: varchar(100) (optional)
 * - imageUrl: varchar(500)
 * - tags: text[] - searchable tags
 * - createdAt: timestamp
 */

import { z } from "zod/v4";
import { eq, sql, count, desc } from "drizzle-orm";
import { createReadOnlyTool } from "@/services/tool-executor";
import type { ToolContext } from "@/types/claude";
import { verifyChildAccess } from "../authorization";

// ============================================================================
// Types
// ============================================================================

export interface VocabularySymbol {
  symbolId: string;
  name: string;
  category: string;
  subcategory: string | null;
  
  // Usage stats for this child
  usageStats: {
    totalUsages: number;
    lastUsedAt: string | null;
    firstUsedAt: string | null;
    usageRank: number; // Rank among all symbols (1 = most used)
  };
  
  // Metadata (mock until symbols table exists)
  imageUrl: string | null;
  tags: string[];
  
  _mockMetadata: boolean;
}

export interface SearchVocabularyResult {
  symbols: VocabularySymbol[];
  totalMatches: number;
  query: string;
  childId: string;
}

// ============================================================================
// Input Schema
// ============================================================================

const inputSchema = z.object({
  childId: z.uuid("Invalid child ID format"),
  query: z.string().min(1, "Search query cannot be empty").max(100),
});

type SearchVocabularyInput = z.infer<typeof inputSchema>;

// ============================================================================
// Tool Implementation
// ============================================================================

async function searchVocabulary(
  input: SearchVocabularyInput,
  context: ToolContext
): Promise<SearchVocabularyResult> {
  // Verify access
  await verifyChildAccess(input.childId, context);

  const { db } = await import("@/db");
  const { usageLogs } = await import("@/db/schema");

  // Get all unique symbols this child has used, with usage stats
  const symbolUsages = await db
    .select({
      symbolId: usageLogs.symbolId,
      totalUsages: count(usageLogs.id),
      lastUsedAt: sql<Date>`max(${usageLogs.timestamp})`.as("last_used"),
      firstUsedAt: sql<Date>`min(${usageLogs.timestamp})`.as("first_used"),
    })
    .from(usageLogs)
    .where(eq(usageLogs.childId, input.childId))
    .groupBy(usageLogs.symbolId)
    .orderBy(desc(count(usageLogs.id))) as Array<{
      symbolId: string;
      totalUsages: number;
      lastUsedAt: Date | null;
      firstUsedAt: Date | null;
    }>;

  // Create a rank map
  const rankMap = new Map<string, number>();
  symbolUsages.forEach((s, index) => {
    rankMap.set(s.symbolId, index + 1);
  });

  // Search/filter symbols based on query
  // For now, we search in symbolId (which may contain meaningful text like "food-apple")
  // Once we have a symbols table, we'll search in name, category, and tags
  const query = input.query.toLowerCase();
  
  const matchingSymbols = symbolUsages.filter((s) => {
    const symbolIdLower = s.symbolId.toLowerCase();
    
    // Match if query appears in symbolId
    if (symbolIdLower.includes(query)) return true;
    
    // Also try to match category (extracted from symbolId)
    const category = extractCategory(s.symbolId);
    if (category.toLowerCase().includes(query)) return true;
    
    // Match derived name
    const name = symbolIdToName(s.symbolId);
    if (name.toLowerCase().includes(query)) return true;
    
    return false;
  });

  // Convert to VocabularySymbol format with mock metadata
  const symbols: VocabularySymbol[] = matchingSymbols.map((s) => ({
    symbolId: s.symbolId,
    name: symbolIdToName(s.symbolId),
    category: extractCategory(s.symbolId),
    subcategory: extractSubcategory(s.symbolId),
    usageStats: {
      totalUsages: s.totalUsages,
      lastUsedAt: s.lastUsedAt ? new Date(s.lastUsedAt).toISOString() : null,
      firstUsedAt: s.firstUsedAt ? new Date(s.firstUsedAt).toISOString() : null,
      usageRank: rankMap.get(s.symbolId) ?? 0,
    },
    imageUrl: generateMockImageUrl(s.symbolId),
    tags: generateMockTags(s.symbolId),
    _mockMetadata: true,
  }));

  // Limit results
  const limitedSymbols = symbols.slice(0, 50);

  return {
    symbols: limitedSymbols,
    totalMatches: matchingSymbols.length,
    query: input.query,
    childId: input.childId,
  };
}

/**
 * Extract category from symbol ID
 * e.g., "food-apple" -> "food", "action-run" -> "action"
 */
function extractCategory(symbolId: string): string {
  const parts = symbolId.split(/[-_]/);
  if (parts.length >= 2) {
    return capitalizeFirst(parts[0] ?? "");
  }
  
  // Check for common prefixes
  const commonCategories = [
    "food", "drink", "action", "feeling", "emotion", "place", "person",
    "animal", "toy", "color", "number", "time", "question", "social",
    "body", "clothing", "weather", "transport", "activity", "object"
  ];
  
  const lowerSymbolId = symbolId.toLowerCase();
  for (const cat of commonCategories) {
    if (lowerSymbolId.startsWith(cat)) {
      return capitalizeFirst(cat);
    }
  }
  
  return "General";
}

/**
 * Extract subcategory if present
 */
function extractSubcategory(symbolId: string): string | null {
  const parts = symbolId.split(/[-_]/);
  if (parts.length >= 3) {
    return capitalizeFirst(parts[1] ?? "");
  }
  return null;
}

/**
 * Convert symbol ID to human-readable name
 * e.g., "food-apple" -> "Apple", "action-run-fast" -> "Run Fast"
 */
function symbolIdToName(symbolId: string): string {
  const parts = symbolId.split(/[-_]/);
  
  // Skip the first part if it's a category
  const nameParts = parts.length >= 2 ? parts.slice(1) : parts;
  
  return nameParts
    .map(capitalizeFirst)
    .join(" ")
    .replace(/\d+$/, ""); // Remove trailing numbers
}

/**
 * Capitalize first letter
 */
function capitalizeFirst(str: string): string {
  if (!str) return "";
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

/**
 * Generate mock image URL (placeholder)
 */
function generateMockImageUrl(symbolId: string): string {
  // In a real implementation, this would come from the symbols table
  return `https://symbols.example.com/pcs/${symbolId}.png`;
}

/**
 * Generate mock tags based on symbol ID
 */
function generateMockTags(symbolId: string): string[] {
  const tags: string[] = [];
  const parts = symbolId.toLowerCase().split(/[-_]/);
  
  // Add all parts as tags
  tags.push(...parts.filter(p => p.length > 2));
  
  // Add category as tag
  const category = extractCategory(symbolId).toLowerCase();
  if (!tags.includes(category)) {
    tags.push(category);
  }
  
  // Add some common related tags based on category
  const categoryTags: Record<string, string[]> = {
    food: ["eating", "hungry", "snack", "meal"],
    drink: ["thirsty", "beverage"],
    action: ["verb", "doing"],
    feeling: ["emotion", "mood"],
    social: ["greeting", "manners", "interaction"],
    question: ["asking", "inquiry"],
    person: ["people", "family"],
    animal: ["pet", "zoo"],
  };
  
  const relatedTags = categoryTags[category] ?? [];
  tags.push(...relatedTags.slice(0, 2));
  
  // Remove duplicates and limit
  return [...new Set(tags)].slice(0, 8);
}

// ============================================================================
// Export
// ============================================================================

export const searchVocabularyTool = createReadOnlyTool(
  "search_vocabulary",
  "Search for symbols in a child's AAC vocabulary by name, category, or keyword. Returns matching symbols with their usage statistics (how often used, last used, usage rank). Use this to find specific symbols or explore vocabulary patterns.",
  inputSchema,
  searchVocabulary
);
