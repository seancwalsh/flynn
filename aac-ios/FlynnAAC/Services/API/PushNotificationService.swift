import Foundation
import UserNotifications
import UIKit

/// Service for handling push notification registration and device token management
@MainActor
class PushNotificationService: NSObject, ObservableObject {
    static let shared = PushNotificationService()
    
    /// Current device token (hex string)
    @Published private(set) var deviceToken: String?
    
    /// Whether push notifications are authorized
    @Published private(set) var isAuthorized: Bool = false
    
    /// Current authorization status
    @Published private(set) var authorizationStatus: UNAuthorizationStatus = .notDetermined
    
    private let authService = AuthService.shared
    
    private override init() {
        super.init()
    }
    
    // MARK: - Public API
    
    /// Request push notification permissions
    func requestAuthorization() async -> Bool {
        let center = UNUserNotificationCenter.current()
        
        do {
            let granted = try await center.requestAuthorization(options: [.alert, .sound, .badge])
            await updateAuthorizationStatus()
            
            if granted {
                await registerForRemoteNotifications()
            }
            
            return granted
        } catch {
            print("Push notification authorization error: \(error)")
            return false
        }
    }
    
    /// Check current authorization status
    func checkAuthorizationStatus() async {
        await updateAuthorizationStatus()
    }
    
    /// Register device token with backend (call after authentication)
    func registerDeviceWithBackend() async {
        guard let token = deviceToken, authService.isAuthenticated else { return }
        
        do {
            try await authService.registerDevice(token: token, platform: .ios)
            print("Device registered with backend successfully")
        } catch {
            print("Failed to register device with backend: \(error)")
        }
    }
    
    /// Handle successful registration for remote notifications
    func didRegisterForRemoteNotifications(withDeviceToken token: Data) {
        let tokenString = token.map { String(format: "%02.2hhx", $0) }.joined()
        deviceToken = tokenString
        print("Device token: \(tokenString)")
        
        // Register with backend if authenticated
        Task {
            await registerDeviceWithBackend()
        }
    }
    
    /// Handle failed registration for remote notifications
    func didFailToRegisterForRemoteNotifications(withError error: Error) {
        print("Failed to register for remote notifications: \(error)")
    }
    
    // MARK: - Private
    
    private func updateAuthorizationStatus() async {
        let center = UNUserNotificationCenter.current()
        let settings = await center.notificationSettings()
        
        authorizationStatus = settings.authorizationStatus
        isAuthorized = settings.authorizationStatus == .authorized
    }
    
    private func registerForRemoteNotifications() async {
        await UIApplication.shared.registerForRemoteNotifications()
    }
}

// MARK: - UNUserNotificationCenterDelegate

extension PushNotificationService: UNUserNotificationCenterDelegate {
    /// Handle notification received while app is in foreground
    nonisolated func userNotificationCenter(
        _ center: UNUserNotificationCenter,
        willPresent notification: UNNotification,
        withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void
    ) {
        // Show notification even when app is in foreground
        completionHandler([.banner, .sound, .badge])
    }
    
    /// Handle notification tap
    nonisolated func userNotificationCenter(
        _ center: UNUserNotificationCenter,
        didReceive response: UNNotificationResponse,
        withCompletionHandler completionHandler: @escaping () -> Void
    ) {
        let userInfo = response.notification.request.content.userInfo
        
        // Handle notification action
        Task { @MainActor in
            handleNotificationTap(userInfo: userInfo)
        }
        
        completionHandler()
    }
    
    @MainActor
    private func handleNotificationTap(userInfo: [AnyHashable: Any]) {
        // Handle different notification types
        if let type = userInfo["type"] as? String {
            switch type {
            case "insight":
                // Navigate to insights
                print("Opening insight from notification")
            case "reminder":
                // Handle reminder
                print("Opening reminder from notification")
            default:
                print("Unknown notification type: \(type)")
            }
        }
    }
}
