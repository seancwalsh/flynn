import Foundation

/// Manages hidden symbols and categories for the hide card feature.
/// Hidden items remain in their grid positions as invisible blank spaces
/// to preserve motor planning positions.
struct HiddenItemsStore: Codable, Equatable {
    private(set) var hiddenSymbolIds: Set<String>
    private(set) var hiddenCategoryIds: Set<String>

    private static let persistenceKey = "FlynnAAC.HiddenItems"

    init(hiddenSymbolIds: Set<String> = [], hiddenCategoryIds: Set<String> = []) {
        self.hiddenSymbolIds = hiddenSymbolIds
        self.hiddenCategoryIds = hiddenCategoryIds
    }

    // MARK: - Queries

    func isHidden(symbolId: String) -> Bool {
        hiddenSymbolIds.contains(symbolId)
    }

    func isHidden(categoryId: String) -> Bool {
        hiddenCategoryIds.contains(categoryId)
    }

    var hiddenSymbolCount: Int {
        hiddenSymbolIds.count
    }

    var hiddenCategoryCount: Int {
        hiddenCategoryIds.count
    }

    var totalHiddenCount: Int {
        hiddenSymbolIds.count + hiddenCategoryIds.count
    }

    /// Counts hidden items in the current view using symbol and category IDs
    func hiddenCount(symbolIds: [String], categoryIds: [String]) -> Int {
        let hiddenSymbols = symbolIds.filter { hiddenSymbolIds.contains($0) }.count
        let hiddenCategories = categoryIds.filter { hiddenCategoryIds.contains($0) }.count
        return hiddenSymbols + hiddenCategories
    }

    // MARK: - Mutations

    mutating func toggleSymbol(_ symbolId: String) {
        if hiddenSymbolIds.contains(symbolId) {
            hiddenSymbolIds.remove(symbolId)
        } else {
            hiddenSymbolIds.insert(symbolId)
        }
    }

    mutating func toggleCategory(_ categoryId: String) {
        if hiddenCategoryIds.contains(categoryId) {
            hiddenCategoryIds.remove(categoryId)
        } else {
            hiddenCategoryIds.insert(categoryId)
        }
    }

    mutating func hideSymbol(_ symbolId: String) {
        hiddenSymbolIds.insert(symbolId)
    }

    mutating func showSymbol(_ symbolId: String) {
        hiddenSymbolIds.remove(symbolId)
    }

    mutating func hideCategory(_ categoryId: String) {
        hiddenCategoryIds.insert(categoryId)
    }

    mutating func showCategory(_ categoryId: String) {
        hiddenCategoryIds.remove(categoryId)
    }

    /// Shows all items with the given IDs
    mutating func showAll(symbolIds: [String], categoryIds: [String]) {
        for id in symbolIds {
            hiddenSymbolIds.remove(id)
        }
        for id in categoryIds {
            hiddenCategoryIds.remove(id)
        }
    }

    /// Hides all items with the given IDs
    mutating func hideAll(symbolIds: [String], categoryIds: [String]) {
        for id in symbolIds {
            hiddenSymbolIds.insert(id)
        }
        for id in categoryIds {
            hiddenCategoryIds.insert(id)
        }
    }

    // MARK: - Persistence

    static func load() -> HiddenItemsStore {
        guard let data = UserDefaults.standard.data(forKey: Self.persistenceKey),
              let store = try? JSONDecoder().decode(HiddenItemsStore.self, from: data) else {
            return HiddenItemsStore()
        }
        return store
    }

    func save() {
        guard let data = try? JSONEncoder().encode(self) else { return }
        UserDefaults.standard.set(data, forKey: Self.persistenceKey)
    }
}
