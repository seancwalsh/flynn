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
                Image(symbol.imageName)
                    .resizable()
                    .aspectRatio(contentMode: .fit)
                    .frame(maxWidth: .infinity, maxHeight: .infinity)

                Text(symbol.label(for: language))
                    .font(.caption)
                    .lineLimit(2)
                    .minimumScaleFactor(0.7)
            }
            .padding(8)
            .frame(minWidth: settings.minimumTouchTarget, minHeight: settings.minimumTouchTarget)
            .background(Color.blue.opacity(isPressed ? 0.3 : 0.1))
            .cornerRadius(8)
            .scaleEffect(isPressed ? 1.1 : 1.0)
            .overlay(
                RoundedRectangle(cornerRadius: 8)
                    .stroke(isPressed ? Color.blue : Color.clear, lineWidth: 2)
            )
        }
        .buttonStyle(PlainButtonStyle())
    }
}
