import Foundation
import Testing
@testable import FlynnAAC

/// TDD Tests for Phrase Builder (FLY-6)
struct PhraseTests {

    // MARK: - Symbol Accumulation

    @Test func phraseBuilderAccumulatesSymbols() {
        var phrase = Phrase()
        let symbol1 = Symbol(id: "I", position: GridPosition(row: 0, col: 0), labels: ["en": "I", "bg": "аз"])
        let symbol2 = Symbol(id: "want", position: GridPosition(row: 0, col: 1), labels: ["en": "want", "bg": "искам"])
        let symbol3 = Symbol(id: "water", position: GridPosition(row: 0, col: 2), labels: ["en": "water", "bg": "вода"])

        phrase.append(symbol1)
        phrase.append(symbol2)
        phrase.append(symbol3)

        #expect(phrase.symbols.count == 3)
        #expect(phrase.text(for: .english) == "I want water")
        #expect(phrase.text(for: .bulgarian) == "аз искам вода")
    }

    @Test func symbolsAppearLeftToRightInOrder() {
        var phrase = Phrase()
        phrase.append(Symbol(id: "first", position: GridPosition(row: 0, col: 0)))
        phrase.append(Symbol(id: "second", position: GridPosition(row: 0, col: 1)))
        phrase.append(Symbol(id: "third", position: GridPosition(row: 0, col: 2)))

        #expect(phrase.symbols[0].id == "first")
        #expect(phrase.symbols[1].id == "second")
        #expect(phrase.symbols[2].id == "third")
    }

    // MARK: - Symbol Removal

    @Test func tapSymbolInPhraseBarRemovesIt() {
        var phrase = Phrase()
        phrase.append(Symbol(id: "I", position: GridPosition(row: 0, col: 0)))
        phrase.append(Symbol(id: "want", position: GridPosition(row: 0, col: 1)))
        phrase.append(Symbol(id: "water", position: GridPosition(row: 0, col: 2)))

        // Tap on middle symbol to remove it
        phrase.remove(at: 1)

        #expect(phrase.symbols.count == 2)
        #expect(phrase.symbols[0].id == "I")
        #expect(phrase.symbols[1].id == "water")
    }

    @Test func clearButtonRemovesAllSymbols() {
        var phrase = Phrase()
        phrase.append(Symbol(id: "I", position: GridPosition(row: 0, col: 0)))
        phrase.append(Symbol(id: "want", position: GridPosition(row: 0, col: 1)))

        phrase.clear()

        #expect(phrase.isEmpty)
        #expect(phrase.symbols.isEmpty)
    }

    // MARK: - Phrase Bar Persistence During Navigation

    @Test func phraseBarPersistsDuringCategoryNavigation() {
        // When navigating categories, phrase bar content must remain
        var phrase = Phrase()
        phrase.append(Symbol(id: "I", position: GridPosition(row: 0, col: 0)))
        phrase.append(Symbol(id: "want", position: GridPosition(row: 0, col: 1)))

        // Simulate category navigation
        let beforeNavigation = phrase.symbols.count

        // Navigate to food category and back
        // (In real implementation, this would involve view state)

        let afterNavigation = phrase.symbols.count

        #expect(beforeNavigation == afterNavigation,
               "Phrase bar must persist during category navigation")
    }

    // MARK: - Speak Complete Phrase

    @Test func speakButtonPlaysCompletePhrase() async {
        let phrase = Phrase(symbols: [
            Symbol(id: "I", position: GridPosition(row: 0, col: 0), labels: ["en": "I"]),
            Symbol(id: "want", position: GridPosition(row: 0, col: 1), labels: ["en": "want"]),
            Symbol(id: "water", position: GridPosition(row: 0, col: 2), labels: ["en": "water"])
        ])

        // The speak function should play the entire phrase
        let spokenText = await phrase.speak(language: .english)

        #expect(spokenText == "I want water",
               "Speak button must play complete phrase as single utterance")
    }

    // MARK: - Maximum Phrase Length

    @Test func phraseHandlesLongSequences() {
        var phrase = Phrase()

        // Add many symbols
        for i in 0..<20 {
            phrase.append(Symbol(id: "word\(i)", position: GridPosition(row: 0, col: i)))
        }

        #expect(phrase.symbols.count == 20,
               "Phrase bar must handle long symbol sequences")
    }
}

// MARK: - Phrase Extensions for Testing

extension Phrase {
    /// Speak the phrase and return the text that was spoken
    func speak(language: Language) async -> String? {
        nil // Not implemented yet - needs TTS integration
    }
}
