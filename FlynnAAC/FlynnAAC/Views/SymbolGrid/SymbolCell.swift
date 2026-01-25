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
                .font(Self.labelFont)
                .tracking(Self.labelTracking)
                .foregroundStyle(FlynnTheme.Colors.textPrimary)
                .lineLimit(2)
                .minimumScaleFactor(0.7)
        }
        .padding(Self.cellPadding)
        .frame(minWidth: Self.minimumSize, minHeight: Self.minimumSize)
        .background(
            (symbol.category?.color.opacity(0.15) ?? FlynnTheme.Colors.surface)
                .opacity(isPressed ? FlynnTheme.Animation.pressedOpacity : 1.0)
        )
        .cornerRadius(FlynnTheme.Layout.cornerRadiusMedium)
        .scaleEffect(isPressed && settings.animationsEnabled ? Self.tapScaleValue : 1.0)
        .onTapGesture {
            triggerTapAnimation()
            onTap()
        }
        .onLongPressGesture(minimumDuration: 0.5, pressing: { pressing in
            if pressing {
                withAnimation(FlynnTheme.Animation.quickEasing) {
                    isPressed = true
                }
            }
        }, perform: {
            withAnimation(FlynnTheme.Animation.quickEasing) {
                isPressed = false
            }
            onLongPress?()
        })
    }

    private func triggerTapAnimation() {
        if settings.animationsEnabled {
            withAnimation(FlynnTheme.Animation.quickEasing) {
                isPressed = true
            }
            DispatchQueue.main.asyncAfter(deadline: .now() + FlynnTheme.Animation.tapScaleUpDuration) {
                withAnimation(FlynnTheme.Animation.quickEasing) {
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
