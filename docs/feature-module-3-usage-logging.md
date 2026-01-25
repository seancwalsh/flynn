# Feature Module 3: Usage Logging & Data Sync

## User Stories

1. **As a system**, I automatically log every symbol tap with timestamp, symbol ID, language used, and context (category path, position in phrase), so we have complete communication data for AI analysis.

2. **As a system**, I log phrase completions (when "speak" is tapped) as distinct events capturing the full phrase, total construction time, and any edits made (symbols removed/reordered), so we can analyze sentence-building patterns.

3. **As a system**, I track session data including session start/end times, total symbols used, unique symbols used, and longest phrase, so caregivers can see engagement patterns over time.

4. **As a system**, I store all logs locally in Core Data and sync to CloudKit when network is available, using conflict-free merge strategies, so no data is ever lost and multiple devices stay consistent.

5. **As a caregiver**, I can see which device/location a communication session happened on (home iPad, dad's iPhone, therapy iPad), so I can correlate usage patterns with environments.

6. **As a system**, I tag each log entry with the active caregiver profile if one is set (mom, dad, ABA therapist, OT), so we can analyze communication patterns with different partners.

7. **As a system**, I detect and flag potential regression patterns (symbols used frequently in past 2 weeks that haven't been used in past 5 days), so this data is available for the AI coach to surface.

8. **As a caregiver**, I can export raw usage data as CSV or JSON for external analysis or sharing with therapists who want the raw data, so we're never locked into just our app's analytics.

## Acceptance Criteria

- Every symbol tap logged within 10ms (non-blocking to UI)
- Logs stored locally even when offline, queue never blocks user interaction
- CloudKit sync completes within 30 seconds of network availability
- Conflict resolution uses timestamp-based last-write-wins for metadata, append-only for log entries
- Device identification persists across app reinstalls (using iCloud account identifier)
- Regression detection algorithm runs locally on-device daily
- Data export includes all fields with ISO 8601 timestamps

## Test Specifications

### TEST: symbol_tap_logging_complete

```
GIVEN child taps symbol "want" in Home category
THEN log entry contains:
  - timestamp (ISO 8601)
  - symbol_id
  - symbol_label_displayed (language-specific)
  - language_setting (BG/EN)
  - category_path (e.g., "home")
  - grid_position ([row, col])
  - session_id
  - device_id
  - caregiver_profile_id (if set)
```

### TEST: phrase_completion_logging

```
GIVEN child builds phrase "I want cookie" and taps speak
THEN phrase_completion log entry contains:
  - all symbol_ids in order
  - construction_time_ms (first tap to speak tap)
  - edits_made (symbols removed or reordered)
  - final_phrase_length
```

### TEST: offline_logging_queues

```
GIVEN device is offline
WHEN child uses app for 30 minutes with 200 symbol taps
THEN all 200 entries stored locally
AND when network resumes, all entries sync to CloudKit
AND no duplicates created
```

### TEST: multi_device_sync_consistency

```
GIVEN child uses home iPad while dad's iPhone is offline
WHEN dad's iPhone comes online
THEN all new log entries appear on dad's iPhone
AND no data conflicts or losses
```

### TEST: regression_detection_flags

```
GIVEN "help" was used 15 times in days 1-10
AND "help" was used 0 times in days 11-16
WHEN regression detection runs on day 16
THEN "help" is flagged as potential regression
AND flag includes last_used_date and previous_frequency
```

### TEST: data_export_complete

```
GIVEN 30 days of usage data exists
WHEN caregiver exports as JSON
THEN export contains all log entries with all fields
AND timestamps are ISO 8601 format
AND file can be re-imported without data loss
```
