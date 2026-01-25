# Per-Button Language Override for Code-Switching

## Problem

Bilingual children naturally code-switch - mixing languages within a single utterance. Our current implementation forces a global language setting, but a child might want to say:

> "I want баница" (I want banitsa - a Bulgarian pastry)

Or:

> "Мама, look!"

Currently, switching the app language changes ALL buttons, which doesn't match natural bilingual communication.

## Research Support

> "Proloquo2Go supports true code-switching—mixing English and Spanish mid-sentence with bilingual child voices—and approximately 5% of users employ this functionality. The app allows individual button language customization, so a single board can mix languages based on the child's natural usage patterns."

> "Code-switching is natural and should be supported, not discouraged."

## Proposed Solution

### Per-Button Language Property

```swift
struct Symbol {
    let id: String
    let position: GridPosition
    // ... existing properties

    // New: override the global language for this specific button
    var languageOverride: Language?

    // Computed: which language to use for this symbol
    func effectiveLanguage(globalLanguage: Language) -> Language {
        languageOverride ?? globalLanguage
    }
}
```

### User Customization Flow

1. Long-press on any button
2. Show options menu including "Language: [English/Bulgarian/Auto]"
3. "Auto" uses global setting (default)
4. Specific language locks that button regardless of global setting

### Use Cases

| Scenario | Implementation |
|----------|----------------|
| Child always says "мама" not "mom" | Lock "mom" button to Bulgarian |
| Family uses English for "please/thank you" | Lock social words to English |
| Bulgarian food items | Lock food category to Bulgarian |
| Child prefers English verbs | Lock core verbs to English |

### Phrase Bar Behavior

When building a phrase with mixed languages:
- Display each symbol in its effective language
- Audio output uses each word's language for TTS
- Example: "I" (English TTS) + "искам" (Bulgarian TTS) + "cookie" (English TTS)

## Data Model Changes

```swift
// In Symbol or a user preferences layer
struct SymbolPreference: Codable {
    let symbolId: String
    var languageOverride: Language?
    var isHidden: Bool
    var customLabel: String?  // Future: user-defined labels
}

// Stored in UserDefaults or Core Data
class UserPreferences {
    var symbolPreferences: [String: SymbolPreference]

    func effectiveLanguage(for symbolId: String, globalLanguage: Language) -> Language {
        symbolPreferences[symbolId]?.languageOverride ?? globalLanguage
    }
}
```

## UI Design

### Button Indicator
Show a small flag or language code on buttons with overrides:
```
┌─────────┐
│ 🇧🇬     │  ← Small indicator
│  [img]  │
│  мама   │
└─────────┘
```

### Settings Screen
Add a "Language Mixing" section:
- Toggle: "Allow per-button languages"
- List of buttons with custom language settings
- Reset all to "Auto" button

## Implementation Steps

1. [ ] Add `languageOverride` to symbol preferences storage
2. [ ] Update `SymbolCell` to use effective language
3. [ ] Add long-press menu with language option
4. [ ] Update `PhraseBar` to handle mixed-language phrases
5. [ ] Update `AudioService` to speak each word in its language
6. [ ] Add visual indicator for language-locked buttons
7. [ ] Add settings UI for managing overrides

## Audio Considerations

Mixed-language phrases need careful audio handling:
- Option A: Speak each word in its language (natural but choppy)
- Option B: Speak entire phrase in dominant language (smoother but less accurate)
- Option C: Use bilingual voice if available (ideal but limited availability)

Proloquo2Go uses "bilingual child voices" - we should investigate if ElevenLabs offers similar capabilities.

## Edge Cases

1. **What if a word only exists in one language?**
   - Always use that language regardless of override

2. **What about category folders?**
   - Folders probably shouldn't have language overrides
   - Navigation should follow global language

3. **Phrase export/sharing?**
   - Include language metadata with shared phrases

## References

- Proloquo2Go code-switching documentation
- Research on bilingual AAC users
- LAMP bilingual vocabulary approach (removed Feb 2025 - lessons learned)
