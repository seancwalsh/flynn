import AVFoundation
import Foundation

actor AudioService {
    private var audioPlayer: AVAudioPlayer?
    private let synthesizer = AVSpeechSynthesizer()

    init() {
        configureAudioSession()
    }

    private func configureAudioSession() {
        do {
            try AVAudioSession.sharedInstance().setCategory(.playback, mode: .default)
            try AVAudioSession.sharedInstance().setActive(true)
        } catch {
            print("Audio session configuration failed: \(error)")
        }
    }

    func play(symbol: Symbol, language: Language) async throws {
        let audioFile = symbol.audioFile(for: language)

        // Try cached audio file first
        if let url = Bundle.main.url(forResource: audioFile, withExtension: nil) {
            try await playAudioFile(at: url)
        } else {
            // Fallback to TTS
            await speakText(symbol.label(for: language), language: language)
        }
    }

    func speakPhrase(_ phrase: Phrase, language: Language) async {
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
}
