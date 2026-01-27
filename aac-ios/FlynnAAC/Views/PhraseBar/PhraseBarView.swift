import SwiftUI

struct PhraseBarView: View {
    let phraseItems: [PhraseItem]
    let language: Language
    let isGeneratingAudio: Bool
    let onSpeak: () -> Void
    let onClear: () -> Void
    let onRemoveSymbol: (Int) -> Void

    @State private var isPulsing = false

    var body: some View {
        GlassEffectContainer {
            HStack(spacing: FlynnTheme.Layout.spacing12) {
                // Phrase symbols in scrollable area
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: FlynnTheme.Layout.spacing6) {
                        ForEach(phraseItems.indices, id: \.self) { index in
                            PhraseSymbolCell(
                                phraseItem: phraseItems[index],
                                language: language,
                                onTap: {
                                    withAnimation(.bouncy) {
                                        onRemoveSymbol(index)
                                    }
                                }
                            )
                        }
                    }
                    .padding(.horizontal, FlynnTheme.Layout.spacing8)
                }
                .frame(height: Self.heightValue - FlynnTheme.Layout.spacing16)

                Spacer(minLength: FlynnTheme.Layout.spacing8)

                // Action buttons
                HStack(spacing: FlynnTheme.Layout.spacing12) {
                    // Clear button
                    Button(action: {
                        withAnimation(.bouncy) {
                            onClear()
                        }
                    }) {
                        Image(systemName: "xmark")
                            .font(.system(size: 16, weight: .semibold))
                            .foregroundStyle(.secondary)
                            .frame(width: 40, height: 40)
                            .glassEffect(.regular.interactive())
                    }
                    .disabled(phraseItems.isEmpty)
                    .opacity(phraseItems.isEmpty ? 0.4 : 1)

                    // Speak button
                    Button(action: {
                        speakPhrase()
                    }) {
                        ZStack {
                            if isGeneratingAudio {
                                ProgressView()
                                    .progressViewStyle(CircularProgressViewStyle(tint: .white))
                            } else {
                                Image(systemName: "speaker.wave.2.fill")
                                    .font(.system(size: 18, weight: .semibold))
                                    .foregroundStyle(.white)
                                    .scaleEffect(isPulsing ? 1.15 : 1.0)
                            }
                        }
                        .frame(width: 48, height: 48)
                        .glassEffect(.regular.tint(.blue).interactive())
                    }
                    .disabled(phraseItems.isEmpty || isGeneratingAudio)
                    .opacity(phraseItems.isEmpty ? 0.4 : 1)
                }
            }
            .padding(.horizontal, FlynnTheme.Layout.spacing12)
            .padding(.vertical, FlynnTheme.Layout.spacing8)
        }
        .frame(height: Self.heightValue)
    }

    private func speakPhrase() {
        guard !phraseItems.isEmpty else { return }

        // Visual feedback
        withAnimation(.easeInOut(duration: 0.25).repeatCount(3)) {
            isPulsing = true
        }

        DispatchQueue.main.asyncAfter(deadline: .now() + 0.75) {
            isPulsing = false
        }

        // Trigger audio playback
        onSpeak()
    }

    // MARK: - Theme Compliance Properties
    static var heightValue: CGFloat { FlynnTheme.Layout.phraseBarHeight }
}

struct PhraseSymbolCell: View {
    let phraseItem: PhraseItem
    let language: Language
    let onTap: () -> Void

    var body: some View {
        Button(action: onTap) {
            VStack(spacing: FlynnTheme.Layout.spacing2) {
                ARASAACImageView(symbolId: phraseItem.symbol.id)
                    .frame(
                        width: FlynnTheme.Layout.phraseBarSymbolSize,
                        height: FlynnTheme.Layout.phraseBarSymbolSize * 0.75
                    )

                Text(phraseItem.label(for: language))
                    .font(.system(size: 10, weight: .medium, design: .rounded))
                    .foregroundStyle(.primary)
                    .lineLimit(1)
                    .minimumScaleFactor(0.7)
            }
            .padding(.horizontal, FlynnTheme.Layout.spacing6)
            .padding(.vertical, FlynnTheme.Layout.spacing4)
            .glassEffect(
                .regular.tint((phraseItem.symbol.category?.color ?? .gray).opacity(0.25)).interactive(),
                in: RoundedRectangle(cornerRadius: 10)
            )
        }
        .buttonStyle(.plain)
    }
}

#Preview {
    VStack {
        PhraseBarView(
            phraseItems: [
                PhraseItem(symbol: Symbol(
                    id: "i",
                    position: GridPosition(row: 0, col: 0),
                    labels: ["en": "I", "bg": "аз"],
                    category: .pronoun
                )),
                PhraseItem(symbol: Symbol(
                    id: "want",
                    position: GridPosition(row: 0, col: 1),
                    labels: ["en": "want", "bg": "искам"],
                    category: .verb
                )),
                PhraseItem(symbol: Symbol(
                    id: "water",
                    position: GridPosition(row: 0, col: 2),
                    labels: ["en": "water", "bg": "вода"],
                    category: .noun
                ))
            ],
            language: .english,
            isGeneratingAudio: false,
            onSpeak: {},
            onClear: {},
            onRemoveSymbol: { _ in }
        )

        Spacer()
    }
    .background(
        LinearGradient(
            colors: [.blue.opacity(0.2), .purple.opacity(0.2)],
            startPoint: .topLeading,
            endPoint: .bottomTrailing
        )
    )
}
