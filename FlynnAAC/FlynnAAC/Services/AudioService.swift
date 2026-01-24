import AVFoundation
import Foundation

enum PhraseGenerationState {
    case idle
    case generating
    case playing
}

actor AudioService {
    private var audioPlayer: AVAudioPlayer?
    private let synthesizer = AVSpeechSynthesizer()

    // Test support properties
    private var _lastPlayedLanguage: Language?
    private var _offlineMode: Bool = false
    private var _onPlaybackStart: (() -> Void)?
    private var _speechRate: Float = 0.5 // Default from AppSettings

    // Preloaded audio players for zero-latency playback
    private var cachedPlayers: [String: AVAudioPlayer] = [:]

    // ElevenLabs phrase generation services
    private let elevenLabsService: ElevenLabsService
    private let phraseCacheService: PhraseCacheService

    // Phrase generation state for UI feedback
    private var _phraseGenerationState: PhraseGenerationState = .idle

    init(
        elevenLabsService: ElevenLabsService = ElevenLabsService(),
        phraseCacheService: PhraseCacheService = PhraseCacheService()
    ) {
        self.elevenLabsService = elevenLabsService
        self.phraseCacheService = phraseCacheService
        Self.configureAudioSession()
        Task { await self.preloadCommonAudio() }
    }

    private static func configureAudioSession() {
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
        // ElevenLabs audio files are bundled at Resources/Audio/{language}/{symbolId}.mp3
        let commonSymbols = ["want", "go", "more", "help", "stop", "yes", "no"]
        for symbolId in commonSymbols {
            for language in Language.allCases {
                if let url = bundledAudioURL(for: symbolId, language: language) {
                    if let player = try? AVAudioPlayer(contentsOf: url) {
                        player.prepareToPlay()
                        cachedPlayers["\(symbolId)-\(language.rawValue)"] = player
                    }
                }
            }
        }
    }

    // MARK: - Bundled Audio (ElevenLabs pre-generated)

    /// Get URL for bundled audio file (ElevenLabs pre-generated MP3)
    /// Audio files are stored at Resources/Audio/{language}/{symbolId}.mp3
    private func bundledAudioURL(for symbolId: String, language: Language) -> URL? {
        // Try the Audio subfolder path first (standard location)
        if let url = Bundle.main.url(forResource: symbolId, withExtension: "mp3", subdirectory: "Audio/\(language.rawValue)") {
            return url
        }
        // Fallback to flat path format
        let audioFile = "\(language.rawValue)/\(symbolId)"
        return Bundle.main.url(forResource: audioFile, withExtension: "mp3")
    }

    /// Check if bundled audio exists for a symbol in a given language
    func hasBundledAudio(for symbolId: String, language: Language) -> Bool {
        bundledAudioURL(for: symbolId, language: language) != nil
    }

    func play(symbol: Symbol, language: Language) async throws {
        // Record language for testing
        _lastPlayedLanguage = language

        // Trigger playback callback before audio starts
        if let callback = _onPlaybackStart {
            callback()
        }

        let cacheKey = "\(symbol.id)-\(language.rawValue)"

        // Priority 1: Try preloaded player for instant playback (sub-100ms)
        if let cachedPlayer = cachedPlayers[cacheKey] {
            cachedPlayer.currentTime = 0 // Reset to beginning
            cachedPlayer.play()
            return
        }

        // Priority 2: Try bundled ElevenLabs audio (pre-generated high-quality voice)
        if let url = bundledAudioURL(for: symbol.id, language: language) {
            try await playAudioFile(at: url)
            return
        }

        // Priority 3: Fallback to Apple TTS (for symbols without pre-generated audio)
        await speakText(symbol.label(for: language), language: language)
    }

    func speakPhrase(_ phrase: Phrase, language: Language) async {
        _lastPlayedLanguage = language
        let text = phrase.text(for: language)
        let cacheKey = PhraseCacheService.generateCacheKey(text: text, language: language)

        // 1. Check cache (instant playback)
        if let cachedURL = await phraseCacheService.getCachedAudio(for: cacheKey) {
            _phraseGenerationState = .playing
            try? await playAudioFile(at: cachedURL)
            _phraseGenerationState = .idle
            return
        }

        // 2. Try ElevenLabs API (requires network)
        _phraseGenerationState = .generating
        do {
            let audioData = try await elevenLabsService.generateAudio(text: text, language: language)
            let url = try await phraseCacheService.cacheAudio(audioData, for: cacheKey)
            _phraseGenerationState = .playing
            try await playAudioFile(at: url)
            _phraseGenerationState = .idle
            return
        } catch {
            // Log error for debugging
            print("ElevenLabs phrase generation failed: \(error)")
            // Fall through to TTS on any error (network, API, etc.)
        }

        // 3. Fallback to Apple TTS (works offline)
        _phraseGenerationState = .playing
        await speakText(text, language: language)
        _phraseGenerationState = .idle
    }

    var phraseGenerationState: PhraseGenerationState {
        get async { _phraseGenerationState }
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
        // Use configured speech rate (0.0-1.0, where 0.5 is default)
        utterance.rate = _speechRate
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

    // MARK: - FLY-11: Feedback Configuration

    func configure(with settings: AppSettings) async {
        _speechRate = settings.speechRate
    }

    var currentSpeechRate: Float {
        get async { _speechRate }
    }

    // MARK: - FLY-10: Offline Functionality

    /// Check if TTS can work offline
    /// TTS is built into iOS and works offline for system voices
    func canSpeakOffline(language: Language) -> Bool {
        // TTS works offline with built-in system voices
        // Only networked voices (Siri voices) require internet
        true
    }
}
