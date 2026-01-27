import Foundation

/// Detects rapid tapping behavior ("playing with" the app) and blocks it
/// to ensure the AAC app is used for communication, not entertainment
class RapidTapDetector {
    private var recentTapTimes: [Date] = []
    private var lastTapTime: Date = .distantPast
    private var isBlocked: Bool = false
    private let rapidTapWindow: TimeInterval
    private let maxTapsInWindow: Int

    /// Creates a detector with configurable thresholds
    /// - Parameters:
    ///   - window: Time window in seconds to track taps (default 1.5s)
    ///   - maxTaps: Maximum taps allowed in window before blocking (default 3)
    init(window: TimeInterval = 1.5, maxTaps: Int = 3) {
        self.rapidTapWindow = window
        self.maxTapsInWindow = maxTaps
    }

    /// Check if a tap should be allowed based on recent tap history
    /// - Parameter now: The current time (injectable for testing)
    /// - Returns: true if tap should be allowed, false if rapid tapping detected
    func shouldAllowTap(at now: Date = Date()) -> Bool {
        // If blocked, only unblock after a complete pause (no taps for full window)
        if isBlocked {
            if now.timeIntervalSince(lastTapTime) >= rapidTapWindow {
                // User has paused long enough - unblock and reset
                isBlocked = false
                recentTapTimes.removeAll()
            } else {
                // Still tapping during blocked period - stay blocked
                lastTapTime = now
                return false
            }
        }

        // Remove taps outside the window
        recentTapTimes = recentTapTimes.filter { now.timeIntervalSince($0) < rapidTapWindow }

        // Check if this tap would exceed the limit
        if recentTapTimes.count >= maxTapsInWindow {
            // Enter blocked state - don't record this tap
            isBlocked = true
            lastTapTime = now
            return false
        }

        // Record this tap and allow it
        recentTapTimes.append(now)
        lastTapTime = now
        return true
    }

    /// Reset the detector state (useful for testing or when navigating away)
    func reset() {
        recentTapTimes.removeAll()
        lastTapTime = .distantPast
        isBlocked = false
    }

    /// Number of taps currently tracked in the window (for testing/debugging)
    var trackedTapCount: Int {
        recentTapTimes.count
    }
}
