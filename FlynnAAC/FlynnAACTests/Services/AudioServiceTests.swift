import Foundation
import Testing
@testable import FlynnAAC

/// TDD Tests for Audio Service (FLY-5)
/// Symbol tap must play audio within 100ms
struct AudioServiceTests {

    // MARK: - Core Requirement: 100ms Latency

    @Test func audioPlaysWithin100ms() async throws {
        // CRITICAL: Audio must start within 100ms of tap
        // This is the core AAC requirement for responsive communication
        let service = AudioService()
        let symbol = Symbol(
            id: "want",
            position: GridPosition(row: 0, col: 1),
            labels: ["en": "want", "bg": "искам"]
        )

        let start = Date()
        try await service.play(symbol: symbol, language: .english)
        let elapsed = Date().timeIntervalSince(start)

        // Must be under 100ms (0.1 seconds)
        #expect(elapsed < 0.1,
               "Audio playback took \(Int(elapsed * 1000))ms - must be under 100ms")
    }

    @Test func audioPlaysInCorrectLanguage() async throws {
        // Audio should play in the currently selected language
        let service = AudioService()
        let symbol = Symbol(
            id: "want",
            position: GridPosition(row: 0, col: 1),
            labels: ["en": "want", "bg": "искам"]
        )

        // Should use Bulgarian TTS/audio when language is Bulgarian
        let playedLanguage = await service.lastPlayedLanguage
        try await service.play(symbol: symbol, language: .bulgarian)

        #expect(await service.lastPlayedLanguage == .bulgarian,
               "Audio must play in selected language")
    }

    // MARK: - Offline Audio (FLY-10 related)

    @Test func audioPlaysOfflineFromCache() async throws {
        // Audio should work offline using cached files
        let service = AudioService()
        let symbol = Symbol(id: "want", position: GridPosition(row: 0, col: 0))

        // Simulate offline mode
        await service.setOfflineMode(true)

        // Should not throw - should use cached audio or TTS
        do {
            try await service.play(symbol: symbol, language: .english)
        } catch {
            Issue.record("Audio must work offline: \(error)")
        }
    }

    @Test func audioFilesAreCachedForOfflineUse() async throws {
        // Verify audio caching mechanism exists
        let service = AudioService()

        let isCached = await service.isAudioCached(for: "want", language: .english)
        #expect(isCached == true,
               "Core vocabulary audio must be pre-cached for offline use")
    }

    // MARK: - Visual Feedback Synchronization

    @Test func audioStartTriggersVisualFeedback() async throws {
        // Visual feedback should appear simultaneously with audio start
        // This tests the coordination between AudioService and UI
        let service = AudioService()

        var feedbackTriggered = false
        await service.setOnPlaybackStart {
            feedbackTriggered = true
        }

        let symbol = Symbol(id: "want", position: GridPosition(row: 0, col: 0))
        try await service.play(symbol: symbol, language: .english)

        #expect(feedbackTriggered,
               "Audio playback must trigger visual feedback callback")
    }

    // MARK: - Silent Mode Handling

    @Test func audioPlaysInSilentMode() async throws {
        // AAC audio must play even when device is in silent mode
        // This is critical for communication
        let service = AudioService()

        let playsInSilent = await service.playsInSilentMode
        #expect(playsInSilent == true,
               "AAC audio must play regardless of silent mode switch")
    }
}

// MARK: - AudioService Extensions for Testing
// All test support methods are now implemented in AudioService.swift
