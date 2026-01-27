import Foundation
import SwiftUI

struct Symbol: Identifiable, Codable, Equatable {
    let id: String
    let position: GridPosition
    let imageName: String
    private let labels: [String: String]
    private let audioFiles: [String: String]
    let category: SymbolCategory?

    init(
        id: String,
        position: GridPosition,
        imageName: String? = nil,
        labels: [String: String] = [:],
        audioFiles: [String: String] = [:],
        category: SymbolCategory? = nil
    ) {
        self.id = id
        self.position = position
        self.imageName = imageName ?? id
        self.labels = labels
        self.audioFiles = audioFiles
        self.category = category
    }

    func label(for language: Language) -> String {
        labels[language.rawValue] ?? id
    }

    func audioFile(for language: Language) -> String {
        audioFiles[language.rawValue] ?? "\(language.rawValue)/\(id).mp3"
    }
}
