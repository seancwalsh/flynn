/**
 * Create Design System issue in Linear
 *
 * Usage: bun scripts/linear-create-design-system-issue.ts
 */

import { LinearClient } from "@linear/sdk";
import "dotenv/config";

const ISSUE = {
  title: "Design System: Warm, sensory-friendly visual foundation",
  milestone: "M1: Core AAC",
  labels: ["child-app", "design"],
  description: `## Overview

Establish the visual design system for the Flynn AAC app with a **calm, warm, distraction-free** aesthetic. The child has sensory sensitivities to bright colors, high contrast, and busy patterns.

## Design Philosophy

- **Child AAC App**: Focused, distraction-free. Symbols do the talking, UI disappears.
- **Caregiver App**: Professional yet warm - like a thoughtful journal meets health dashboard.

## Requirements

### Color Tokens
- Warm, muted tones only - no bright primaries
- Background: subtle warm paper texture (soft cream/off-white)
- Dark mode: warm charcoal (not pure black)
- LAMP category colors (muted): sage green (verbs), dusty yellow (nouns), muted rose (social)

### Typography
- Clean sans-serif for symbol labels (Bulgarian Cyrillic + English Latin)
- Generous letter-spacing for readability

### Grid & Layout
- Subtle 1px warm gray grid lines
- Minimum 60x60pt touch targets
- Generous padding within cells

### Animation Specs
- Subtle scale on tap (105% max)
- Soft opacity transitions
- No bounces, wobbles, or particle effects
- Option to disable all animations

### What to Avoid
- Bright/primary/neon colors
- High contrast borders/shadows
- Decorative elements, mascots, gamification
- Any visual complexity not serving communication

## Acceptance Criteria

- [ ] Color tokens defined for both apps, light/dark modes
- [ ] Typography scale with Bulgarian Cyrillic support
- [ ] Spacing system (4px base unit)
- [ ] SwiftUI theme file with reusable view modifiers
- [ ] Paper texture treatment specified
- [ ] Animation specs documented
- [ ] Accessibility considerations documented

## Test Specifications

\`\`\`swift
import Testing
@testable import FlynnAAC

struct DesignSystemTests {
    @Test func colorTokensAreDefined() {
        // Verify all color tokens exist
        #expect(FlynnTheme.Colors.background != nil)
        #expect(FlynnTheme.Colors.surface != nil)
        #expect(FlynnTheme.Colors.textPrimary != nil)
    }

    @Test func touchTargetsMinimum60Points() {
        #expect(FlynnTheme.Layout.minimumTouchTarget >= 60)
    }

    @Test func animationScaleIsSubtle() {
        #expect(FlynnTheme.Animation.tapScale <= 1.05)
    }

    @Test func darkModeUsesWarmCharcoal() {
        // Dark background should not be pure black
        // RGB values should have warmth (R slightly > B)
    }
}
\`\`\`
`,
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
  const team = teams.nodes.find((t) => t.key === "FLY" || t.key === "AAC");
  if (!team) {
    console.log("Available teams:", teams.nodes.map((t) => `${t.key}: ${t.name}`).join(", "));
    console.error("❌ Team 'FLY' or 'AAC' not found.");
    process.exit(1);
  }

  // Find or create labels
  const allLabels = await client.issueLabels({
    filter: { team: { id: { eq: team.id } } },
  });

  const labelIds: string[] = [];
  for (const labelName of ISSUE.labels) {
    let label = allLabels.nodes.find((l) => l.name === labelName);
    if (!label) {
      const result = await client.createIssueLabel({
        teamId: team.id,
        name: labelName,
      });
      label = await result.issueLabel;
    }
    if (label) labelIds.push(label.id);
  }

  // Create issue
  const result = await client.createIssue({
    teamId: team.id,
    title: ISSUE.title,
    description: ISSUE.description,
    labelIds,
  });

  const issue = await result.issue;
  console.log(`✅ Created issue: ${issue?.identifier} - ${issue?.title}`);
  console.log(`   URL: ${issue?.url}`);

  return issue?.identifier;
}

main().catch(console.error);
