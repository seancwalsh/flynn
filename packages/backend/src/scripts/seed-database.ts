/**
 * Database Seeding Script for Flynn AAC Backend
 *
 * Generates comprehensive seed data for testing AI agentic insights features.
 * Creates realistic usage patterns, metrics, therapist relationships, and insights.
 *
 * Usage:
 *   bun run src/scripts/seed-database.ts
 *   bun run src/scripts/seed-database.ts --clean
 *   bun run src/scripts/seed-database.ts --days=60
 */

import { db } from "../db";
import {
  families,
  children,
  caregivers,
  therapists,
  therapistClients,
  usageLogs,
  dailyMetrics,
  weeklyMetrics,
  metricBaselines,
  insights,
  anomalies,
  goals,
  therapySessions,
  type Child,
  type Therapist,
} from "../db/schema";
import { eq, sql } from "drizzle-orm";

// ============================================================================
// CONFIGURATION
// ============================================================================

const DAYS_OF_DATA = parseInt(process.argv.find(arg => arg.startsWith("--days="))?.split("=")[1] || "30");
const CLEAN_FIRST = process.argv.includes("--clean");

// ============================================================================
// SEED DATA DEFINITIONS
// ============================================================================

const FAMILY_DATA = [
  { name: "Johnson Family", childCount: 1 },
  { name: "Garcia Family", childCount: 1 },
  { name: "Patel Family", childCount: 2 },
];

const CHILD_PROFILES = [
  { name: "Emma", birthDate: "2020-06-15", profileType: "intermediate" }, // ~5 years old
  { name: "Noah", birthDate: "2021-03-22", profileType: "beginner" }, // ~4 years old
  { name: "Oliver", birthDate: "2019-09-08", profileType: "advanced" }, // ~6 years old
  { name: "Sophia", birthDate: "2021-11-30", profileType: "beginner" }, // ~3 years old
];

const THERAPIST_DATA = [
  {
    name: "Dr. Sarah Mitchell",
    email: "sarah.mitchell@flynntherapy.local",
    specialty: "slp",
    credentials: "MS, CCC-SLP"
  },
  {
    name: "James Rodriguez",
    email: "james.rodriguez@flynntherapy.local",
    specialty: "ot",
    credentials: "OTD, OTR/L"
  },
  {
    name: "Emily Chen",
    email: "emily.chen@flynntherapy.local",
    specialty: "aba",
    credentials: "BCBA-D"
  },
  {
    name: "Michael Thompson",
    email: "michael.thompson@flynntherapy.local",
    specialty: "pt",
    credentials: "DPT"
  },
];

// Common AAC symbols by category
const SYMBOLS = {
  food: [
    "food-apple", "food-banana", "food-cereal", "food-milk", "food-water",
    "food-juice", "food-snack", "food-breakfast", "food-lunch", "food-dinner",
    "food-cookie", "food-pizza", "food-chicken", "food-bread"
  ],
  actions: [
    "action-want", "action-help", "action-more", "action-done", "action-play",
    "action-go", "action-stop", "action-eat", "action-drink", "action-read",
    "action-watch", "action-brush-teeth", "action-get-dressed"
  ],
  people: [
    "person-mom", "person-dad", "person-sibling", "person-friend", "person-teacher",
    "person-therapist", "person-grandma", "person-grandpa"
  ],
  feelings: [
    "feeling-happy", "feeling-sad", "feeling-tired", "feeling-hungry", "feeling-thirsty",
    "feeling-angry", "feeling-scared", "feeling-love", "feeling-sick", "feeling-excited"
  ],
  places: [
    "place-home", "place-school", "place-park", "place-bathroom", "place-kitchen",
    "place-bedroom", "place-outside", "place-car", "place-bed"
  ],
  toys: [
    "toy-ball", "toy-blocks", "toy-puzzle", "toy-car", "toy-doll",
    "toy-tablet", "toy-book", "toy-game"
  ],
  activities: [
    "activity-tv", "activity-book", "activity-music", "activity-bath", "activity-game",
    "activity-coloring", "activity-singing"
  ],
};

