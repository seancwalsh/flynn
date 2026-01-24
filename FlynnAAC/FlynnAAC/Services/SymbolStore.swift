import Foundation

actor SymbolStore {
    private var rootSymbols: [Symbol] = []
    private var rootCategories: [Category] = []

    init() {
        loadDefaultSymbols()
    }

    func getRootSymbols() -> [Symbol] {
        rootSymbols
    }

    func getRootCategories() -> [Category] {
        rootCategories
    }

    func getSymbols(for category: Category?) -> [Symbol] {
        guard let category = category else {
            return rootSymbols
        }
        return category.symbols
    }

    func getCategories(for category: Category?) -> [Category] {
        guard let category = category else {
            return rootCategories
        }
        return category.subcategories
    }

    private func loadDefaultSymbols() {
        // Default symbols for testing - will be replaced with Core Data
        rootSymbols = [
            Symbol(
                id: "want",
                position: GridPosition(row: 0, col: 1),
                labels: ["en": "want", "bg": "искам"]
            ),
            Symbol(
                id: "more",
                position: GridPosition(row: 0, col: 2),
                labels: ["en": "more", "bg": "още"]
            ),
            Symbol(
                id: "help",
                position: GridPosition(row: 0, col: 3),
                labels: ["en": "help", "bg": "помощ"]
            ),
            Symbol(
                id: "stop",
                position: GridPosition(row: 1, col: 0),
                labels: ["en": "stop", "bg": "спри"]
            ),
            Symbol(
                id: "yes",
                position: GridPosition(row: 1, col: 1),
                labels: ["en": "yes", "bg": "да"]
            ),
            Symbol(
                id: "no",
                position: GridPosition(row: 1, col: 2),
                labels: ["en": "no", "bg": "не"]
            )
        ]

        rootCategories = [
            Category(
                id: "food",
                position: GridPosition(row: 0, col: 0),
                labels: ["en": "food", "bg": "храна"],
                symbols: [
                    Symbol(id: "apple", position: GridPosition(row: 0, col: 0), labels: ["en": "apple", "bg": "ябълка"]),
                    Symbol(id: "water", position: GridPosition(row: 0, col: 1), labels: ["en": "water", "bg": "вода"]),
                    Symbol(id: "milk", position: GridPosition(row: 0, col: 2), labels: ["en": "milk", "bg": "мляко"])
                ]
            )
        ]
    }
}
