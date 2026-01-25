# Feature Module 5: AI Coach

## User Stories

1. **As a caregiver**, I receive daily digest notifications summarizing yesterday's communication highlights, emerging patterns, and one actionable suggestion, so I stay informed without needing to open the app.

2. **As a caregiver**, I receive real-time push notifications for milestone moments (first time using a word combination, longest phrase ever, using a word that was regressing), so I can celebrate progress and reinforce successes immediately.

3. **As a caregiver**, I can view a weekly coaching report with deeper analysis including vocabulary growth rate, regression risks, partner comparison insights, and prioritized recommendations, so I have structured guidance for the week ahead.

4. **As a caregiver**, I can see regression alerts highlighting specific words that have dropped off, with context on when they were last used, previous frequency, and suggested modeling activities, so I can intervene before skills are lost.

5. **As a caregiver**, I can see word combination suggestions based on current vocabulary (e.g., "Nikolai uses 'want' and 'cookie' separately - try modeling 'want cookie' together"), so I can support phrase development.

6. **As a caregiver**, I can see new word suggestions based on developmental progression, current vocabulary gaps, and usage patterns (e.g., "Consider adding 'help' - it's a high-value core word missing from the current set"), so vocabulary grows strategically.

7. **As a caregiver**, I can ask the AI coach free-form questions about my child's communication patterns and get responses grounded in actual usage data (e.g., "Does he communicate more in the morning or afternoon?"), so I can explore insights conversationally.

8. **As a caregiver**, I can see coaching suggestions tailored to my role - parents get suggestions integrated into daily routines, therapists get session-planning recommendations with data to support goals, so advice is actionable for my context.

9. **As a caregiver**, I experience the AI coach in my preferred personality - warm/encouraging emphasizes celebration and gentle guidance, clinical/data-focused emphasizes metrics and evidence-based recommendations, so insights feel right for me.

10. **As a caregiver**, I can view the data and reasoning behind any AI recommendation by tapping "why this suggestion?", so I understand the coach's logic and can trust its guidance.

## Acceptance Criteria

- Daily digest delivered between 7-8am local time (configurable)
- Real-time milestone notifications delivered within 60 seconds of event
- Weekly report generated every Sunday evening (configurable day)
- Regression alerts trigger when word unused for 5+ days after 5+ uses in prior 2 weeks (thresholds configurable)
- AI responses grounded in actual data - no hallucinated statistics
- Free-form question responses return within 5 seconds
- All AI features use Anthropic API (Claude)
- Personality toggle changes tone without changing underlying recommendations
- "Why this suggestion?" shows specific data points that triggered the recommendation

## Test Specifications

### TEST: daily_digest_content

```
GIVEN yesterday had 52 symbol taps, 6 phrases, new use of "more + cookie"
WHEN daily digest generates
THEN digest includes:
  - total symbols and comparison to 7-day average
  - highlight of "more + cookie" combination
  - one specific actionable suggestion
AND digest tone matches user's personality preference
```

### TEST: daily_digest_timing

```
GIVEN user's notification time is set to 7:30am
WHEN daily digest is scheduled
THEN notification delivers between 7:25-7:35am local time
```

### TEST: milestone_notification_realtime

```
GIVEN child's previous longest phrase was 3 words
WHEN child builds and speaks a 4-word phrase
THEN push notification sent within 60 seconds
AND notification celebrates the specific achievement
```

### TEST: milestone_regression_recovery

```
GIVEN "help" was flagged as regressing 3 days ago
WHEN child uses "help" today
THEN push notification sent celebrating the return
AND regression flag is cleared
```

### TEST: weekly_report_comprehensive

```
WHEN weekly report generates on Sunday
THEN report includes:
  - vocabulary growth (new words added vs adopted)
  - regression risk list with specific words
  - usage by partner comparison
  - top 3 prioritized recommendations for coming week
  - comparison to previous week
```

### TEST: regression_alert_specificity

```
GIVEN "go" was used 8 times in days 1-14
AND "go" was used 0 times in days 15-20
WHEN regression analysis runs
THEN alert shows:
  - word: "go"
  - last used: [specific date]
  - previous frequency: "8 times in 2 weeks"
  - suggested activity: contextual modeling suggestion
```

### TEST: word_combination_suggestion_grounded

```
GIVEN child uses "want" 20 times and "drink" 15 times
AND "want drink" combination used 0 times
WHEN AI generates suggestions
THEN suggestion includes "try modeling 'want drink'"
AND "why?" shows the specific usage counts
```

### TEST: new_word_suggestion_developmental

```
GIVEN current vocabulary is missing core word "help"
AND child successfully uses "want", "more", "stop"
WHEN AI generates new word suggestions
THEN "help" is recommended
AND reasoning references core vocabulary research and current mastery
```

### TEST: freeform_question_data_grounded

```
GIVEN user asks "when does he communicate most?"
WHEN AI processes question
THEN response references actual hourly usage distribution
AND no statistics are hallucinated
AND response returns within 5 seconds
```

### TEST: role_tailored_suggestions_parent

```
GIVEN user role is "parent"
WHEN AI generates suggestion for practicing "help"
THEN suggestion references daily routines (meals, play, bedtime)
AND tone is warm and integrated into family life
```

### TEST: role_tailored_suggestions_therapist

```
GIVEN user role is "ABA therapist"
WHEN AI generates suggestion for practicing "help"
THEN suggestion references session structure and discrete trials
AND includes baseline data and suggested mastery criteria
```

### TEST: personality_warm_tone

```
GIVEN personality is "warm/encouraging"
WHEN daily digest generates
THEN language celebrates successes first
AND challenges framed as opportunities
AND uses encouraging phrases
```

### TEST: personality_clinical_tone

```
GIVEN personality is "clinical/data-focused"
WHEN daily digest generates
THEN language leads with metrics
AND includes specific percentages and comparisons
AND recommendations reference evidence base
```

### TEST: why_this_suggestion_transparency

```
GIVEN AI suggests "model 'want help' combination"
WHEN user taps "why this suggestion?"
THEN explanation shows:
  - "want" used 34 times this week
  - "help" used 12 times this week
  - combination used 0 times
  - developmental rationale for combining
```
