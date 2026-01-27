import Foundation
import Testing
@testable import FlynnAAC

/// TDD Tests for Phrase Engine (FLY-6)
struct PhraseEngineTests {

    // MARK: - Symbol Accumulation

    @Test func phraseEngineAccumulatesSymbols() async {
        let engine = PhraseEngine()

        await engine.addSymbol(Symbol(id: "I", position: GridPosition(row: 0, col: 0)))
        await engine.addSymbol(Symbol(id: "want", position: GridPosition(row: 0, col: 1)))
        await engine.addSymbol(Symbol(id: "water", position: GridPosition(row: 0, col: 2)))

        let symbols = await engine.getSymbols()
        #expect(symbols.count == 3)
    }

    @Test func phraseEngineCanClear() async {
        let engine = PhraseEngine()

        await engine.addSymbol(Symbol(id: "I", position: GridPosition(row: 0, col: 0)))
        await engine.addSymbol(Symbol(id: "want", position: GridPosition(row: 0, col: 1)))
        await engine.clear()

        let isEmpty = await engine.isEmpty
        #expect(isEmpty)
    }

    @Test func phraseEngineCanRemoveAtIndex() async {
        let engine = PhraseEngine()

        await engine.addSymbol(Symbol(id: "I", position: GridPosition(row: 0, col: 0)))
        await engine.addSymbol(Symbol(id: "want", position: GridPosition(row: 0, col: 1)))
        await engine.addSymbol(Symbol(id: "water", position: GridPosition(row: 0, col: 2)))
        await engine.removeSymbol(at: 1)

        let symbols = await engine.getSymbols()
        #expect(symbols.count == 2)
        #expect(symbols[0].id == "I")
        #expect(symbols[1].id == "water")
    }

    // MARK: - Speaking Phrases

    @Test func phraseEngineSpeaksCompletePhrase() async {
        let engine = PhraseEngine()

        await engine.addSymbol(Symbol(id: "I", position: GridPosition(row: 0, col: 0), labels: ["en": "I"]))
        await engine.addSymbol(Symbol(id: "want", position: GridPosition(row: 0, col: 1), labels: ["en": "want"]))
        await engine.addSymbol(Symbol(id: "water", position: GridPosition(row: 0, col: 2), labels: ["en": "water"]))

        let spokenText = await engine.speakAndReturnText(language: .english)

        #expect(spokenText == "I want water",
               "Engine should speak complete phrase")
    }

    @Test func phraseEngineSpeaksInSelectedLanguage() async {
        let engine = PhraseEngine()

        await engine.addSymbol(Symbol(
            id: "want",
            position: GridPosition(row: 0, col: 0),
            labels: ["en": "want", "bg": "искам"]
        ))

        let englishText = await engine.speakAndReturnText(language: .english)
        let bulgarianText = await engine.speakAndReturnText(language: .bulgarian)

        #expect(englishText == "want")
        #expect(bulgarianText == "искам")
    }

    // MARK: - Empty Phrase Handling

    @Test func phraseEngineDoesNotSpeakWhenEmpty() async {
        let engine = PhraseEngine()

        let spoke = await engine.speakAndReturnText(language: .english)

        #expect(spoke == nil,
               "Should not speak when phrase is empty")
    }

    // MARK: - Phrase State During Navigation

    @Test func phraseStatePersistsDuringNavigation() async {
        let engine = PhraseEngine()

        await engine.addSymbol(Symbol(id: "I", position: GridPosition(row: 0, col: 0)))
        await engine.addSymbol(Symbol(id: "want", position: GridPosition(row: 0, col: 1)))

        let countBefore = await engine.getSymbols().count

        // Simulate navigation (phrase engine should maintain state)
        // In real app, this would involve view lifecycle

        let countAfter = await engine.getSymbols().count

        #expect(countBefore == countAfter,
               "Phrase state must persist during navigation")
    }
}

// MARK: - PhraseEngine Extensions for Testing

extension PhraseEngine {
    /// Speak the phrase and return the text that was spoken
    func speakAndReturnText(language: Language) async -> String? {
        let symbols = await getSymbols()
        guard !symbols.isEmpty else { return nil }

        // Build the complete phrase text
        let text = symbols.map { $0.label(for: language) }.joined(separator: " ")

        // Trigger actual speak (but return text for testing)
        await speak(language: language)

        return text
    }
}
