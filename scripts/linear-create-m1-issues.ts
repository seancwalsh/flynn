/**
 * Creates M1: Core AAC issues in Linear
 */

import { LinearClient } from "@linear/sdk";
import "dotenv/config";

interface UserStory {
  title: string;
  labels: string[];
  milestone: string;
  description: string;
}

const ISSUES: UserStory[] = [
  {
    title: "Symbol tap plays audio within 100ms",
    labels: ["child-app"],
    milestone: "M1: Core AAC",
    description: `**User Story:**
As a child, I can tap a symbol to hear the word spoken aloud in my current language (Bulgarian or English), so I can communicate my needs immediately without delay.

**Acceptance Criteria:**
- [ ] Symbol tap triggers audio playback within 100ms
- [ ] Visual feedback (highlight/scale animation) on tap
- [ ] Audio plays in currently selected language
- [ ] Works fully offline with pre-downloaded TTS audio
- [ ] Tap does not require precise targeting - entire cell is touch target

**Test Specifications:**
\`\`\`
TEST: symbol_tap_plays_audio
  GIVEN the app is open on the main grid
  WHEN user taps any symbol
  THEN audio plays within 100ms
  AND the symbol shows visual tap feedback (scale or highlight)
  AND the audio matches the current language setting

TEST: symbol_tap_offline
  GIVEN device has no network connection
  WHEN user taps a symbol
  THEN audio plays normally from cached TTS files
\`\`\``,
  },
  {
    title: "Phrase builder accumulates symbols and speaks complete phrase",
    labels: ["child-app"],
    milestone: "M1: Core AAC",
    description: `**User Story:**
As a child, I can tap multiple symbols to build a phrase, then tap a "speak" button to hear the complete phrase spoken aloud, so I can express complex thoughts and multi-word requests.

**Acceptance Criteria:**
- [ ] Tapped symbols appear in horizontal phrase bar at top of screen
- [ ] Phrase bar shows symbols in order tapped (left to right)
- [ ] Maximum phrase length of 10 symbols (configurable)
- [ ] "Speak" button plays all symbols as continuous phrase
- [ ] "Clear" button removes all symbols from phrase bar
- [ ] Individual symbol tap in phrase bar removes that symbol
- [ ] Phrase bar persists during category navigation

**Test Specifications:**
\`\`\`
TEST: phrase_builder_accumulates
  GIVEN the phrase builder is empty
  WHEN user taps "I", then "want", then "more"
  THEN phrase builder shows three symbols in left-to-right sequence
  AND speak button is visible and enabled

TEST: phrase_builder_speaks_complete_phrase
  GIVEN phrase builder contains "I", "want", "cookie"
  WHEN user taps the speak button
  THEN audio plays "I want cookie" as continuous speech
  AND phrase builder remains populated (not auto-cleared)

TEST: phrase_builder_clear
  GIVEN phrase builder contains multiple symbols
  WHEN user taps the clear button
  THEN phrase builder becomes empty
  AND speak button becomes disabled

TEST: phrase_builder_remove_single
  GIVEN phrase builder contains "I", "want", "more"
  WHEN user taps the "want" symbol in the phrase bar
  THEN phrase builder shows "I", "more"
  AND symbol order is preserved
\`\`\``,
  },
  {
    title: "Category navigation with consistent symbol positions",
    labels: ["child-app"],
    milestone: "M1: Core AAC",
    description: `**User Story:**
As a child, I can navigate between category pages (Food, Actions, People, Feelings, etc.) with symbols always in the same positions, so I develop motor memory and can communicate faster over time.

**Acceptance Criteria:**
- [ ] Categories displayed as folder symbols on home grid
- [ ] Tapping category opens that category's symbol grid
- [ ] "Back" or "Home" button always in same position (top-left)
- [ ] Symbol positions within categories NEVER change (LAMP compliance)
- [ ] Navigation transitions are fast (<200ms) with no jarring animations
- [ ] Category structure supports 2 levels deep (Home → Category → Subcategory)

**Test Specifications:**
\`\`\`
TEST: category_navigation_opens_grid
  GIVEN user is on home grid
  WHEN user taps "Food" category
  THEN Food category grid is displayed within 200ms
  AND back button is visible in top-left

TEST: symbol_position_consistency
  GIVEN "apple" is at position [1,2] in Food category
  WHEN user navigates away and returns to Food category
  THEN "apple" is still at position [1,2]

TEST: lamp_compliance_across_sessions
  GIVEN "want" is at position [0,1] on home grid
  WHEN app is closed and reopened
  THEN "want" is still at position [0,1]

TEST: back_navigation
  GIVEN user is in Food category
  WHEN user taps back button
  THEN home grid is displayed
  AND back button position was consistent (top-left)
\`\`\``,
  },
  {
    title: "Language toggle switches labels and TTS without moving symbols",
    labels: ["child-app"],
    milestone: "M1: Core AAC",
    description: `**User Story:**
As a caregiver, I can toggle the app language between Bulgarian and English with a single tap, and all symbol labels and text-to-speech switch to the selected language while symbols remain in identical grid positions, so my child can use either language without relearning symbol locations.

**Acceptance Criteria:**
- [ ] Language toggle button accessible from any screen (persistent in header)
- [ ] Toggle switches between Bulgarian (BG) and English (EN)
- [ ] All symbol text labels update to selected language
- [ ] TTS voice switches to appropriate language voice
- [ ] Symbol images remain identical (ARASAAC symbols are language-neutral)
- [ ] Symbol grid positions are 100% identical between languages
- [ ] Current language persists across app restarts
- [ ] Language toggle is large enough for quick caregiver access but not accidentally triggered by child

**Test Specifications:**
\`\`\`
TEST: language_toggle_switches_labels
  GIVEN language is set to Bulgarian
  AND symbol at [2,3] shows label "искам"
  WHEN caregiver taps language toggle
  THEN language switches to English
  AND symbol at [2,3] shows label "want"
  AND symbol image is unchanged

TEST: language_toggle_switches_tts
  GIVEN language is set to English
  WHEN user taps "want" symbol
  THEN audio plays "want" in English voice
  WHEN caregiver toggles to Bulgarian
  AND user taps same symbol
  THEN audio plays "искам" in Bulgarian voice

TEST: language_persists_across_restart
  GIVEN language is set to Bulgarian
  WHEN app is terminated and relaunched
  THEN language is still Bulgarian

TEST: symbol_positions_identical_between_languages
  GIVEN complete symbol grid in English
  WHEN language is toggled to Bulgarian
  THEN every symbol occupies identical grid position
  AND no symbols have moved or swapped
\`\`\``,
  },
  {
    title: "Adjustable grid size with position preservation",
    labels: ["child-app"],
    milestone: "M1: Core AAC",
    description: `**User Story:**
As a caregiver, I can adjust the grid size (4×4, 5×5, 6×6) based on my child's current skill level, with existing symbols maintaining their positions when the grid expands or contracts, so vocabulary can grow without disrupting learned motor patterns.

**Acceptance Criteria:**
- [ ] Grid size options: 4×4 (16 cells), 5×5 (25 cells), 6×6 (36 cells)
- [ ] Grid size setting in caregiver-protected settings menu
- [ ] When expanding grid, existing symbols keep their [row, col] positions
- [ ] New cells added to right edge and bottom edge when expanding
- [ ] When contracting grid, symbols outside new bounds move to first available empty cell (with caregiver warning)
- [ ] Minimum touch target size maintained at all grid sizes (60×60 points minimum)
- [ ] Grid size change requires confirmation to prevent accidental changes

**Test Specifications:**
\`\`\`
TEST: grid_expansion_preserves_positions
  GIVEN grid is 4x4
  AND "want" is at position [1,2]
  WHEN caregiver changes grid to 5x5
  THEN "want" is still at position [1,2]
  AND new empty cells appear at column 5 and row 5

TEST: grid_expansion_adds_cells_correctly
  GIVEN grid is 4x4 (16 cells)
  WHEN caregiver changes grid to 5x5
  THEN grid has 25 cells
  AND 9 new cells are empty and available

TEST: grid_contraction_warning
  GIVEN grid is 5x5
  AND symbols exist at positions [4,x] or [x,4]
  WHEN caregiver attempts to change to 4x4
  THEN warning dialog appears listing affected symbols
  AND caregiver must confirm before change applies

TEST: minimum_touch_target_all_sizes
  GIVEN any grid size setting
  THEN each cell touch target is >= 60x60 points
\`\`\``,
  },
  {
    title: "Full offline functionality for core AAC",
    labels: ["child-app", "infrastructure"],
    milestone: "M1: Core AAC",
    description: `**User Story:**
As a child, I can use all core AAC features (symbol selection, phrase building, audio playback, navigation) without any internet connection, so I can communicate reliably in any environment.

**Acceptance Criteria:**
- [ ] All ARASAAC symbol images stored locally on device
- [ ] All TTS audio files pre-generated and cached locally for both languages
- [ ] Symbol grid data stored in local Core Data database
- [ ] No network calls required for any user-facing AAC feature
- [ ] Usage logs stored locally and synced when network available
- [ ] App launches and functions normally in airplane mode
- [ ] No error messages or degraded experience when offline

**Test Specifications:**
\`\`\`
TEST: offline_symbol_display
  GIVEN device is in airplane mode
  WHEN app launches
  THEN all symbols display correctly with images and labels

TEST: offline_audio_playback
  GIVEN device has no network connection
  WHEN user taps symbols and speaks phrases
  THEN all audio plays correctly

TEST: offline_usage_logging
  GIVEN device is offline
  WHEN user interacts with symbols
  THEN interactions are logged to local database
  AND logs sync when network becomes available

TEST: offline_app_launch
  GIVEN device has never connected to network after app install
  AND initial symbol pack was bundled with app
  WHEN app launches
  THEN app functions normally with bundled content
\`\`\``,
  },
  {
    title: "Visual and audio feedback system",
    labels: ["child-app"],
    milestone: "M1: Core AAC",
    description: `**User Story:**
As a child, I receive clear visual and audio feedback when I interact with the app, so I understand my taps are registered and can build confidence in using the device to communicate.

**Acceptance Criteria:**
- [ ] Symbol tap: subtle scale animation (grow to 110% then return)
- [ ] Symbol tap: brief highlight overlay
- [ ] Phrase bar addition: symbol slides into phrase bar with animation
- [ ] Speak button: visual pulse while audio plays
- [ ] Error states: gentle visual indication (no harsh sounds or red flashing)
- [ ] All animations complete within 200ms
- [ ] Animations can be disabled in accessibility settings
- [ ] No animations block user interaction (non-blocking)

**Test Specifications:**
\`\`\`
TEST: tap_feedback_animation
  GIVEN user taps a symbol
  THEN symbol scales to 110% within 50ms
  AND symbol returns to 100% within 200ms total
  AND highlight overlay appears and fades

TEST: phrase_bar_animation
  GIVEN user taps a symbol
  THEN symbol appears to slide/animate into phrase bar
  AND animation completes within 200ms

TEST: animations_non_blocking
  GIVEN animation is in progress
  WHEN user taps another symbol
  THEN second tap is registered immediately
  AND does not wait for first animation to complete

TEST: animations_can_be_disabled
  GIVEN animations are disabled in settings
  WHEN user taps symbols
  THEN no animations play
  AND symbols still show static feedback (opacity change)
\`\`\``,
  },
];

