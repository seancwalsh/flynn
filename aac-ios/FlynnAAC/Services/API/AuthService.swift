import Foundation
import ClerkSDK

/// Authentication service using Clerk
@MainActor
class AuthService: ObservableObject {
    static let shared = AuthService()
    
    /// Current authenticated user info (from our backend)
    @Published private(set) var currentUser: UserInfo?
    
    /// Whether the user is authenticated with Clerk
    @Published private(set) var isAuthenticated: Bool = false
    
    /// Loading state
    @Published private(set) var isLoading: Bool = false
    
    /// Last error
    @Published var lastError: APIError?
    
    private let apiClient = APIClient.shared
    
    private init() {
        // Configure Clerk
        Task {
            await configureClerk()
        }
    }
    
    // MARK: - Clerk Configuration
    
    private func configureClerk() async {
        // Configure Clerk with publishable key
        Clerk.configure(publishableKey: APIConfiguration.clerkPublishableKey)
        
        // Observe Clerk session changes
        await observeClerkSession()
    }
    
    private func observeClerkSession() async {
        // Check initial session state
        await checkClerkSession()
        
        // Set up observation for session changes
        Task {
            for await session in Clerk.shared.$session.values {
                await handleSessionChange(session)
            }
        }
    }
    
    private func handleSessionChange(_ session: Session?) async {
        if let session = session, session.status == .active {
            isAuthenticated = true
            // Fetch user info from our backend
            try? await refreshUserInfo()
        } else {
            isAuthenticated = false
            currentUser = nil
        }
    }
    
    // MARK: - Public API
    
    /// Check if user has an active Clerk session
    func checkClerkSession() async {
        isLoading = true
        defer { isLoading = false }
        
        if let session = Clerk.shared.session, session.status == .active {
            isAuthenticated = true
            try? await refreshUserInfo()
        } else {
            isAuthenticated = false
            currentUser = nil
        }
    }
    
    /// Sign in with email and password using Clerk
    func signIn(email: String, password: String) async throws {
        isLoading = true
        lastError = nil
        
        defer { isLoading = false }
        
        do {
            // Create sign-in attempt with Clerk
            let signIn = try await SignIn.create(strategy: .identifier(email, password: password))
            
            // Check if sign-in is complete
            if signIn.status == .complete {
                // Session is automatically set by Clerk
                isAuthenticated = true
                try await refreshUserInfo()
            } else {
                // Might need additional verification (e.g., MFA)
                throw APIError.httpError(statusCode: 400, message: "Additional verification required", code: "VERIFICATION_REQUIRED")
            }
        } catch let error as ClerkClientError {
            let apiError = APIError.httpError(statusCode: 401, message: error.localizedDescription, code: "CLERK_ERROR")
            lastError = apiError
            throw apiError
        } catch let error as APIError {
            lastError = error
            throw error
        } catch {
            let apiError = APIError.unknown(error)
            lastError = apiError
            throw apiError
        }
    }
    
    /// Sign up with email, password, and role using Clerk
    func signUp(email: String, password: String, role: UserRole = .caregiver) async throws {
        isLoading = true
        lastError = nil
        
        defer { isLoading = false }
        
        do {
            // Create sign-up with Clerk
            // Note: Role is stored in unsafe metadata and will be picked up by webhook
            let signUp = try await SignUp.create(
                strategy: .standard(emailAddress: email, password: password),
                unsafeMetadata: ["role": role.rawValue]
            )
            
            // Check if email verification is needed
            if signUp.status == .missingRequirements {
                // Prepare email verification
                try await signUp.prepareVerification(strategy: .emailCode)
                // The user will need to enter the code - this should trigger a UI change
                throw APIError.httpError(statusCode: 200, message: "Please check your email for a verification code", code: "VERIFICATION_NEEDED")
            } else if signUp.status == .complete {
                isAuthenticated = true
                try await refreshUserInfo()
            }
        } catch let error as ClerkClientError {
            let apiError = APIError.httpError(statusCode: 400, message: error.localizedDescription, code: "CLERK_ERROR")
            lastError = apiError
            throw apiError
        } catch let error as APIError {
            lastError = error
            throw error
        } catch {
            let apiError = APIError.unknown(error)
            lastError = apiError
            throw apiError
        }
    }
    
    /// Complete email verification during sign-up
    func verifyEmail(code: String) async throws {
        isLoading = true
        lastError = nil
        
        defer { isLoading = false }
        
        do {
            guard let signUp = Clerk.shared.signUp else {
                throw APIError.httpError(statusCode: 400, message: "No pending sign-up", code: "NO_SIGNUP")
            }
            
            let result = try await signUp.attemptVerification(strategy: .emailCode(code: code))
            
            if result.status == .complete {
                isAuthenticated = true
                try await refreshUserInfo()
            }
        } catch let error as ClerkClientError {
            let apiError = APIError.httpError(statusCode: 400, message: error.localizedDescription, code: "CLERK_ERROR")
            lastError = apiError
            throw apiError
        } catch let error as APIError {
            lastError = error
            throw error
        } catch {
            let apiError = APIError.unknown(error)
            lastError = apiError
            throw apiError
        }
    }
    
    /// Sign out from Clerk
    func signOut() async {
        isLoading = true
        
        defer {
            isLoading = false
            isAuthenticated = false
            currentUser = nil
        }
        
        do {
            try await Clerk.shared.signOut()
        } catch {
            print("Sign out error: \(error)")
        }
    }
    
    /// Get current user info from our backend
    func refreshUserInfo() async throws {
        guard isAuthenticated else {
            throw APIError.unauthorized
        }
        
        let response: UserInfoResponse = try await apiClient.get(path: "auth/me")
        currentUser = response.user
    }
    
    /// Register device for push notifications
    func registerDevice(token: String, platform: DevicePlatform = .ios) async throws {
        guard isAuthenticated else {
            throw APIError.unauthorized
        }
        
        let request = DeviceRegistrationRequest(deviceToken: token, platform: platform)
        let _: DeviceRegistrationResponse = try await apiClient.post(
            path: "auth/device",
            body: request
        )
    }
    
    /// Try to restore session from Clerk
    /// Returns true if session was restored successfully
    @discardableResult
    func restoreSession() async -> Bool {
        isLoading = true
        defer { isLoading = false }
        
        // Check if Clerk has an active session
        if let session = Clerk.shared.session, session.status == .active {
            isAuthenticated = true
            
            // Refresh user info in background
            Task {
                try? await refreshUserInfo()
            }
            
            return true
        }
        
        return false
    }
    
    /// Get the current Clerk session token for API calls
    func getSessionToken() async throws -> String? {
        guard let session = Clerk.shared.session else {
            return nil
        }
        
        // Get a fresh token from Clerk
        let tokenResult = try await session.getToken()
        return tokenResult?.jwt
    }
}

// MARK: - Error Helpers

extension AuthService {
    /// Check if the last error requires re-authentication
    var needsReauth: Bool {
        lastError?.requiresReauth ?? false
    }
    
    /// Clear the last error
    func clearError() {
        lastError = nil
    }
}
