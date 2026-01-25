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
    @State private var showSettings = false

    var body: some View {
        ZStack {
            // Background gradient that shows through glass effects
            LinearGradient(
                colors: [
                    Color(red: 0.95, green: 0.93, blue: 0.98),
                    Color(red: 0.92, green: 0.96, blue: 0.98),
                    Color(red: 0.96, green: 0.94, blue: 0.92)
                ],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
            .ignoresSafeArea()

            VStack(spacing: 0) {
                // Floating header with glass effect
                HeaderView(
                    currentLanguage: viewModel.currentLanguage,
                    onLanguageToggle: {
                        viewModel.toggleLanguage()
                    },
                    onSettingsTapped: {
                        showSettings = true
                    }
                )

                // Phrase bar with glass effect
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
                .padding(.horizontal, FlynnTheme.Layout.spacing12)
                .padding(.bottom, FlynnTheme.Layout.spacing8)

                // Symbol grid
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
        .sheet(isPresented: $showSettings) {
            SettingsView(settings: $viewModel.settings)
        }
    }
}

struct HeaderView: View {
    let currentLanguage: Language
    let onLanguageToggle: () -> Void
    let onSettingsTapped: () -> Void

    var body: some View {
        HStack {
            // Logo
            GlassEffectContainer {
                HStack(spacing: FlynnTheme.Layout.spacing4) {
                    Text("Flynn")
                        .font(.custom("Bradley Hand", size: 28))
                        .fontWeight(.bold)
                        .foregroundStyle(
                            LinearGradient(
                                colors: [
                                    Color(red: 0.36, green: 0.55, blue: 0.87),  // Soft blue
                                    Color(red: 0.58, green: 0.44, blue: 0.78)   // Soft purple
                                ],
                                startPoint: .leading,
                                endPoint: .trailing
                            )
                        )
                    Text("AAC")
                        .font(.system(size: 14, weight: .medium, design: .rounded))
                        .foregroundStyle(.secondary)
                }
                .padding(.horizontal, FlynnTheme.Layout.spacing12)
                .padding(.vertical, FlynnTheme.Layout.spacing6)
                .glassEffect(.regular, in: .capsule)
            }
            .padding(.leading, FlynnTheme.Layout.spacing16)
            .padding(.top, FlynnTheme.Layout.spacing8)

            Spacer()

            HStack(spacing: FlynnTheme.Layout.spacing8) {
                // Settings button
                GlassEffectContainer {
                    Button(action: onSettingsTapped) {
                        Image(systemName: "gearshape")
                            .font(.system(size: 16, weight: .medium))
                            .foregroundStyle(.primary)
                            .padding(FlynnTheme.Layout.spacing8)
                            .glassEffect(.regular.interactive(), in: .circle)
                    }
                    .buttonStyle(.plain)
                }

                // Language toggle
                GlassEffectContainer {
                    Button(action: onLanguageToggle) {
                        HStack(spacing: FlynnTheme.Layout.spacing8) {
                            Image(systemName: "globe")
                                .font(.system(size: 16, weight: .medium))

                            Text(currentLanguage == .english ? "EN" : "BG")
                                .font(.system(size: 15, weight: .semibold, design: .rounded))
                        }
                        .foregroundStyle(.primary)
                        .padding(.horizontal, FlynnTheme.Layout.spacing12)
                        .padding(.vertical, FlynnTheme.Layout.spacing8)
                        .glassEffect(.regular.interactive(), in: .capsule)
                    }
                    .buttonStyle(.plain)
                }
            }
            .padding(.trailing, FlynnTheme.Layout.spacing16)
            .padding(.top, FlynnTheme.Layout.spacing8)
        }
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
    @Published var settings: AppSettings

    /// Detect rapid tapping ("playing with" the app) and suppress it
    private let rapidTapDetector = RapidTapDetector()

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
        let loadedSettings = AppSettings.loadOrDefault()
        self.settings = loadedSettings
        self.currentLanguage = loadedSettings.language
    }

    // MARK: - Symbol Interaction

    func symbolTapped(_ symbol: Symbol) {
        guard rapidTapDetector.shouldAllowTap() else { return }

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

        // Auto-return to home if enabled and we're in a category
        if settings.autoReturnToHome && currentCategory != nil {
            currentCategory = nil
        }
    }

    /// Handle tapping a verb with a specific conjugated form
    func symbolTappedWithLabel(_ symbol: Symbol, label: String) {
        guard rapidTapDetector.shouldAllowTap() else { return }

        // Play audio for the conjugated form
        Task {
            // For Bulgarian verbs, the bundled audio contains the first person singular form
            // If the selected form matches, use the bundled audio for high-quality voice
            if currentLanguage == .bulgarian,
               let conjugation = VocabularyStructure.conjugation(for: symbol.id),
               label == conjugation.first_sg {
                // Use bundled ElevenLabs audio (it contains the first person form)
                try? await audioService.play(symbol: symbol, language: currentLanguage)
            } else {
                // Different conjugation form - fall back to TTS
                await audioService.speakText(label, language: currentLanguage)
            }
        }

        // Add to phrase with override label
        phraseItems.append(PhraseItem(symbol: symbol, overrideLabel: label))
        Task {
            await phraseEngine.addSymbol(symbol)
        }

        // Auto-return to home if enabled and we're in a category
        if settings.autoReturnToHome && currentCategory != nil {
            currentCategory = nil
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
            _ = Phrase(symbols: phraseSymbols)

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
