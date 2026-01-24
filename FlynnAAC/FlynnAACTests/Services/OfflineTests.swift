import Foundation
import Testing
@testable import FlynnAAC

/// TDD Tests for Offline Functionality (FLY-10)
/// Core AAC must work completely offline
struct OfflineTests {

    // MARK: - Symbol Display Offline

    @Test func symbolsDisplayOffline() async {
        let store = SymbolStore()

        // Enable airplane mode simulation
        await store.setOfflineMode(true)

        let symbols = await store.getRootSymbols()

        #expect(!symbols.isEmpty,
               "Symbols must display when offline")
    }

    @Test func allSymbolImagesAvailableOffline() async {
        let store = SymbolStore()
        await store.setOfflineMode(true)

        let symbols = await store.getRootSymbols()

        for symbol in symbols {
            let hasImage = await store.isImageCached(for: symbol.id)
            #expect(hasImage,
                   "Symbol \(symbol.id) image must be cached for offline use")
        }
    }

    @Test func categoriesDisplayOffline() async {
        let store = SymbolStore()
        await store.setOfflineMode(true)

        let categories = await store.getRootCategories()

        #expect(!categories.isEmpty,
               "Categories must display when offline")
    }

    // MARK: - Audio Playback Offline

    @Test func audioPlaysOffline() async {
        let service = AudioService()
        await service.setOfflineMode(true)

        let symbol = Symbol(
            id: "want",
            position: GridPosition(row: 0, col: 0),
            labels: ["en": "want"]
        )

        // Should not throw - uses TTS fallback
        do {
            try await service.play(symbol: symbol, language: .english)
        } catch {
            Issue.record("Audio must work offline: \(error)")
        }
    }

    @Test func ttsWorksOffline() async {
        // TTS is built into iOS and works offline
        let service = AudioService()
        await service.setOfflineMode(true)

        let canSpeak = await service.canSpeakOffline(language: .english)

        #expect(canSpeak,
               "TTS must work offline for core AAC functionality")
    }

    // MARK: - Phrase Building Offline

    @Test func phraseBuilderWorksOffline() async {
        // Phrase building is entirely local, should work offline
        var phrase = Phrase()

        // Simulate offline
        phrase.append(Symbol(id: "I", position: GridPosition(row: 0, col: 0)))
        phrase.append(Symbol(id: "want", position: GridPosition(row: 0, col: 1)))

        #expect(phrase.symbols.count == 2,
               "Phrase building must work offline")
    }

    @Test func phraseSpeakingWorksOffline() async {
        let phrase = Phrase(symbols: [
            Symbol(id: "I", position: GridPosition(row: 0, col: 0), labels: ["en": "I"]),
            Symbol(id: "want", position: GridPosition(row: 0, col: 1), labels: ["en": "want"])
        ])

        let engine = PhraseEngine()
        await engine.setOfflineMode(true)

        // Should work using TTS
        let canSpeak = await engine.canSpeakOffline()

        #expect(canSpeak,
               "Phrase speaking must work offline via TTS")
    }

    // MARK: - No Error Messages Offline

    @Test func noErrorMessagesDisplayedOffline() async {
        let store = SymbolStore()
        await store.setOfflineMode(true)

        // Perform typical operations
        _ = await store.getRootSymbols()
        _ = await store.getRootCategories()

        let errors = await store.getErrorMessages()

        #expect(errors.isEmpty,
               "No error messages should appear during offline use")
    }

    // MARK: - Usage Sync When Online

    @Test func usageLogsSyncWhenBackOnline() async {
        let analytics = UsageAnalytics()

        // Log usage while offline
        await analytics.setOfflineMode(true)
        await analytics.logSymbolTap(symbolId: "want")
        await analytics.logSymbolTap(symbolId: "water")

        // Come back online
        await analytics.setOfflineMode(false)

        // Sync should happen
        let pendingLogs = await analytics.pendingLogCount

        #expect(pendingLogs == 0,
               "Usage logs should sync when back online")
    }
}

// MARK: - SymbolStore Extensions for Testing

extension SymbolStore {
    /// Enable/disable offline mode
    func setOfflineMode(_ offline: Bool) async {
        // Not implemented yet
    }

    /// Check if image is cached
    func isImageCached(for symbolId: String) async -> Bool {
        false // Not implemented yet
    }

    /// Get any error messages
    func getErrorMessages() async -> [String] {
        [] // Not implemented yet
    }
}

// MARK: - AudioService Extensions for Testing

extension AudioService {
    /// Check if TTS can work offline
    func canSpeakOffline(language: Language) async -> Bool {
        false // Not implemented yet
    }
}

// MARK: - PhraseEngine Extensions for Testing

extension PhraseEngine {
    /// Enable/disable offline mode
    func setOfflineMode(_ offline: Bool) async {
        // Not implemented yet
    }

    /// Check if can speak offline
    func canSpeakOffline() async -> Bool {
        false // Not implemented yet
    }
}

// MARK: - UsageAnalytics (needs implementation)

actor UsageAnalytics {
    func setOfflineMode(_ offline: Bool) async {}
    func logSymbolTap(symbolId: String) async {}
    var pendingLogCount: Int { 999 } // Returns non-zero to fail test
}
