import SwiftUI

struct ContentView: View {
    @StateObject private var viewModel = AACViewModel()

    var body: some View {
        VStack(spacing: 0) {
            HeaderView(
                currentLanguage: viewModel.currentLanguage,
                onLanguageToggle: {
                    viewModel.toggleLanguage()
                }
            )

            PhraseBarView(
                symbols: viewModel.phraseSymbols,
                language: viewModel.currentLanguage,
                onSpeak: {
                    viewModel.speakPhrase()
                },
                onClear: {
                    viewModel.clearPhrase()
                },
                onRemoveSymbol: { index in
                    viewModel.removeSymbol(at: index)
                }
            )

            SymbolGridView(
                category: viewModel.currentCategory,
                language: viewModel.currentLanguage,
                onSymbolTapped: { symbol in
                    viewModel.symbolTapped(symbol)
                },
                onCategoryTapped: { category in
                    viewModel.navigateToCategory(category)
                },
                onBackTapped: {
                    viewModel.navigateBack()
                }
            )
        }
    }
}

struct HeaderView: View {
    let currentLanguage: Language
    let onLanguageToggle: () -> Void

    var body: some View {
        HStack {
            Spacer()
            Button(action: onLanguageToggle) {
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

/// Main view model for AAC functionality
/// Coordinates audio playback, phrase building, and state management
@MainActor
class AACViewModel: ObservableObject {
    @Published var currentLanguage: Language
    @Published var phraseSymbols: [Symbol] = []
    @Published var currentCategory: Category?

    private let audioService: AudioService
    private let phraseEngine: PhraseEngine
    private var settings: AppSettings

    init(
        audioService: AudioService = AudioService(),
        phraseEngine: PhraseEngine = PhraseEngine()
    ) {
        self.audioService = audioService
        self.phraseEngine = phraseEngine

        // Load persisted settings or use defaults
        self.settings = AppSettings.loadOrDefault()
        self.currentLanguage = settings.language
    }

    // MARK: - Symbol Interaction

    func symbolTapped(_ symbol: Symbol) {
        // Play audio immediately (target: <100ms)
        Task {
            do {
                try await audioService.play(symbol: symbol, language: currentLanguage)
            } catch {
                print("Audio playback failed: \(error)")
            }
        }

        // Add to phrase
        phraseSymbols.append(symbol)
        Task {
            await phraseEngine.addSymbol(symbol)
        }
    }

    // MARK: - Language Toggle

    func toggleLanguage() {
        currentLanguage = currentLanguage == .english ? .bulgarian : .english

        // Persist language setting immediately
        settings.language = currentLanguage
        settings.save()
    }

    // MARK: - Phrase Management

    func speakPhrase() {
        guard !phraseSymbols.isEmpty else { return }

        Task {
            let phrase = Phrase(symbols: phraseSymbols)
            await audioService.speakPhrase(phrase, language: currentLanguage)
        }
    }

    func clearPhrase() {
        phraseSymbols.removeAll()
        Task {
            await phraseEngine.clear()
        }
    }

    func removeSymbol(at index: Int) {
        guard index < phraseSymbols.count else { return }
        phraseSymbols.remove(at: index)

        Task {
            await phraseEngine.removeSymbol(at: index)
        }
    }

    // MARK: - Category Navigation

    func navigateToCategory(_ category: Category) {
        currentCategory = category
    }

    func navigateBack() {
        // Navigate back to root (nil) for now
        // TODO: Implement proper category hierarchy tracking for FLY-7
        currentCategory = nil
    }
}

#Preview {
    ContentView()
}