// Profile-based usage patterns
const USAGE_PROFILES = {
  beginner: { minTaps: 20, maxTaps: 40, symbols: 15, sessions: 4 },
  intermediate: { minTaps: 60, maxTaps: 90, symbols: 30, sessions: 6 },
  advanced: { minTaps: 100, maxTaps: 150, symbols: 45, sessions: 7 },
};

// Time-of-day communication contexts
const TIME_CONTEXTS = {
  morning: { hours: [6, 7, 8, 9], categories: { food: 0.40, actions: 0.25, people: 0.20, feelings: 0.10, places: 0.05 } },
  midday: { hours: [10, 11, 12, 13, 14], categories: { actions: 0.30, toys: 0.25, people: 0.15, food: 0.15, places: 0.15 } },
  afternoon: { hours: [15, 16, 17, 18], categories: { food: 0.35, actions: 0.30, feelings: 0.15, activities: 0.10, people: 0.10 } },
  evening: { hours: [19, 20, 21], categories: { actions: 0.30, food: 0.25, activities: 0.20, feelings: 0.15, people: 0.10 } },
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomChoice<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

function weightedChoice<T>(items: T[], weights: number[]): T {
  const totalWeight = weights.reduce((sum, w) => sum + w, 0);
  let random = Math.random() * totalWeight;

  for (let i = 0; i < items.length; i++) {
    random -= weights[i];
    if (random <= 0) return items[i];
  }

  return items[items.length - 1];
}

function getDateDaysAgo(days: number): Date {
  const date = new Date();
  date.setDate(date.getDate() - days);
  date.setHours(0, 0, 0, 0);
  return date;
}

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

function getTimeContext(hour: number) {
  for (const [name, context] of Object.entries(TIME_CONTEXTS)) {
    if (context.hours.includes(hour)) {
      return { name, ...context };
    }
  }
  return { name: 'midday', ...TIME_CONTEXTS.midday };
}

// ============================================================================
// MAIN SEEDING FUNCTIONS
// ============================================================================

async function cleanDatabase() {
  console.log("🧹 Cleaning existing data...");

  // Delete in dependency order
  await db.delete(therapySessions);
  await db.delete(goals);
  await db.delete(anomalies);
  await db.delete(insights);
  await db.delete(metricBaselines);
  await db.delete(weeklyMetrics);
  await db.delete(dailyMetrics);
  await db.delete(usageLogs);
  await db.delete(therapistClients);
  await db.delete(therapists);
  await db.delete(caregivers);
  await db.delete(children);
  await db.delete(families);

  console.log("✅ Database cleaned");
}

async function seedFamiliesAndChildren() {
  console.log("\n👨‍👩‍👧‍👦 Creating families and children...");

  const createdChildren: Child[] = [];
  let childIndex = 0;

  for (const familyData of FAMILY_DATA) {
    // Create family
    const [family] = await db.insert(families).values({
      name: familyData.name,
    }).returning();

    console.log(`  ✓ Created family: ${family.name}`);

    // Create caregivers
    const caregiverCount = randomInt(2, 3);
    for (let i = 0; i < caregiverCount; i++) {
      const roles = ["parent", "parent", "grandparent", "guardian"];
      await db.insert(caregivers).values({
        familyId: family.id,
        name: `${family.name} - Caregiver ${i + 1}`,
        email: `caregiver${i + 1}-${family.id.slice(0, 8)}@flynn.local`,
        role: i < 2 ? "parent" : randomChoice(roles),
      });
    }

    // Create children
    for (let i = 0; i < familyData.childCount; i++) {
      const childData = CHILD_PROFILES[childIndex++];
      const [child] = await db.insert(children).values({
        familyId: family.id,
        name: childData.name,
        birthDate: childData.birthDate,
      }).returning();

      console.log(`    ✓ Created child: ${child.name} (${childData.profileType})`);
      createdChildren.push(child);
    }
  }

  console.log(`✅ Created ${FAMILY_DATA.length} families, ${createdChildren.length} children`);
  return createdChildren;
}

async function seedTherapists() {
  console.log("\n👨‍⚕️ Creating therapists...");

  const createdTherapists: Therapist[] = [];

  for (const therapistData of THERAPIST_DATA) {
    const [therapist] = await db.insert(therapists).values({
      name: therapistData.name,
      email: therapistData.email,
    }).returning();

    console.log(`  ✓ Created therapist: ${therapist.name} (${therapistData.specialty})`);
    createdTherapists.push(therapist);
  }

  console.log(`✅ Created ${createdTherapists.length} therapists`);
  return createdTherapists;
}

async function linkTherapistsToChildren(childrenList: Child[], therapistsList: Therapist[]) {
  console.log("\n🔗 Linking therapists to children...");

  const slp = therapistsList[0]; // Dr. Sarah Mitchell
  const ot = therapistsList[1];  // James Rodriguez
  const aba = therapistsList[2]; // Emily Chen
  const pt = therapistsList[3];  // Michael Thompson

  let linkCount = 0;

  for (const child of childrenList) {
    // All children get SLP
    await db.insert(therapistClients).values({
      therapistId: slp.id,
      childId: child.id,
      grantedAt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000), // 90 days ago
    });
    linkCount++;

    // 60% get OT
    if (Math.random() < 0.6) {
      await db.insert(therapistClients).values({
        therapistId: ot.id,
        childId: child.id,
        grantedAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
      });
      linkCount++;
    }

    // 40% get ABA
    if (Math.random() < 0.4) {
      await db.insert(therapistClients).values({
        therapistId: aba.id,
        childId: child.id,
        grantedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      });
      linkCount++;
    }

    // 20% get PT
    if (Math.random() < 0.2) {
      await db.insert(therapistClients).values({
        therapistId: pt.id,
        childId: child.id,
        grantedAt: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000),
      });
      linkCount++;
    }
  }

  console.log(`✅ Created ${linkCount} therapist-client relationships`);
}

