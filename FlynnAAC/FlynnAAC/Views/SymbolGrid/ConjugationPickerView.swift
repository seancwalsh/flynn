import SwiftUI

/// A picker view that displays all conjugation forms for a Bulgarian verb
/// Shows pronoun + verb pictograms for visual clarity
struct ConjugationPickerView: View {
    let symbol: Symbol
    let conjugation: BulgarianConjugation
    let onSelect: (String, GrammaticalPerson, GrammaticalNumber) -> Void
    let onCancel: () -> Void

    /// Map grammatical person/number to pronoun symbol IDs
    private static let pronounSymbolIds: [String: String] = [
        "first_sg": "i",      // аз
        "second_sg": "you",   // ти
        "third_sg": "he",     // той/тя (using "he" as generic)
        "first_pl": "we",     // ние
        "second_pl": "you",   // вие (using "you" - same symbol)
        "third_pl": "they"    // те
    ]

    var body: some View {
        VStack(spacing: FlynnTheme.Layout.spacing16) {
            // Header with cancel button
            HStack {
                Button(action: onCancel) {
                    Image(systemName: "xmark.circle.fill")
                        .font(.title2)
                        .foregroundStyle(FlynnTheme.Colors.textSecondary)
                }

                Spacer()

                Text(conjugation.english)
                    .font(FlynnTheme.Typography.phraseBar)
                    .foregroundStyle(FlynnTheme.Colors.textPrimary)

                Spacer()

                // Balance the X button
                Image(systemName: "xmark.circle.fill")
                    .font(.title2)
                    .foregroundStyle(.clear)
            }
            .padding(.horizontal)

            // Conjugation grid - 2x3 layout
            VStack(spacing: FlynnTheme.Layout.spacing12) {
                // Singular forms
                HStack(spacing: FlynnTheme.Layout.spacing8) {
                    conjugationCard(
                        form: conjugation.first_sg,
                        pronounSymbolId: "i",
                        person: .first,
                        number: .singular
                    )
                    conjugationCard(
                        form: conjugation.second_sg,
                        pronounSymbolId: "you",
                        person: .second,
                        number: .singular
                    )
                    conjugationCard(
                        form: conjugation.third_sg,
                        pronounSymbolId: "he",
                        person: .third,
                        number: .singular
                    )
                }

                // Plural forms
                HStack(spacing: FlynnTheme.Layout.spacing8) {
                    conjugationCard(
                        form: conjugation.first_pl,
                        pronounSymbolId: "we",
                        person: .first,
                        number: .plural
                    )
                    conjugationCard(
                        form: conjugation.second_pl,
                        pronounSymbolId: "you",
                        person: .second,
                        number: .plural
                    )
                    conjugationCard(
                        form: conjugation.third_pl,
                        pronounSymbolId: "they",
                        person: .third,
                        number: .plural
                    )
                }
            }
            .padding()
        }
        .padding()
        .background(FlynnTheme.Colors.surface)
        .cornerRadius(FlynnTheme.Layout.cornerRadiusLarge)
        .shadow(radius: 10)
    }

    /// A card showing pronoun pictogram + verb pictogram with text labels
    @ViewBuilder
    private func conjugationCard(
        form: String,
        pronounSymbolId: String,
        person: GrammaticalPerson,
        number: GrammaticalNumber
    ) -> some View {
        let iconSize: CGFloat = 40

        Button(action: {
            onSelect(form, person, number)
        }) {
            VStack(spacing: FlynnTheme.Layout.spacing4) {
                // Pictograms row: pronoun + verb
                HStack(spacing: FlynnTheme.Layout.spacing8) {
                    ARASAACImageView(symbolId: pronounSymbolId)
                        .frame(width: iconSize, height: iconSize)

                    ARASAACImageView(symbolId: symbol.id)
                        .frame(width: iconSize, height: iconSize)
                }

                // Text label showing the conjugated form
                Text(form)
                    .font(FlynnTheme.Typography.symbolLabelMedium)
                    .foregroundStyle(FlynnTheme.Colors.textPrimary)
                    .lineLimit(1)
                    .minimumScaleFactor(0.8)
            }
            .padding(FlynnTheme.Layout.spacing8)
            .frame(maxWidth: .infinity)
            .background(symbol.category?.color.opacity(0.15) ?? FlynnTheme.Colors.surfaceSecondary)
            .cornerRadius(FlynnTheme.Layout.cornerRadiusMedium)
        }
        .buttonStyle(PlainButtonStyle())
    }
}

/// A compact single-row conjugation picker for inline display
struct InlineConjugationPicker: View {
    let verbSymbolId: String
    let conjugation: BulgarianConjugation
    let onSelect: (String) -> Void

    /// Map person/number key to pronoun symbol ID
    private func pronounSymbolId(for form: ConjugatedForm) -> String {
        switch (form.person, form.number) {
        case (.first, .singular): return "i"
        case (.second, .singular): return "you"
        case (.third, .singular): return "he"
        case (.first, .plural): return "we"
        case (.second, .plural): return "you"
        case (.third, .plural): return "they"
        }
    }

    var body: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: FlynnTheme.Layout.spacing8) {
                ForEach(conjugation.allForms, id: \.form) { form in
                    Button(action: {
                        onSelect(form.form)
                    }) {
                        VStack(spacing: FlynnTheme.Layout.spacing2) {
                            HStack(spacing: FlynnTheme.Layout.spacing4) {
                                ARASAACImageView(symbolId: pronounSymbolId(for: form))
                                    .frame(width: 24, height: 24)
                                ARASAACImageView(symbolId: verbSymbolId)
                                    .frame(width: 24, height: 24)
                            }
                            Text(form.form)
                                .font(FlynnTheme.Typography.caption)
                                .foregroundStyle(FlynnTheme.Colors.textPrimary)
                        }
                        .padding(.horizontal, FlynnTheme.Layout.spacing8)
                        .padding(.vertical, FlynnTheme.Layout.spacing4)
                        .background(Color.green.opacity(0.15))
                        .cornerRadius(FlynnTheme.Layout.cornerRadiusSmall)
                    }
                    .buttonStyle(PlainButtonStyle())
                }
            }
            .padding(.horizontal)
        }
    }
}

#Preview {
    VStack {
        ConjugationPickerView(
            symbol: Symbol(
                id: "want",
                position: GridPosition(row: 0, col: 0),
                labels: ["en": "want", "bg": "искам"],
                category: .verb
            ),
            conjugation: VocabularyStructure.verbConjugations["want"]!,
            onSelect: { form, person, number in
                print("Selected: \(form)")
            },
            onCancel: {}
        )
        .padding()

        Spacer()
    }
    .background(Color.gray.opacity(0.3))
}
