/**
 * Linear Project Setup Script
 *
 * Creates the AAC App project structure in Linear:
 * - Team (if needed)
 * - Project
 * - Labels
 * - Milestones (as project milestones)
 *
 * Usage: npm run linear:setup
 */

import { LinearClient } from "@linear/sdk";
import "dotenv/config";

const TEAM_NAME = "Flynn AAC";
const TEAM_KEY = "AAC";

const PROJECT = {
  name: "Flynn AAC",
  description: "Bilingual AAC app (BG/EN) with ARASAAC symbols, LAMP motor planning, and AI-powered caregiver coaching.",
};

const LABELS = [
  { name: "child-app", color: "#4EA7FC", description: "AAC app features for Flynn" },
  { name: "companion-app", color: "#8B5CF6", description: "Caregiver companion app features" },
  { name: "ai-coach", color: "#F59E0B", description: "AI/LLM-powered features" },
  { name: "infrastructure", color: "#6B7280", description: "Backend, sync, and data features" },
];

const MILESTONES = [
  { name: "M1: Core AAC", description: "Basic symbol grid, navigation, phrase building, TTS", sortOrder: 1 },
  { name: "M2: Symbol Management", description: "Vocabulary customization, adding/editing symbols", sortOrder: 2 },
  { name: "M3: Data Sync", description: "CloudKit integration, multi-device sync, offline-first", sortOrder: 3 },
  { name: "M4: Companion App Foundation", description: "Basic caregiver app with usage dashboard", sortOrder: 4 },
  { name: "M5: AI Coach", description: "LLM-powered insights, regression detection, coaching", sortOrder: 5 },
];

async function main() {
  const apiKey = process.env.LINEAR_API_KEY;

  if (!apiKey) {
    console.error("❌ LINEAR_API_KEY not found in .env file");
    console.error("   Get your API key from: https://linear.app/settings/api");
    process.exit(1);
  }

  const client = new LinearClient({ apiKey });

  console.log("🔗 Connecting to Linear...\n");

  // Get or create team
  const team = await getOrCreateTeam(client);
  console.log(`✅ Team: ${team.name} (${team.key})\n`);

  // Create labels
  console.log("📝 Setting up labels...");
  for (const label of LABELS) {
    await createLabelIfNotExists(client, team.id, label);
  }
  console.log("");

  // Create project
  console.log("📦 Creating project...");
  const project = await createProjectIfNotExists(client, team.id);
  console.log(`✅ Project: ${project.name}\n`);

  // Create milestones
  console.log("🎯 Setting up milestones...");
  for (const milestone of MILESTONES) {
    await createMilestoneIfNotExists(client, project.id, milestone);
  }

  console.log("\n🎉 Setup complete!");
  console.log(`\n   View project: https://linear.app/team/${team.key}/project/${project.slugId}`);
}

async function getOrCreateTeam(client: LinearClient) {
  const teams = await client.teams();
  let team = teams.nodes.find((t) => t.name === TEAM_NAME || t.key === TEAM_KEY);

  if (!team) {
    console.log(`Creating team "${TEAM_NAME}"...`);
    const result = await client.createTeam({
      name: TEAM_NAME,
      key: TEAM_KEY,
    });
    const createdTeam = await result.team;
    if (!createdTeam) throw new Error("Failed to create team");
    team = createdTeam;
  }

  return team;
}

async function createLabelIfNotExists(
  client: LinearClient,
  teamId: string,
  label: { name: string; color: string; description: string }
) {
  const labels = await client.issueLabels({ filter: { team: { id: { eq: teamId } } } });
  const existing = labels.nodes.find((l) => l.name === label.name);

  if (existing) {
    console.log(`   ⏭️  Label "${label.name}" already exists`);
    return existing;
  }

  const result = await client.createIssueLabel({
    teamId,
    name: label.name,
    color: label.color,
    description: label.description,
  });

  const created = await result.issueLabel;
  console.log(`   ✅ Created label "${label.name}"`);
  return created;
}

async function createProjectIfNotExists(client: LinearClient, teamId: string) {
  const projects = await client.projects({ filter: { name: { eq: PROJECT.name } } });
  let project = projects.nodes[0];

  if (!project) {
    const result = await client.createProject({
      teamIds: [teamId],
      name: PROJECT.name,
      description: PROJECT.description,
    });
    const created = await result.project;
    if (!created) throw new Error("Failed to create project");
    project = created;
    console.log(`   ✅ Created project "${PROJECT.name}"`);
  } else {
    console.log(`   ⏭️  Project "${PROJECT.name}" already exists`);
  }

  return project;
}

async function createMilestoneIfNotExists(
  client: LinearClient,
  projectId: string,
  milestone: { name: string; description: string; sortOrder: number }
) {
  const project = await client.project(projectId);
  const milestones = await project.projectMilestones();
  const existing = milestones.nodes.find((m) => m.name === milestone.name);

  if (existing) {
    console.log(`   ⏭️  Milestone "${milestone.name}" already exists`);
    return existing;
  }

  const result = await client.createProjectMilestone({
    projectId,
    name: milestone.name,
    description: milestone.description,
    sortOrder: milestone.sortOrder,
  });

  const created = await result.projectMilestone;
  console.log(`   ✅ Created milestone "${milestone.name}"`);
  return created;
}

main().catch(console.error);
