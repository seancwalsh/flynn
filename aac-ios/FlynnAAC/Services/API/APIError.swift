import Foundation

/// API error types
enum APIError: LocalizedError {
    case invalidURL
    case invalidRequest
    case invalidResponse
    case decodingError(Error)
    case encodingError(Error)
    case networkError(Error)
    case httpError(statusCode: Int, message: String?, code: String?)
    case unauthorized
    case tokenExpired
    case tokenRefreshFailed
    case serverError(String)
    case unknown(Error?)
    
    var errorDescription: String? {
        switch self {
        case .invalidURL:
            return "Invalid URL"
        case .invalidRequest:
            return "Invalid request"
        case .invalidResponse:
            return "Invalid response from server"
        case .decodingError(let error):
            return "Failed to decode response: \(error.localizedDescription)"
        case .encodingError(let error):
            return "Failed to encode request: \(error.localizedDescription)"
        case .networkError(let error):
            return "Network error: \(error.localizedDescription)"
        case .httpError(let statusCode, let message, _):
            return message ?? "HTTP error \(statusCode)"
        case .unauthorized:
            return "Authentication required"
        case .tokenExpired:
            return "Session expired, please log in again"
        case .tokenRefreshFailed:
            return "Failed to refresh session"
        case .serverError(let message):
            return "Server error: \(message)"
        case .unknown(let error):
            return error?.localizedDescription ?? "An unknown error occurred"
        }
    }
    
    /// Check if this error requires the user to re-authenticate
    var requiresReauth: Bool {
        switch self {
        case .unauthorized, .tokenExpired, .tokenRefreshFailed:
            return true
        case .httpError(let statusCode, _, _):
            return statusCode == 401
        default:
            return false
        }
    }
}

/// API error response model (matches backend error format)
struct APIErrorResponse: Decodable {
    let error: String?
    let message: String?
    let code: String?
    let statusCode: Int?
}
