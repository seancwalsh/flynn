import SwiftUI
import Foundation

/// A ghost cell representing a hidden symbol in edit mode.
/// Shows the original content at reduced opacity with a "hidden" indicator.
/// Tapping reveals the symbol (toggles visibility).
struct GhostSymbolCell: View {
    let symbol: Symbol
    let language: Language
    let onTap: () -> Void

    @State private var isPressed = false
    @State private var settings = AppSettings.default

    private var symbolColor: Color {
        symbol.category?.color ?? Color(red: 0.6, green: 0.6, blue: 0.65)
    }

    var body: some View {
        VStack(spacing: FlynnTheme.Layout.spacing4) {
            ZStack {
                // Original symbol content at reduced opacity
                ARASAACImageView(symbolId: symbol.id)
                    .frame(maxWidth: 90, maxHeight: 90)
                    .opacity(0.35)

                // Eye-slash icon overlay
                Image(systemName: "eye.slash.fill")
                    .font(.title2.weight(.medium))
                    .foregroundStyle(FlynnTheme.Colors.warning)
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)

            Text(symbol.label(for: language))
                .font(FlynnTheme.Typography.symbolLabel)
                .foregroundStyle(.primary)
                .opacity(0.35)
                .lineLimit(2)
                .minimumScaleFactor(0.5)
        }
        .padding(FlynnTheme.Layout.spacing6)
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background {
            // Desaturated tinted glass effect
            Rectangle()
                .fill(symbolColor.opacity(0.15))
                .saturation(0.5)
        }
        .overlay {
            // Dashed border overlay
            Rectangle()
                .strokeBorder(
                    style: StrokeStyle(lineWidth: 2, dash: [6, 4])
                )
                .foregroundStyle(FlynnTheme.Colors.warning.opacity(0.5))
        }
        .glassEffect(.regular, in: Rectangle())
        .scaleEffect(isPressed && settings.animationsEnabled ? FlynnTheme.Animation.tapScale : 1.0)
        .contentShape(Rectangle())
        .onTapGesture {
            triggerTapAnimation()
            onTap()
        }
        .accessibilityLabel("\(symbol.label(for: language)), hidden")
        .accessibilityHint("Double tap to show")
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
}

#Preview {
    GhostSymbolCell(
        symbol: Symbol(
            id: "want",
            position: GridPosition(row: 0, col: 0),
            labels: ["en": "want"],
            category: .verb
        ),
        language: .english,
        onTap: {}
    )
    .frame(width: 120, height: 120)
    .padding()
    .background(
        LinearGradient(
            colors: [.blue.opacity(0.2), .purple.opacity(0.2)],
            startPoint: .topLeading,
            endPoint: .bottomTrailing
        )
    )
}
