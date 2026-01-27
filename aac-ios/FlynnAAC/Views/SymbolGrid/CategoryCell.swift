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
                        .frame(maxWidth: 90, maxHeight: 90)
                        .foregroundStyle(.primary)

                    // Folder indicator
                    VStack {
                        Spacer()
                        HStack {
                            Spacer()
                            Image(systemName: "folder.fill")
                                .font(.system(size: 14, weight: .medium))
                                .foregroundStyle(.secondary)
                                .padding(6)
                        }
                    }
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)

                Text(category.label(for: language))
                    .font(.system(size: 18, weight: .semibold, design: .rounded))
                    .foregroundStyle(.primary)
                    .lineLimit(2)
                    .minimumScaleFactor(0.5)
            }
            .padding(FlynnTheme.Layout.spacing6)
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            .glassEffect(
                .regular.tint(category.color.opacity(0.4)).interactive(),
                in: Rectangle()
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
