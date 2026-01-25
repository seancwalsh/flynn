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
        HStack(spacing: FlynnTheme.Layout.spacing12) {
            // Phrase symbols
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: FlynnTheme.Layout.spacing4) {
                    ForEach(phraseItems.indices, id: \.self) { index in
                        PhraseSymbolCell(
                            phraseItem: phraseItems[index],
                            language: language,
                            onTap: {
                                withAnimation(FlynnTheme.Animation.standardEasing) {
                                    onRemoveSymbol(index)
                                }
                            }
                        )
                    }
                }
                .padding(.horizontal, FlynnTheme.Layout.phraseBarPadding)
            }
            .frame(height: Self.heightValue)
            .background(FlynnTheme.Colors.surface)
            .cornerRadius(FlynnTheme.Layout.cornerRadiusMedium)

            Spacer()

            // Clear button
            Button(action: {
                withAnimation(FlynnTheme.Animation.standardEasing) {
                    onClear()
                }
            }) {
                Image(systemName: "xmark.circle.fill")
                    .font(.title2)
                    .foregroundStyle(FlynnTheme.Colors.error)
            }
            .disabled(phraseItems.isEmpty)
            .opacity(phraseItems.isEmpty ? 0.3 : 1)

            // Speak button
            Button(action: {
                speakPhrase()
            }) {
                ZStack {
                    if isGeneratingAudio {
                        ProgressView()
                            .progressViewStyle(CircularProgressViewStyle(tint: FlynnTheme.Colors.accent))
                    } else {
                        Image(systemName: "speaker.wave.2.fill")
                            .font(.title2)
                            .foregroundStyle(FlynnTheme.Colors.accent)
                            .scaleEffect(isPulsing ? 1.2 : 1.0)
                    }
                }
                .frame(width: 30, height: 30)
            }
            .disabled(phraseItems.isEmpty || isGeneratingAudio)
            .opacity(phraseItems.isEmpty ? 0.3 : 1)
        }
        .padding(FlynnTheme.Layout.phraseBarPadding)
        .background(FlynnTheme.Colors.background)
    }

    private func speakPhrase() {
        guard !phraseItems.isEmpty else { return }

        // Visual feedback
        withAnimation(.easeInOut(duration: 0.3).repeatCount(3)) {
            isPulsing = true
        }

        DispatchQueue.main.asyncAfter(deadline: .now() + 0.9) {
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
                    .frame(width: FlynnTheme.Layout.phraseBarSymbolSize, height: FlynnTheme.Layout.phraseBarSymbolSize * 0.75)

                Text(phraseItem.label(for: language))
                    .font(FlynnTheme.Typography.caption)
                    .tracking(FlynnTheme.Typography.trackingWide)
                    .foregroundStyle(FlynnTheme.Colors.textPrimary)
                    .lineLimit(1)
            }
            .padding(FlynnTheme.Layout.spacing4)
            .background(phraseItem.symbol.category?.color.opacity(0.12) ?? FlynnTheme.Colors.surfaceSecondary)
            .cornerRadius(FlynnTheme.Layout.cornerRadiusSmall)
        }
        .buttonStyle(PlainButtonStyle())
    }
}
