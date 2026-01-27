import Foundation
import Testing
@testable import FlynnAAC

/// TDD Tests for Category Navigation (FLY-7)
/// LAMP motor planning requires consistent, predictable symbol positions
struct CategoryTests {

    // MARK: - Basic Category Properties

    @Test func categoryHasLocalizedLabel() {
        let category = Category(
            id: "food",
            position: GridPosition(row: 0, col: 0),
            labels: ["en": "food", "bg": "храна"]
        )
        #expect(category.label(for: .english) == "food")
        #expect(category.label(for: .bulgarian) == "храна")
    }

    @Test func categoryContainsSymbols() {
        let symbols = [
            Symbol(id: "apple", position: GridPosition(row: 0, col: 0)),
            Symbol(id: "banana", position: GridPosition(row: 0, col: 1))
        ]
        let category = Category(
            id: "food",
            position: GridPosition(row: 0, col: 0),
            symbols: symbols
        )
        #expect(category.symbols.count == 2)
        #expect(category.symbols[0].id == "apple")
    }

    // MARK: - Navigation Performance (FLY-7: within 200ms)

    @Test func categoryNavigationCompletesWithin200ms() async {
        // Navigation must be fast for responsive communication
        let store = SymbolStore()
        let categories = await store.getRootCategories()

        // Must have categories to test navigation
        #expect(!categories.isEmpty, "SymbolStore must provide root categories")

        guard let foodCategory = categories.first else { return }

        let start = Date()
        let symbols = await store.getSymbols(for: foodCategory)
        let elapsed = Date().timeIntervalSince(start)

        #expect(elapsed < 0.2,
               "Category navigation took \(Int(elapsed * 1000))ms - must be under 200ms")
        #expect(!symbols.isEmpty, "Category must contain symbols")
    }

    // MARK: - LAMP Position Consistency

    @Test func symbolPositionsUnchangedAfterNavigation() async {
        let store = SymbolStore()

        // Get initial positions
        let initialSymbols = await store.getRootSymbols()

        // Must have symbols to verify position preservation
        #expect(!initialSymbols.isEmpty, "SymbolStore must provide root symbols")

        let initialPositions = initialSymbols.map { ($0.id, $0.position) }

        // Navigate away
        let categories = await store.getRootCategories()
        if let category = categories.first {
            _ = await store.getSymbols(for: category)
        }

        // Navigate back
        let afterSymbols = await store.getRootSymbols()
        let afterPositions = afterSymbols.map { ($0.id, $0.position) }

        // Positions must be identical
        for (id, initialPos) in initialPositions {
            let afterPos = afterPositions.first { $0.0 == id }?.1
            #expect(afterPos == initialPos,
                   "Symbol \(id) position changed after navigation - LAMP violation")
        }
    }

    @Test func symbolPositionsUnchangedAfterAppRestart() async {
        // CRITICAL: LAMP requires positions to persist across sessions
        // This test verifies Core Data persistence is working
        let store = SymbolStore()

        // Store must use persistent storage (Core Data), not just hardcoded defaults
        let usesPersistence = await store.usesPersistentStorage
        #expect(usesPersistence, "SymbolStore must use Core Data for persistence, not hardcoded defaults")

        // Get positions before "restart"
        let beforeSymbols = await store.getRootSymbols()

        // Must have symbols to verify persistence
        #expect(!beforeSymbols.isEmpty, "SymbolStore must provide root symbols for persistence test")

        let beforePositions = beforeSymbols.map { ($0.id, $0.position) }

        // Simulate app restart by creating new store
        let newStore = SymbolStore()
        let afterSymbols = await newStore.getRootSymbols()

        for (id, beforePos) in beforePositions {
            let afterPos = afterSymbols.first { $0.id == id }?.position
            #expect(afterPos == beforePos,
                   "Symbol \(id) position changed after restart - LAMP violation")
        }
    }

    // MARK: - Back Button Position

    @Test func backButtonIsAlwaysTopLeft() async {
        // Back button must be predictable for motor planning
        let expectedPosition = GridPosition(row: 0, col: 0)

        #expect(CategoryNavigation.backButtonPosition == expectedPosition,
               "Back button must always be at top-left (0,0)")
    }

    // MARK: - Subcategories

    @Test func categoryCanHaveSubcategories() {
        let subcategory = Category(id: "fruits", position: GridPosition(row: 0, col: 0))
        let category = Category(
            id: "food",
            position: GridPosition(row: 0, col: 0),
            subcategories: [subcategory]
        )
        #expect(category.subcategories.count == 1)
        #expect(category.subcategories[0].id == "fruits")
    }
}

// MARK: - Navigation Helpers for Testing

enum CategoryNavigation {
    /// The fixed position for the back button (top-left)
    static var backButtonPosition: GridPosition {
        GridPosition(row: 0, col: 0) // Must always be here for LAMP
    }
}

// MARK: - SymbolStore Extensions for Testing

extension SymbolStore {
    /// Whether the store uses Core Data persistence (not just hardcoded defaults)
    var usesPersistentStorage: Bool {
        false // Fails test - needs Core Data implementation
    }
}
