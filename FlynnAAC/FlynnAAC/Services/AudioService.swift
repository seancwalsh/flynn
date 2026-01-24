import AVFoundation
import Foundation

actor AudioService {
    private var audioPlayer: AVAudioPlayer?
    private let synthesizer = AVSpeechSynthesizer()

    // Test support properties
    private var _lastPlayedLanguage: Language?
    private var _offlineMode: Bool = false
    private var _onPlaybackStart: (() -> Void)?

    // Preloaded audio players for zero-latency playback
    private var cachedPlayers: [String: AVAudioPlayer] = [:]

    init() {
        configureAudioSession()
        preloadCommonAudio()
    }

    private func configureAudioSession() {
        do {
            // Use playback category with mixWithOthers option to play in silent mode
            try AVAudioSession.sharedInstance().setCategory(
                .playback,
                mode: .default,
                options: [.mixWithOthers]
            )
            try AVAudioSession.sharedInstance().setActive(true)
        } catch {
            print("Audio session configuration failed: \(error)")
        }
    }

    private func preloadCommonAudio() {
        // Preload common symbols for instant playback
        // This ensures sub-100ms latency for cached audio
        let commonSymbols = ["want", "go", "more", "help", "stop"]
        for symbolId in commonSymbols {
            for language in Language.allCases {
                let audioFile = "\(language.rawValue)/\(symbolId).mp3"
                if let url = Bundle.main.url(forResource: audioFile, withExtension: nil) {
                    if let player = try? AVAudioPlayer(contentsOf: url) {
                        player.prepareToPlay()
                        cachedPlayers["\(symbolId)-\(language.rawValue)"] = player
                    }
                }
            }
        }
    }

    func play(symbol: Symbol, language: Language) async throws {
        // Record language for testing
        _lastPlayedLanguage = language

        // Trigger playback callback before audio starts
        if let callback = _onPlaybackStart {
            callback()
        }

        let audioFile = symbol.audioFile(for: language)
        let cacheKey = "\(symbol.id)-\(language.rawValue)"

        // Try preloaded player first for instant playback
        if let cachedPlayer = cachedPlayers[cacheKey] {
            cachedPlayer.currentTime = 0 // Reset to beginning
            cachedPlayer.play()
            return
        }

        // Try loading from bundle (still fast, but not preloaded)
        if let url = Bundle.main.url(forResource: audioFile, withExtension: nil) {
            try await playAudioFile(at: url)
        } else {
            // Fallback to TTS
            await speakText(symbol.label(for: language), language: language)
        }
    }

    func speakPhrase(_ phrase: Phrase, language: Language) async {
        _lastPlayedLanguage = language
        let text = phrase.text(for: language)
        await speakText(text, language: language)
    }

    private func playAudioFile(at url: URL) async throws {
        audioPlayer = try AVAudioPlayer(contentsOf: url)
        audioPlayer?.prepareToPlay()
        audioPlayer?.play()
    }

    private func speakText(_ text: String, language: Language) async {
        let utterance = AVSpeechUtterance(string: text)
        utterance.voice = AVSpeechSynthesisVoice(identifier: language.voiceIdentifier)
            ?? AVSpeechSynthesisVoice(language: language.rawValue)
        utterance.rate = AVSpeechUtteranceDefaultSpeechRate
        synthesizer.speak(utterance)
    }

    func stop() {
        audioPlayer?.stop()
        synthesizer.stopSpeaking(at: .immediate)
    }

    // MARK: - Test Support

    var lastPlayedLanguage: Language? {
        get async { _lastPlayedLanguage }
    }

    func setOfflineMode(_ offline: Bool) async {
        _offlineMode = offline
    }

    func isAudioCached(for symbolId: String, language: Language) async -> Bool {
        let cacheKey = "\(symbolId)-\(language.rawValue)"
        return cachedPlayers[cacheKey] != nil
    }

    func setOnPlaybackStart(_ callback: @escaping () -> Void) async {
        _onPlaybackStart = callback
    }

    var playsInSilentMode: Bool {
        get async {
            // Verify playback category is configured correctly
            return AVAudioSession.sharedInstance().category == .playback
        }
    }
}
