import Foundation

/// Protocol for data synchronization between local storage and backend
protocol SyncServiceProtocol {
    /// Sync all pending changes to the backend
    func syncAll() async throws
    
    /// Sync symbol usage data
    func syncUsageData() async throws
    
    /// Sync user preferences and settings
    func syncPreferences() async throws
    
    /// Fetch latest data from backend
    func fetchLatest() async throws
    
    /// Get last sync timestamp
    var lastSyncDate: Date? { get }
    
    /// Whether sync is currently in progress
    var isSyncing: Bool { get }
}

/// Sync status for UI display
enum SyncStatus {
    case idle
    case syncing
    case success(Date)
    case error(Error)
}

/// Data sync service for syncing local data with the backend
/// Currently a stub - will be implemented with CloudKit integration
@MainActor
class SyncService: ObservableObject, SyncServiceProtocol {
    static let shared = SyncService()
    
    /// Current sync status
    @Published private(set) var status: SyncStatus = .idle
    
    /// Last successful sync date
    @Published private(set) var lastSyncDate: Date?
    
    /// Whether sync is in progress
    @Published private(set) var isSyncing: Bool = false
    
    private let apiClient = APIClient.shared
    private let authService = AuthService.shared
    
    // Storage keys
    private let lastSyncKey = "SyncService.lastSyncDate"
    
    private init() {
        // Load last sync date from UserDefaults
        if let timestamp = UserDefaults.standard.object(forKey: lastSyncKey) as? Date {
            lastSyncDate = timestamp
        }
    }
    
    // MARK: - SyncServiceProtocol
    
    /// Sync all data with backend
    func syncAll() async throws {
        guard authService.isAuthenticated else {
            throw SyncError.notAuthenticated
        }
        
        guard !isSyncing else {
            throw SyncError.alreadySyncing
        }
        
        isSyncing = true
        status = .syncing
        
        defer {
            isSyncing = false
        }
        
        do {
            // TODO: Implement actual sync logic
            // 1. Push local changes
            try await syncUsageData()
            try await syncPreferences()
            
            // 2. Pull remote changes
            try await fetchLatest()
            
            // 3. Update sync timestamp
            let now = Date()
            lastSyncDate = now
            UserDefaults.standard.set(now, forKey: lastSyncKey)
            
            status = .success(now)
        } catch {
            status = .error(error)
            throw error
        }
    }
    
    /// Sync symbol usage data to backend
    func syncUsageData() async throws {
        guard authService.isAuthenticated else {
            throw SyncError.notAuthenticated
        }
        
        // TODO: Implement usage data sync
        // 1. Get pending usage logs from local storage
        // 2. POST to /api/v1/usage-logs
        // 3. Mark as synced locally
        
        print("SyncService: Usage data sync (stub)")
    }
    
    /// Sync user preferences to backend
    func syncPreferences() async throws {
        guard authService.isAuthenticated else {
            throw SyncError.notAuthenticated
        }
        
        // TODO: Implement preferences sync
        // 1. Get local preferences
        // 2. Push to backend
        
        print("SyncService: Preferences sync (stub)")
    }
    
    /// Fetch latest data from backend
    func fetchLatest() async throws {
        guard authService.isAuthenticated else {
            throw SyncError.notAuthenticated
        }
        
        // TODO: Implement fetch
        // 1. GET /api/v1/insights (latest insights for child)
        // 2. GET /api/v1/children (child data)
        // 3. Merge with local data
        
        print("SyncService: Fetch latest (stub)")
    }
    
    // MARK: - Convenience
    
    /// Schedule periodic background sync
    func startBackgroundSync(interval: TimeInterval = 3600) {
        // TODO: Implement with BGTaskScheduler for iOS 13+
        print("SyncService: Background sync scheduling (stub)")
    }
    
    /// Perform sync if needed (e.g., on app foreground)
    func syncIfNeeded() async {
        // Sync if last sync was more than 1 hour ago
        let syncThreshold: TimeInterval = 3600
        
        if let lastSync = lastSyncDate {
            guard Date().timeIntervalSince(lastSync) > syncThreshold else {
                return
            }
        }
        
        do {
            try await syncAll()
        } catch {
            print("Background sync failed: \(error)")
        }
    }
}

// MARK: - Sync Errors

enum SyncError: LocalizedError {
    case notAuthenticated
    case alreadySyncing
    case networkUnavailable
    case mergeConflict
    case unknown(Error)
    
    var errorDescription: String? {
        switch self {
        case .notAuthenticated:
            return "Not authenticated. Please log in to sync."
        case .alreadySyncing:
            return "Sync already in progress."
        case .networkUnavailable:
            return "Network unavailable. Please check your connection."
        case .mergeConflict:
            return "Sync conflict detected. Please resolve manually."
        case .unknown(let error):
            return "Sync error: \(error.localizedDescription)"
        }
    }
}

// MARK: - Usage Log Model (for future implementation)

/// Local usage log entry for syncing
struct UsageLogEntry: Codable, Identifiable {
    let id: UUID
    let symbolId: String
    let timestamp: Date
    let sessionId: UUID?
    var isSynced: Bool
    
    init(symbolId: String, sessionId: UUID? = nil) {
        self.id = UUID()
        self.symbolId = symbolId
        self.timestamp = Date()
        self.sessionId = sessionId
        self.isSynced = false
    }
}
