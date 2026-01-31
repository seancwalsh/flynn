/**
 * Seed Default Symbol Categories
 *
 * Seeds the database with Fitzgerald Key Color-Coded categories
 * for AAC symbols. These are the standard industry categories.
 *
 * Run with: bun run seed:categories
 */

import { db } from "../index";
import { symbolCategories } from "../schema";
import { eq } from "drizzle-orm";

// ============================================================================
// Fitzgerald Key Color-Coded Categories
// ============================================================================

export const DEFAULT_CATEGORIES = [
  {
    name: "People",
    nameBulgarian: "Хора",
    colorName: "yellow",
    colorHex: "#FFD54F",
    icon: "person.fill",
    displayOrder: 1,
    description: "People, family members, friends, community helpers",
  },
  {
    name: "Actions",
    nameBulgarian: "Действия",
    colorName: "green",
    colorHex: "#66BB6A",
    icon: "figure.walk",
    displayOrder: 2,
    description: "Verbs and action words",
  },
  {
    name: "Descriptors",
    nameBulgarian: "Описатели",
    colorName: "blue",
    colorHex: "#42A5F5",
    icon: "star.fill",
    displayOrder: 3,
    description: "Adjectives, descriptive words, feelings",
  },
  {
    name: "Food & Drink",
    nameBulgarian: "Храна и напитки",
    colorName: "red",
    colorHex: "#EF5350",
    icon: "fork.knife",
    displayOrder: 4,
    description: "Food items, drinks, meals",
  },
  {
    name: "Places",
    nameBulgarian: "Места",
    colorName: "orange",
    colorHex: "#FFA726",
    icon: "house.fill",
    displayOrder: 5,
    description: "Locations, rooms, buildings",
  },
  {
    name: "Objects",
    nameBulgarian: "Обекти",
    colorName: "pink",
    colorHex: "#EC407A",
    icon: "cube.box.fill",
    displayOrder: 6,
    description: "Toys, tools, everyday items",
  },
  {
    name: "Time",
    nameBulgarian: "Време",
    colorName: "purple",
    colorHex: "#AB47BC",
    icon: "clock.fill",
    displayOrder: 7,
    description: "Time-related words, schedule, calendar",
  },
  {
    name: "Questions",
    nameBulgarian: "Въпроси",
    colorName: "brown",
    colorHex: "#8D6E63",
    icon: "questionmark.circle.fill",
    displayOrder: 8,
    description: "Question words, interrogatives",
  },
  {
    name: "Social",
    nameBulgarian: "Социално",
    colorName: "teal",
    colorHex: "#26A69A",
    icon: "bubble.left.and.bubble.right.fill",
    displayOrder: 9,
    description: "Social phrases, greetings, polite words",
  },
  {
    name: "Miscellaneous",
    nameBulgarian: "Разни",
    colorName: "gray",
    colorHex: "#78909C",
    icon: "ellipsis.circle.fill",
    displayOrder: 10,
    description: "Other words that don't fit specific categories",
  },
] as const;

// ============================================================================
// Seed Function
// ============================================================================

export async function seedSymbolCategories() {
  console.log("🌱 Seeding symbol categories...");

  let insertedCount = 0;
  let updatedCount = 0;

  for (const category of DEFAULT_CATEGORIES) {
    // Check if category already exists
    const [existing] = await db
      .select()
      .from(symbolCategories)
      .where(eq(symbolCategories.name, category.name))
      .limit(1);

    if (existing) {
      // Update existing category
      await db
        .update(symbolCategories)
        .set({
          nameBulgarian: category.nameBulgarian,
          colorName: category.colorName,
          colorHex: category.colorHex,
          icon: category.icon,
          displayOrder: category.displayOrder,
          isSystem: true,
        })
        .where(eq(symbolCategories.id, existing.id));

      updatedCount++;
      console.log(`  ✓ Updated: ${category.name}`);
    } else {
      // Insert new category
      await db.insert(symbolCategories).values({
        name: category.name,
        nameBulgarian: category.nameBulgarian,
        colorName: category.colorName,
        colorHex: category.colorHex,
        icon: category.icon,
        displayOrder: category.displayOrder,
        isSystem: true,
      });

      insertedCount++;
      console.log(`  ✓ Inserted: ${category.name}`);
    }
  }

  console.log(`\n✅ Seed complete!`);
  console.log(`   Inserted: ${insertedCount} categories`);
  console.log(`   Updated: ${updatedCount} categories`);
  console.log(`   Total: ${DEFAULT_CATEGORIES.length} categories\n`);

  return { insertedCount, updatedCount, total: DEFAULT_CATEGORIES.length };
}

// ============================================================================
// CLI Runner
// ============================================================================

// Run if called directly
if (import.meta.main) {
  seedSymbolCategories()
    .then(() => {
      console.log("Done!");
      process.exit(0);
    })
    .catch((error) => {
      console.error("❌ Seed failed:", error);
      process.exit(1);
    });
}
