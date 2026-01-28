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
                        HapticManager.shared.phraseClear()
                        withAnimation(.bouncy) {
                            onClear()
                        }
                    }) {
                        Image(systemName: "xmark")
                            .font(.body.weight(.semibold))
                            .foregroundStyle(.secondary)
                            .frame(width: 40, height: 40)
                            .glassEffect(.regular.interactive())
                    }
                    .disabled(phraseItems.isEmpty)
                    .opacity(phraseItems.isEmpty ? 0.4 : 1)
                    .accessibilityLabel("Clear phrase")
                    .accessibilityHint("Double tap to clear all symbols from the phrase bar")

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
                                    .font(.body.weight(.semibold))
                                    .foregroundStyle(.white)
                                    .scaleEffect(isPulsing ? 1.15 : 1.0)
                            }
                        }
                        .frame(width: 48, height: 48)
                        .glassEffect(.regular.tint(.blue).interactive())
                    }
                    .disabled(phraseItems.isEmpty || isGeneratingAudio)
                    .opacity(phraseItems.isEmpty ? 0.4 : 1)
                    .accessibilityLabel(speakButtonAccessibilityLabel)
                    .accessibilityHint("Double tap to speak the phrase")
                }
            }
            .padding(.horizontal, FlynnTheme.Layout.spacing12)
            .padding(.vertical, FlynnTheme.Layout.spacing8)
        }
        .frame(height: Self.heightValue)
    }

    /// Accessibility label for speak button that announces the phrase content
    private var speakButtonAccessibilityLabel: String {
        if isGeneratingAudio {
            return "Generating speech"
        }
        if phraseItems.isEmpty {
            return "Speak phrase, empty"
        }
        let phraseText = phraseItems.map { $0.label(for: language) }.joined(separator: " ")
        return "Speak: \(phraseText)"
    }

    private func speakPhrase() {
        guard !phraseItems.isEmpty else { return }

        // Haptic feedback for speaking
        HapticManager.shared.phraseSpoken()

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
        Button(action: {
            HapticManager.shared.symbolRemoved()
            onTap()
        }) {
            VStack(spacing: FlynnTheme.Layout.spacing2) {
                ARASAACImageView(symbolId: phraseItem.symbol.id)
                    .frame(
                        width: FlynnTheme.Layout.phraseBarSymbolSize,
                        height: FlynnTheme.Layout.phraseBarSymbolSize * 0.75
                    )

                Text(phraseItem.label(for: language))
                    .font(FlynnTheme.Typography.phraseBarSymbolLabel)
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
        .accessibilityLabel(phraseItem.label(for: language))
        .accessibilityHint("Double tap to remove from phrase")
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