async function generateUsageLogsForChild(
  child: Child,
  profileType: string,
  daysOfData: number
) {
  console.log(`\n📊 Generating usage logs for ${child.name}...`);

  const profile = USAGE_PROFILES[profileType as keyof typeof USAGE_PROFILES];
  let totalLogs = 0;

  for (let daysAgo = daysOfData - 1; daysAgo >= 0; daysAgo--) {
    const date = getDateDaysAgo(daysAgo);
    const isWeekend = date.getDay() === 0 || date.getDay() === 6;

    // Weekend adjustment
    const weekendFactor = isWeekend ? 0.75 : 1.0;

    // Occasional "off days"
    const isOffDay = Math.random() < 0.1;
    const offDayFactor = isOffDay ? 0.4 : 1.0;

    // Daily tap count with variance
    const baseTaps = randomInt(profile.minTaps, profile.maxTaps);
    const dailyTaps = Math.floor(baseTaps * weekendFactor * offDayFactor);

    // Generate logs throughout the day
    const logs: Array<{ childId: string; symbolId: string; timestamp: Date }> = [];

    for (let i = 0; i < dailyTaps; i++) {
      // Pick random hour weighted by time contexts
      const timeWeights = [
        ...Array(6).fill(0.1),  // 0-5am: very low
        ...Array(4).fill(1.5),  // 6-9am: morning high
        ...Array(5).fill(1.0),  // 10-2pm: moderate
        ...Array(4).fill(1.5),  // 3-6pm: afternoon high
        ...Array(3).fill(1.2),  // 7-9pm: evening moderate
        ...Array(2).fill(0.3),  // 10-11pm: very low
      ];

      const hour = weightedChoice(Array.from({ length: 24 }, (_, i) => i), timeWeights);
      const context = getTimeContext(hour);

      // Pick category based on time context
      const categoryNames = Object.keys(context.categories);
      const categoryWeights = Object.values(context.categories);
      const category = weightedChoice(categoryNames, categoryWeights);

      // Pick symbol from category (Zipf's law distribution)
      const symbolsInCategory = SYMBOLS[category as keyof typeof SYMBOLS] || SYMBOLS.actions;
      const symbolWeights = symbolsInCategory.map((_, idx) => 1 / (idx + 1));
      const symbolId = weightedChoice(symbolsInCategory, symbolWeights);

      // Create timestamp
      const timestamp = new Date(date);
      timestamp.setHours(hour, randomInt(0, 59), randomInt(0, 59));

      logs.push({
        childId: child.id,
        symbolId,
        timestamp,
      });
    }

    // Insert logs in batches
    if (logs.length > 0) {
      await db.insert(usageLogs).values(logs);
      totalLogs += logs.length;
    }
  }

  console.log(`  ✓ Generated ${totalLogs} usage logs`);
  return totalLogs;
}

