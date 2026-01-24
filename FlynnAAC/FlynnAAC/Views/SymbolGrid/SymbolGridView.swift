import SwiftUI

struct SymbolGridView: View {
    let category: Category?
    let language: Language
    let onSymbolTapped: (Symbol) -> Void
    let onCategoryTapped: (Category) -> Void

    @State private var settings = AppSettings.default

    private var columns: [GridItem] {
        Array(repeating: GridItem(.flexible(), spacing: Self.cellSpacing), count: settings.gridColumns)
    }

    var body: some View {
        ScrollView {
            LazyVGrid(columns: columns, spacing: Self.cellSpacing) {
                if category != nil {
                    BackButton {
                        onCategoryTapped(Category(id: "", position: GridPosition(row: 0, col: 0)))
                    }
                }

                // Categories first
                ForEach(categories) { cat in
                    CategoryCell(
                        category: cat,
                        language: language,
                        onTap: { onCategoryTapped(cat) }
                    )
                }

                // Then symbols
                ForEach(symbols) { symbol in
                    SymbolCell(
                        symbol: symbol,
                        language: language,
                        onTap: { onSymbolTapped(symbol) }
                    )
                }
            }
            .padding(FlynnTheme.Layout.screenMargin)
        }
        .background(FlynnTheme.Colors.background)
    }

    private var symbols: [Symbol] {
        // TODO: Get from SymbolStore based on category
        []
    }

    private var categories: [Category] {
        // TODO: Get from SymbolStore based on category
        []
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
