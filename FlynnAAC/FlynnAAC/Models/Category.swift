import Foundation
import SwiftUI

struct Category: Identifiable, Codable, Equatable {
    let id: String
    let position: GridPosition
    let imageName: String
    private let labels: [String: String]
    let symbols: [Symbol]
    let subcategories: [Category]
    private let colorName: String?

    init(
        id: String,
        position: GridPosition,
        imageName: String? = nil,
        labels: [String: String] = [:],
        symbols: [Symbol] = [],
        subcategories: [Category] = [],
        colorName: String? = nil
    ) {
        self.id = id
        self.position = position
        self.imageName = imageName ?? id
        self.labels = labels
        self.symbols = symbols
        self.subcategories = subcategories
        self.colorName = colorName
    }

    func label(for language: Language) -> String {
        labels[language.rawValue] ?? id
    }

    var color: Color {
        switch colorName {
        case "yellow": return .yellow
        case "green": return .green
        case "blue": return .blue
        case "orange": return .orange
        case "pink": return .pink
        case "purple": return .purple
        case "gray": return .gray
        case "brown": return .brown
        default: return .brown
        }
    }
}
