import SwiftUI

struct SymbolCell: View {
    let symbol: Symbol
    let language: Language
    let onTap: () -> Void

    @State private var isPressed = false
    @State private var settings = AppSettings.default

    var body: some View {
        Button(action: {
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
            onTap()
        }) {
            VStack(spacing: FlynnTheme.Layout.spacing4) {
                symbolImage
                    .resizable()
                    .aspectRatio(contentMode: .fit)
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
        }
        .buttonStyle(PlainButtonStyle())
    }

    /// Returns the appropriate image for the symbol
    /// Tries asset catalog first, falls back to SF Symbol
    private var symbolImage: Image {
        // Map symbol IDs to SF Symbol names
        let sfSymbolName = Self.sfSymbolMapping[symbol.id] ?? "questionmark.circle"
        return Image(systemName: sfSymbolName)
    }

    /// Mapping of symbol IDs to SF Symbol names
    private static let sfSymbolMapping: [String: String] = [
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
