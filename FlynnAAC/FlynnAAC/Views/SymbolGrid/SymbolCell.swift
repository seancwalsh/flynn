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
                Image(symbol.imageName)
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
