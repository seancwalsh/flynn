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
    let isEditMode: Bool
    let hiddenItems: HiddenItemsStore
    let onSymbolTapped: (Symbol) -> Void
    let onSymbolWithLabelTapped: ((Symbol, String) -> Void)?  // For conjugated verbs
    let onCategoryTapped: (Category) -> Void
    let onBackTapped: () -> Void
    let onToggleSymbolVisibility: ((String) -> Void)?
    let onToggleCategoryVisibility: ((String) -> Void)?

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
        isEditMode: Bool = false,
        hiddenItems: HiddenItemsStore = HiddenItemsStore(),
        onSymbolTapped: @escaping (Symbol) -> Void,
        onSymbolWithLabelTapped: ((Symbol, String) -> Void)? = nil,
        onCategoryTapped: @escaping (Category) -> Void,
        onBackTapped: @escaping () -> Void,
        onToggleSymbolVisibility: ((String) -> Void)? = nil,
        onToggleCategoryVisibility: ((String) -> Void)? = nil
    ) {
        self.category = category
        self.language = language
        self.isEditMode = isEditMode
        self.hiddenItems = hiddenItems
        self.onSymbolTapped = onSymbolTapped
        self.onSymbolWithLabelTapped = onSymbolWithLabelTapped
        self.onCategoryTapped = onCategoryTapped
        self.onBackTapped = onBackTapped
        self.onToggleSymbolVisibility = onToggleSymbolVisibility
        self.onToggleCategoryVisibility = onToggleCategoryVisibility
    }

    private var columns: [GridItem] {
        Array(repeating: GridItem(.flexible(), spacing: Self.cellSpacing), count: settings.gridColumns)
    }

    var body: some View {
        GeometryReader { geometry in
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

                let padding: CGFloat = 12
                let spacing: CGFloat = Self.cellSpacing
                let availableWidth = geometry.size.width - (padding * 2)
                let availableHeight = geometry.size.height - (padding * 2)
                let cellWidth = (availableWidth - (spacing * CGFloat(settings.gridColumns - 1))) / CGFloat(settings.gridColumns)
                let cellHeight = (availableHeight - (spacing * CGFloat(settings.gridRows - 1))) / CGFloat(settings.gridRows)

                GlassEffectContainer(spacing: spacing) {
                    VStack(spacing: spacing) {
                        ForEach(0..<settings.gridRows, id: \.self) { row in
                            HStack(spacing: spacing) {
                                ForEach(0..<settings.gridColumns, id: \.self) { col in
                                    cellView(row: row, col: col)
                                        .frame(width: cellWidth, height: cellHeight)
                                        .glassEffectID(cellID(row: row, col: col), in: gridNamespace)
                                }
                            }
                        }
                    }
                }
                .padding(padding)
            }
        }
        .task {
            await loadContent()
        }
        .onChange(of: category) { _, _ in
            Task {
                await loadContent()
            }
        }
        .sheet(isPresented: $showingConjugationPicker) {
            if let symbol = selectedVerbSymbol,
               let conjugation = selectedVerbConjugation {
                ConjugationPickerView(
                    symbol: symbol,
                    conjugation: conjugation,
                    onSelect: { form, _, _ in
                        handleConjugationSelected(symbol: symbol, form: form)
                    }
                )
                .presentationDetents([.medium])
                .presentationDragIndicator(.visible)
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

    // MARK: - Grid Cell Helpers

    private func cellID(row: Int, col: Int) -> String {
        if category != nil && row == 0 && col == 0 {
            return "back"
        }
        if let item = gridItems.first(where: { $0.position.row == row && $0.position.col == col }) {
            switch item {
            case .symbol(let s): return s.id
            case .category(let c): return c.id
            }
        }
        return "empty-\(row)-\(col)"
    }

    @ViewBuilder
    private func cellView(row: Int, col: Int) -> some View {
        if category != nil && row == 0 && col == 0 {
            BackButton(action: onBackTapped)
        } else if let item = gridItems.first(where: { $0.position.row == row && $0.position.col == col }) {
            switch item {
            case .symbol(let symbol):
                symbolCellView(symbol: symbol)
            case .category(let cat):
                categoryCellView(category: cat)
            }
        } else {
            // Empty cell placeholder
            Color.clear
        }
    }

    @ViewBuilder
    private func symbolCellView(symbol: Symbol) -> some View {
        let isHidden = hiddenItems.isHidden(symbolId: symbol.id)

        if isHidden && !isEditMode {
            // Invisible placeholder - preserves layout, no interaction
            Color.clear
                .allowsHitTesting(false)
        } else if isHidden && isEditMode {
            // Ghost cell - tap to show
            GhostSymbolCell(
                symbol: symbol,
                language: language,
                onTap: {
                    onToggleSymbolVisibility?(symbol.id)
                }
            )
        } else if !isHidden && isEditMode {
            // Normal cell with edit overlay - tap to hide
            SymbolCell(
                symbol: symbol,
                language: language,
                onTap: {
                    onToggleSymbolVisibility?(symbol.id)
                },
                onLongPress: nil
            )
            .overlay(alignment: .topTrailing) {
                // Checkmark badge indicating item is visible
                Image(systemName: "checkmark.circle.fill")
                    .font(.system(size: 18, weight: .medium))
                    .foregroundStyle(FlynnTheme.Colors.success)
                    .padding(FlynnTheme.Layout.spacing6)
            }
        } else {
            // Normal cell - tap to speak
            SymbolCell(
                symbol: symbol,
                language: language,
                onTap: { handleSymbolTap(symbol) },
                onLongPress: { handleSymbolLongPress(symbol) }
            )
        }
    }

    @ViewBuilder
    private func categoryCellView(category cat: Category) -> some View {
        let isHidden = hiddenItems.isHidden(categoryId: cat.id)

        if isHidden && !isEditMode {
            // Invisible placeholder - preserves layout, no interaction
            Color.clear
                .allowsHitTesting(false)
        } else if isHidden && isEditMode {
            // Ghost cell - tap to show
            GhostCategoryCell(
                category: cat,
                language: language,
                onTap: {
                    onToggleCategoryVisibility?(cat.id)
                }
            )
        } else if !isHidden && isEditMode {
            // Normal cell with edit overlay - tap to hide
            CategoryCell(
                category: cat,
                language: language,
                onTap: {
                    onToggleCategoryVisibility?(cat.id)
                }
            )
            .overlay(alignment: .topTrailing) {
                // Checkmark badge indicating item is visible
                Image(systemName: "checkmark.circle.fill")
                    .font(.system(size: 18, weight: .medium))
                    .foregroundStyle(FlynnTheme.Colors.success)
                    .padding(FlynnTheme.Layout.spacing6)
            }
        } else {
            // Normal cell - tap to navigate
            CategoryCell(
                category: cat,
                language: language,
                onTap: { onCategoryTapped(cat) }
            )
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
                    .font(.title2.weight(.semibold))
                    .foregroundStyle(.primary)
                Text("Back")
                    .font(FlynnTheme.Typography.captionText)
                    .foregroundStyle(.secondary)
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            .glassEffect(.regular.interactive(), in: Rectangle())
        }
        .buttonStyle(.plain)
        .accessibilityLabel("Back")
        .accessibilityHint("Double tap to go back to the previous screen")
    }
}
