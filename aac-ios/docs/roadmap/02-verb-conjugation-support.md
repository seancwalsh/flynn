# Verb Conjugation Support

## Problem

Bulgarian verbs conjugate for person and number. Our current implementation stores only one form:

```swift
VocabularyWord(id: "want", english: "want", bulgarian: "искам", ...)
```

But Bulgarian speakers need access to six forms:

| Person | Singular | Plural |
|--------|----------|--------|
| 1st | искам (I want) | искаме (we want) |
| 2nd | искаш (you want) | искате (you all want) |
| 3rd | иска (he/she/it wants) | искат (they want) |

A child saying "той иска вода" (he wants water) cannot currently produce grammatically correct output.

## Research Guidance

> "Cross-linguistic research on agglutinative languages like Zulu offers a model... identified 213 core formatives (morphological units) rather than whole words. This suggests Bulgarian AAC should consider organizing by stems with accessible inflectional endings."

> "For Bulgarian verb conjugation specifically, an LLM could generate all six person/number forms from an infinitive for a developer to review and import—far safer than generating forms dynamically during communication."

## Proposed Solution

### Option A: Pre-generated Conjugation Tables (Recommended)

Store all conjugated forms at build time:

```swift
struct BulgarianVerb {
    let stem: String
    let infinitive: String  // искам (1st person singular as citation form)
    let conjugations: [Person: [Number: String]]

    enum Person: String, CaseIterable {
        case first, second, third
    }

    enum Number: String, CaseIterable {
        case singular, plural
    }
}

// Example
let want = BulgarianVerb(
    stem: "иск",
    infinitive: "искам",
    conjugations: [
        .first: [.singular: "искам", .plural: "искаме"],
        .second: [.singular: "искаш", .plural: "искате"],
        .third: [.singular: "иска", .plural: "искат"]
    ]
)
```

### Option B: Stem + Ending Buttons

Provide verb stem button plus ending buttons that can be combined:

```
[иск-] + [-ам] → искам
[иск-] + [-аш] → искаш
```

**Pros**: More flexible, teaches morphology
**Cons**: More complex for young children, requires understanding of conjugation

### Recommended Approach for MVP

1. **Default to 1st person singular** (искам) - matches how children typically start
2. **Store all conjugations** in vocabulary structure
3. **Add conjugation picker UI** - tap-and-hold or swipe to select person/number
4. **Pronoun + verb auto-agreement** (future) - selecting "той" (he) could automatically suggest 3rd person verb forms

## UI Design Options

### Option 1: Long-press Conjugation Wheel
```
    [искаш]
[искам] ● [иска]
    [искат]
```
Long-press on verb shows wheel with conjugation options.

### Option 2: Pronoun Context
When a pronoun is in the phrase bar, verbs automatically show the matching conjugation:
- Phrase bar has "аз" → verb buttons show 1st person singular
- Phrase bar has "те" → verb buttons show 3rd person plural

### Option 3: Conjugation Row
After tapping a verb, show a row of conjugation options before adding to phrase:
```
[искам] [искаш] [иска] [искаме] [искате] [искат]
```

## Implementation Steps

1. [x] Research Bulgarian verb conjugation patterns
2. [ ] Use LLM to generate conjugation tables for all verbs in vocabulary
3. [ ] Add conjugation data structure to VocabularyStructure
4. [ ] Validate conjugations with Bulgarian speaker
5. [ ] Implement UI for conjugation selection
6. [ ] Add pronoun-verb agreement hints (stretch goal)

## Bulgarian Verb Conjugation Patterns

Most Bulgarian verbs follow predictable patterns based on their conjugation class:

### First Conjugation (а-class)
Stem ends in -а: чет**а** (read), пиш**а** (write)
- аз четА, ти четЕШ, той четЕ, ние четЕМ, вие четЕТЕ, те четАТ

### Second Conjugation (и-class)
Stem ends in -и: говор**я** (speak), уч**а** (learn)
- аз говорЯ, ти говорИШ, той говорИ, ние говорИМ, вие говорИТЕ, те говорЯТ

### Third Conjugation (е-class)
Stem ends in -е: ум**ея** (can), разбир**ам** (understand)
- Various patterns

## Verbs to Conjugate (from current vocabulary)

Core verbs needing conjugation:
- искам (want)
- харесвам (like)
- имам (have)
- отивам (go)
- вземам (get)
- правя (make/do)
- слагам (put)
- виждам (see)
- ям (eat)
- пия (drink)
- играя (play)
- спирам (stop)
- мога (can)

## Audio Considerations

Each conjugated form needs its own audio file for TTS. Options:
1. Generate all forms via ElevenLabs (expensive but consistent voice)
2. Use system TTS for conjugated forms (inconsistent but free)
3. Pre-generate most common forms only (1st/3rd person singular)

## References

- Bulgarian grammar resources for verb conjugation
- Mngomezulu et al. (2019) - Morphological approach to Zulu AAC
- Research on AAC for morphologically complex languages
