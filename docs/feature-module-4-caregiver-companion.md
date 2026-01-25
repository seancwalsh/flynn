# Feature Module 4: Caregiver Companion App Foundation

## User Stories

1. **As a caregiver**, I can log in with my Apple ID and see all data for children I have access to, so the app securely connects me to my family's shared data via CloudKit.

2. **As a caregiver**, I can view a dashboard showing today's communication summary (total symbols, unique words, phrases built, total usage time), so I can quickly see how much my child communicated today.

3. **As a caregiver**, I can view usage trends over time (daily, weekly, monthly) with simple charts showing symbol count, phrase length, and session frequency, so I can see progress and patterns.

4. **As a caregiver**, I can see a "most used words" list for any time period, so I understand which vocabulary my child relies on most.

5. **As a caregiver**, I can see a "recently added words" list showing new vocabulary and whether it's been used yet, so I can track if newly introduced symbols are being adopted.

6. **As a caregiver**, I can view a "words not used recently" list showing vocabulary that may be regressing, so I know where to focus modeling efforts.

7. **As a caregiver**, I can filter all data views by communication partner (me, spouse, ABA therapist, OT), so I can see how communication patterns differ across caregivers.

8. **As a caregiver**, I can set my profile role (parent, ABA therapist, OT, speech therapist) and personalization preferences, so the app tailors its interface and AI coach personality to my needs.

9. **As a caregiver**, I can set the AI coach personality preference (warm/encouraging or clinical/data-focused) independently of my role if I want to override the default, so I get insights in the tone I prefer.

10. **As a caregiver**, I can tap any metric or word in the dashboard to drill down into detailed logs showing each individual usage instance with timestamp and context, so I can investigate patterns deeply.

## Acceptance Criteria

- Dashboard loads within 2 seconds showing current day data
- Charts render smoothly with 90 days of data points
- Partner filter applies across all views consistently
- Role selection persists and syncs across caregiver's devices
- AI coach personality defaults: warm/encouraging for parent roles, clinical/data-focused for therapist roles
- Drill-down views load within 500ms
- All data respects CloudKit sharing permissions (caregivers only see children they're invited to)

## Test Specifications

### TEST: dashboard_today_summary_accurate

```
GIVEN child used 45 symbols today across 3 sessions
AND built 8 phrases
AND total usage time was 22 minutes
WHEN caregiver opens dashboard
THEN today summary shows:
  - 45 total symbols
  - unique word count (deduplicated)
  - 8 phrases
  - 22 minutes usage time
```

### TEST: trend_chart_weekly_view

```
GIVEN 14 days of usage data exists
WHEN caregiver selects weekly trend view
THEN chart displays 2 weeks of daily data points
AND chart renders within 500ms
AND tapping a data point shows that day's detail
```

### TEST: most_used_words_accuracy

```
GIVEN usage data for past 7 days
WHEN caregiver views "most used words" for 7-day period
THEN words are ranked by tap frequency descending
AND count shown matches actual log entries
```

### TEST: recently_added_tracking

```
GIVEN "butterfly" was added 3 days ago
AND "butterfly" has been tapped 2 times
WHEN caregiver views "recently added" list
THEN "butterfly" appears with "added 3 days ago"
AND shows "used 2 times"
```

### TEST: regression_list_surfaces_unused

```
GIVEN "help" was used 12 times in week 1
AND "help" was used 0 times in week 2
WHEN caregiver views "words not used recently"
THEN "help" appears in list
AND shows previous frequency and days since last use
```

### TEST: partner_filter_applies_globally

```
GIVEN caregiver selects filter "ABA therapist"
WHEN viewing dashboard, trends, and word lists
THEN all data shown is filtered to only ABA sessions
AND filter indicator is visible on all screens
```

### TEST: role_sets_default_coach_personality

```
GIVEN new user selects role "ABA therapist"
THEN AI coach personality defaults to "clinical/data-focused"
GIVEN new user selects role "parent"
THEN AI coach personality defaults to "warm/encouraging"
```

### TEST: personality_override_independent

```
GIVEN user role is "parent" (default: warm)
WHEN user manually sets personality to "clinical"
THEN AI coach uses clinical personality
AND role remains "parent"
```

### TEST: drill_down_shows_full_context

```
GIVEN caregiver taps "want" in most-used list
THEN detail view shows every instance of "want" usage
AND each instance shows: timestamp, phrase context, partner, device
```

### TEST: cloudkit_permission_respected

```
GIVEN therapist is invited with read-only access
WHEN therapist views dashboard
THEN all data is visible
AND no edit/delete options are available
```
