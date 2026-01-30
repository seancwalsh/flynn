import { db } from "../db";
import { caregivers, families } from "../db/schema";
import { eq } from "drizzle-orm";

async function main() {
  const allCaregivers = await db
    .select({
      email: caregivers.email,
      name: caregivers.name,
      familyId: caregivers.familyId,
    })
    .from(caregivers);

  console.log("All caregivers:");
  for (const c of allCaregivers) {
    const [family] = await db.select().from(families).where(eq(families.id, c.familyId));
    console.log(`  ${c.email} -> ${family?.name} (${c.familyId})`);
  }

  // Check if dev@flynn-aac.local exists
  const [devCaregiver] = await db
    .select()
    .from(caregivers)
    .where(eq(caregivers.email, "dev@flynn-aac.local"));

  if (!devCaregiver) {
    console.log("\n❌ dev@flynn-aac.local not found");
    console.log("Creating dev caregiver...");

    // Link to first family
    const [firstFamily] = await db.select().from(families).limit(1);
    if (firstFamily) {
      const [newCaregiver] = await db
        .insert(caregivers)
        .values({
          email: "dev@flynn-aac.local",
          name: "Dev User",
          role: "parent",
          familyId: firstFamily.id,
        })
        .returning();

      console.log(`✅ Created dev caregiver linked to ${firstFamily.name}`);
    }
  } else {
    const [family] = await db.select().from(families).where(eq(families.id, devCaregiver.familyId));
    console.log(`\n✅ dev@flynn-aac.local exists, linked to ${family?.name}`);
  }

  process.exit(0);
}

main();
