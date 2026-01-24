import Foundation

actor PhraseEngine {
    private(set) var currentPhrase: Phrase = Phrase()
    private let audioService: AudioService

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
}
