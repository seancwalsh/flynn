import Foundation

/// HTTP methods
enum HTTPMethod: String {
    case get = "GET"
    case post = "POST"
    case put = "PUT"
    case patch = "PATCH"
    case delete = "DELETE"
}

/// Main API client with automatic token refresh
actor APIClient {
    static let shared = APIClient()
    
    private let session: URLSession
    private let decoder: JSONDecoder
    private let encoder: JSONEncoder
    
    /// Flag to prevent concurrent token refreshes
    private var isRefreshingToken = false
    /// Pending requests waiting for token refresh
    private var pendingRequests: [CheckedContinuation<Void, Never>] = []
    
    private init() {
        let config = URLSessionConfiguration.default
        config.timeoutIntervalForRequest = APIConfiguration.requestTimeout
        config.timeoutIntervalForResource = APIConfiguration.requestTimeout * 2
        
        self.session = URLSession(configuration: config)
        
        self.decoder = JSONDecoder()
        decoder.keyDecodingStrategy = .convertFromSnakeCase
        decoder.dateDecodingStrategy = .iso8601
        
        self.encoder = JSONEncoder()
        encoder.keyEncodingStrategy = .convertToSnakeCase
        encoder.dateEncodingStrategy = .iso8601
    }
    
    // MARK: - Public Request Methods
    
    /// Perform an authenticated request
    func request<T: Decodable>(
        path: String,
        method: HTTPMethod = .get,
        body: (any Encodable)? = nil,
        requiresAuth: Bool = true
    ) async throws -> T {
        // Build URL
        let url = APIConfiguration.url(for: path)
        
        // Check and refresh token if needed
        if requiresAuth {
            try await ensureValidToken()
        }
        
        // Build request
        var request = URLRequest(url: url)
        request.httpMethod = method.rawValue
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("application/json", forHTTPHeaderField: "Accept")
        
        // Add auth header
        if requiresAuth, let tokens = AuthKeychain.getTokens() {
            request.setValue("Bearer \(tokens.accessToken)", forHTTPHeaderField: "Authorization")
        }
        
        // Encode body
        if let body {
            do {
                request.httpBody = try encoder.encode(body)
            } catch {
                throw APIError.encodingError(error)
            }
        }
        
        // Perform request
        let (data, response): (Data, URLResponse)
        do {
            (data, response) = try await session.data(for: request)
        } catch {
            throw APIError.networkError(error)
        }
        
        // Validate response
        guard let httpResponse = response as? HTTPURLResponse else {
            throw APIError.invalidResponse
        }
        
        // Handle HTTP errors
        if !(200...299).contains(httpResponse.statusCode) {
            // Handle 401 with token refresh retry
            if httpResponse.statusCode == 401 && requiresAuth {
                let refreshed = try await refreshToken()
                if refreshed {
                    // Retry the request once
                    return try await request(path: path, method: method, body: body, requiresAuth: true)
                } else {
                    throw APIError.tokenRefreshFailed
                }
            }
            
            // Try to decode error response
            if let errorResponse = try? decoder.decode(APIErrorResponse.self, from: data) {
                throw APIError.httpError(
                    statusCode: httpResponse.statusCode,
                    message: errorResponse.message ?? errorResponse.error,
                    code: errorResponse.code
                )
            }
            
            throw APIError.httpError(statusCode: httpResponse.statusCode, message: nil, code: nil)
        }
        
        // Decode response
        do {
            return try decoder.decode(T.self, from: data)
        } catch {
            throw APIError.decodingError(error)
        }
    }
    
    /// Perform an unauthenticated request (login, register, refresh)
    func requestUnauthenticated<T: Decodable>(
        path: String,
        method: HTTPMethod = .post,
        body: (any Encodable)? = nil
    ) async throws -> T {
        try await request(path: path, method: method, body: body, requiresAuth: false)
    }
    
    // MARK: - Token Management
    
    /// Ensure we have a valid token, refreshing if necessary
    private func ensureValidToken() async throws {
        guard let tokens = AuthKeychain.getTokens() else {
            throw APIError.unauthorized
        }
        
        if tokens.isExpired {
            let refreshed = try await refreshToken()
            if !refreshed {
                throw APIError.tokenExpired
            }
        }
    }
    
    /// Refresh the access token
    /// Returns true if refresh was successful
    @discardableResult
    func refreshToken() async throws -> Bool {
        // Wait if already refreshing
        if isRefreshingToken {
            await withCheckedContinuation { continuation in
                pendingRequests.append(continuation)
            }
            return AuthKeychain.hasTokens()
        }
        
        guard let tokens = AuthKeychain.getTokens() else {
            return false
        }
        
        isRefreshingToken = true
        defer {
            isRefreshingToken = false
            // Resume all pending requests
            for continuation in pendingRequests {
                continuation.resume()
            }
            pendingRequests.removeAll()
        }
        
        do {
            let refreshRequest = RefreshTokenRequest(refreshToken: tokens.refreshToken)
            let response: TokenRefreshResponse = try await requestUnauthenticated(
                path: "auth/refresh",
                body: refreshRequest
            )
            
            let newTokens = StoredTokens(
                accessToken: response.accessToken,
                refreshToken: response.refreshToken,
                expiresIn: response.expiresIn
            )
            AuthKeychain.saveTokens(newTokens)
            
            return true
        } catch {
            // Token refresh failed - clear stored tokens
            AuthKeychain.clearAll()
            return false
        }
    }
}

// MARK: - Convenience Extensions

extension APIClient {
    /// GET request
    func get<T: Decodable>(path: String, requiresAuth: Bool = true) async throws -> T {
        try await request(path: path, method: .get, requiresAuth: requiresAuth)
    }
    
    /// POST request
    func post<T: Decodable>(path: String, body: (any Encodable)? = nil, requiresAuth: Bool = true) async throws -> T {
        try await request(path: path, method: .post, body: body, requiresAuth: requiresAuth)
    }
    
    /// PUT request
    func put<T: Decodable>(path: String, body: (any Encodable)? = nil, requiresAuth: Bool = true) async throws -> T {
        try await request(path: path, method: .put, body: body, requiresAuth: requiresAuth)
    }
    
    /// DELETE request
    func delete<T: Decodable>(path: String, requiresAuth: Bool = true) async throws -> T {
        try await request(path: path, method: .delete, requiresAuth: requiresAuth)
    }
}
