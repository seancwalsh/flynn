import { db } from "../db";
import { children, usageLogs, dailyMetrics, insights, goals } from "../db/schema";
import { eq } from "drizzle-orm";

async function main() {
  // Get Emma
  const [emma] = await db
    .select()
    .from(children)
    .where(eq(children.name, "Emma"));

  if (!emma) {
    console.log("❌ Emma not found");
    process.exit(1);
  }

  console.log(`✅ Found Emma (ID: ${emma.id})`);

  // Check usage logs
  const logs = await db
    .select()
    .from(usageLogs)
    .where(eq(usageLogs.childId, emma.id))
    .limit(5);

  console.log(`\n📊 Usage logs: ${logs.length} (showing first 5)`);
  logs.forEach(log => {
    console.log(`  - ${log.symbolId} at ${log.timestamp.toISOString()}`);
  });

  // Check daily metrics
  const metrics = await db
    .select()
    .from(dailyMetrics)
    .where(eq(dailyMetrics.childId, emma.id))
    .limit(3);

  console.log(`\n📈 Daily metrics: ${metrics.length} (showing first 3)`);
  metrics.forEach(m => {
    console.log(`  - ${m.date}: ${m.totalTaps} taps, ${m.uniqueSymbols} symbols`);
  });

  // Check insights
  const emmaInsights = await db
    .select()
    .from(insights)
    .where(eq(insights.childId, emma.id));

  console.log(`\n💡 Insights: ${emmaInsights.length}`);
  emmaInsights.forEach(i => {
    console.log(`  - [${i.type}] ${i.title}`);
  });

  // Check goals
  const emmaGoals = await db
    .select()
    .from(goals)
    .where(eq(goals.childId, emma.id));

  console.log(`\n🎯 Goals: ${emmaGoals.length}`);
  emmaGoals.forEach(g => {
    console.log(`  - ${g.title} (${g.progressPercent}%)`);
  });

  process.exit(0);
}

main();
