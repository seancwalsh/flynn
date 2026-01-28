# iOS Sprint 2 Implementation Specs

## Overview
Sprint 2 focuses on stability, security, and UX improvements for daily use.

---

## FLY-113: Constant-time Passphrase Comparison (Security)

### Problem
Simple string comparison (`==`) is vulnerable to timing attacks. An attacker can guess the passphrase character-by-character by measuring response time differences.

### Implementation

```swift
import CryptoKit

extension String {
    /// Constant-time comparison to prevent timing attacks
    func constantTimeCompare(to other: String) -> Bool {
        let selfData = Data(self.utf8)
        let otherData = Data(other.utf8)
        
        // Compare using XOR - timing is constant regardless of where mismatch occurs
        guard selfData.count == otherData.count else {
            // Still do work to maintain constant time for different lengths
            var result: UInt8 = 1
            for byte in selfData {
                result |= byte
            }
            return false
        }
        
        var result: UInt8 = 0
        for (a, b) in zip(selfData, otherData) {
            result |= a ^ b
        }
        return result == 0
    }
}
```

### Usage
Replace all passphrase checks in `ParentalGateView` or similar:

```swift
// Before (vulnerable)
if enteredPassphrase == storedPassphrase { ... }

// After (secure)
if enteredPassphrase.constantTimeCompare(to: storedPassphrase) { ... }
```

### Testing
- Unit test with various passphrase lengths
- Timing test to verify constant execution time

---

## FLY-114: Network Retry Logic with Exponential Backoff

### Problem
Network requests fail silently or immediately without retry, causing poor UX on flaky connections.

### Implementation

```swift
import Foundation

actor NetworkRetryManager {
    private let maxRetries = 3
    private let baseDelay: TimeInterval = 1.0
    private let maxDelay: TimeInterval = 30.0
    
    func executeWithRetry<T>(
        operation: @escaping () async throws -> T,
        isRetryable: @escaping (Error) -> Bool = { _ in true }
    ) async throws -> T {
        var lastError: Error?
        
        for attempt in 0..<maxRetries {
            do {
                return try await operation()
            } catch {
                lastError = error
                
                guard isRetryable(error) else {
                    throw error
                }
                
                if attempt < maxRetries - 1 {
                    let delay = calculateDelay(attempt: attempt)
                    try await Task.sleep(nanoseconds: UInt64(delay * 1_000_000_000))
                }
            }
        }
        
        throw lastError ?? NetworkError.maxRetriesExceeded
    }
    
    private func calculateDelay(attempt: Int) -> TimeInterval {
        // Exponential backoff with jitter
        let exponentialDelay = baseDelay * pow(2.0, Double(attempt))
        let jitter = Double.random(in: 0...0.3) * exponentialDelay
        return min(exponentialDelay + jitter, maxDelay)
    }
}

enum NetworkError: Error {
    case maxRetriesExceeded
    case notRetryable
}

// Extension to check if error is retryable
extension Error {
    var isRetryable: Bool {
        if let urlError = self as? URLError {
            switch urlError.code {
            case .timedOut, .networkConnectionLost, .notConnectedToInternet:
                return true
            default:
                return false
            }
        }
        return false
    }
}
```

### Usage

```swift
let retryManager = NetworkRetryManager()

let result = try await retryManager.executeWithRetry {
    try await apiClient.fetchSymbols()
} isRetryable: { error in
    error.isRetryable
}
```

---

## FLY-115: Loading Skeleton States

### Problem
Empty screens during loading create uncertainty. Users don't know if app is working.

### Implementation

```swift
import SwiftUI

struct SkeletonModifier: ViewModifier {
    @State private var isAnimating = false
    
    func body(content: Content) -> some View {
        content
            .redacted(reason: .placeholder)
            .overlay(
                GeometryReader { geometry in
                    LinearGradient(
                        colors: [
                            Color.clear,
                            Color.white.opacity(0.4),
                            Color.clear
                        ],
                        startPoint: .leading,
                        endPoint: .trailing
                    )
                    .frame(width: geometry.size.width * 0.5)
                    .offset(x: isAnimating ? geometry.size.width : -geometry.size.width)
                }
            )
            .clipped()
            .onAppear {
                withAnimation(.linear(duration: 1.5).repeatForever(autoreverses: false)) {
                    isAnimating = true
                }
            }
    }
}

extension View {
    func skeleton() -> some View {
        modifier(SkeletonModifier())
    }
}

// Symbol grid skeleton
struct SymbolGridSkeleton: View {
    let columns = 4
    let rows = 3
    
    var body: some View {
        LazyVGrid(columns: Array(repeating: GridItem(.flexible()), count: columns)) {
            ForEach(0..<(columns * rows), id: \.self) { _ in
                RoundedRectangle(cornerRadius: 12)
                    .fill(Color.gray.opacity(0.3))
                    .aspectRatio(1, contentMode: .fit)
                    .skeleton()
            }
        }
        .padding()
    }
}
```

