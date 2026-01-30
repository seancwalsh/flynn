import SwiftUI
import ClerkSDK

/// Container view that shows either auth screens or main content
struct AuthContainerView<Content: View>: View {
    @StateObject private var authService = AuthService.shared
    @StateObject private var deviceManager = DeviceManager.shared
    @State private var isCheckingAuth = true
    @State private var needsOnboarding = false
    let content: () -> Content

    init(@ViewBuilder content: @escaping () -> Content) {
        self.content = content
    }

    var body: some View {
        Group {
            if isCheckingAuth {
                // Loading state while checking auth
                splashView
            } else if !authService.isAuthenticated {
                // Show login screen
                LoginView(authService: authService)
            } else if needsOnboarding {
                // Show child selection onboarding
                ChildSelectionView {
                    // After selecting child, check again
                    checkOnboardingStatus()
                }
            } else {
                // Show main content
                content()
                    .environment(\.authService, authService)
            }
        }
        .task {
            // Try to restore session on app launch
            await restoreSession()
        }
        .onChange(of: authService.isAuthenticated) { _, isAuthenticated in
            // When auth state changes, re-check onboarding
            if isAuthenticated {
                checkOnboardingStatus()
            }
        }
    }

    /// Check if device needs onboarding (child selection)
    private func checkOnboardingStatus() {
        needsOnboarding = !deviceManager.isDeviceRegistered
    }
    
    private var splashView: some View {
        ZStack {
            LinearGradient(
                colors: [
                    Color(red: 0.95, green: 0.93, blue: 0.98),
                    Color(red: 0.92, green: 0.96, blue: 0.98),
                    Color(red: 0.96, green: 0.94, blue: 0.92)
                ],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
            .ignoresSafeArea()
            
            VStack(spacing: 16) {
                Text("Flynn")
                    .font(.custom("Bradley Hand", size: 56))
                    .fontWeight(.bold)
                    .foregroundStyle(
                        LinearGradient(
                            colors: [
                                Color(red: 0.36, green: 0.55, blue: 0.87),
                                Color(red: 0.58, green: 0.44, blue: 0.78)
                            ],
                            startPoint: .leading,
                            endPoint: .trailing
                        )
                    )
                
                ProgressView()
                    .scaleEffect(1.2)
            }
        }
    }
    
    private func restoreSession() async {
        // Small delay to show splash
        try? await Task.sleep(nanoseconds: 500_000_000)

        // Check Clerk session
        await authService.checkClerkSession()

        // Check if device needs onboarding
        checkOnboardingStatus()

        withAnimation {
            isCheckingAuth = false
        }
    }
}

// MARK: - Environment Key

private struct AuthServiceKey: EnvironmentKey {
    static let defaultValue: AuthService = .shared
}

extension EnvironmentValues {
    var authService: AuthService {
        get { self[AuthServiceKey.self] }
        set { self[AuthServiceKey.self] = newValue }
    }
}

#Preview("Authenticated") {
    AuthContainerView {
        Text("Main Content")
    }
}
