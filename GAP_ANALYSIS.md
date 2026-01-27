# Flynn AAC iOS App - Gap Analysis

**Generated:** 2025-01-28  
**Issue:** FLY-63 - iOS App Functionality Review  
**Purpose:** Identify gaps to make the app ready for Flynn's daily use

---

## Executive Summary

The Flynn AAC iOS app has a solid foundation with core AAC functionality in place. However, several gaps need to be addressed before it's ready for Flynn's daily use, particularly in **accessibility**, **error handling**, and **offline robustness**. The Bulgarian vocabulary coverage is good but could be expanded with more culturally relevant content.

### Priority Matrix

| Priority | Category | Items |
|----------|----------|-------|
| 🔴 Critical | Accessibility | VoiceOver support, Dynamic Type |
| 🔴 Critical | Error Handling | User-facing error messages, network failure UX |
| 🟠 High | Offline | Image caching preload, graceful degradation |
| 🟠 High | UX | Loading states, haptic feedback |
| 🟡 Medium | Vocabulary | Expand Bulgarian culturally-specific words |
| 🟢 Low | Features | Word prediction, favorites |

---

## 1. Feature Comparison with Established AAC Apps

### Comparison Matrix

| Feature | Flynn AAC | Proloquo2Go | TouchChat | CBoard |
|---------|-----------|-------------|-----------|--------|
| **Core Grid Navigation** | ✅ | ✅ | ✅ | ✅ |
| **Symbol Sets** | ARASAAC | PCS + others | PCS | ARASAAC |
| **Multiple Languages** | ✅ (EN/BG) | ✅ (50+) | ✅ | ✅ (40+) |
| **Phrase Building** | ✅ | ✅ | ✅ | ✅ |
| **TTS Audio** | ✅ | ✅ | ✅ | ✅ |
| **High-Quality Voice** | ✅ (ElevenLabs) | ✅ (Acapela) | ✅ | ❌ (TTS only) |
| **Verb Conjugation** | ✅ (Bulgarian) | ❌ | ❌ | ❌ |
| **Motor Planning** | ✅ | ✅ (LAMP) | ✅ (TouchChat) | ❌ |
| **Hide/Show Symbols** | ✅ | ✅ | ✅ | ✅ |
| **VoiceOver Support** | ⚠️ Partial | ✅ Full | ✅ Full | ✅ Full |
| **Dynamic Type** | ❌ | ✅ | ✅ | ❌ |
| **Switch Access** | ❌ | ✅ | ✅ | ❌ |
| **Word Prediction** | ❌ | ✅ | ❌ | ❌ |
| **Favorites/History** | ❌ | ✅ | ✅ | ✅ |
| **Keyboard Input** | 🚧 Stub | ✅ | ✅ | ✅ |
| **Cloud Sync** | 🚧 Stub | ✅ | ✅ | ✅ |
| **Offline Mode** | ✅ | ✅ | ✅ | ✅ |
| **Caregiver Controls** | ✅ | ✅ | ✅ | ❌ |
| **Usage Analytics** | 🚧 Stub | ✅ | ✅ | ❌ |

### Critical Missing Features

1. **Switch Access Support** - Important for motor impaired users
2. **Word Prediction** - Speeds up communication significantly
3. **Favorites/Quick Access** - Frequently used phrases should be accessible
4. **Full Keyboard Input** - Currently just a stub

### Competitive Advantages

1. **Bulgarian Verb Conjugation** - Unique feature not in competitors
2. **ElevenLabs High-Quality Voice** - Better than most TTS options
3. **Modern SwiftUI Architecture** - iOS 18 Liquid Glass effects
4. **Motor Planning Preservation** - Hidden cards maintain position

---

## 2. Edge Cases and Error Handling Review

### Current State Analysis

#### ✅ Well Handled

```swift
// AudioService.swift - Good fallback chain
// Priority 1: Preloaded cache → Priority 2: Bundled audio → Priority 3: TTS
```

- Audio playback has graceful fallback to TTS
- Phrase cache uses SHA256 hashing (collision-resistant)
- Rapid tap detection prevents "playing with" the app
- Keychain storage for passphrase (secure)

#### 🔴 Critical Issues

