# Parallel Vocabulary Systems

## Problem

The current `VocabularyStructure.swift` treats Bulgarian as translated English - every English word has a Bulgarian equivalent in the same grid position. Research shows this is an anti-pattern:

> "Lists from one language cannot and should not be assumed to be translatable, as words represent language-specific concepts and grammar." - Soto & Tönsing (2024)

## Current State

```swift
VocabularyWord(id: "want", english: "want", bulgarian: "искам", category: .verb, row: 1, col: 0)
```

This assumes:
- "want" and "искам" have identical communicative frequency
- Both belong in the same grid position
- The same 42 core words work for both languages

## Proposed Solution

### Two Vocabulary Systems, Shared Navigation

1. **Shared folder/navigation structure** - Categories like Food, People, Places remain in the same positions
2. **Language-specific core vocabulary** - The words on the home screen may differ between languages
3. **Per-button language assignment** - Some buttons might only exist in one language

### Data Model Changes

```swift
struct VocabularyWord {
    let id: String
    let languages: [Language: LanguageContent]  // Not just labels
    let category: WordCategory
    let gridPosition: GridPosition?
    let languageAvailability: Set<Language>  // Which languages have this word
}

struct LanguageContent {
    let label: String
    let audioFile: String?
    let conjugations: [String: String]?  // For verbs
}
```

### Position Strategy

| Scenario | Approach |
|----------|----------|
| Word translates cleanly | Same position, different labels |
| Word exists only in English | Show in English mode, hide in Bulgarian mode |
| Word exists only in Bulgarian | Hide in English mode, show in Bulgarian mode |
| Different core words needed | Language-specific positions with consistent navigation |

## Research Support

- Proloquo2Go "optimizes each language independently while keeping folder hierarchy identical"
- This preserves navigation motor patterns even when specific word placement differs
- Cross-linguistic core vocabulary research shows the *types* of words are universal (pronouns, verbs, prepositions) but specific words differ

## Implementation Steps

1. [ ] Add `languageAvailability` field to vocabulary words
2. [ ] Create Bulgarian-specific core word analysis (consult with Bulgarian SLP)
3. [ ] Implement grid filtering based on current language
4. [ ] Allow empty cells where a word doesn't exist in current language
5. [ ] Document which words are shared vs. language-specific

## Open Questions

- Should we consult with a Bulgarian speech-language pathologist (логопед)?
- Can we analyze Bulgarian children's speech corpora to identify true Bulgarian core vocabulary?
- How do we handle the transition when a child has already learned positions?

## References

- Soto & Tönsing (2024) - Cross-linguistic core vocabulary analysis
- AssistiveWare Proloquo2Go multilingual approach
- UNICEF Cboard Bulgarian implementation
