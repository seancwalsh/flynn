import SwiftUI

struct ContentView: View {
    @State private var currentLanguage: Language = .english
    @State private var phraseSymbols: [Symbol] = []
    @State private var currentCategory: Category?

    var body: some View {
        VStack(spacing: 0) {
            HeaderView(
                currentLanguage: $currentLanguage
            )

            PhraseBarView(
                symbols: $phraseSymbols,
                language: currentLanguage
            )

            SymbolGridView(
                category: currentCategory,
                language: currentLanguage,
                onSymbolTapped: { symbol in
                    phraseSymbols.append(symbol)
                },
                onCategoryTapped: { category in
                    currentCategory = category
                }
            )
        }
    }
}

struct HeaderView: View {
    @Binding var currentLanguage: Language

    var body: some View {
        HStack {
            Spacer()
            Button(action: {
                currentLanguage = currentLanguage == .english ? .bulgarian : .english
            }) {
                Text(currentLanguage == .english ? "EN" : "BG")
                    .font(.headline)
                    .padding(.horizontal, 12)
                    .padding(.vertical, 8)
                    .background(Color.blue.opacity(0.2))
                    .cornerRadius(8)
            }
            .padding()
        }
        .background(Color(.systemBackground))
    }
}

#Preview {
    ContentView()
}
