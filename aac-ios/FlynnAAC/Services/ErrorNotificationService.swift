import SwiftUI
import Combine

/// Types of errors that can be displayed to users
enum AppError: Equatable {
    case imageLoadFailed(symbolId: String)
    case audioFallback(reason: String)
    case networkUnavailable
    case syncFailed
    case generic(message: String)
    
    var title: String {
        switch self {
        case .imageLoadFailed:
            return "Image Unavailable"
        case .audioFallback:
            return "Audio Quality Reduced"
        case .networkUnavailable:
            return "No Connection"
        case .syncFailed:
            return "Sync Failed"
        case .generic:
            return "Something Went Wrong"
        }
    }
    
    var message: String {
        switch self {
        case .imageLoadFailed(let symbolId):
            return "Using fallback image for \"\(symbolId)\""
        case .audioFallback(let reason):
            return reason
        case .networkUnavailable:
            return "Check your internet connection"
        case .syncFailed:
            return "Changes will sync when connected"
        case .generic(let message):
            return message
        }
    }
    
    var icon: String {
        switch self {
        case .imageLoadFailed:
            return "photo.badge.exclamationmark"
        case .audioFallback:
            return "speaker.wave.1"
        case .networkUnavailable:
            return "wifi.slash"
        case .syncFailed:
            return "icloud.slash"
        case .generic:
            return "exclamationmark.triangle"
        }
    }
    
    var severity: ErrorSeverity {
        switch self {
        case .imageLoadFailed:
            return .info
        case .audioFallback:
            return .info
        case .networkUnavailable:
            return .warning
        case .syncFailed:
            return .warning
        case .generic:
            return .error
        }
    }
}

enum ErrorSeverity {
    case info
    case warning
    case error
    
    var color: Color {
        switch self {
        case .info:
            return .blue
        case .warning:
            return .orange
        case .error:
            return .red
        }
    }
}

/// Notification model for display
struct ErrorNotification: Identifiable, Equatable {
    let id = UUID()
    let error: AppError
    let timestamp: Date
    
    static func == (lhs: ErrorNotification, rhs: ErrorNotification) -> Bool {
        lhs.id == rhs.id
    }
}

/// Observable service for managing error notifications
@MainActor
final class ErrorNotificationService: ObservableObject {
    static let shared = ErrorNotificationService()
    
    @Published private(set) var currentNotification: ErrorNotification?
    @Published private(set) var notificationHistory: [ErrorNotification] = []
    
    private var dismissTask: Task<Void, Never>?
    private let autoDismissDelay: TimeInterval = 5.0
    private let maxHistorySize = 20
    
    // Suppress duplicate errors within this window
    private let deduplicationWindow: TimeInterval = 10.0
    private var recentErrors: [String: Date] = [:]
    
    private init() {}
    
    /// Show an error notification
    /// - Parameters:
    ///   - error: The error to display
    ///   - autoDismiss: Whether to auto-dismiss after delay (default: true)
    func show(_ error: AppError, autoDismiss: Bool = true) {
        // Check for duplicate recent error
        let errorKey = "\(error.title):\(error.message)"
        if let lastShown = recentErrors[errorKey],
           Date().timeIntervalSince(lastShown) < deduplicationWindow {
            return // Suppress duplicate
        }
        recentErrors[errorKey] = Date()
        
        // Clean old entries from dedup cache
        let cutoff = Date().addingTimeInterval(-deduplicationWindow)
        recentErrors = recentErrors.filter { $0.value > cutoff }
        
        let notification = ErrorNotification(error: error, timestamp: Date())
        
        // Cancel any pending dismiss
        dismissTask?.cancel()
        
        // Show new notification
        withAnimation(.spring(response: 0.3, dampingFraction: 0.7)) {
            currentNotification = notification
        }
        
        // Haptic feedback
        HapticManager.shared.warning()
        
        // Add to history
        notificationHistory.insert(notification, at: 0)
        if notificationHistory.count > maxHistorySize {
            notificationHistory.removeLast()
        }
        
        // Auto-dismiss if requested
        if autoDismiss {
            dismissTask = Task {
                try? await Task.sleep(nanoseconds: UInt64(autoDismissDelay * 1_000_000_000))
                guard !Task.isCancelled else { return }
                dismiss()
            }
        }
    }
    
    /// Dismiss current notification
    func dismiss() {
        dismissTask?.cancel()
        withAnimation(.spring(response: 0.25, dampingFraction: 0.8)) {
            currentNotification = nil
        }
    }
    
    /// Clear all notifications including history
    func clearAll() {
        dismiss()
        notificationHistory.removeAll()
    }
}

// MARK: - Convenience Methods

extension ErrorNotificationService {
    /// Report an image loading failure
    func reportImageLoadFailed(symbolId: String) {
        show(.imageLoadFailed(symbolId: symbolId))
    }
    
    /// Report audio fallback to system TTS
    func reportAudioFallback(reason: String = "Using system voice") {
        show(.audioFallback(reason: reason))
    }
    
    /// Report network unavailable
    func reportNetworkUnavailable() {
        show(.networkUnavailable, autoDismiss: false)
    }
    
    /// Report sync failure
    func reportSyncFailed() {
        show(.syncFailed)
    }
}