async function computeMetricsForChild(child: Child, daysOfData: number) {
  console.log(`\n📈 Computing metrics for ${child.name}...`);

  let dailyCount = 0;

  // Compute daily metrics
  for (let daysAgo = daysOfData - 1; daysAgo >= 0; daysAgo--) {
    const date = getDateDaysAgo(daysAgo);
    const dateStr = formatDate(date);
    const nextDate = new Date(date);
    nextDate.setDate(nextDate.getDate() + 1);

    // Query logs for this day
    const logs = await db
      .select()
      .from(usageLogs)
      .where(
        sql`${usageLogs.childId} = ${child.id}
            AND ${usageLogs.timestamp} >= ${date.toISOString()}
            AND ${usageLogs.timestamp} < ${nextDate.toISOString()}`
      );

    if (logs.length === 0) continue;

    // Calculate metrics
    const totalTaps = logs.length;
    const uniqueSymbols = new Set(logs.map(l => l.symbolId)).size;
    const hourlyDist = Array(24).fill(0);

    logs.forEach(log => {
      const hour = log.timestamp.getHours();
      hourlyDist[hour]++;
    });

    // Top symbols
    const symbolCounts = new Map<string, number>();
    logs.forEach(log => {
      symbolCounts.set(log.symbolId, (symbolCounts.get(log.symbolId) || 0) + 1);
    });
    const topSymbols = Array.from(symbolCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([symbolId, count]) => ({ symbolId, count, label: symbolId.replace('-', ' ') }));

    // Insert daily metric
    await db.insert(dailyMetrics).values({
      childId: child.id,
      date: dateStr,
      totalTaps,
      uniqueSymbols,
      uniqueCategories: 5, // Simplified
      sessionCount: randomInt(3, 8),
      hourlyDistribution: hourlyDist,
      topSymbols,
      categoryBreakdown: { food: randomInt(10, 30), actions: randomInt(15, 35), people: randomInt(5, 15) },
    });

    dailyCount++;
  }

  console.log(`  ✓ Computed ${dailyCount} daily metrics`);

  // Compute weekly metrics (simplified)
  const weekCount = Math.floor(daysOfData / 7);
  for (let weekIdx = 0; weekIdx < weekCount; weekIdx++) {
    const weekStart = getDateDaysAgo((weekCount - weekIdx) * 7);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);

    const weekMetrics = await db
      .select()
      .from(dailyMetrics)
      .where(
        sql`${dailyMetrics.childId} = ${child.id}
            AND ${dailyMetrics.date} >= ${sql.raw(`'${formatDate(weekStart)}'`)}
            AND ${dailyMetrics.date} < ${sql.raw(`'${formatDate(weekEnd)}'`)}`
      );

    if (weekMetrics.length === 0) continue;

    const totalTaps = weekMetrics.reduce((sum, m) => sum + m.totalTaps, 0);
    const avgDailyTaps = totalTaps / weekMetrics.length;

    await db.insert(weeklyMetrics).values({
      childId: child.id,
      weekStart: formatDate(weekStart),
      totalTaps,
      avgDailyTaps,
      activeDays: weekMetrics.length,
      totalUniqueSymbols: 25 + weekIdx * 2, // Progressive growth
      newSymbolsThisWeek: randomInt(2, 5),
      totalSessions: weekMetrics.reduce((sum, m) => sum + m.sessionCount, 0),
      tapsTrend: weekIdx > 0 ? randomChoice(["improving", "stable"]) : "stable",
      vocabularyTrend: "improving",
      overallTrend: "improving",
    });
  }

  console.log(`  ✓ Computed ${weekCount} weekly metrics`);
}

