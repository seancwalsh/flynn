/**
 * Auto-detect test pass → update Linear + PRD passes field
 *
 * This script:
 * 1. Runs xcodebuild test
 * 2. Parses output for passing test suites
 * 3. Updates Linear issues for passing tests
 * 4. Updates docs/prd.json passes field
 *
 * Usage: npx tsx scripts/linear-check-tests.ts
 */

import { execSync } from "child_process";
import { readFileSync, writeFileSync, existsSync } from "fs";
import { LinearClient } from "@linear/sdk";
import "dotenv/config";

// Maps test suites to requirement IDs
const TEST_TO_ISSUE_MAP: Record<string, string> = {
  DesignSystemTests: "FLY-4",
  SymbolTests: "FLY-5",
  AudioServiceTests: "FLY-5",
  PhraseTests: "FLY-6",
  PhraseEngineTests: "FLY-6",
  CategoryTests: "FLY-7",
  LanguageTests: "FLY-8",
  GridTests: "FLY-9",
  OfflineTests: "FLY-10",
  FeedbackTests: "FLY-11",
};

interface PRD {
  project: unknown;
  milestones: unknown;
  requirements: Array<{
    id: string;
    category: string;
    description: string;
    steps: string[];
    passes: boolean;
  }>;
}

async function main() {
  const apiKey = process.env.LINEAR_API_KEY;
  if (!apiKey) {
    console.log("⚠️  LINEAR_API_KEY not found - skipping Linear updates");
  }

  const client = apiKey ? new LinearClient({ apiKey }) : null;

  // Read PRD
  const prdPath = "docs/prd.json";
  if (!existsSync(prdPath)) {
    console.error(`❌ PRD file not found at ${prdPath}`);
    process.exit(1);
  }

  const prd: PRD = JSON.parse(readFileSync(prdPath, "utf-8"));

  // Run tests
  console.log("🧪 Running tests...");
  let output: string;
  try {
    output = execSync(
      "xcodebuild test -project FlynnAAC/FlynnAAC.xcodeproj -scheme FlynnAAC -destination 'id=127FF9EE-69AE-4F56-A447-4AF263902755' 2>&1 || true",
      { encoding: "utf-8", maxBuffer: 10 * 1024 * 1024 }
    );
  } catch (error: unknown) {
    // xcodebuild returns non-zero on test failure, but we still want to parse output
    const e = error as { stdout?: string; stderr?: string; message?: string };
    output = e.stdout || e.stderr || e.message || "";
    console.log("⚠️  Some tests may have failed");
  }

  // Debug: show what we're searching
  const hasTestOutput = output.includes("Suite") && output.includes("passed");
  if (!hasTestOutput) {
    console.log("⚠️  No test results found in output");
  }

  const passedIssues = new Set<string>();

  // Check which test suites passed
  for (const [testName, issueId] of Object.entries(TEST_TO_ISSUE_MAP)) {
    // Match patterns like "Suite SymbolTests passed" or "Test Suite 'SymbolTests' passed"
    const passedRegex = new RegExp(
      `(Suite ${testName} passed|Test Suite '${testName}' passed)`,
      "i"
    );

    if (passedRegex.test(output)) {
      passedIssues.add(issueId);
    }
  }

  // Update PRD passes field
  let prdUpdated = false;
  for (const issueId of passedIssues) {
    const req = prd.requirements.find((r) => r.id === issueId);
    if (req && !req.passes) {
      req.passes = true;
      prdUpdated = true;
      console.log(`✅ ${issueId}: tests passed - updated PRD`);

      // Update Linear issue if client is available
      if (client) {
        try {
          await markIssueComplete(client, issueId);
          console.log(`   └─ Linear issue ${issueId} marked as Done`);
        } catch (error) {
          console.log(
            `   └─ Could not update Linear: ${(error as Error).message}`
          );
        }
      }
    } else if (req?.passes) {
      console.log(`✓ ${issueId}: already marked as passing`);
    }
  }

  // Write updated PRD
  if (prdUpdated) {
    writeFileSync(prdPath, JSON.stringify(prd, null, 2) + "\n");
    console.log("\n📝 PRD updated");
  }

  // Summary
  const passingCount = prd.requirements.filter((r) => r.passes).length;
  const totalCount = prd.requirements.length;
  console.log(`\n📊 Progress: ${passingCount}/${totalCount} requirements passing`);

  if (passingCount === totalCount) {
    console.log("🎉 All requirements passing!");
  }
}

async function markIssueComplete(
  client: LinearClient,
  issueIdentifier: string
) {
  // Search for issue by identifier (e.g., "FLY-5")
  const searchResult = await client.searchIssues(issueIdentifier);
  const issue = searchResult.nodes.find(
    (i) => i.identifier === issueIdentifier
  );

  if (!issue) {
    throw new Error(`Issue ${issueIdentifier} not found`);
  }

  const team = await issue.team;
  if (!team) {
    throw new Error(`Could not find team for issue ${issueIdentifier}`);
  }

  const states = await team.states();
  const doneState = states.nodes.find(
    (s) => s.name === "Done" || s.name === "Completed"
  );

  if (!doneState) {
    throw new Error(`Could not find 'Done' state in team workflow`);
  }

  await client.updateIssue(issue.id, { stateId: doneState.id });
}

main().catch((error) => {
  console.error("Error:", error.message);
  process.exit(1);
});
