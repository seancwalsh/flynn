import Foundation

actor SymbolStore {
    private var rootSymbols: [Symbol] = []
    private var rootCategories: [Category] = []

    // Track whether we're using persistent storage (Core Data) or just defaults
    // For now, we use defaults but this property allows tests to verify intent
    nonisolated var usesPersistentStorage: Bool {
        // TODO: Return true once Core Data is implemented
        false
    }

    init() {
        // Initialize with defaults synchronously
        self.rootSymbols = Self.createDefaultSymbols()
        self.rootCategories = Self.createDefaultCategories()
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

    // MARK: - Grid Management (FLY-9)

    /// Add a symbol to the store
    func addSymbol(_ symbol: Symbol) {
        rootSymbols.append(symbol)
    }

    /// Check if grid can be contracted without losing symbols
    /// Returns false if any symbols exist in cells that would be removed
    func canContractGrid(to rows: Int, columns: Int) -> Bool {
        // Check root symbols
        for symbol in rootSymbols {
            if symbol.position.row >= rows || symbol.position.col >= columns {
                return false
            }
        }

        // Check root categories
        for category in rootCategories {
            if category.position.row >= rows || category.position.col >= columns {
                return false
            }
        }

        return true
    }

    private static func createDefaultSymbols() -> [Symbol] {
        // Default symbols for testing - will be replaced with Core Data
        return [
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
    }

    private static func createDefaultCategories() -> [Category] {
        return [
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
