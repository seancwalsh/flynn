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
    let onSymbolWithLabelTapped: ((Symbol, String) -> Void)?  // For conjugated verbs
    let onCategoryTapped: (Category) -> Void
    let onBackTapped: () -> Void

    @State private var settings = AppSettings.default
    @State private var gridItems: [GridItemType] = []
    @State private var store = SymbolStore()

    // Conjugation picker state
    @State private var showingConjugationPicker = false
    @State private var selectedVerbSymbol: Symbol?
    @State private var selectedVerbConjugation: BulgarianConjugation?

    @Namespace private var gridNamespace

    init(
        category: Category?,
        language: Language,
        onSymbolTapped: @escaping (Symbol) -> Void,
        onSymbolWithLabelTapped: ((Symbol, String) -> Void)? = nil,
        onCategoryTapped: @escaping (Category) -> Void,
        onBackTapped: @escaping () -> Void
    ) {
        self.category = category
        self.language = language
        self.onSymbolTapped = onSymbolTapped
        self.onSymbolWithLabelTapped = onSymbolWithLabelTapped
        self.onCategoryTapped = onCategoryTapped
        self.onBackTapped = onBackTapped
    }

    private var columns: [GridItem] {
        Array(repeating: GridItem(.flexible(), spacing: Self.cellSpacing), count: settings.gridColumns)
    }

    var body: some View {
        ZStack {
            // Beautiful gradient background
            LinearGradient(
                colors: [
                    Color(red: 0.95, green: 0.93, blue: 0.98),  // Soft lavender
                    Color(red: 0.92, green: 0.96, blue: 0.98),  // Soft blue
                    Color(red: 0.96, green: 0.94, blue: 0.92)   // Warm cream
                ],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
            .ignoresSafeArea()

            ScrollView {
                GlassEffectContainer(spacing: 12) {
                    LazyVGrid(columns: columns, spacing: Self.cellSpacing) {
                        // Back button always at position [0,0] when in a category
                        if category != nil {
                            BackButton(action: onBackTapped)
                                .glassEffectID("back", in: gridNamespace)
                        }

                        // All items sorted by position
                        ForEach(gridItems) { item in
                            switch item {
                            case .symbol(let symbol):
                                SymbolCell(
                                    symbol: symbol,
                                    language: language,
                                    onTap: { handleSymbolTap(symbol) },
                                    onLongPress: { handleSymbolLongPress(symbol) }
                                )
                                .glassEffectID(symbol.id, in: gridNamespace)
                            case .category(let cat):
                                CategoryCell(
                                    category: cat,
                                    language: language,
                                    onTap: { onCategoryTapped(cat) }
                                )
                                .glassEffectID(cat.id, in: gridNamespace)
                            }
                        }
                    }
                }
                .padding(FlynnTheme.Layout.screenMargin)
            }

            // Conjugation picker overlay
            if showingConjugationPicker,
               let symbol = selectedVerbSymbol,
               let conjugation = selectedVerbConjugation {
                Color.black.opacity(0.25)
                    .ignoresSafeArea()
                    .onTapGesture {
                        showingConjugationPicker = false
                    }

                ConjugationPickerView(
                    symbol: symbol,
                    conjugation: conjugation,
                    onSelect: { form, _, _ in
                        handleConjugationSelected(symbol: symbol, form: form)
                    },
                    onCancel: {
                        showingConjugationPicker = false
                    }
                )
                .padding(.horizontal, FlynnTheme.Layout.spacing24)
                .transition(.scale(scale: 0.9).combined(with: .opacity))
            }
        }
        .animation(.bouncy(duration: 0.3), value: showingConjugationPicker)
        .task {
            await loadContent()
        }
        .onChange(of: category) { _, _ in
            Task {
                await loadContent()
            }
        }
    }

    private func handleSymbolTap(_ symbol: Symbol) {
        // Check if this is a verb in Bulgarian mode that has conjugations
        if language == .bulgarian,
           symbol.category == .verb,
           let conjugation = VocabularyStructure.conjugation(for: symbol.id) {
            // Default tap uses 1st person singular ("аз" / "I" form)
            let firstPersonForm = conjugation.first_sg
            if let onSymbolWithLabelTapped = onSymbolWithLabelTapped {
                onSymbolWithLabelTapped(symbol, firstPersonForm)
            } else {
                onSymbolTapped(symbol)
            }
        } else {
            // Regular tap - add symbol directly
            onSymbolTapped(symbol)
        }
    }

    private func handleSymbolLongPress(_ symbol: Symbol) {
        // Long press on verbs in Bulgarian mode shows conjugation picker
        if language == .bulgarian,
           symbol.category == .verb,
           let conjugation = VocabularyStructure.conjugation(for: symbol.id) {
            selectedVerbSymbol = symbol
            selectedVerbConjugation = conjugation
            showingConjugationPicker = true
        }
    }

    private func handleConjugationSelected(symbol: Symbol, form: String) {
        showingConjugationPicker = false

        // If we have a callback for conjugated forms, use it
        if let onSymbolWithLabelTapped = onSymbolWithLabelTapped {
            onSymbolWithLabelTapped(symbol, form)
        } else {
            // Fallback: just add the symbol (default form will be used)
            onSymbolTapped(symbol)
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
            VStack(spacing: FlynnTheme.Layout.spacing4) {
                Image(systemName: "chevron.left")
                    .font(.system(size: 24, weight: .semibold))
                    .foregroundStyle(.primary)
                Text("Back")
                    .font(.system(size: 11, weight: .medium, design: .rounded))
                    .foregroundStyle(.secondary)
            }
            .frame(minWidth: 60, minHeight: 60)
            .glassEffect(.regular.interactive(), in: RoundedRectangle(cornerRadius: 14))
        }
        .buttonStyle(.plain)
    }
}
