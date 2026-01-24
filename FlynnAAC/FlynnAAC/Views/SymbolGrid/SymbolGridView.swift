import SwiftUI

struct SymbolGridView: View {
    let category: Category?
    let language: Language
    let onSymbolTapped: (Symbol) -> Void
    let onCategoryTapped: (Category) -> Void
    let onBackTapped: () -> Void

    @State private var settings = AppSettings.default
    @State private var symbols: [Symbol] = []
    @State private var categories: [Category] = []
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

                // Categories
                ForEach(categories) { cat in
                    CategoryCell(
                        category: cat,
                        language: language,
                        onTap: { onCategoryTapped(cat) }
                    )
                }

                // Symbols
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

        let elapsed = Date().timeIntervalSince(start)

        // Update state on main thread
        await MainActor.run {
            self.symbols = loadedSymbols
            self.categories = loadedCategories
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
