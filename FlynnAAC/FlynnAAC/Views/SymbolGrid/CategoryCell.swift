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
                withAnimation(.easeInOut(duration: 0.1)) {
                    isPressed = true
                }
                DispatchQueue.main.asyncAfter(deadline: .now() + 0.1) {
                    withAnimation(.easeInOut(duration: 0.1)) {
                        isPressed = false
                    }
                }
            }
            onTap()
        }) {
            VStack(spacing: 4) {
                ZStack {
                    Image(category.imageName)
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
                    .font(.caption)
                    .lineLimit(2)
                    .minimumScaleFactor(0.7)
            }
            .padding(8)
            .frame(minWidth: settings.minimumTouchTarget, minHeight: settings.minimumTouchTarget)
            .background(Color.orange.opacity(isPressed ? 0.3 : 0.1))
            .cornerRadius(8)
            .scaleEffect(isPressed ? 1.1 : 1.0)
            .overlay(
                RoundedRectangle(cornerRadius: 8)
                    .stroke(isPressed ? Color.orange : Color.clear, lineWidth: 2)
            )
        }
        .buttonStyle(PlainButtonStyle())
    }
}
