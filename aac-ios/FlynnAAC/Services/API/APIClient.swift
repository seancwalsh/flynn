import Foundation
import ClerkSDK

/// HTTP methods
enum HTTPMethod: String {
    case get = "GET"
    case post = "POST"
    case put = "PUT"
    case patch = "PATCH"
    case delete = "DELETE"
}

/// Main API client with Clerk authentication
actor APIClient {
    static let shared = APIClient()
    
    private let session: URLSession
    private let decoder: JSONDecoder
    private let encoder: JSONEncoder
    
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
        
        // Build request
        var request = URLRequest(url: url)
        request.httpMethod = method.rawValue
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("application/json", forHTTPHeaderField: "Accept")
        
        // Add Clerk auth header if required
        if requiresAuth {
            guard let token = await getClerkToken() else {
                throw APIError.unauthorized
            }
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
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
            // Handle 401 - session might be invalid
            if httpResponse.statusCode == 401 {
                throw APIError.tokenExpired
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
    
    /// Perform an unauthenticated request
    func requestUnauthenticated<T: Decodable>(
        path: String,
        method: HTTPMethod = .post,
        body: (any Encodable)? = nil
    ) async throws -> T {
        try await request(path: path, method: method, body: body, requiresAuth: false)
    }
    
    // MARK: - Clerk Token Management
    
    /// Get the current Clerk session token
    private func getClerkToken() async -> String? {
        guard let clerkSession = Clerk.shared.session,
              clerkSession.status == .active else {
            return nil
        }
        
        do {
            let tokenResult = try await clerkSession.getToken()
            return tokenResult?.jwt
        } catch {
            print("Failed to get Clerk token: \(error)")
            return nil
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
