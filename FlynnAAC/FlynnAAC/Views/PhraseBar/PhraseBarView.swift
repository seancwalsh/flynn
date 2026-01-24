import SwiftUI

struct PhraseBarView: View {
    @Binding var symbols: [Symbol]
    let language: Language

    @State private var isPulsing = false

    var body: some View {
        HStack(spacing: 8) {
            // Phrase symbols
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 4) {
                    ForEach(symbols.indices, id: \.self) { index in
                        PhraseSymbolCell(
                            symbol: symbols[index],
                            language: language,
                            onTap: {
                                withAnimation {
                                    _ = symbols.remove(at: index)
                                }
                            }
                        )
                    }
                }
                .padding(.horizontal, 8)
            }
            .frame(height: 60)
            .background(Color(.systemGray6))
            .cornerRadius(8)

            Spacer()

            // Clear button
            Button(action: {
                withAnimation {
                    symbols.removeAll()
                }
            }) {
                Image(systemName: "xmark.circle.fill")
                    .font(.title2)
                    .foregroundColor(.red)
            }
            .disabled(symbols.isEmpty)
            .opacity(symbols.isEmpty ? 0.3 : 1)

            // Speak button
            Button(action: {
                speakPhrase()
            }) {
                Image(systemName: "speaker.wave.2.fill")
                    .font(.title2)
                    .foregroundColor(.blue)
                    .scaleEffect(isPulsing ? 1.2 : 1.0)
            }
            .disabled(symbols.isEmpty)
            .opacity(symbols.isEmpty ? 0.3 : 1)
        }
        .padding()
        .background(Color(.systemBackground))
    }

    private func speakPhrase() {
        guard !symbols.isEmpty else { return }

        // Visual feedback
        withAnimation(.easeInOut(duration: 0.3).repeatCount(3)) {
            isPulsing = true
        }

        DispatchQueue.main.asyncAfter(deadline: .now() + 0.9) {
            isPulsing = false
        }

        // Audio playback handled by PhraseEngine
        // TODO: Connect to PhraseEngine
    }
}

struct PhraseSymbolCell: View {
    let symbol: Symbol
    let language: Language
    let onTap: () -> Void

    var body: some View {
        Button(action: onTap) {
            VStack(spacing: 2) {
                Image(symbol.imageName)
                    .resizable()
                    .aspectRatio(contentMode: .fit)
                    .frame(width: 40, height: 30)

                Text(symbol.label(for: language))
                    .font(.system(size: 10))
                    .lineLimit(1)
            }
            .padding(4)
            .background(Color.blue.opacity(0.1))
            .cornerRadius(4)
        }
        .buttonStyle(PlainButtonStyle())
    }
}
