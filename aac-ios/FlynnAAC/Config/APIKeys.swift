import Foundation

enum APIKeys {
    /// ElevenLabs API key for text-to-speech
    ///
    /// To set up:
    /// 1. Get your API key from https://elevenlabs.io/app/settings/api-keys
    /// 2. Replace the empty string below with your key
    ///
    /// Example: static let elevenLabsKey: String? = "sk_abc123..."
    ///
    /// Note: For production apps, consider using environment variables,
    /// keychain storage, or a secure backend proxy instead of hardcoding.

    static let elevenLabsKey: String? = "sk_64a2bd11ab472b1b051910c50ba0c0a9f57453ec302ff6e2"
}
