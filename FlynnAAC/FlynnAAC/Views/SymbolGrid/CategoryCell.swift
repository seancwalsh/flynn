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
                withAnimation(.easeOut(duration: 0.08)) {
                    isPressed = true
                }
                DispatchQueue.main.asyncAfter(deadline: .now() + 0.08) {
                    withAnimation(.easeOut(duration: 0.12)) {
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
                        .foregroundStyle(.primary)

                    // Folder indicator
                    VStack {
                        Spacer()
                        HStack {
                            Spacer()
                            Image(systemName: "folder.fill")
                                .font(.system(size: 12, weight: .medium))
                                .foregroundStyle(.secondary)
                                .padding(4)
                        }
                    }
                }

                Text(category.label(for: language))
                    .font(.system(size: 13, weight: .medium, design: .rounded))
                    .foregroundStyle(.primary)
                    .lineLimit(2)
                    .minimumScaleFactor(0.7)
            }
            .padding(FlynnTheme.Layout.gridCellPadding)
            .frame(minWidth: FlynnTheme.Layout.minimumTouchTarget, minHeight: FlynnTheme.Layout.minimumTouchTarget)
            .glassEffect(
                .regular.tint(FlynnTheme.Colors.categoryNoun.opacity(0.2)).interactive(),
                in: RoundedRectangle(cornerRadius: 14)
            )
            .scaleEffect(isPressed && settings.animationsEnabled ? FlynnTheme.Animation.tapScale : 1.0)
        }
        .buttonStyle(.plain)
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

#Preview {
    CategoryCell(
        category: Category(
            id: "food",
            position: GridPosition(row: 0, col: 0),
            labels: ["en": "Food", "bg": "Храна"],
            symbols: [],
            subcategories: []
        ),
        language: .english,
        onTap: {}
    )
    .frame(width: 100, height: 100)
    .padding()
    .background(
        LinearGradient(
            colors: [.blue.opacity(0.2), .purple.opacity(0.2)],
            startPoint: .topLeading,
            endPoint: .bottomTrailing
        )
    )
}
