import Foundation

// MARK: - Request Models

/// Login request body
struct LoginRequest: Encodable {
    let email: String
    let password: String
}

/// Registration request body
struct RegisterRequest: Encodable {
    let email: String
    let password: String
    let role: UserRole
}

/// Device registration request body
struct DeviceRegistrationRequest: Encodable {
    let deviceToken: String
    let platform: DevicePlatform
}

/// Token refresh request body
struct RefreshTokenRequest: Encodable {
    let refreshToken: String
}

// MARK: - Response Models

/// Authentication response (login/register)
struct AuthResponse: Decodable {
    let message: String
    let user: UserInfo
    let accessToken: String
    let refreshToken: String
    let expiresIn: Int
}

/// Token refresh response
struct TokenRefreshResponse: Decodable {
    let message: String
    let accessToken: String
    let refreshToken: String
    let expiresIn: Int
}

/// User info response
struct UserInfoResponse: Decodable {
    let user: UserInfo
}

/// Device registration response
struct DeviceRegistrationResponse: Decodable {
    let message: String
    let device: DeviceInfo
}

/// Logout response
struct LogoutResponse: Decodable {
    let message: String
}

// MARK: - Shared Models

/// User information
struct UserInfo: Codable, Identifiable {
    let id: String
    let email: String
    let role: UserRole
}

/// User role
enum UserRole: String, Codable, CaseIterable {
    case caregiver
    case therapist
    case admin
}

/// Device platform
enum DevicePlatform: String, Codable {
    case ios
    case android
    case web
}

/// Device information
struct DeviceInfo: Codable {
    let id: String
    let deviceToken: String
    let platform: String
}

// MARK: - Token Storage

/// Stored authentication tokens
struct StoredTokens: Codable {
    let accessToken: String
    let refreshToken: String
    let expiresAt: Date
    
    /// Check if access token is expired or about to expire
    var isExpired: Bool {
        Date() >= expiresAt.addingTimeInterval(-APIConfiguration.tokenRefreshThreshold)
    }
    
    /// Check if access token is completely expired (past expiry time)
    var isCompletelyExpired: Bool {
        Date() >= expiresAt
    }
    
    init(accessToken: String, refreshToken: String, expiresIn: Int) {
        self.accessToken = accessToken
        self.refreshToken = refreshToken
        self.expiresAt = Date().addingTimeInterval(TimeInterval(expiresIn))
    }
}