async function main() {
  const apiKey = process.env.LINEAR_API_KEY;
  if (!apiKey) {
    console.error("❌ LINEAR_API_KEY not found in .env file");
    process.exit(1);
  }

  const client = new LinearClient({ apiKey });
  console.log("🔗 Connecting to Linear...\n");

  // Find team
  const teams = await client.teams();
  const team = teams.nodes.find((t) => t.key === "FLY" || t.name === "Flynn AAC");
  if (!team) {
    console.error("❌ Team 'Flynn AAC' not found. Run linear:setup first.");
    process.exit(1);
  }
  console.log(`✅ Team: ${team.name}\n`);

  // Find project
  const projects = await client.projects({ filter: { name: { eq: "Flynn AAC" } } });
  const project = projects.nodes[0];
  if (!project) {
    console.error("❌ Project 'Flynn AAC' not found. Run linear:setup first.");
    process.exit(1);
  }
  console.log(`✅ Project: ${project.name}\n`);

  // Get milestones
  const milestones = await project.projectMilestones();
  const milestoneMap = new Map(milestones.nodes.map((m) => [m.name, m.id]));

  // Get labels
  const allLabels = await client.issueLabels({ filter: { team: { id: { eq: team.id } } } });
  const labelMap = new Map(allLabels.nodes.map((l) => [l.name, l.id]));

  // Create issues
  console.log("📝 Creating issues...\n");
  for (const issue of ISSUES) {
    const milestoneId = milestoneMap.get(issue.milestone);
    if (!milestoneId) {
      console.error(`   ❌ Milestone "${issue.milestone}" not found, skipping: ${issue.title}`);
      continue;
    }

    const labelIds = issue.labels
      .map((name) => labelMap.get(name))
      .filter((id): id is string => !!id);

    const result = await client.createIssue({
      teamId: team.id,
      projectId: project.id,
      projectMilestoneId: milestoneId,
      title: issue.title,
      description: issue.description,
      labelIds,
    });

    const created = await result.issue;
    console.log(`   ✅ ${created?.identifier}: ${created?.title}`);
  }

  console.log("\n🎉 All issues created!");
  console.log(`\n   View project: https://linear.app/flynn-aac/project/flynn-aac`);
}

main().catch(console.error);
