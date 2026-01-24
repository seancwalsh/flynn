import Foundation
import CoreGraphics

struct AppSettings: Codable {
    var language: Language
    var gridRows: Int
    var gridColumns: Int
    var animationsEnabled: Bool
    var speechRate: Float

    static let `default` = AppSettings(
        language: .english,
        gridRows: 4,
        gridColumns: 4,
        animationsEnabled: true,
        speechRate: 0.5
    )

    init(
        language: Language = .english,
        gridRows: Int = 4,
        gridColumns: Int = 4,
        animationsEnabled: Bool = true,
        speechRate: Float = 0.5
    ) {
        self.language = language
        self.gridRows = gridRows
        self.gridColumns = gridColumns
        self.animationsEnabled = animationsEnabled
        self.speechRate = speechRate
    }

    var gridSize: (rows: Int, columns: Int) {
        (gridRows, gridColumns)
    }

    var minimumTouchTarget: CGFloat {
        60.0
    }

    /// Calculate actual touch target size based on grid and screen
    /// Assuming iPad width of ~768pt with padding
    var calculatedTouchTargetSize: CGFloat {
        let availableWidth: CGFloat = 700
        return availableWidth / CGFloat(gridColumns)
    }

    // MARK: - Persistence

    private static let userDefaults = UserDefaults.standard
    private static let settingsKey = "FlynnAAC.AppSettings"

    /// Load settings from UserDefaults
    static func loadFromPersistence() -> AppSettings? {
        guard let data = userDefaults.data(forKey: settingsKey),
              let settings = try? JSONDecoder().decode(AppSettings.self, from: data) else {
            return nil
        }
        return settings
    }

    /// Save settings to UserDefaults
    func save() {
        guard let data = try? JSONEncoder().encode(self) else { return }
        Self.userDefaults.set(data, forKey: Self.settingsKey)
    }

    /// Load persisted settings or return default
    static func loadOrDefault() -> AppSettings {
        loadFromPersistence() ?? .default
    }
}