async function generateInsightsForChild(child: Child) {
  console.log(`\n💡 Generating insights for ${child.name}...`);

  const insightsList = [];

  // Daily digest (recent)
  insightsList.push({
    childId: child.id,
    type: "daily_digest",
    severity: "info",
    title: `${child.name}'s Communication Summary`,
    body: `${child.name} had a great day with active communication and vocabulary use.`,
    content: {
      taps: randomInt(50, 120),
      symbols: randomInt(20, 40),
      sessions: randomInt(4, 7),
      highlights: ["Used food vocabulary frequently", "Communicated during morning routine"],
    },
  });

  // Milestone
  if (Math.random() < 0.7) {
    insightsList.push({
      childId: child.id,
      type: "milestone",
      severity: null,
      title: "50 Symbol Milestone Reached!",
      body: `${child.name} has now used 50 different symbols. This shows expanding vocabulary.`,
      content: {
        milestone: "50_symbols",
        achieved: true,
        date: formatDate(getDateDaysAgo(5)),
      },
    });
  }

  // Suggestion
  insightsList.push({
    childId: child.id,
    type: "suggestion",
    severity: null,
    title: "Morning Routine Opportunity",
    body: `${child.name} is most active between 7-9am. Consider adding routine symbols during this time.`,
    content: {
      suggestionType: "routine_optimization",
      peakHours: [7, 8, 9],
      suggestedSymbols: ["action-brush-teeth", "action-get-dressed", "food-breakfast"],
    },
  });

  // Weekly report
  insightsList.push({
    childId: child.id,
    type: "weekly_report",
    severity: "info",
    title: "Week of " + formatDate(getDateDaysAgo(7)),
    body: "This week showed positive growth with increased vocabulary usage.",
    content: {
      totalTaps: randomInt(400, 600),
      avgDailyTaps: randomInt(60, 90),
      uniqueSymbols: randomInt(30, 45),
      trend: "improving",
    },
  });

  // Regression alert (20% chance)
  if (Math.random() < 0.2) {
    insightsList.push({
      childId: child.id,
      type: "regression_alert",
      severity: "warning",
      title: "Vocabulary Regression Detected",
      body: "Some frequently used symbols have not appeared recently.",
      content: {
        lostWords: ["food-apple", "action-play"],
        daysAbsent: 5,
      },
    });
  }

  // Insert all insights
  await db.insert(insights).values(insightsList);
  console.log(`  ✓ Generated ${insightsList.length} insights`);
}

async function generateGoalsForChild(child: Child, therapistsList: Therapist[]) {
  console.log(`\n🎯 Generating goals for ${child.name}...`);

  const goalTemplates = [
    { title: "Increase vocabulary to 50 core words", therapyType: "aac", category: "communication", progress: randomInt(40, 70) },
    { title: "Use 3-word phrases consistently", therapyType: "aac", category: "communication", progress: randomInt(20, 50) },
    { title: "Request items using AAC device", therapyType: "slp", category: "communication", progress: randomInt(60, 90) },
    { title: "Follow 2-step directions", therapyType: "slp", category: "language", progress: randomInt(30, 60) },
    { title: "Develop fine motor skills for device navigation", therapyType: "ot", category: "motor", progress: randomInt(50, 80) },
  ];

  const numGoals = randomInt(3, 4);
  const selectedGoals = goalTemplates.sort(() => Math.random() - 0.5).slice(0, numGoals);

  for (const goalData of selectedGoals) {
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + randomInt(30, 90));

    await db.insert(goals).values({
      childId: child.id,
      title: goalData.title,
      description: `Working on ${goalData.title.toLowerCase()} through practice.`,
      therapyType: goalData.therapyType,
      category: goalData.category,
      status: goalData.progress >= 90 ? "achieved" : "active",
      progressPercent: goalData.progress,
      targetDate: formatDate(targetDate),
      therapistId: therapistsList[0].id, // SLP
    });
  }

  console.log(`  ✓ Generated ${numGoals} goals`);
}

