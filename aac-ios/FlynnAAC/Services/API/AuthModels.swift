import Foundation

// MARK: - Request Models

/// Device registration request body
struct DeviceRegistrationRequest: Encodable {
    let deviceToken: String
    let platform: DevicePlatform
}

// MARK: - Response Models

/// User info response
struct UserInfoResponse: Decodable {
    let user: UserInfo
}

/// Device registration response
struct DeviceRegistrationResponse: Decodable {
    let message: String
    let device: DeviceInfo
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
