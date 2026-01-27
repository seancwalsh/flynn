/**
 * Mark a Linear issue as Done
 *
 * Usage: npx tsx scripts/linear-complete-issue.ts FLY-5
 */

import { LinearClient } from "@linear/sdk";
import "dotenv/config";

const issueIdentifier = process.argv[2]; // e.g., "FLY-5"

async function main() {
  if (!issueIdentifier) {
    console.error("Usage: npx tsx scripts/linear-complete-issue.ts <issue-id>");
    console.error("Example: npx tsx scripts/linear-complete-issue.ts FLY-5");
    process.exit(1);
  }

  const apiKey = process.env.LINEAR_API_KEY;
  if (!apiKey) {
    console.error("❌ LINEAR_API_KEY not found in .env file");
    process.exit(1);
  }

  const client = new LinearClient({ apiKey });

  // Find the issue by searching
  const searchResult = await client.searchIssues(issueIdentifier);
  const issue = searchResult.nodes.find(
    (i) => i.identifier === issueIdentifier
  );

  if (!issue) {
    console.error(`❌ Issue ${issueIdentifier} not found`);
    process.exit(1);
  }

  // Get the team's workflow states
  const team = await issue.team;
  if (!team) {
    console.error(`❌ Could not find team for issue ${issueIdentifier}`);
    process.exit(1);
  }

  const states = await team.states();
  const doneState = states.nodes.find(
    (s) => s.name === "Done" || s.name === "Completed"
  );

  if (!doneState) {
    console.error(`❌ Could not find 'Done' state in team workflow`);
    console.log(
      "Available states:",
      states.nodes.map((s) => s.name).join(", ")
    );
    process.exit(1);
  }

  // Update the issue
  await client.updateIssue(issue.id, { stateId: doneState.id });
  console.log(`✅ ${issueIdentifier} marked as Done`);
}

main().catch((error) => {
  console.error("Error:", error.message);
  process.exit(1);
});
