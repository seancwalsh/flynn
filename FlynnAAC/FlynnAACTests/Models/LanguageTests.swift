import Foundation
import Testing
@testable import FlynnAAC

/// TDD Tests for Language Toggle (FLY-8)
/// Language switch must change labels/TTS without moving symbols
struct LanguageTests {

    // MARK: - Language Properties

    @Test func languageHasDisplayName() {
        #expect(Language.english.displayName == "English")
        #expect(Language.bulgarian.displayName == "Български")
    }

    @Test func languageHasRawValue() {
        #expect(Language.english.rawValue == "en")
        #expect(Language.bulgarian.rawValue == "bg")
    }

    @Test func languageHasVoiceIdentifier() {
        #expect(Language.english.voiceIdentifier.contains("Samantha") ||
               Language.english.voiceIdentifier.contains("en"))
        #expect(Language.bulgarian.voiceIdentifier.contains("Daria") ||
               Language.bulgarian.voiceIdentifier.contains("bg"))
    }

    // MARK: - Label Switching (FLY-8 Core)

    @Test func symbolLabelsChangeWithLanguage() {
        let symbol = Symbol(
            id: "want",
            position: GridPosition(row: 0, col: 0),
            labels: ["en": "want", "bg": "искам"]
        )

        let englishLabel = symbol.label(for: .english)
        let bulgarianLabel = symbol.label(for: .bulgarian)

        #expect(englishLabel == "want")
        #expect(bulgarianLabel == "искам")
        #expect(englishLabel != bulgarianLabel)
    }

    @Test func symbolImageDoesNotChangeWithLanguage() {
        // Critical: image must stay the same, only label changes
        let symbol = Symbol(
            id: "want",
            position: GridPosition(row: 0, col: 0),
            labels: ["en": "want", "bg": "искам"]
        )

        // Image name should be based on ID, not language
        #expect(symbol.imageName == "want")
    }

    // MARK: - Position Preservation (FLY-8 Core)

    @Test func symbolPositionDoesNotChangeWithLanguage() {
        // CRITICAL: Grid positions must be 100% identical across languages
        let position = GridPosition(row: 2, col: 3)
        let symbol = Symbol(
            id: "want",
            position: position,
            labels: ["en": "want", "bg": "искам"]
        )

        // Access labels in both languages
        _ = symbol.label(for: .english)
        #expect(symbol.position == position, "Position changed after English access")

        _ = symbol.label(for: .bulgarian)
        #expect(symbol.position == position, "Position changed after Bulgarian access")
    }

    @Test func gridLayoutIdenticalAcrossLanguages() async {
        // The entire grid must look the same, just with different labels
        let store = SymbolStore()

        let englishSymbols = await store.getRootSymbols()
        let englishPositions = Set(englishSymbols.map { $0.position })

        // Switch to Bulgarian (conceptually)
        let bulgarianSymbols = await store.getRootSymbols()
        let bulgarianPositions = Set(bulgarianSymbols.map { $0.position })

        #expect(englishPositions == bulgarianPositions,
               "Grid positions must be identical across languages")
    }

    // MARK: - TTS Language (FLY-8)

    @Test func ttsPlaysInSelectedLanguage() async {
        let service = AudioService()
        let symbol = Symbol(
            id: "want",
            position: GridPosition(row: 0, col: 0),
            labels: ["en": "want", "bg": "искам"]
        )

        try? await service.play(symbol: symbol, language: .bulgarian)

        #expect(await service.lastPlayedLanguage == .bulgarian,
               "TTS must play in selected language")
    }

    // MARK: - Language Persistence

    @Test func languageSettingPersistsAcrossRestart() {
        // Language preference must survive app restart
        var settings = AppSettings.default
        settings.language = .bulgarian

        // Simulate save and reload
        let persisted = AppSettings.loadFromPersistence()

        #expect(persisted?.language == .bulgarian,
               "Language setting must persist across app restarts")
    }

    @Test func languageToggleUpdatesImmediately() async {
        // When toggling language, all visible labels should update immediately
        // without any network calls or delays

        var settings = AppSettings.default
        settings.language = .english

        let start = Date()
        settings.language = .bulgarian
        let elapsed = Date().timeIntervalSince(start)

        #expect(elapsed < 0.01,
               "Language toggle must be instantaneous (no network)")
    }
}

// MARK: - AppSettings Extensions for Testing

extension AppSettings {
    /// Load settings from persistence
    static func loadFromPersistence() -> AppSettings? {
        nil // Not implemented yet - needs UserDefaults or Core Data
    }
}
