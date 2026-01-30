import Foundation

/// Status of a pending usage log entry
enum UsageLogSyncStatus: String, Codable {
    case pending
    case syncing
    case synced
    case failed
}

/// Local usage log entry stored before syncing to backend
struct PendingUsageLog: Codable, Identifiable {
    let id: UUID
    let childId: String
    let symbolId: String
    let categoryId: String
    let timestamp: Date
    let sessionId: String?
    let metadata: [String: String]?
    var syncStatus: UsageLogSyncStatus

    init(
        id: UUID = UUID(),
        childId: String,
        symbolId: String,
        categoryId: String,
        timestamp: Date = Date(),
        sessionId: String? = nil,
        metadata: [String: String]? = nil,
        syncStatus: UsageLogSyncStatus = .pending
    ) {
        self.id = id
        self.childId = childId
        self.symbolId = symbolId
        self.categoryId = categoryId
        self.timestamp = timestamp
        self.sessionId = sessionId
        self.metadata = metadata
        self.syncStatus = syncStatus
    }
}

/// Manages local storage and tracking of symbol usage logs before syncing to backend
@MainActor
class UsageLogManager: ObservableObject {
    static let shared = UsageLogManager()

    /// Storage key for persisting pending logs in UserDefaults
    private let storageKey = "flynn.usage_logs.pending"

    /// In-memory cache of pending logs
    @Published private(set) var pendingLogs: [PendingUsageLog] = []

    /// Count of logs waiting to be synced
    var pendingCount: Int {
        pendingLogs.filter { $0.syncStatus == .pending }.count
    }

    /// Count of logs that failed to sync
    var failedCount: Int {
        pendingLogs.filter { $0.syncStatus == .failed }.count
    }

    private init() {
        loadPendingLogs()
    }

    // MARK: - Public API

    /// Log a symbol usage event
    /// - Parameters:
    ///   - childId: ID of the child using the symbol
    ///   - symbolId: ID of the symbol that was tapped
    ///   - categoryId: ID of the symbol's category
    ///   - sessionId: Optional session ID to group related taps
    ///   - metadata: Optional additional metadata
    func logUsage(
        childId: String,
        symbolId: String,
        categoryId: String,
        sessionId: String? = nil,
        metadata: [String: String]? = nil
    ) {
        let log = PendingUsageLog(
            childId: childId,
            symbolId: symbolId,
            categoryId: categoryId,
            sessionId: sessionId,
            metadata: metadata
        )

        pendingLogs.append(log)
        savePendingLogs()

        print("📊 UsageLogManager: Logged \(symbolId) for child \(childId) (pending: \(pendingCount))")

        // Trigger background sync
        Task {
            await SyncService.shared.syncUsageData()
        }
    }

    /// Get pending logs ready for syncing (up to specified limit)
    /// - Parameter limit: Maximum number of logs to return (default: 100)
    /// - Returns: Array of pending usage logs
    func getPendingLogs(limit: Int = 100) -> [PendingUsageLog] {
        return Array(
            pendingLogs
                .filter { $0.syncStatus == .pending }
                .prefix(limit)
        )
    }

    /// Mark logs as successfully synced and remove them from storage
    /// - Parameter ids: Array of log IDs that were successfully synced
    func markLogsSynced(ids: [UUID]) {
        pendingLogs.removeAll { ids.contains($0.id) }
        savePendingLogs()

        print("✅ UsageLogManager: Marked \(ids.count) logs as synced (remaining: \(pendingCount))")
    }

    /// Mark logs as failed to sync (for retry later)
    /// - Parameter ids: Array of log IDs that failed to sync
    func markLogsFailed(ids: [UUID]) {
        for id in ids {
            if let index = pendingLogs.firstIndex(where: { $0.id == id }) {
                pendingLogs[index].syncStatus = .failed
            }
        }
        savePendingLogs()

        print("❌ UsageLogManager: Marked \(ids.count) logs as failed (failed: \(failedCount))")
    }

    /// Retry failed logs by marking them as pending again
    func retryFailedLogs() {
        for index in pendingLogs.indices {
            if pendingLogs[index].syncStatus == .failed {
                pendingLogs[index].syncStatus = .pending
            }
        }
        savePendingLogs()

        print("🔄 UsageLogManager: Retrying \(pendingCount) failed logs")
    }

    /// Clear all pending logs (use with caution!)
    func clearAllLogs() {
        pendingLogs.removeAll()
        savePendingLogs()

        print("🗑️ UsageLogManager: Cleared all pending logs")
    }

    // MARK: - Private Helpers

    /// Load pending logs from UserDefaults
    private func loadPendingLogs() {
        guard let data = UserDefaults.standard.data(forKey: storageKey) else {
            pendingLogs = []
            return
        }

        do {
            let decoder = JSONDecoder()
            decoder.dateDecodingStrategy = .iso8601
            pendingLogs = try decoder.decode([PendingUsageLog].self, from: data)

            print("📂 UsageLogManager: Loaded \(pendingLogs.count) pending logs from storage")
        } catch {
            print("⚠️ UsageLogManager: Failed to decode pending logs: \(error)")
            pendingLogs = []
        }
    }

    /// Save pending logs to UserDefaults
    private func savePendingLogs() {
        do {
            let encoder = JSONEncoder()
            encoder.dateEncodingStrategy = .iso8601
            let data = try encoder.encode(pendingLogs)
            UserDefaults.standard.set(data, forKey: storageKey)
        } catch {
            print("⚠️ UsageLogManager: Failed to encode pending logs: \(error)")
        }
    }
}
