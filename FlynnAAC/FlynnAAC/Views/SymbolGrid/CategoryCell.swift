import SwiftUI

struct CategoryCell: View {
    let category: Category
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
                ZStack {
                    categoryImage
                        .resizable()
                        .aspectRatio(contentMode: .fit)
                        .frame(maxWidth: .infinity, maxHeight: .infinity)

                    // Folder indicator
                    VStack {
                        Spacer()
                        HStack {
                            Spacer()
                            Image(systemName: "folder.fill")
                                .font(.caption)
                                .foregroundColor(.secondary)
                                .padding(4)
                        }
                    }
                }

                Text(category.label(for: language))
                    .font(FlynnTheme.Typography.symbolLabelMedium)
                    .tracking(FlynnTheme.Typography.trackingStandard)
                    .foregroundStyle(FlynnTheme.Colors.textPrimary)
                    .lineLimit(2)
                    .minimumScaleFactor(0.7)
            }
            .padding(FlynnTheme.Layout.gridCellPadding)
            .frame(minWidth: FlynnTheme.Layout.minimumTouchTarget, minHeight: FlynnTheme.Layout.minimumTouchTarget)
            .background(
                FlynnTheme.Colors.categoryNoun.opacity(isPressed ? 0.3 : 0.15)
            )
            .cornerRadius(FlynnTheme.Layout.cornerRadiusMedium)
            .scaleEffect(isPressed && settings.animationsEnabled ? FlynnTheme.Animation.tapScale : 1.0)
        }
        .buttonStyle(PlainButtonStyle())
    }

    /// Returns the appropriate image for the category
    private var categoryImage: Image {
        let sfSymbolName = Self.sfSymbolMapping[category.id] ?? "folder.fill"
        return Image(systemName: sfSymbolName)
    }

    /// Mapping of category IDs to SF Symbol names
    private static let sfSymbolMapping: [String: String] = [
        "food": "fork.knife",
        "drinks": "cup.and.saucer.fill",
        "people": "person.2.fill",
        "places": "map.fill",
        "actions": "figure.walk",
        "feelings": "heart.fill",
        "animals": "pawprint.fill",
        "toys": "gamecontroller.fill",
        "clothes": "tshirt.fill",
        "colors": "paintpalette.fill",
        "numbers": "number.circle.fill",
        "time": "clock.fill",
        "weather": "cloud.sun.fill",
        "body": "figure.stand",
        "school": "book.fill",
        "home": "house.fill",
        "outside": "tree.fill",
        "transport": "car.fill"
    ]
}
