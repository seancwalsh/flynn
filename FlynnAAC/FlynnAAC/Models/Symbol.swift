import Foundation

struct Symbol: Identifiable, Codable, Equatable {
    let id: String
    let position: GridPosition
    let imageName: String
    private let labels: [String: String]
    private let audioFiles: [String: String]

    init(
        id: String,
        position: GridPosition,
        imageName: String? = nil,
        labels: [String: String] = [:],
        audioFiles: [String: String] = [:]
    ) {
        self.id = id
        self.position = position
        self.imageName = imageName ?? id
        self.labels = labels
        self.audioFiles = audioFiles
    }

    func label(for language: Language) -> String {
        labels[language.rawValue] ?? id
    }

    func audioFile(for language: Language) -> String {
        audioFiles[language.rawValue] ?? "\(language.rawValue)/\(id).mp3"
    }
}
