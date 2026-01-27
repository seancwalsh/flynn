import Foundation

struct Phrase: Identifiable, Codable {
    let id: UUID
    var symbols: [Symbol]
    let createdAt: Date

    init(id: UUID = UUID(), symbols: [Symbol] = [], createdAt: Date = Date()) {
        self.id = id
        self.symbols = symbols
        self.createdAt = createdAt
    }

    func text(for language: Language) -> String {
        symbols.map { $0.label(for: language) }.joined(separator: " ")
    }

    mutating func append(_ symbol: Symbol) {
        symbols.append(symbol)
    }

    mutating func remove(at index: Int) {
        guard index >= 0 && index < symbols.count else { return }
        symbols.remove(at: index)
    }

    mutating func clear() {
        symbols.removeAll()
    }

    var isEmpty: Bool {
        symbols.isEmpty
    }
}
