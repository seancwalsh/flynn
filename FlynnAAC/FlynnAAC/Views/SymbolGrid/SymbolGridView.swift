import SwiftUI

// Unified grid item to enable position-based sorting
enum GridItemType: Identifiable {
    case symbol(Symbol)
    case category(Category)

    var id: String {
        switch self {
        case .symbol(let s): return "symbol-\(s.id)"
        case .category(let c): return "category-\(c.id)"
        }
    }

    var position: GridPosition {
        switch self {
        case .symbol(let s): return s.position
        case .category(let c): return c.position
        }
    }
}

struct SymbolGridView: View {
    let category: Category?
    let language: Language
    let onSymbolTapped: (Symbol) -> Void
    let onCategoryTapped: (Category) -> Void
    let onBackTapped: () -> Void

    @State private var settings = AppSettings.default
    @State private var gridItems: [GridItemType] = []
    @State private var store = SymbolStore()

    private var columns: [GridItem] {
        Array(repeating: GridItem(.flexible(), spacing: Self.cellSpacing), count: settings.gridColumns)
    }

    var body: some View {
        ScrollView {
            LazyVGrid(columns: columns, spacing: Self.cellSpacing) {
                // Back button always at position [0,0] when in a category
                if category != nil {
                    BackButton(action: onBackTapped)
                }

                // All items sorted by position
                ForEach(gridItems) { item in
                    switch item {
                    case .symbol(let symbol):
                        SymbolCell(
                            symbol: symbol,
                            language: language,
                            onTap: { onSymbolTapped(symbol) }
                        )
                    case .category(let cat):
                        CategoryCell(
                            category: cat,
                            language: language,
                            onTap: { onCategoryTapped(cat) }
                        )
                    }
                }
            }
            .padding(FlynnTheme.Layout.screenMargin)
        }
        .background(FlynnTheme.Colors.background)
        .task {
            await loadContent()
        }
        .onChange(of: category) { _, _ in
            Task {
                await loadContent()
            }
        }
    }

    private func loadContent() async {
        // Measure navigation time for FLY-7 requirement (must be < 200ms)
        let start = Date()

        let loadedSymbols = await store.getSymbols(for: category)
        let loadedCategories = await store.getCategories(for: category)

        // Combine and sort by position (row first, then column)
        var items: [GridItemType] = []
        items.append(contentsOf: loadedSymbols.map { .symbol($0) })
        items.append(contentsOf: loadedCategories.map { .category($0) })
        items.sort { a, b in
            if a.position.row != b.position.row {
                return a.position.row < b.position.row
            }
            return a.position.col < b.position.col
        }

        let elapsed = Date().timeIntervalSince(start)

        // Update state on main thread
        await MainActor.run {
            self.gridItems = items
        }

        // Log if we exceed 200ms target
        if elapsed > 0.2 {
            print("⚠️ Navigation took \(Int(elapsed * 1000))ms - exceeds 200ms target")
        }
    }

    // MARK: - Theme Compliance Properties
    static var cellSpacing: CGFloat { FlynnTheme.Layout.gridCellSpacing }
    static var gridLineColor: Color { FlynnTheme.Colors.border }
    static var gridLineWidth: CGFloat { FlynnTheme.Layout.gridLineWidth }
}

struct BackButton: View {
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            VStack {
                Image(systemName: "arrow.left")
                    .font(.system(size: 32))
                Text("Back")
                    .font(.caption)
            }
            .frame(minWidth: 60, minHeight: 60)
            .background(Color.gray.opacity(0.2))
            .cornerRadius(8)
        }
    }
}
