import Foundation

actor SymbolStore {
    private var rootSymbols: [Symbol] = []
    private var rootCategories: [Category] = []
    private var offlineMode: Bool = false
    private var errorMessages: [String] = []

    // Track whether we're using persistent storage (Core Data) or just defaults
    nonisolated var usesPersistentStorage: Bool {
        false
    }

    init() {
        // Initialize from VocabularyStructure
        self.rootSymbols = Self.createSymbolsFromVocabulary()
        self.rootCategories = Self.createCategoriesFromVocabulary()
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

    func addSymbol(_ symbol: Symbol) {
        rootSymbols.append(symbol)
    }

    func canContractGrid(to rows: Int, columns: Int) -> Bool {
        for symbol in rootSymbols {
            if symbol.position.row >= rows || symbol.position.col >= columns {
                return false
            }
        }
        for category in rootCategories {
            if category.position.row >= rows || category.position.col >= columns {
                return false
            }
        }
        return true
    }

    // MARK: - FLY-10: Offline Functionality

    func setOfflineMode(_ offline: Bool) {
        offlineMode = offline
        if !offline {
            errorMessages.removeAll()
        }
    }

    func isImageCached(for symbolId: String) -> Bool {
        true
    }

    func getErrorMessages() -> [String] {
        errorMessages
    }

    // MARK: - Create Symbols from VocabularyStructure

    private static func createSymbolsFromVocabulary() -> [Symbol] {
        VocabularyStructure.coreWords.compactMap { word -> Symbol? in
            guard let position = word.gridPosition else { return nil }
            return Symbol(
                id: word.id,
                position: position,
                imageName: word.id,
                labels: ["en": word.english, "bg": word.bulgarian],
                audioFiles: [:],
                category: mapWordCategoryToSymbolCategory(word.category)
            )
        }
    }

    private static func createCategoriesFromVocabulary() -> [Category] {
        VocabularyStructure.categoryFolders.map { folder in
            let symbols = folder.words.enumerated().map { (index, word) -> Symbol in
                // Arrange in grid: 7 columns
                let row = index / 7
                let col = index % 7
                return Symbol(
                    id: word.id,
                    position: GridPosition(row: row, col: col),
                    imageName: word.id,
                    labels: ["en": word.english, "bg": word.bulgarian],
                    audioFiles: [:],
                    category: mapWordCategoryToSymbolCategory(word.category)
                )
            }

            return Category(
                id: folder.id,
                position: folder.gridPosition,
                imageName: folder.id,
                labels: ["en": folder.english, "bg": folder.bulgarian],
                symbols: symbols,
                subcategories: [],
                colorName: "brown"
            )
        }
    }

    private static func mapWordCategoryToSymbolCategory(_ wordCategory: WordCategory) -> SymbolCategory {
        switch wordCategory {
        case .pronoun: return .pronoun
        case .verb: return .verb
        case .describing: return .descriptor
        case .noun: return .noun
        case .social: return .social
        case .question: return .question
        case .preposition: return .preposition
        case .time: return .misc
        case .category: return .misc
        }
    }
}
