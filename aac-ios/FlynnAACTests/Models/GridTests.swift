import Foundation
import Testing
@testable import FlynnAAC

/// TDD Tests for Grid Size Adjustment (FLY-9)
struct GridTests {

    // MARK: - Default Settings

    @Test func defaultGridSizeIs4x4() {
        let settings = AppSettings.default
        #expect(settings.gridRows == 4)
        #expect(settings.gridColumns == 4)
    }

    // MARK: - Grid Resize

    @Test func gridSizeCanBeChanged() {
        var settings = AppSettings.default
        settings.gridRows = 5
        settings.gridColumns = 5
        #expect(settings.gridSize.rows == 5)
        #expect(settings.gridSize.columns == 5)
    }

    @Test func existingSymbolsKeepPositionsOnExpand() async {
        // When expanding grid from 4x4 to 5x5, existing symbols stay in place
        let store = SymbolStore()

        // Get positions at 4x4
        var settings = AppSettings.default
        settings.gridRows = 4
        settings.gridColumns = 4

        let beforeSymbols = await store.getRootSymbols()
        let beforePositions = beforeSymbols.map { ($0.id, $0.position) }

        // Expand to 5x5
        settings.gridRows = 5
        settings.gridColumns = 5

        let afterSymbols = await store.getRootSymbols()

        for (id, beforePos) in beforePositions {
            let afterPos = afterSymbols.first { $0.id == id }?.position
            #expect(afterPos == beforePos,
                   "Symbol \(id) moved during grid expand - LAMP violation")
        }
    }

    @Test func newCellsAddedToRightAndBottomOnExpand() {
        // When expanding, new cells should appear on right and bottom edges
        // Existing cells should not shift

        var settings = AppSettings.default
        settings.gridRows = 4
        settings.gridColumns = 4

        let existingCells = Set((0..<4).flatMap { row in
            (0..<4).map { col in GridPosition(row: row, col: col) }
        })

        settings.gridRows = 5
        settings.gridColumns = 5

        let allCells = Set((0..<5).flatMap { row in
            (0..<5).map { col in GridPosition(row: row, col: col) }
        })

        let newCells = allCells.subtracting(existingCells)

        // New cells should only be in row 4 or col 4
        for cell in newCells {
            #expect(cell.row == 4 || cell.col == 4,
                   "New cell at (\(cell.row), \(cell.col)) not on edge")
        }
    }

    // MARK: - Grid Contract with Warning

    @Test func contractingGridWithSymbolsInOuterCellsShowsWarning() async {
        // If symbols exist in outer cells, contracting should warn user
        let store = SymbolStore()

        // Place symbol in outer cell (row 4)
        await store.addSymbol(
            Symbol(id: "outer", position: GridPosition(row: 4, col: 0))
        )

        var settings = AppSettings.default
        settings.gridRows = 5
        settings.gridColumns = 5

        // Attempt to contract
        let canContract = await store.canContractGrid(to: 4, columns: 4)

        #expect(canContract == false,
               "Should not allow contracting when symbols exist in outer cells")
    }

    @Test func contractingEmptyOuterCellsSucceeds() async {
        let store = SymbolStore()

        // No symbols in outer cells
        var settings = AppSettings.default
        settings.gridRows = 5
        settings.gridColumns = 5

        let canContract = await store.canContractGrid(to: 4, columns: 4)

        #expect(canContract == true,
               "Should allow contracting when outer cells are empty")
    }

    // MARK: - Touch Target Size (FLY-9)

    @Test func touchTargetsAre60PointsMinimum() {
        let settings = AppSettings.default
        #expect(settings.minimumTouchTarget >= 60,
               "Touch targets must be at least 60pt for accessibility")
    }

    @Test func touchTargetsRemain60PointsAtAllGridSizes() {
        // Even at larger grids, touch targets must meet minimum
        var settings = AppSettings.default

        for gridSize in [3, 4, 5, 6, 7, 8] {
            settings.gridRows = gridSize
            settings.gridColumns = gridSize

            let touchTarget = settings.calculatedTouchTargetSize

            #expect(touchTarget >= 60,
                   "Touch target at \(gridSize)x\(gridSize) grid is \(touchTarget)pt - must be >=60pt")
        }
    }

    // MARK: - Grid Position Hashing

    @Test func gridPositionIsHashable() {
        let pos1 = GridPosition(row: 1, col: 2)
        let pos2 = GridPosition(row: 1, col: 2)
        let pos3 = GridPosition(row: 2, col: 1)

        var positionSet = Set<GridPosition>()
        positionSet.insert(pos1)
        positionSet.insert(pos2) // Should not increase count
        positionSet.insert(pos3)

        #expect(positionSet.count == 2)
    }
}

// MARK: - SymbolStore Extensions for Testing
// Extensions removed - now implemented in SymbolStore.swift

// MARK: - AppSettings Extensions for Testing
// Extension removed - now implemented in AppSettings.swift