**1. No User-Facing Error Messages**
```swift
// ARASAACImageView.swift - Error is silently caught
} catch {
    print("Failed to load ARASAAC pictogram for \(symbolId): \(error)")
}
// User sees a generic question mark icon with no explanation
```

**2. Network Errors Not Communicated**
```swift
// ElevenLabsService.swift - Falls back silently
print("ElevenLabs phrase generation failed: \(error)")
// User doesn't know why audio quality changed
```

**3. Missing Input Validation**
```swift
// AppSettings.swift - No bounds checking
Stepper("Rows: \(settings.gridRows)", value: $settings.gridRows, in: 2...8)
// Stepper prevents invalid values, but no validation on load
```

#### 🟠 High Priority Issues

**4. ARASAAC Image Loading Race Condition**
```swift
// ARASAACImageView.swift
@State private var image: UIImage?
// If view is recreated while loading, could show stale image
```

**5. Passphrase Plain Text Comparison**
```swift
// KeychainHelper.swift
static func verifyPassphrase(_ passphrase: String) -> Bool {
    guard let stored = getPassphrase() else { return false }
    return stored == passphrase  // Should use constant-time comparison
}
```

**6. No Retry Logic for Network Requests**
```swift
// ElevenLabsService.swift - Single attempt, no retry
let (data, response) = try await URLSession.shared.data(for: request)
```

### Recommended Fixes

```swift
// 1. Add user-facing error banner component
struct ErrorBanner: View {
    let message: String
    let onDismiss: () -> Void
    // Show non-blocking errors to user
}

// 2. Add network retry with exponential backoff
func fetchWithRetry<T>(maxAttempts: Int = 3, delay: TimeInterval = 1.0)

// 3. Constant-time passphrase comparison
import CryptoKit
static func verifyPassphrase(_ passphrase: String) -> Bool {
    guard let stored = getPassphrase(),
          let storedData = stored.data(using: .utf8),
          let inputData = passphrase.data(using: .utf8) else { return false }
    return storedData.count == inputData.count && 
           zip(storedData, inputData).reduce(0) { $0 | ($1.0 ^ $1.1) } == 0
}
```

---

## 3. Bulgarian Vocabulary Coverage

### Current Inventory

| Category | Count | Coverage |
|----------|-------|----------|
| Core Words (home screen) | 15 | ✅ Good |
| QuickFires (phrases) | 10 | ✅ Good |
| Greetings & Social | 13 | ✅ Good |
| Food & Drink | 15 | 🟡 Could expand |
| People | 17 | ✅ Good |
| Places | 19 | ✅ Good |
| Things | 12 | 🟡 Could expand |
| Descriptors | 25 | ✅ Excellent |
| Time | 12 | ✅ Good |
| Questions | 7 | ✅ Good |
| Actions | 23 | ✅ Good |
| Connecting Words | 11 | ✅ Good |
| Animals | 12 | ✅ Good |
| Personal Needs | 10 | ✅ Good |
| Repairs | 6 | 🟡 Could expand |
| **Total** | ~207 | ✅ Good baseline |

### Bulgarian-Specific Quality Check

#### ✅ Correct Translations
- All 27 verb conjugations are correctly formed
- Pronouns (аз, ти, той, тя, то, ние, вие, те) complete
- Question words correctly translated

#### 🟡 Could Improve

1. **Culturally Specific Food Items**
   - Missing: баница, кисело мляко, лютеница, шопска салата, таратор
   
2. **Bulgarian Holidays/Events**
   - Missing: Коледа, Великден, Баба Марта, именден

3. **Local Places**
   - Missing: площад, блок, панелка, квартал

4. **Family Terms (Bulgarian-specific)**
   - Missing: вуйчо, леля, чичо, strina

5. **Common Bulgarian Expressions**
   - Missing: браво, супер, хайде

### Verb Conjugation Coverage

```
Current: 27 verbs fully conjugated
Missing commonly used verbs:
- обличам (dress)
- събуждам се (wake up)  
- мия се (wash)
- лягам (lie down)
- качвам се (climb/get on)
- слизам (get off/down)
```

---

## 4. Accessibility Features Review

### Current Implementation

