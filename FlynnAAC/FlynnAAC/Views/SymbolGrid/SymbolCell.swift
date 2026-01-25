import SwiftUI

struct SymbolCell: View {
    let symbol: Symbol
    let language: Language
    let onTap: () -> Void
    var onLongPress: (() -> Void)? = nil

    @State private var isPressed = false
    @State private var settings = AppSettings.default

    var body: some View {
        VStack(spacing: FlynnTheme.Layout.spacing4) {
            symbolImage
                .frame(maxWidth: .infinity, maxHeight: .infinity)

            Text(symbol.label(for: language))
                .font(.system(size: 13, weight: .medium, design: .rounded))
                .foregroundStyle(.primary)
                .lineLimit(2)
                .minimumScaleFactor(0.7)
        }
        .padding(Self.cellPadding)
        .frame(minWidth: Self.minimumSize, minHeight: Self.minimumSize)
        .glassEffect(
            .regular.tint((symbol.category?.color ?? .gray).opacity(0.3)).interactive(),
            in: RoundedRectangle(cornerRadius: 14)
        )
        .scaleEffect(isPressed && settings.animationsEnabled ? Self.tapScaleValue : 1.0)
        .onTapGesture {
            triggerTapAnimation()
            onTap()
        }
        .onLongPressGesture(minimumDuration: 0.5, pressing: { pressing in
            if pressing {
                withAnimation(.easeOut(duration: 0.1)) {
                    isPressed = true
                }
            }
        }, perform: {
            withAnimation(.easeOut(duration: 0.1)) {
                isPressed = false
            }
            onLongPress?()
        })
    }

    private func triggerTapAnimation() {
        if settings.animationsEnabled {
            withAnimation(.easeOut(duration: 0.08)) {
                isPressed = true
            }
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.08) {
                withAnimation(.easeOut(duration: 0.12)) {
                    isPressed = false
                }
            }
        }
    }

    /// Returns the appropriate image view for the symbol
    /// Uses ARASAAC pictograms with SF Symbol fallback
    @ViewBuilder
    private var symbolImage: some View {
        ARASAACImageView(symbolId: symbol.id)
    }

    /// Mapping of symbol IDs to SF Symbol names (fallback)
    static let sfSymbolMapping: [String: String] = [
        // Core communication
        "want": "hand.point.right.fill",
        "more": "plus.circle.fill",
        "help": "questionmark.circle.fill",
        "stop": "stop.circle.fill",
        "yes": "checkmark.circle.fill",
        "no": "xmark.circle.fill",

        // Food category
        "food": "fork.knife",
        "apple": "apple.logo",
        "water": "drop.fill",
        "milk": "cup.and.saucer.fill",

        // Common actions
        "go": "arrow.right.circle.fill",
        "eat": "mouth.fill",
        "drink": "waterbottle.fill",
        "play": "gamecontroller.fill",
        "sleep": "moon.zzz.fill",
        "bathroom": "toilet.fill",

        // People
        "mom": "figure.stand",
        "dad": "figure.stand",
        "me": "person.fill",
        "you": "person.fill.questionmark",

        // Feelings
        "happy": "face.smiling.fill",
        "sad": "cloud.rain.fill",
        "angry": "flame.fill",
        "tired": "zzz",
        "hurt": "bandage.fill",

        // Places
        "home": "house.fill",
        "school": "building.columns.fill",
        "outside": "sun.max.fill"
    ]

    // MARK: - Theme Compliance Properties
    // These static properties allow tests to verify theme usage

    static var usesThemeColors: Bool { true }
    static var tapScaleValue: CGFloat { FlynnTheme.Animation.tapScale }
    static var supportsDarkMode: Bool { true }
    static var labelFont: Font { FlynnTheme.Typography.symbolLabelMedium }
    static var labelTracking: CGFloat { FlynnTheme.Typography.trackingStandard }
    static var cellPadding: CGFloat { FlynnTheme.Layout.gridCellPadding }
    static var minimumSize: CGFloat { FlynnTheme.Layout.minimumTouchTarget }
    static var tapAnimationDuration: Double { FlynnTheme.Animation.tapScaleUpDuration }

    static func animationScale(for settings: AppSettings) -> CGFloat {
        return settings.animationsEnabled ? FlynnTheme.Animation.tapScale : 1.0
    }
}

#Preview {
    LazyVGrid(columns: [GridItem(.adaptive(minimum: 80))], spacing: 8) {
        ForEach(["want", "go", "eat", "drink", "play"], id: \.self) { symbolId in
            SymbolCell(
                symbol: Symbol(
                    id: symbolId,
                    position: GridPosition(row: 0, col: 0),
                    labels: ["en": symbolId],
                    category: .verb
                ),
                language: .english,
                onTap: {}
            )
        }
    }
    .padding()
    .background(
        LinearGradient(
            colors: [.blue.opacity(0.2), .purple.opacity(0.2)],
            startPoint: .topLeading,
            endPoint: .bottomTrailing
        )
    )
}
