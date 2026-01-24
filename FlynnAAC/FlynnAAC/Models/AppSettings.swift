import Foundation

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
}
