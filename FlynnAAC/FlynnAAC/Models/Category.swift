import Foundation

struct Category: Identifiable, Codable, Equatable {
    let id: String
    let position: GridPosition
    let imageName: String
    private let labels: [String: String]
    let symbols: [Symbol]
    let subcategories: [Category]

    init(
        id: String,
        position: GridPosition,
        imageName: String? = nil,
        labels: [String: String] = [:],
        symbols: [Symbol] = [],
        subcategories: [Category] = []
    ) {
        self.id = id
        self.position = position
        self.imageName = imageName ?? id
        self.labels = labels
        self.symbols = symbols
        self.subcategories = subcategories
    }

    func label(for language: Language) -> String {
        labels[language.rawValue] ?? id
    }
}
