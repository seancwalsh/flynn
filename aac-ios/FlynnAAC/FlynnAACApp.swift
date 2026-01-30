import SwiftUI
import UserNotifications

@main
struct FlynnAACApp: App {
    @UIApplicationDelegateAdaptor(AppDelegate.self) var appDelegate
    @Environment(\.scenePhase) private var scenePhase

    var body: some Scene {
        WindowGroup {
            AuthContainerView {
                ContentView()
            }
            .preloadOnFirstLaunch()  // Show preload progress on first launch
        }
        .onChange(of: scenePhase) { oldPhase, newPhase in
            switch newPhase {
            case .active:
                // Sync when app becomes active
                Task {
                    do {
                        try await SyncService.shared.syncUsageData()
                    } catch {
                        print("⚠️ Failed to sync on app active: \(error)")
                    }
                }
            case .background:
                // Sync before going to background
                Task {
                    do {
                        try await SyncService.shared.syncUsageData()
                    } catch {
                        print("⚠️ Failed to sync before background: \(error)")
                    }
                }
            default:
                break
            }
        }
    }
}

/// App delegate for handling push notifications and app lifecycle
class AppDelegate: NSObject, UIApplicationDelegate {
    func application(
        _ application: UIApplication,
        didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?
    ) -> Bool {
        // Set up push notification delegate
        UNUserNotificationCenter.current().delegate = PushNotificationService.shared
        
        return true
    }
    
    func application(
        _ application: UIApplication,
        didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data
    ) {
        Task { @MainActor in
            PushNotificationService.shared.didRegisterForRemoteNotifications(withDeviceToken: deviceToken)
        }
    }
    
    func application(
        _ application: UIApplication,
        didFailToRegisterForRemoteNotificationsWithError error: Error
    ) {
        Task { @MainActor in
            PushNotificationService.shared.didFailToRegisterForRemoteNotifications(withError: error)
        }
    }
}
