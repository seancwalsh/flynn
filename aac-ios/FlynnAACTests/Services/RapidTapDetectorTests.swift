import Foundation
import Testing
@testable import FlynnAAC

/// Tests for rapid tap detection to prevent "playing with" the app
struct RapidTapDetectorTests {

    // MARK: - Basic Behavior

    @Test func allowsFirstTap() {
        let detector = RapidTapDetector(window: 1.0, maxTaps: 3)
        let now = Date()

        #expect(detector.shouldAllowTap(at: now) == true,
               "First tap should always be allowed")
    }

    @Test func allowsTapsUpToLimit() {
        let detector = RapidTapDetector(window: 1.0, maxTaps: 3)
        let now = Date()

        // Taps 1, 2, 3 should all be allowed
        #expect(detector.shouldAllowTap(at: now) == true, "Tap 1 should be allowed")
        #expect(detector.shouldAllowTap(at: now.addingTimeInterval(0.1)) == true, "Tap 2 should be allowed")
        #expect(detector.shouldAllowTap(at: now.addingTimeInterval(0.2)) == true, "Tap 3 should be allowed")
    }

    // MARK: - Blocking Rapid Taps

    @Test func blocksFourthRapidTap() {
        let detector = RapidTapDetector(window: 1.0, maxTaps: 3)
        let now = Date()

        // First 3 taps allowed
        _ = detector.shouldAllowTap(at: now)
        _ = detector.shouldAllowTap(at: now.addingTimeInterval(0.1))
        _ = detector.shouldAllowTap(at: now.addingTimeInterval(0.2))

        // 4th tap should be BLOCKED
        let fourthAllowed = detector.shouldAllowTap(at: now.addingTimeInterval(0.3))
        #expect(fourthAllowed == false,
               "4th rapid tap should be blocked to prevent playing with app")
    }

    @Test func blocksContinuousRapidTapping() {
        let detector = RapidTapDetector(window: 1.0, maxTaps: 3)
        let now = Date()

        // First 3 allowed
        _ = detector.shouldAllowTap(at: now)
        _ = detector.shouldAllowTap(at: now.addingTimeInterval(0.1))
        _ = detector.shouldAllowTap(at: now.addingTimeInterval(0.2))

        // Taps 4-10 should ALL be blocked while rapid tapping continues
        for i in 3..<10 {
            let tapTime = now.addingTimeInterval(Double(i) * 0.1)
            let allowed = detector.shouldAllowTap(at: tapTime)
            #expect(allowed == false,
                   "Tap \(i + 1) at \(Double(i) * 0.1)s should be blocked during rapid tapping")
        }
    }

    // MARK: - Recovery After Slowing Down

    @Test func allowsTapAfterWindowExpires() {
        let detector = RapidTapDetector(window: 1.0, maxTaps: 3)
        let now = Date()

        // Fill up the window
        _ = detector.shouldAllowTap(at: now)
        _ = detector.shouldAllowTap(at: now.addingTimeInterval(0.1))
        _ = detector.shouldAllowTap(at: now.addingTimeInterval(0.2))

        // 4th tap blocked
        #expect(detector.shouldAllowTap(at: now.addingTimeInterval(0.3)) == false)

        // After window expires (1.0s), taps should be allowed again
        let afterWindow = now.addingTimeInterval(1.5)
        #expect(detector.shouldAllowTap(at: afterWindow) == true,
               "Tap should be allowed after window expires and user slows down")
    }

    @Test func windowSlidesCorrectly() {
        let detector = RapidTapDetector(window: 1.0, maxTaps: 3)
        let now = Date()

        // Tap at 0.0s
        _ = detector.shouldAllowTap(at: now)
        // Tap at 0.5s
        _ = detector.shouldAllowTap(at: now.addingTimeInterval(0.5))
        // Tap at 1.0s (first tap should have expired)
        _ = detector.shouldAllowTap(at: now.addingTimeInterval(1.0))

        // At 1.1s, the 0.0s tap has expired, so we should have 2 taps in window
        // A new tap should be allowed
        let allowed = detector.shouldAllowTap(at: now.addingTimeInterval(1.1))
        #expect(allowed == true,
               "Tap should be allowed as old taps expire from sliding window")
    }

    // MARK: - Edge Cases

    @Test func resetClearsHistory() {
        let detector = RapidTapDetector(window: 1.0, maxTaps: 3)
        let now = Date()

        // Fill up and block
        _ = detector.shouldAllowTap(at: now)
        _ = detector.shouldAllowTap(at: now.addingTimeInterval(0.1))
        _ = detector.shouldAllowTap(at: now.addingTimeInterval(0.2))
        #expect(detector.shouldAllowTap(at: now.addingTimeInterval(0.3)) == false)

        // Reset
        detector.reset()

        // Should allow taps again immediately
        #expect(detector.shouldAllowTap(at: now.addingTimeInterval(0.4)) == true,
               "After reset, taps should be allowed immediately")
    }

    @Test func tracksCorrectTapCount() {
        let detector = RapidTapDetector(window: 1.0, maxTaps: 3)
        let now = Date()

        #expect(detector.trackedTapCount == 0)

        _ = detector.shouldAllowTap(at: now)
        #expect(detector.trackedTapCount == 1)

        _ = detector.shouldAllowTap(at: now.addingTimeInterval(0.1))
        #expect(detector.trackedTapCount == 2)

        _ = detector.shouldAllowTap(at: now.addingTimeInterval(0.2))
        #expect(detector.trackedTapCount == 3)

        // Blocked tap should NOT increment count
        _ = detector.shouldAllowTap(at: now.addingTimeInterval(0.3))
        #expect(detector.trackedTapCount == 3,
               "Blocked taps should not be added to history")
    }

    // MARK: - Real-World Scenarios

    @Test func normalUsagePattern() {
        // Simulate normal AAC usage: tap, wait, tap, wait
        let detector = RapidTapDetector(window: 1.5, maxTaps: 3)
        let now = Date()

        // User taps "I" - allowed
        #expect(detector.shouldAllowTap(at: now) == true)

        // User thinks, taps "want" after 2 seconds - allowed (window cleared)
        #expect(detector.shouldAllowTap(at: now.addingTimeInterval(2.0)) == true)

        // User taps "cookie" after 1 more second - allowed
        #expect(detector.shouldAllowTap(at: now.addingTimeInterval(3.0)) == true)

        // All taps allowed for normal deliberate usage
    }

    @Test func playingWithAppPattern() {
        // Simulate a child rapidly tapping for fun
        let detector = RapidTapDetector(window: 1.5, maxTaps: 3)
        let now = Date()

        var allowedCount = 0
        var blockedCount = 0

        // Child taps 20 times rapidly over 2 seconds
        for i in 0..<20 {
            let tapTime = now.addingTimeInterval(Double(i) * 0.1)
            if detector.shouldAllowTap(at: tapTime) {
                allowedCount += 1
            } else {
                blockedCount += 1
            }
        }

        #expect(allowedCount == 3,
               "Only first 3 taps should be allowed, got \(allowedCount)")
        #expect(blockedCount == 17,
               "17 taps should be blocked, got \(blockedCount)")
    }
}
