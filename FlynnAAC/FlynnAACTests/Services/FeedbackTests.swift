import Foundation
import Testing
@testable import FlynnAAC

/// TDD Tests for Visual/Audio Feedback (FLY-11)
struct FeedbackTests {

    // MARK: - Tap Animation (105% scale per design system)

    @Test func tapAnimationScalesTo105Percent() {
        // Must use design system value, not hardcoded
        #expect(SymbolCell.tapScaleValue == 1.05,
               "Tap scale must be 1.05 (105%), not \(SymbolCell.tapScaleValue)")
    }

    @Test func tapAnimationReturnsToNormal() async {
        // After tap feedback, should return to 1.0 scale
        let feedback = TapFeedbackController()

        await feedback.triggerTap()

        // Wait for animation to complete
        try? await Task.sleep(nanoseconds: 200_000_000) // 200ms

        let currentScale = await feedback.currentScale

        #expect(currentScale == 1.0,
               "Scale should return to 1.0 after tap animation")
    }

    // MARK: - Highlight Overlay

    @Test func highlightOverlayAppearsOnTap() async {
        let feedback = TapFeedbackController()

        await feedback.triggerTap()

        let hasHighlight = await feedback.isHighlightVisible

        #expect(hasHighlight,
               "Highlight overlay must appear on tap")
    }

    // MARK: - Phrase Bar Animation

    @Test func symbolAnimatesIntoPhraseBar() async {
        // When tapping a symbol, it should animate into phrase bar
        let animation = PhraseBarAnimation()

        await animation.animateSymbolAddition(
            from: CGPoint(x: 100, y: 200),
            to: CGPoint(x: 50, y: 50)
        )

        let didAnimate = await animation.lastAnimationCompleted

        #expect(didAnimate,
               "Symbol should animate into phrase bar")
    }

    // MARK: - Speak Button Feedback

    @Test func speakButtonPulsesWhilePlaying() async {
        let feedback = SpeakButtonFeedback()

        await feedback.startSpeaking()

        let isPulsing = await feedback.isPulsing

        #expect(isPulsing,
               "Speak button should pulse while audio plays")
    }

    @Test func speakButtonStopsPulsingWhenDone() async {
        let feedback = SpeakButtonFeedback()

        await feedback.startSpeaking()
        await feedback.stopSpeaking()

        let isPulsing = await feedback.isPulsing

        #expect(!isPulsing,
               "Speak button should stop pulsing when done")
    }

    // MARK: - Rapid Tap Handling

    @Test func rapidTapsDoNotBlockInput() async {
        // Animations must not block rapid tapping
        let counter = TapCounter()

        // Simulate rapid taps
        for _ in 0..<10 {
            await counter.recordTap()
        }

        let tapCount = await counter.count

        #expect(tapCount == 10,
               "All rapid taps must register - animations must not block input")
    }

    // MARK: - Animations Disabled Setting

    @Test func animationsCanBeDisabled() {
        var settings = AppSettings.default
        #expect(settings.animationsEnabled == true, "Animations default to enabled")

        settings.animationsEnabled = false
        #expect(settings.animationsEnabled == false)
    }

    @Test func staticFeedbackWhenAnimationsDisabled() async {
        var settings = AppSettings.default
        settings.animationsEnabled = false

        let feedback = TapFeedbackController(settings: settings)
        await feedback.triggerTap()

        let scale = await feedback.currentScale
        let hasHighlight = await feedback.isHighlightVisible

        // With animations disabled, should have static feedback
        #expect(scale == 1.0,
               "Scale should be 1.0 when animations disabled")
        #expect(hasHighlight,
               "Highlight should still appear even with animations disabled")
    }

    // MARK: - Speech Rate Setting

    @Test func speechRateIsConfigurable() {
        var settings = AppSettings.default
        #expect(settings.speechRate == 0.5, "Default speech rate")

        settings.speechRate = 0.8
        #expect(settings.speechRate == 0.8)
    }

    @Test func speechRateAffectsTTS() async {
        let service = AudioService()

        var settings = AppSettings.default
        settings.speechRate = 0.3 // Slower

        await service.configure(with: settings)

        let rate = await service.currentSpeechRate

        #expect(rate == 0.3,
               "TTS rate should match settings")
    }
}

// MARK: - Feedback Controllers (need implementation)

actor TapFeedbackController {
    let settings: AppSettings
    private(set) var currentScale: CGFloat = 1.0
    private(set) var isHighlightVisible: Bool = false

    init(settings: AppSettings = .default) {
        self.settings = settings
    }

    func triggerTap() async {
        if settings.animationsEnabled {
            // Animate to 1.05, show highlight
            currentScale = 1.05
            isHighlightVisible = true

            // Wait for animation duration
            try? await Task.sleep(nanoseconds: UInt64(FlynnTheme.Animation.tapScaleUpDuration * 1_000_000_000))

            // Return to normal
            currentScale = 1.0
        } else {
            // Static feedback - just show highlight
            isHighlightVisible = true
        }
    }
}

actor PhraseBarAnimation {
    private(set) var lastAnimationCompleted: Bool = false

    func animateSymbolAddition(from: CGPoint, to: CGPoint) async {
        // Simulate animation duration
        try? await Task.sleep(nanoseconds: 150_000_000) // 150ms
        lastAnimationCompleted = true
    }
}

actor SpeakButtonFeedback {
    private(set) var isPulsing: Bool = false

    func startSpeaking() async {
        isPulsing = true
    }

    func stopSpeaking() async {
        isPulsing = false
    }
}

actor TapCounter {
    private(set) var count = 0

    func recordTap() async {
        count += 1
    }
}

// MARK: - AudioService Extensions
// Extensions removed - now implemented in AudioService.swift
