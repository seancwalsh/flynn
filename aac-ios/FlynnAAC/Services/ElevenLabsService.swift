import Foundation

enum ElevenLabsError: Error {
    case invalidURL
    case noAPIKey
    case networkError(Error)
    case invalidResponse
    case apiError(statusCode: Int, message: String)
    case noAudioData
}

actor ElevenLabsService {
    private let voiceId = "EXAVITQu4vr4xnSDxMaL" // Bella - warm, natural voice
    private let baseURL = "https://api.elevenlabs.io/v1"
    private let apiKeyProvider: () -> String?

    init(apiKeyProvider: @escaping () -> String? = { APIKeys.elevenLabsKey }) {
        self.apiKeyProvider = apiKeyProvider
    }

    func generateAudio(text: String, language: Language) async throws -> Data {
        guard let apiKey = apiKeyProvider(), !apiKey.isEmpty else {
            throw ElevenLabsError.noAPIKey
        }

        guard let url = URL(string: "\(baseURL)/text-to-speech/\(voiceId)") else {
            throw ElevenLabsError.invalidURL
        }

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue(apiKey, forHTTPHeaderField: "xi-api-key")
        request.setValue("audio/mpeg", forHTTPHeaderField: "Accept")

        let body: [String: Any] = [
            "text": text,
            "model_id": "eleven_turbo_v2_5",  // Faster model, often cleaner output
            "voice_settings": [
                "stability": 0.85,         // High stability for clean, consistent speech
                "similarity_boost": 0.3    // Low to minimize artifacts
            ]
        ]

        request.httpBody = try JSONSerialization.data(withJSONObject: body)

        let (data, response): (Data, URLResponse)
        do {
            (data, response) = try await URLSession.shared.data(for: request)
        } catch {
            throw ElevenLabsError.networkError(error)
        }

        guard let httpResponse = response as? HTTPURLResponse else {
            throw ElevenLabsError.invalidResponse
        }

        guard httpResponse.statusCode == 200 else {
            let message = String(data: data, encoding: .utf8) ?? "Unknown error"
            throw ElevenLabsError.apiError(statusCode: httpResponse.statusCode, message: message)
        }

        guard !data.isEmpty else {
            throw ElevenLabsError.noAudioData
        }

        return data
    }

    func getCacheKey(text: String, language: Language) -> String {
        PhraseCacheService.generateCacheKey(text: text, language: language)
    }
}
