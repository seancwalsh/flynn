import Foundation
import UIKit

/// Manages communication sessions by tracking user activity and generating session IDs
/// A new session is created after 30+ minutes of inactivity
@MainActor
class SessionManager: ObservableObject {
    static let shared = SessionManager()

    /// Current session ID (regenerates after 30+ min inactivity)
    @Published private(set) var currentSessionId: String

    /// Time of last recorded activity
    private var lastActivityTime: Date?

    /// Session timeout interval (30 minutes)
    private let sessionTimeoutInterval: TimeInterval = 1800 // 30 minutes

    private init() {
        self.currentSessionId = UUID().uuidString
        self.lastActivityTime = Date()

        // Monitor app lifecycle to detect foreground/background transitions
        setupNotifications()

        print("🔄 SessionManager: Started with session \(currentSessionId.prefix(8))...")
    }

    deinit {
        NotificationCenter.default.removeObserver(self)
    }

    // MARK: - Public API

    /// Record activity and potentially start new session if timeout exceeded
    func recordActivity() {
        let now = Date()

        // Check if we need to start a new session (30+ min since last activity)
        if let lastTime = lastActivityTime {
            let timeSinceLastActivity = now.timeIntervalSince(lastTime)

            if timeSinceLastActivity > sessionTimeoutInterval {
                startNewSession()
            }
        }

        lastActivityTime = now
    }

    /// Force start a new session (useful for testing or manual triggers)
    func startNewSession() {
        let oldSessionId = currentSessionId
        currentSessionId = UUID().uuidString
        lastActivityTime = Date()

        print("🔄 SessionManager: New session \(currentSessionId.prefix(8))... (previous: \(oldSessionId.prefix(8))...)")
    }

    /// Get the current session ID (convenience accessor)
    var session: String {
        return currentSessionId
    }

    // MARK: - Private Helpers

    /// Set up notifications for app lifecycle events
    private func setupNotifications() {
        // App became active - check if we need new session
        NotificationCenter.default.addObserver(
            self,
            selector: #selector(appDidBecomeActive),
            name: UIApplication.didBecomeActiveNotification,
            object: nil
        )

        // App will resign active - record timestamp
        NotificationCenter.default.addObserver(
            self,
            selector: #selector(appWillResignActive),
            name: UIApplication.willResignActiveNotification,
            object: nil
        )
    }

    @objc private func appDidBecomeActive() {
        // When app becomes active, check if we've been away long enough for new session
        recordActivity()
    }

    @objc private func appWillResignActive() {
        // Record when app goes to background so we can calculate time away
        lastActivityTime = Date()
    }
}
