import SwiftUI

/// A picker view that displays all conjugation forms for a Bulgarian verb
/// Uses iOS 26 Liquid Glass design for a modern, elegant appearance
struct ConjugationPickerView: View {
    let symbol: Symbol
    let conjugation: BulgarianConjugation
    let onSelect: (String, GrammaticalPerson, GrammaticalNumber) -> Void
    let onCancel: () -> Void

    @Namespace private var glassNamespace

    var body: some View {
        GlassEffectContainer {
            VStack(spacing: FlynnTheme.Layout.spacing16) {
                // Header with verb name
                HStack {
                    Button(action: onCancel) {
                        Image(systemName: "xmark")
                            .font(.system(size: 16, weight: .semibold))
                            .foregroundStyle(.secondary)
                            .frame(width: 32, height: 32)
                            .glassEffect(.regular.interactive())
                    }

                    Spacer()

                    // Verb icon and name
                    HStack(spacing: FlynnTheme.Layout.spacing8) {
                        ARASAACImageView(symbolId: symbol.id)
                            .frame(width: 32, height: 32)

                        Text(conjugation.english)
                            .font(.system(size: 18, weight: .semibold, design: .rounded))
                            .foregroundStyle(.primary)
                    }
                    .padding(.horizontal, FlynnTheme.Layout.spacing12)
                    .padding(.vertical, FlynnTheme.Layout.spacing8)
                    .glassEffect(.regular, in: .capsule)

                    Spacer()

                    // Invisible balance element
                    Color.clear
                        .frame(width: 32, height: 32)
                }
                .padding(.horizontal, FlynnTheme.Layout.spacing8)

                // Conjugation grid - 2x3 layout
                VStack(spacing: FlynnTheme.Layout.spacing12) {
                    // Singular forms row
                    HStack(spacing: FlynnTheme.Layout.spacing8) {
                        ConjugationButton(
                            form: conjugation.first_sg,
                            pronounSymbolId: "i",
                            verbSymbolId: symbol.id,
                            categoryColor: symbol.category?.color ?? .gray
                        ) {
                            onSelect(conjugation.first_sg, .first, .singular)
                        }
                        .glassEffectID("first_sg", in: glassNamespace)

                        ConjugationButton(
                            form: conjugation.second_sg,
                            pronounSymbolId: "you",
                            verbSymbolId: symbol.id,
                            categoryColor: symbol.category?.color ?? .gray
                        ) {
                            onSelect(conjugation.second_sg, .second, .singular)
                        }
                        .glassEffectID("second_sg", in: glassNamespace)

                        ConjugationButton(
                            form: conjugation.third_sg,
                            pronounSymbolId: "he",
                            verbSymbolId: symbol.id,
                            categoryColor: symbol.category?.color ?? .gray
                        ) {
                            onSelect(conjugation.third_sg, .third, .singular)
                        }
                        .glassEffectID("third_sg", in: glassNamespace)
                    }

                    // Plural forms row
                    HStack(spacing: FlynnTheme.Layout.spacing8) {
                        ConjugationButton(
                            form: conjugation.first_pl,
                            pronounSymbolId: "we",
                            verbSymbolId: symbol.id,
                            categoryColor: symbol.category?.color ?? .gray
                        ) {
                            onSelect(conjugation.first_pl, .first, .plural)
                        }
                        .glassEffectID("first_pl", in: glassNamespace)

                        ConjugationButton(
                            form: conjugation.second_pl,
                            pronounSymbolId: "you",
                            verbSymbolId: symbol.id,
                            categoryColor: symbol.category?.color ?? .gray
                        ) {
                            onSelect(conjugation.second_pl, .second, .plural)
                        }
                        .glassEffectID("second_pl", in: glassNamespace)

                        ConjugationButton(
                            form: conjugation.third_pl,
                            pronounSymbolId: "they",
                            verbSymbolId: symbol.id,
                            categoryColor: symbol.category?.color ?? .gray
                        ) {
                            onSelect(conjugation.third_pl, .third, .plural)
                        }
                        .glassEffectID("third_pl", in: glassNamespace)
                    }
                }
                .padding(.horizontal, FlynnTheme.Layout.spacing8)
            }
            .padding(FlynnTheme.Layout.spacing16)
        }
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
    ZStack {
        // Background content for glass effect to sample
        LinearGradient(
            colors: [.blue.opacity(0.3), .purple.opacity(0.3)],
            startPoint: .topLeading,
            endPoint: .bottomTrailing
        )
        .ignoresSafeArea()

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
    }
}