| Feature | Status | Notes |
|---------|--------|-------|
| VoiceOver Labels | ⚠️ Partial | Only on edit mode components |
| VoiceOver Hints | ⚠️ Partial | Only on hidden items |
| Dynamic Type | ❌ Missing | Hardcoded font sizes |
| Switch Access | ❌ Missing | No implementation |
| Reduce Motion | ⚠️ Partial | Animation toggle exists but not system-aware |
| Contrast | ✅ Good | Theme designed for low contrast |
| Touch Targets | ✅ Good | 60pt minimum enforced |
| Color Blindness | ⚠️ Partial | Relies on color coding (Fitzgerald) |

### Critical Missing Accessibility

#### 1. VoiceOver Support (CRITICAL)
```swift
// SymbolCell.swift - NO accessibility labels!
var body: some View {
    VStack(spacing: FlynnTheme.Layout.spacing4) {
        symbolImage  // No accessibilityLabel
        Text(symbol.label(for: language))  // Label exists but not marked
    }
    // Missing: .accessibilityElement(children: .combine)
    // Missing: .accessibilityLabel(symbol.label(for: language))
    // Missing: .accessibilityHint("Double tap to speak")
    // Missing: .accessibilityAddTraits(.isButton)
}
```

#### 2. Dynamic Type (CRITICAL)
```swift
// FlynnTheme.swift - Hardcoded font sizes
static let symbolLabelSmall = Font.system(size: 11, weight: .medium)
// Should use: @ScaledMetric or .font(.body) with custom styling
```

#### 3. Reduce Motion (System Preference)
```swift
// Should check @Environment(\.accessibilityReduceMotion)
// Instead only uses app setting: settings.animationsEnabled
```

### Recommended Accessibility Fixes

```swift
// 1. SymbolCell.swift - Add full VoiceOver support
VStack { ... }
    .accessibilityElement(children: .combine)
    .accessibilityLabel(symbol.label(for: language))
    .accessibilityHint("Double tap to add to phrase and speak")
    .accessibilityAddTraits(.isButton)
    .accessibilityInputLabels([symbol.label(for: language), symbol.id])

// 2. Dynamic Type support
struct ScaledSymbolLabel: View {
    @ScaledMetric(relativeTo: .body) var fontSize: CGFloat = 14
    
    var body: some View {
        Text(label)
            .font(.system(size: fontSize, weight: .medium, design: .rounded))
    }
}

// 3. System reduce motion respect
@Environment(\.accessibilityReduceMotion) var reduceMotion
let shouldAnimate = settings.animationsEnabled && !reduceMotion

// 4. Add shape indicators for color-blind users
if symbol.category == .verb {
    // Add icon overlay in addition to color
    Image(systemName: "figure.run")
        .accessibilityHidden(true)
}
```

---

## 5. UX Improvements Needed

### High Priority

#### 1. Loading States
Currently no visual feedback while images load.

```swift
// Current: Just ProgressView()
// Needed: Skeleton loading, shimmer effect, or placeholder images
struct SymbolPlaceholder: View {
    var body: some View {
        RoundedRectangle(cornerRadius: 8)
            .fill(Color.gray.opacity(0.2))
            .overlay(
                Image(systemName: "photo")
                    .foregroundStyle(.gray.opacity(0.4))
            )
    }
}
```

#### 2. Haptic Feedback
No tactile feedback for interactions.

```swift
// Add to symbolTapped
let impactGenerator = UIImpactFeedbackGenerator(style: .medium)
impactGenerator.impactOccurred()

// Add for phrase spoken
let notificationGenerator = UINotificationFeedbackGenerator()
notificationGenerator.notificationOccurred(.success)
```

#### 3. Visual Feedback for Audio Playback
Currently only phrase bar shows audio state.

```swift
// Individual symbols should pulse/animate when speaking
@State private var isSpeaking = false
SymbolCell(...)
    .scaleEffect(isSpeaking ? 1.05 : 1.0)
    .animation(.easeInOut(duration: 0.3).repeatForever(autoreverses: true))
```

#### 4. Undo Last Symbol
No way to undo accidental taps without manually removing.

```swift
// Add undo button or shake-to-undo
func undoLastSymbol() {
    guard !phraseItems.isEmpty else { return }
    let removed = phraseItems.removeLast()
    undoStack.append(removed)
}
```

