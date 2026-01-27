import SwiftUI

/// A picker view that displays all conjugation forms for a Bulgarian verb
/// Presented as a native iOS bottom sheet with Liquid Glass styling
struct ConjugationPickerView: View {
    let symbol: Symbol
    let conjugation: BulgarianConjugation
    let onSelect: (String, GrammaticalPerson, GrammaticalNumber) -> Void

    @Environment(\.dismiss) private var dismiss
    @Namespace private var glassNamespace

    var body: some View {
        VStack(spacing: FlynnTheme.Layout.spacing20) {
            // Drag indicator
            Capsule()
                .fill(Color.secondary.opacity(0.4))
                .frame(width: 36, height: 5)
                .padding(.top, FlynnTheme.Layout.spacing12)

            // Header with verb icon and name
            HStack(spacing: FlynnTheme.Layout.spacing12) {
                ARASAACImageView(symbolId: symbol.id)
                    .frame(width: 48, height: 48)

                VStack(alignment: .leading, spacing: FlynnTheme.Layout.spacing2) {
                    Text(conjugation.english)
                        .font(.system(size: 22, weight: .bold, design: .rounded))
                        .foregroundColor(.primary)

                    Text("Choose a form")
                        .font(.system(size: 14, weight: .medium, design: .rounded))
                        .foregroundColor(.secondary)
                }

                Spacer()
            }
            .padding(.horizontal, FlynnTheme.Layout.spacing16)

            // Conjugation grid - 2x3 layout
            VStack(spacing: FlynnTheme.Layout.spacing12) {
                // Singular forms row
                HStack(spacing: FlynnTheme.Layout.spacing12) {
                    ConjugationButton(
                        form: conjugation.first_sg,
                        pronounSymbolId: "i",
                        verbSymbolId: symbol.id,
                        categoryColor: symbol.category?.color ?? .gray
                    ) {
                        onSelect(conjugation.first_sg, .first, .singular)
                        dismiss()
                    }
                    .glassEffectID("first_sg", in: glassNamespace)

                    ConjugationButton(
                        form: conjugation.second_sg,
                        pronounSymbolId: "you",
                        verbSymbolId: symbol.id,
                        categoryColor: symbol.category?.color ?? .gray
                    ) {
                        onSelect(conjugation.second_sg, .second, .singular)
                        dismiss()
                    }
                    .glassEffectID("second_sg", in: glassNamespace)

                    ConjugationButton(
                        form: conjugation.third_sg,
                        pronounSymbolId: "he",
                        verbSymbolId: symbol.id,
                        categoryColor: symbol.category?.color ?? .gray
                    ) {
                        onSelect(conjugation.third_sg, .third, .singular)
                        dismiss()
                    }
                    .glassEffectID("third_sg", in: glassNamespace)
                }

                // Plural forms row
                HStack(spacing: FlynnTheme.Layout.spacing12) {
                    ConjugationButton(
                        form: conjugation.first_pl,
                        pronounSymbolId: "we",
                        verbSymbolId: symbol.id,
                        categoryColor: symbol.category?.color ?? .gray
                    ) {
                        onSelect(conjugation.first_pl, .first, .plural)
                        dismiss()
                    }
                    .glassEffectID("first_pl", in: glassNamespace)

                    ConjugationButton(
                        form: conjugation.second_pl,
                        pronounSymbolId: "you",
                        verbSymbolId: symbol.id,
                        categoryColor: symbol.category?.color ?? .gray
                    ) {
                        onSelect(conjugation.second_pl, .second, .plural)
                        dismiss()
                    }
                    .glassEffectID("second_pl", in: glassNamespace)

                    ConjugationButton(
                        form: conjugation.third_pl,
                        pronounSymbolId: "they",
                        verbSymbolId: symbol.id,
                        categoryColor: symbol.category?.color ?? .gray
                    ) {
                        onSelect(conjugation.third_pl, .third, .plural)
                        dismiss()
                    }
                    .glassEffectID("third_pl", in: glassNamespace)
                }
            }
            .padding(.horizontal, FlynnTheme.Layout.spacing16)

            Spacer()
        }
        .padding(.top, FlynnTheme.Layout.spacing8)
    }
}

/// Individual conjugation button with glass effect
private struct ConjugationButton: View {
    let form: String
    let pronounSymbolId: String
    let verbSymbolId: String
    let categoryColor: Color
    let action: () -> Void

    private let iconSize: CGFloat = 36

    var body: some View {
        Button(action: action) {
            VStack(spacing: FlynnTheme.Layout.spacing6) {
                // Pictograms row: pronoun + verb
                HStack(spacing: FlynnTheme.Layout.spacing4) {
                    ARASAACImageView(symbolId: pronounSymbolId)
                        .frame(width: iconSize, height: iconSize)

                    ARASAACImageView(symbolId: verbSymbolId)
                        .frame(width: iconSize, height: iconSize)
                }

                // Conjugated form text
                Text(form)
                    .font(.system(size: 14, weight: .medium, design: .rounded))
                    .foregroundStyle(.primary)
                    .lineLimit(1)
                    .minimumScaleFactor(0.7)
            }
            .padding(.horizontal, FlynnTheme.Layout.spacing8)
            .padding(.vertical, FlynnTheme.Layout.spacing8)
            .frame(maxWidth: .infinity)
            .glassEffect(.regular.tint(categoryColor.opacity(0.3)).interactive(), in: RoundedRectangle(cornerRadius: 12))
        }
        .buttonStyle(.plain)
    }
}

/// A compact single-row conjugation picker for inline display
struct InlineConjugationPicker: View {
    let verbSymbolId: String
    let conjugation: BulgarianConjugation
    let onSelect: (String) -> Void

    var body: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            GlassEffectContainer {
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
                                    .font(.system(size: 11, weight: .medium, design: .rounded))
                                    .foregroundStyle(.primary)
                            }
                            .padding(.horizontal, FlynnTheme.Layout.spacing8)
                            .padding(.vertical, FlynnTheme.Layout.spacing4)
                            .glassEffect(.regular.interactive())
                        }
                        .buttonStyle(.plain)
                    }
                }
                .padding(.horizontal, FlynnTheme.Layout.spacing8)
            }
        }
    }

    /// Map person/number to pronoun symbol ID
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
}

#Preview {
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
        }
    )
    .presentationDetents([.medium])
}
