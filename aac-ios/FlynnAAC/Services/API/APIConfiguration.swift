import Foundation

/// API environment configuration
enum APIEnvironment: String, CaseIterable {
    case development
    case staging
    case production
    
    var baseURL: URL {
        switch self {
        case .development:
            // Local development server
            return URL(string: "http://localhost:3000")!
        case .staging:
            // Staging server (update when deployed)
            return URL(string: "https://staging-api.flynnapp.com")!
        case .production:
            // Production server (update when deployed)
            return URL(string: "https://api.flynnapp.com")!
        }
    }
    
    var apiVersion: String { "v1" }
    
    var apiBaseURL: URL {
        baseURL.appendingPathComponent("api").appendingPathComponent(apiVersion)
    }
    
    /// Clerk publishable key for this environment
    var clerkPublishableKey: String {
        switch self {
        case .development:
            // Test key - replace with your Clerk test key
            return "pk_test_REPLACE_WITH_YOUR_KEY"
        case .staging:
            return "pk_test_REPLACE_WITH_YOUR_KEY"
        case .production:
            return "pk_live_REPLACE_WITH_YOUR_KEY"
        }
    }
}

/// Global API configuration
struct APIConfiguration {
    /// Current environment - change this for different builds
    #if DEBUG
    static var environment: APIEnvironment = .development
    #else
    static var environment: APIEnvironment = .production
    #endif
    
    /// Request timeout in seconds
    static let requestTimeout: TimeInterval = 30
    
    /// Token refresh threshold - refresh if token expires within this many seconds
    static let tokenRefreshThreshold: TimeInterval = 300 // 5 minutes
    
    /// Maximum retry attempts for failed requests
    static let maxRetryAttempts = 3
    
    // MARK: - URL Helpers
    
    static var baseURL: URL { environment.baseURL }
    static var apiBaseURL: URL { environment.apiBaseURL }
    
    static func url(for path: String) -> URL {
        apiBaseURL.appendingPathComponent(path)
    }
    
    // MARK: - Clerk Configuration
    
    static var clerkPublishableKey: String { environment.clerkPublishableKey }
}
