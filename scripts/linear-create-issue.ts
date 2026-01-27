/**
 * Linear Issue Creation Script
 *
 * Creates issues from user story format with:
 * - Title
 * - User story description
 * - Acceptance criteria checklist
 * - Test specifications
 * - Labels
 * - Milestone assignment
 *
 * Usage: npx tsx scripts/linear-create-issue.ts
 */

import { LinearClient } from "@linear/sdk";
import "dotenv/config";

// Example user story - modify this or import from a file
const ISSUE = {
  title: "Symbol tap plays audio within 100ms",
  milestone: "M1: Core AAC",
  labels: ["child-app"],
  userStory: {
    asA: "non-verbal child using the AAC app",
    iCan: "tap any symbol and hear the corresponding word spoken immediately",
    soThat: "I can communicate my needs without frustrating delays",
  },
  acceptanceCriteria: [
    "Audio plays within 100ms of tap on any device",
    "Audio works in both Bulgarian and English",
    "Audio plays even when device is in silent mode",
    "Visual feedback (highlight) appears simultaneously with audio",
    "Works offline with cached audio files",
  ],
  testSpecs: `
describe('Symbol Audio Playback', () => {
  it('should play audio within 100ms of tap', async () => {
    const startTime = Date.now();
    await tapSymbol('want');
    const audioStarted = await waitForAudioStart();
    expect(audioStarted - startTime).toBeLessThan(100);
  });

  it('should play audio in current language setting', async () => {
    await setLanguage('bg');
    await tapSymbol('want');
    expect(await getPlayingAudioFile()).toContain('bg/want.mp3');
  });

  it('should work offline', async () => {
    await goOffline();
    await tapSymbol('want');
    expect(await isAudioPlaying()).toBe(true);
  });
});
`.trim(),
};

async function main() {
  const apiKey = process.env.LINEAR_API_KEY;

  if (!apiKey) {
    console.error("❌ LINEAR_API_KEY not found in .env file");
    process.exit(1);
  }

  const client = new LinearClient({ apiKey });

  // Find team
  const teams = await client.teams();
  const team = teams.nodes.find((t) => t.key === "AAC");
  if (!team) {
    console.error("❌ Team 'AAC' not found. Run linear:setup first.");
    process.exit(1);
  }

  // Find project
  const projects = await client.projects({ filter: { name: { eq: "AAC App - v1" } } });
  const project = projects.nodes[0];
  if (!project) {
    console.error("❌ Project 'AAC App - v1' not found. Run linear:setup first.");
    process.exit(1);
  }

  // Find milestone
  const milestones = await project.projectMilestones();
  const milestone = milestones.nodes.find((m) => m.name === ISSUE.milestone);
  if (!milestone) {
    console.error(`❌ Milestone '${ISSUE.milestone}' not found.`);
    process.exit(1);
  }

  // Find labels
  const allLabels = await client.issueLabels({ filter: { team: { id: { eq: team.id } } } });
  const labelIds = ISSUE.labels
    .map((name) => allLabels.nodes.find((l) => l.name === name)?.id)
    .filter(Boolean) as string[];

  // Build description
  const description = formatDescription(ISSUE);

  // Create issue
  const result = await client.createIssue({
    teamId: team.id,
    projectId: project.id,
    projectMilestoneId: milestone.id,
    title: ISSUE.title,
    description,
    labelIds,
  });

  const issue = await result.issue;
  console.log(`✅ Created issue: ${issue?.identifier} - ${issue?.title}`);
  console.log(`   URL: ${issue?.url}`);
}

function formatDescription(issue: typeof ISSUE): string {
  const lines: string[] = [];

  // User story
  lines.push("## User Story");
  lines.push("");
  lines.push(`**As a** ${issue.userStory.asA},`);
  lines.push(`**I can** ${issue.userStory.iCan},`);
  lines.push(`**So that** ${issue.userStory.soThat}.`);
  lines.push("");

  // Acceptance criteria
  lines.push("## Acceptance Criteria");
  lines.push("");
  for (const criterion of issue.acceptanceCriteria) {
    lines.push(`- [ ] ${criterion}`);
  }
  lines.push("");

  // Test specs
  lines.push("## Test Specifications");
  lines.push("");
  lines.push("```typescript");
  lines.push(issue.testSpecs);
  lines.push("```");

  return lines.join("\n");
}

main().catch(console.error);
