# LLM-Assisted Development Workflow

## Problem

Manually creating vocabulary data is error-prone and time-consuming:
- 150+ words need Bulgarian translations
- Each Bulgarian verb needs 6 conjugated forms
- Cultural appropriateness requires validation
- Consistency across the vocabulary is hard to maintain

## Research Guidance: LLMs as Developer Tools, Not User-Facing

> "For a young child's primary communication system, LLM-generated content introduces unacceptable risks."

> "Key concerns: LLMs are stochastic (same input may produce different outputs), which violates motor planning principles requiring consistent results."

> "Safer LLM applications exist as developer tools rather than user-facing features: assisting vocabulary creation and translation that humans then validate, generating morphologically correct forms for professional review before deployment."

**Critical Principle**: LLM generates → Human validates → Static data ships

## Safe LLM Use Cases

### 1. Verb Conjugation Generation

**Prompt template:**
```
Generate Bulgarian verb conjugations for the following verbs.
Output as JSON with this structure:
{
  "verb_id": {
    "infinitive": "...",
    "english": "...",
    "conjugations": {
      "1sg": "...", "2sg": "...", "3sg": "...",
      "1pl": "...", "2pl": "...", "3pl": "..."
    }
  }
}

Verbs to conjugate:
- искам (want)
- харесвам (like)
- имам (have)
[...]
```

**Workflow:**
1. Run prompt through Claude/GPT
2. Save JSON output
3. Have Bulgarian speaker validate ALL forms
4. Import validated data into VocabularyStructure.swift
5. Never regenerate without re-validation

### 2. Translation Validation

**Prompt template:**
```
Review these English-Bulgarian AAC vocabulary translations for a 5-year-old child.
Flag any issues with:
- Incorrect translations
- Overly formal register (should be child-friendly)
- Cultural inappropriateness
- Better alternative translations

Current vocabulary:
[paste vocabulary list]
```

### 3. Cultural Vocabulary Suggestions

**Prompt template:**
```
Suggest Bulgarian-specific vocabulary for an AAC app that might not have
direct English equivalents. Categories needed:
- Bulgarian foods (beyond баница)
- Bulgarian family terms (beyond мама/татко)
- Bulgarian social phrases
- Bulgarian cultural concepts

For each suggestion, provide:
- Bulgarian word
- Approximate English meaning
- Why it's culturally important
- ARASAAC symbol ID if you know it
```

### 4. Core Vocabulary Analysis

**Prompt template:**
```
Based on research on child language development in Bulgarian,
what are the most frequently used words by Bulgarian children ages 3-6?

Compare to the English core vocabulary list below and identify:
- Words that should be prioritized in Bulgarian
- English words that may be less important in Bulgarian
- Bulgarian-specific words not in the English list

English core vocabulary:
[paste list]
```

## Unsafe LLM Use Cases (DO NOT IMPLEMENT)

| Use Case | Why It's Unsafe |
|----------|-----------------|
| Real-time phrase generation | Stochastic output violates motor planning |
| Dynamic vocabulary suggestions | Could suggest inappropriate content |
| Grammar correction during use | Child needs consistent feedback |
| Contextual word prediction | Unpredictable behavior |
| Voice synthesis prompt generation | Content could be inappropriate |

## Development Workflow

```
┌─────────────────┐
│  Developer      │
│  writes prompt  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  LLM generates  │
│  vocabulary     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Output saved   │
│  as JSON/Swift  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Bulgarian      │
│  speaker review │◄──── REQUIRED GATE
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Validated data │
│  committed to   │
│  codebase       │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  App ships with │
│  static data    │
└─────────────────┘
```

## Implementation: Scripts Directory

Create helper scripts for vocabulary generation:

```
scripts/
├── generate_conjugations.py      # Run LLM prompt for verb conjugations
├── validate_translations.py      # Check translations against rules
├── import_vocabulary.swift       # Convert JSON to Swift
└── prompts/
    ├── conjugation_prompt.md
    ├── translation_review_prompt.md
    └── cultural_vocabulary_prompt.md
```

### Example Script: generate_conjugations.py

```python
import anthropic
import json

VERBS = [
    ("искам", "want"),
    ("харесвам", "like"),
    # ... more verbs
]

def generate_conjugations():
    client = anthropic.Anthropic()

    prompt = f"""Generate Bulgarian verb conjugations...
    {json.dumps(VERBS)}
    """

    response = client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=4096,
        messages=[{"role": "user", "content": prompt}]
    )

    # Save for human review
    with open("conjugations_REVIEW_REQUIRED.json", "w") as f:
        f.write(response.content[0].text)

    print("⚠️  OUTPUT REQUIRES HUMAN VALIDATION BEFORE USE")

if __name__ == "__main__":
    generate_conjugations()
```

## Validation Checklist

Before importing any LLM-generated content:

- [ ] Bulgarian native speaker has reviewed ALL items
- [ ] Translations are appropriate for child (not overly formal)
- [ ] Verb conjugations are grammatically correct
- [ ] No inappropriate or offensive content
- [ ] Cultural items are actually relevant to Bulgarian children
- [ ] ARASAAC IDs (if provided) have been verified
- [ ] Data has been diffed against previous version for unexpected changes

## Privacy Considerations

> "AAC users have an absolute right to privacy regarding what they say."

- Never send user-generated phrases to LLM APIs
- Never log or analyze what the child communicates
- LLM usage is strictly for development-time vocabulary generation
- All LLM processing happens on developer machine, not user device

## Future Considerations

If LLM technology improves to guarantee:
- Deterministic outputs
- Content safety
- On-device processing (no cloud)

Then reconsider limited user-facing features. Until then, static validated data only.

## References

- Google SpeakFaster (2024) - Adult AAC with AI (different context)
- Common Sense Media - AI content safety research
- UNICEF AI and children guidelines
- AssistiveWare privacy policy
