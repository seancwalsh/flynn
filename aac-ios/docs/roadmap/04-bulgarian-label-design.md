# Design for Longer Bulgarian Labels

## Problem

Bulgarian words are often longer than English equivalents due to suffixation:

| English | Bulgarian | Length Difference |
|---------|-----------|-------------------|
| good | хубаво | +2 chars |
| water | вода | same |
| I want | искам | same |
| the chair | столът | +3 chars (no separate "the") |
| grandmother | баба | -7 chars (shorter!) |
| thank you | благодаря | +1 char |

More critically, Bulgarian uses Cyrillic script which may have different rendering characteristics.

## Research Guidance

> "Word length impacts button design significantly. Bulgarian words tend to be longer than English equivalents due to suffixation, making symbol-primary design with shorter text labels more critical than in English AAC."

## Current State

Our `SymbolCell` uses a fixed layout:
```swift
VStack(spacing: FlynnTheme.Layout.spacing4) {
    ARASAACImageView(symbolId: symbol.id)
        .frame(width: 60, height: 45)

    Text(symbol.label(for: language))
        .font(FlynnTheme.Typography.caption)
        .lineLimit(1)
}
```

The `lineLimit(1)` truncates longer Bulgarian words.

## Proposed Solutions

### 1. Dynamic Font Sizing

Automatically reduce font size for longer labels:

```swift
func labelFont(for text: String) -> Font {
    switch text.count {
    case 0...6: return FlynnTheme.Typography.caption
    case 7...10: return FlynnTheme.Typography.captionSmall
    default: return FlynnTheme.Typography.captionTiny
    }
}
```

### 2. Two-Line Labels

Allow labels to wrap to two lines for longer words:

```swift
Text(symbol.label(for: language))
    .font(FlynnTheme.Typography.caption)
    .lineLimit(2)
    .minimumScaleFactor(0.7)
    .multilineTextAlignment(.center)
```

### 3. Symbol-Primary Design

Increase image-to-text ratio, making the symbol larger and text smaller:

```
Current:        Proposed:
┌─────────┐    ┌─────────┐
│  [img]  │    │         │
│  45pt   │    │  [img]  │
│─────────│    │  55pt   │
│  label  │    │─────────│
│  15pt   │    │ label   │
└─────────┘    │ 10pt    │
               └─────────┘
```

### 4. Abbreviation Strategy

For very long words, use standard abbreviations:

| Full | Abbreviated |
|------|-------------|
| благодаря | благод. |
| довиждане | довижд. |
| моля | моля |

Store abbreviations in vocabulary:
```swift
struct VocabularyWord {
    let bulgarian: String
    let bulgarianAbbreviated: String?  // Used when space constrained
}
```

## Cyrillic-Specific Considerations

### Font Selection
- Ensure chosen font has good Cyrillic support
- Test rendering of all Bulgarian characters: а б в г д е ж з и й к л м н о п р с т у ф х ц ч ш щ ъ ь ю я
- Pay attention to: ж, ш, щ, ю (wider characters)

### Character Width
Some Cyrillic characters are wider than Latin equivalents:
- ж (zh) vs g
- ш (sh) vs s
- щ (sht) vs t
- ю (yu) vs u

May need slight letter-spacing adjustments for Cyrillic.

### Mixed Script
When code-switching, a phrase might mix scripts:
> "I искам cookie"

Ensure smooth transitions between Latin and Cyrillic in the phrase bar.

## Implementation Steps

1. [ ] Audit all Bulgarian labels for length
2. [ ] Implement dynamic font sizing based on label length
3. [ ] Allow two-line labels with minimum scale factor
4. [ ] Test Cyrillic rendering across all characters
5. [ ] Add abbreviated forms for longest words
6. [ ] Adjust grid cell sizing if needed for Bulgarian mode
7. [ ] Test phrase bar with mixed-script content

## Testing Checklist

- [ ] Longest Bulgarian word displays without truncation
- [ ] All Cyrillic characters render correctly
- [ ] Mixed Latin/Cyrillic phrases display properly
- [ ] Font remains readable at smallest size
- [ ] Touch targets remain adequate (60pt minimum)

## Measurements Needed

Run analysis on vocabulary to determine:
1. Average Bulgarian label length vs English
2. Longest Bulgarian labels in current vocabulary
3. Distribution of label lengths

```swift
// Analysis script
let bulgarianLengths = VocabularyStructure.allWords.map { $0.bulgarian.count }
let englishLengths = VocabularyStructure.allWords.map { $0.english.count }
print("Bulgarian avg: \(bulgarianLengths.average)")
print("English avg: \(englishLengths.average)")
print("Longest Bulgarian: \(bulgarianLengths.max())")
```

## References

- iOS Human Interface Guidelines - Typography
- Research on AAC symbol-to-text ratios
- Cyrillic typography best practices
