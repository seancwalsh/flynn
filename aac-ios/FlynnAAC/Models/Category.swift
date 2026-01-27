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
        case "yellow": return Color(red: 1.0, green: 0.84, blue: 0.0)       // Bright golden yellow
        case "green": return Color(red: 0.2, green: 0.78, blue: 0.35)       // Bright green
        case "blue": return Color(red: 0.2, green: 0.6, blue: 1.0)          // Bright blue
        case "orange": return Color(red: 1.0, green: 0.55, blue: 0.0)       // Bright orange
        case "pink": return Color(red: 1.0, green: 0.4, blue: 0.6)          // Bright pink
        case "purple": return Color(red: 0.7, green: 0.3, blue: 0.9)        // Bright purple
        case "gray": return Color(red: 0.6, green: 0.6, blue: 0.65)         // Medium gray
        case "brown": return Color(red: 0.72, green: 0.5, blue: 0.3)        // Warm brown
        case "teal": return Color(red: 0.0, green: 0.75, blue: 0.75)        // Bright teal
        case "red": return Color(red: 1.0, green: 0.3, blue: 0.3)           // Bright red
        default: return Color(red: 0.72, green: 0.5, blue: 0.3)
        }
    }
}