async function generateSessionsForChild(child: Child, therapistsList: Therapist[]) {
  console.log(`\n📝 Generating therapy sessions for ${child.name}...`);

  const numSessions = randomInt(8, 12);
  const weeksSpread = 8;

  for (let i = 0; i < numSessions; i++) {
    const daysAgo = Math.floor((i / numSessions) * weeksSpread * 7);
    const sessionDate = getDateDaysAgo(daysAgo);

    // Most sessions with SLP
    const therapist = Math.random() < 0.7 ? therapistsList[0] : randomChoice(therapistsList);

    await db.insert(therapySessions).values({
      childId: child.id,
      therapistId: therapist.id,
      therapyType: "slp",
      sessionDate: formatDate(sessionDate),
      durationMinutes: randomChoice([30, 45, 60]),
      notes: randomChoice([
        `${child.name} showed good engagement today.`,
        `Worked on expanding vocabulary. Great progress!`,
        `Some difficulty with attention. May need shorter activities.`,
        `Excellent session! ${child.name} initiated communication multiple times.`,
      ]),
    });
  }

  console.log(`  ✓ Generated ${numSessions} therapy sessions`);
}

// ============================================================================
// MAIN EXECUTION
// ============================================================================

async function main() {
  console.log("🌱 Flynn AAC Database Seeding Script");
  console.log(`   Days of data: ${DAYS_OF_DATA}`);
  console.log(`   Clean first: ${CLEAN_FIRST}`);

  const startTime = Date.now();

  try {
    if (CLEAN_FIRST) {
      await cleanDatabase();
    }

    const childrenList = await seedFamiliesAndChildren();
    const therapistsList = await seedTherapists();
    await linkTherapistsToChildren(childrenList, therapistsList);

    // Process each child
    for (let i = 0; i < childrenList.length; i++) {
      const child = childrenList[i];
      const profile = CHILD_PROFILES[i];

      await generateUsageLogsForChild(child, profile.profileType, DAYS_OF_DATA);
      await computeMetricsForChild(child, DAYS_OF_DATA);
      await generateInsightsForChild(child);
      await generateGoalsForChild(child, therapistsList);
      await generateSessionsForChild(child, therapistsList);
    }

    // Summary
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log("\n" + "=".repeat(60));
    console.log("✅ Seeding completed successfully!");
    console.log(`⏱️  Time elapsed: ${elapsed}s`);
    console.log("=".repeat(60));

    // Count verification
    console.log("\n📊 Record Counts:");
    const counts = {
      families: await db.select({ count: sql<number>`count(*)` }).from(families),
      children: await db.select({ count: sql<number>`count(*)` }).from(children),
      caregivers: await db.select({ count: sql<number>`count(*)` }).from(caregivers),
      therapists: await db.select({ count: sql<number>`count(*)` }).from(therapists),
      therapistClients: await db.select({ count: sql<number>`count(*)` }).from(therapistClients),
      usageLogs: await db.select({ count: sql<number>`count(*)` }).from(usageLogs),
      dailyMetrics: await db.select({ count: sql<number>`count(*)` }).from(dailyMetrics),
      weeklyMetrics: await db.select({ count: sql<number>`count(*)` }).from(weeklyMetrics),
      insights: await db.select({ count: sql<number>`count(*)` }).from(insights),
      goals: await db.select({ count: sql<number>`count(*)` }).from(goals),
      therapySessions: await db.select({ count: sql<number>`count(*)` }).from(therapySessions),
    };

    for (const [table, result] of Object.entries(counts)) {
      console.log(`  ${table.padEnd(20)} ${result[0].count}`);
    }

    process.exit(0);
  } catch (error) {
    console.error("\n❌ Seeding failed:", error);
    process.exit(1);
  }
}

main();
