import SwiftUI

/// A phrase item that wraps a symbol with an optional label override
/// Used for conjugated verbs where the displayed form differs from the default
struct PhraseItem: Identifiable {
    let id = UUID()
    let symbol: Symbol
    let overrideLabel: String?

    init(symbol: Symbol, overrideLabel: String? = nil) {
        self.symbol = symbol
        self.overrideLabel = overrideLabel
    }

    /// Get the label to display, using override if available
    func label(for language: Language) -> String {
        overrideLabel ?? symbol.label(for: language)
    }
}

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
                phraseItems: viewModel.phraseItems,
                language: viewModel.currentLanguage,
                isGeneratingAudio: viewModel.isGeneratingPhraseAudio,
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
                onSymbolWithLabelTapped: { symbol, label in
                    viewModel.symbolTappedWithLabel(symbol, label: label)
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
    @Published var phraseItems: [PhraseItem] = []
    @Published var currentCategory: Category?
    @Published var isGeneratingPhraseAudio: Bool = false

    private let audioService: AudioService
    private let phraseEngine: PhraseEngine
    private var settings: AppSettings

    /// Convenience accessor for symbols (for backward compatibility)
    var phraseSymbols: [Symbol] {
        phraseItems.map { $0.symbol }
    }

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
        phraseItems.append(PhraseItem(symbol: symbol))
        Task {
            await phraseEngine.addSymbol(symbol)
        }
    }

    /// Handle tapping a verb with a specific conjugated form
    func symbolTappedWithLabel(_ symbol: Symbol, label: String) {
        // Play the conjugated form audio
        Task {
            do {
                try await audioService.speakText(label, language: currentLanguage)
            } catch {
                print("Audio playback failed: \(error)")
            }
        }

        // Add to phrase with override label
        phraseItems.append(PhraseItem(symbol: symbol, overrideLabel: label))
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
        guard !phraseItems.isEmpty else { return }

        Task {
            isGeneratingPhraseAudio = true

            // Build phrase text using override labels where available
            let phraseText = phraseItems.map { $0.label(for: currentLanguage) }.joined(separator: " ")

            // Create phrase with the symbols (for any other phrase functionality)
            let phrase = Phrase(symbols: phraseSymbols)

            // Speak the custom text (handles conjugated forms)
            await audioService.speakPhraseText(phraseText, language: currentLanguage)

            isGeneratingPhraseAudio = false
        }
    }

    func clearPhrase() {
        phraseItems.removeAll()
        Task {
            await phraseEngine.clear()
        }
    }

    func removeSymbol(at index: Int) {
        guard index < phraseItems.count else { return }
        phraseItems.remove(at: index)

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
