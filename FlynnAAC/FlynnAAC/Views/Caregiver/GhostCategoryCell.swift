import SwiftUI
import Foundation

/// A ghost cell representing a hidden category folder in edit mode.
/// Shows the original content at reduced opacity with a "hidden" indicator.
/// Tapping reveals the category (toggles visibility).
struct GhostCategoryCell: View {
    let category: Category
    let language: Language
    let onTap: () -> Void

    @State private var isPressed = false
    @State private var settings = AppSettings.default

    var body: some View {
        VStack(spacing: FlynnTheme.Layout.spacing4) {
            ZStack {
                // Original category content at reduced opacity
                categoryImage
                    .resizable()
                    .aspectRatio(contentMode: .fit)
                    .frame(maxWidth: 90, maxHeight: 90)
                    .foregroundStyle(.primary)
                    .opacity(0.35)

                // Eye-slash icon overlay
                Image(systemName: "eye.slash.fill")
                    .font(.system(size: 24, weight: .medium))
                    .foregroundStyle(FlynnTheme.Colors.warning)

                // Folder indicator (also faded)
                VStack {
                    Spacer()
                    HStack {
                        Spacer()
                        Image(systemName: "folder.fill")
                            .font(.system(size: 14, weight: .medium))
                            .foregroundStyle(.secondary)
                            .opacity(0.35)
                            .padding(6)
                    }
                }
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)

            Text(category.label(for: language))
                .font(.system(size: 18, weight: .semibold, design: .rounded))
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
                .fill(category.color.opacity(0.15))
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
        .accessibilityLabel("\(category.label(for: language)), hidden folder")
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

    /// Returns the appropriate image for the category
    private var categoryImage: Image {
        let sfSymbolName = Self.sfSymbolMapping[category.id] ?? "folder.fill"
        return Image(systemName: sfSymbolName)
    }

    /// Mapping of category IDs to SF Symbol names
    private static let sfSymbolMapping: [String: String] = [
        // TD Snap Motor Plan folders
        "quickfires": "bolt.fill",
        "keyboard": "keyboard.fill",
        "greetings": "hand.wave.fill",
        "personal_needs": "heart.text.square.fill",
        "repairs": "wrench.and.screwdriver.fill",
        "connecting": "link",
        "animals": "pawprint.fill",
        "descriptors": "paintbrush.pointed.fill",
        "things": "cube.fill",
        "food": "fork.knife",
        "people": "person.2.fill",
        "places": "map.fill",
        "actions": "figure.walk",
        "questions": "questionmark.circle.fill",
        "time": "clock.fill",
        // Legacy mappings
        "drinks": "cup.and.saucer.fill",
        "feelings": "heart.fill",
        "toys": "gamecontroller.fill",
        "clothes": "tshirt.fill",
        "colors": "paintpalette.fill",
        "numbers": "number.circle.fill",
        "weather": "cloud.sun.fill",
        "body": "figure.stand",
        "school": "book.fill",
        "home": "house.fill",
        "outside": "tree.fill",
        "transport": "car.fill"
    ]
}

#Preview {
    GhostCategoryCell(
        category: Category(
            id: "food",
            position: GridPosition(row: 0, col: 0),
            labels: ["en": "Food", "bg": "Храна"],
            symbols: [],
            subcategories: [],
            colorName: "orange"
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