### Medium Priority

#### 5. Category Breadcrumb Navigation
Only "Back" button exists, no context of where you are.

```swift
// Add breadcrumb: Home > Food > (current)
struct BreadcrumbView: View {
    let path: [String]
    // Show navigation path
}
```

#### 6. First-Run Tutorial
No onboarding for new users.

```swift
// Coach marks or guided tour
struct OnboardingOverlay: View {
    // Highlight key features: phrase bar, speak button, categories
}
```

#### 7. Long Press Preview
Long press shows conjugation, but no preview for non-verbs.

```swift
// Show symbol preview popup on long press
// Similar to iOS keyboard magnifier
```

### Low Priority

#### 8. Drag to Reorder in Phrase Bar
Can only remove symbols, not reorder.

#### 9. Recent Symbols
Quick access to recently used symbols.

#### 10. Symbol Search
Find symbols by typing (useful for caregivers).

---

## 6. Technical Debt

### Code Quality Issues

1. **Force Unwrapping**
```swift
// VocabularyStructure.swift - Multiple force unwraps
let conjugation = VocabularyStructure.verbConjugations["want"]!
```

2. **Inconsistent Error Types**
- `ElevenLabsError`, `APIError`, `ARASAACError`, `SyncError` all different
- Should have unified error protocol

3. **Missing Tests**
```bash
# Only 6 test files, many features untested
FlynnAACTests/
├── Services/
│   ├── FeedbackTests.swift
│   ├── OfflineTests.swift
│   ├── PhraseEngineTests.swift
│   ├── AudioServiceTests.swift
│   └── RapidTapDetectorTests.swift
├── Theme/
│   └── DesignSystemTests.swift
└── Models/
    ├── CategoryTests.swift
    ├── LanguageTests.swift
    ├── PhraseTests.swift
    ├── SymbolTests.swift
    ├── GridTests.swift
    └── ConjugationTests.swift
```

Missing tests for:
- `SymbolStore`
- `ARASAACService`
- `ElevenLabsService`
- `SyncService`
- `HiddenItemsStore`
- All View components

4. **Stub Implementations**
- `SyncService` - mostly stubs
- `UsageAnalytics` - only in tests
- Keyboard folder - contains only stub

---

## 7. Recommended Action Items

### Sprint 1 (Critical - Before Daily Use)

- [ ] **Add full VoiceOver support to all interactive elements**
- [ ] **Implement Dynamic Type for font scaling**
- [ ] **Add user-facing error messages for network failures**
- [ ] **Preload ARASAAC images on first launch**
- [ ] **Add haptic feedback for symbol taps**

### Sprint 2 (High Priority)

- [ ] Add constant-time passphrase comparison
- [ ] Implement network retry logic
- [ ] Add loading skeleton states
- [ ] Add undo last symbol feature
- [ ] Expand Bulgarian culturally-specific vocabulary
- [ ] Add 5+ more verb conjugations

### Sprint 3 (Medium Priority)

- [ ] Implement Switch Access support
- [ ] Add onboarding tutorial
- [ ] Implement favorites/quick phrases
- [ ] Add breadcrumb navigation
- [ ] Respect system Reduce Motion setting

### Sprint 4 (Nice to Have)

- [ ] Word prediction
- [ ] Full keyboard input
- [ ] Symbol search
- [ ] Drag to reorder phrase bar
- [ ] Recent symbols section

---

## 8. Summary

The Flynn AAC app is well-architected with a strong foundation. The Bulgarian language support, including verb conjugation, is a standout feature that competitors lack. However, **accessibility gaps (VoiceOver, Dynamic Type) are critical blockers** for daily use and should be the immediate priority.

**Estimated effort to production-ready:**
- Critical fixes: ~2-3 days
- High priority: ~1 week
- Full polish: ~2-3 weeks

**Strengths to preserve:**
- Clean SwiftUI architecture
- Excellent offline-first design
- High-quality ElevenLabs audio
- Bulgarian verb conjugation system
- Motor planning preservation with hidden cards

**Main risks:**
- Accessibility lawsuit risk if VoiceOver not implemented
- User frustration with silent error handling
- Image loading delays on first use
