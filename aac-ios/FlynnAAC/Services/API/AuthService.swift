import Foundation

/// Authentication service for login, registration, and user management
@MainActor
class AuthService: ObservableObject {
    static let shared = AuthService()
    
    /// Current authenticated user
    @Published private(set) var currentUser: UserInfo?
    
    /// Whether the user is authenticated
    @Published private(set) var isAuthenticated: Bool = false
    
    /// Loading state
    @Published private(set) var isLoading: Bool = false
    
    /// Last error
    @Published var lastError: APIError?
    
    private let apiClient = APIClient.shared
    
    private init() {
        // Load cached user on init
        loadCachedAuth()
    }
    
    // MARK: - Public API
    
    /// Login with email and password
    func login(email: String, password: String) async throws {
        isLoading = true
        lastError = nil
        
        defer { isLoading = false }
        
        do {
            let request = LoginRequest(email: email, password: password)
            let response: AuthResponse = try await apiClient.requestUnauthenticated(
                path: "auth/login",
                body: request
            )
            
            // Store tokens and user
            let tokens = StoredTokens(
                accessToken: response.accessToken,
                refreshToken: response.refreshToken,
                expiresIn: response.expiresIn
            )
            AuthKeychain.saveTokens(tokens)
            AuthKeychain.saveUser(response.user)
            
            // Update state
            currentUser = response.user
            isAuthenticated = true
            
        } catch let error as APIError {
            lastError = error
            throw error
        } catch {
            let apiError = APIError.unknown(error)
            lastError = apiError
            throw apiError
        }
    }
    
    /// Register a new user
    func register(email: String, password: String, role: UserRole = .caregiver) async throws {
        isLoading = true
        lastError = nil
        
        defer { isLoading = false }
        
        do {
            let request = RegisterRequest(email: email, password: password, role: role)
            let response: AuthResponse = try await apiClient.requestUnauthenticated(
                path: "auth/register",
                body: request
            )
            
            // Store tokens and user
            let tokens = StoredTokens(
                accessToken: response.accessToken,
                refreshToken: response.refreshToken,
                expiresIn: response.expiresIn
            )
            AuthKeychain.saveTokens(tokens)
            AuthKeychain.saveUser(response.user)
            
            // Update state
            currentUser = response.user
            isAuthenticated = true
            
        } catch let error as APIError {
            lastError = error
            throw error
        } catch {
            let apiError = APIError.unknown(error)
            lastError = apiError
            throw apiError
        }
    }
    
    /// Logout current user
    func logout() async {
        isLoading = true
        
        defer {
            isLoading = false
            // Always clear local state regardless of API call success
            AuthKeychain.clearAll()
            currentUser = nil
            isAuthenticated = false
        }
        
        // Try to revoke tokens on server (best effort)
        do {
            let _: LogoutResponse = try await apiClient.post(path: "auth/logout")
        } catch {
            // Ignore errors - we still want to clear local state
            print("Logout API call failed: \(error)")
        }
    }
    
    /// Get current user info from server
    func refreshUserInfo() async throws {
        guard isAuthenticated else {
            throw APIError.unauthorized
        }
        
        let response: UserInfoResponse = try await apiClient.get(path: "auth/me")
        currentUser = response.user
        AuthKeychain.saveUser(response.user)
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
    
    /// Try to restore session from stored tokens
    /// Returns true if session was restored successfully
    @discardableResult
    func restoreSession() async -> Bool {
        guard let tokens = AuthKeychain.getTokens(),
              let user = AuthKeychain.getUser() else {
            return false
        }
        
        // If token is completely expired, try to refresh
        if tokens.isCompletelyExpired {
            do {
                let refreshed = try await apiClient.refreshToken()
                if !refreshed {
                    AuthKeychain.clearAll()
                    return false
                }
            } catch {
                AuthKeychain.clearAll()
                return false
            }
        }
        
        // Token is valid (or was refreshed), restore session
        currentUser = user
        isAuthenticated = true
        
        // Optionally refresh user info in background
        Task {
            try? await refreshUserInfo()
        }
        
        return true
    }
    
    // MARK: - Private
    
    private func loadCachedAuth() {
        if let user = AuthKeychain.getUser(), AuthKeychain.hasTokens() {
            currentUser = user
            isAuthenticated = true
        }
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