### Usage

```swift
struct SymbolGridView: View {
    @StateObject var viewModel = SymbolGridViewModel()
    
    var body: some View {
        Group {
            if viewModel.isLoading {
                SymbolGridSkeleton()
            } else {
                ActualSymbolGrid(symbols: viewModel.symbols)
            }
        }
    }
}
```

---

## FLY-116: Undo Last Symbol Feature

### Problem
Users accidentally tap wrong symbols, requiring manual deletion from phrase bar.

### Implementation

```swift
import SwiftUI

class PhraseBarViewModel: ObservableObject {
    @Published var symbols: [Symbol] = []
    private var undoStack: [[Symbol]] = []
    private let maxUndoLevels = 10
    
    func addSymbol(_ symbol: Symbol) {
        saveUndoState()
        symbols.append(symbol)
    }
    
    func removeLastSymbol() {
        guard !symbols.isEmpty else { return }
        saveUndoState()
        symbols.removeLast()
    }
    
    func undo() {
        guard let previousState = undoStack.popLast() else { return }
        symbols = previousState
        
        // Haptic feedback
        let generator = UIImpactFeedbackGenerator(style: .light)
        generator.impactOccurred()
    }
    
    var canUndo: Bool {
        !undoStack.isEmpty
    }
    
    private func saveUndoState() {
        undoStack.append(symbols)
        if undoStack.count > maxUndoLevels {
            undoStack.removeFirst()
        }
    }
}

// Undo button
struct UndoButton: View {
    @ObservedObject var viewModel: PhraseBarViewModel
    
    var body: some View {
        Button(action: { viewModel.undo() }) {
            Image(systemName: "arrow.uturn.backward")
                .font(.title2)
                .foregroundColor(viewModel.canUndo ? .primary : .gray)
        }
        .disabled(!viewModel.canUndo)
        .accessibilityLabel("Undo last symbol")
    }
}
```

### Keyboard Shortcut (iPad)
```swift
.keyboardShortcut("z", modifiers: .command)
```

---

## FLY-117: Expand Bulgarian Vocabulary

### Scope
Add culturally-specific Bulgarian words/symbols not in standard ARASAAC:

**Food:**
- баница (banitsa - cheese pastry)
- айран (ayran - yogurt drink)
- кашкавал (kashkaval - yellow cheese)
- шопска салата (shopska salad)
- таратор (tarator - cold soup)

**Places:**
- баба/дядо's house
- детска градина (kindergarten)
- площадка (playground)

**Cultural:**
- Баба Марта (Baba Marta)
- мартеница (martenitsa)
- Коледа (Christmas Bulgarian style)

### Implementation
1. Create custom symbol category "Bulgarian Culture"
2. Add symbols with Bulgarian labels
3. Include both Cyrillic and transliterated labels
4. Ensure TTS pronunciation is correct

---

## FLY-118: Verb Conjugations

### Current State
Limited verb forms. Need conjugations for daily use.

### Priority Verbs
1. **искам** (want) - искам, искаш, иска, искаме
2. **мога** (can) - мога, можеш, може, можем
3. **трябва** (need/must) - requires modal constructions
4. **харесвам** (like) - харесвам, харесваш, харесва
5. **виждам** (see) - виждам, виждаш, вижда

### Implementation
```swift
struct VerbConjugation {
    let infinitive: String
    let forms: [Person: String]
    
    enum Person: String, CaseIterable {
        case firstSingular = "аз"
        case secondSingular = "ти"
        case thirdSingular = "той/тя/то"
        case firstPlural = "ние"
        case secondPlural = "вие"
        case thirdPlural = "те"
    }
}

// UI: When user selects verb, show conjugation picker
```

---

## Testing Checklist

- [ ] FLY-113: Security audit for timing attacks
- [ ] FLY-114: Test on flaky network (Network Link Conditioner)
- [ ] FLY-115: Visual review of skeleton states
- [ ] FLY-116: Undo works correctly with multiple operations
- [ ] FLY-117: Bulgarian speakers review vocabulary
- [ ] FLY-118: Grammatically correct conjugations
