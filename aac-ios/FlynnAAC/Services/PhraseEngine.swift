import Foundation

actor PhraseEngine {
    private(set) var currentPhrase: Phrase = Phrase()
    private let audioService: AudioService
    private var offlineMode: Bool = false

    init(audioService: AudioService = AudioService()) {
        self.audioService = audioService
    }

    func addSymbol(_ symbol: Symbol) {
        currentPhrase.append(symbol)
    }

    func removeSymbol(at index: Int) {
        currentPhrase.remove(at: index)
    }

    func clear() {
        currentPhrase.clear()
    }

    func speak(language: Language) async {
        guard !currentPhrase.isEmpty else { return }
        await audioService.speakPhrase(currentPhrase, language: language)
    }

    func getSymbols() -> [Symbol] {
        currentPhrase.symbols
    }

    var isEmpty: Bool {
        currentPhrase.isEmpty
    }

    // MARK: - FLY-10: Offline Functionality

    /// Enable/disable offline mode
    func setOfflineMode(_ offline: Bool) {
        offlineMode = offline
    }

    /// Check if can speak offline
    /// Phrase speaking works offline via TTS
    func canSpeakOffline() -> Bool {
        // TTS is always available offline
        true
    }
}
