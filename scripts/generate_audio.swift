#!/usr/bin/env swift

import Foundation

// MARK: - Models

struct SymbolManifest: Codable {
    let version: String
    let description: String
    let voiceSettings: VoiceSettings
    let symbols: [SymbolEntry]
}

struct VoiceSettings: Codable {
    let voiceId: String
    let voiceName: String
    let modelId: String
    let stability: Double
    let similarityBoost: Double
}

struct SymbolEntry: Codable {
    let id: String
    let labels: [String: String]
}

struct ElevenLabsRequest: Codable {
    let text: String
    let model_id: String
    let voice_settings: ElevenLabsVoiceSettings
}

struct ElevenLabsVoiceSettings: Codable {
    let stability: Double
    let similarity_boost: Double
}

// MARK: - Configuration

let languages = ["en", "bg"]
let projectRoot = FileManager.default.currentDirectoryPath
let manifestPath = "\(projectRoot)/FlynnAAC/FlynnAAC/Resources/symbol_manifest.json"
let audioOutputBase = "\(projectRoot)/FlynnAAC/FlynnAAC/Resources/Audio"

// MARK: - Command Line Arguments

var forceRegenerate = false
var specificSymbol: String? = nil
var specificLanguage: String? = nil

var args = CommandLine.arguments.dropFirst()
while let arg = args.popFirst() {
    switch arg {
    case "--force":
        forceRegenerate = true
    case "--symbol":
        specificSymbol = args.popFirst()
    case "--language":
        specificLanguage = args.popFirst()
    case "--help":
        print("""
        Usage: generate_audio.swift [options]

        Options:
          --force           Regenerate all audio files even if they exist
          --symbol <id>     Generate audio for specific symbol only
          --language <lang> Generate audio for specific language only (en, bg)
          --help            Show this help message

        Environment:
          ELEVENLABS_API_KEY  Required API key for ElevenLabs

        Examples:
          ./generate_audio.swift                    # Generate missing audio
          ./generate_audio.swift --force            # Regenerate all audio
          ./generate_audio.swift --symbol want     # Generate only 'want' symbol
          ./generate_audio.swift --language en     # Generate only English audio
        """)
        exit(0)
    default:
        print("Unknown argument: \(arg)")
        exit(1)
    }
}

// MARK: - API Key

guard let apiKey = ProcessInfo.processInfo.environment["ELEVENLABS_API_KEY"] else {
    print("Error: ELEVENLABS_API_KEY environment variable not set")
    print("Usage: export ELEVENLABS_API_KEY='your_key_here'")
    exit(1)
}

// MARK: - Load Manifest

func loadManifest() throws -> SymbolManifest {
    let url = URL(fileURLWithPath: manifestPath)
    let data = try Data(contentsOf: url)
    return try JSONDecoder().decode(SymbolManifest.self, from: data)
}

// MARK: - Generate Audio

func generateAudio(text: String, voiceId: String, settings: VoiceSettings) throws -> Data {
    let url = URL(string: "https://api.elevenlabs.io/v1/text-to-speech/\(voiceId)")!
    var request = URLRequest(url: url)
    request.httpMethod = "POST"
    request.setValue("application/json", forHTTPHeaderField: "Content-Type")
    request.setValue("audio/mpeg", forHTTPHeaderField: "Accept")
    request.setValue(apiKey, forHTTPHeaderField: "xi-api-key")

    let requestBody = ElevenLabsRequest(
        text: text,
        model_id: settings.modelId,
        voice_settings: ElevenLabsVoiceSettings(
            stability: settings.stability,
            similarity_boost: settings.similarityBoost
        )
    )

    request.httpBody = try JSONEncoder().encode(requestBody)

    let semaphore = DispatchSemaphore(value: 0)
    var responseData: Data?
    var responseError: Error?
    var httpResponse: HTTPURLResponse?

    let task = URLSession.shared.dataTask(with: request) { data, response, error in
        responseData = data
        responseError = error
        httpResponse = response as? HTTPURLResponse
        semaphore.signal()
    }
    task.resume()
    semaphore.wait()

    if let error = responseError {
        throw error
    }

    guard let response = httpResponse else {
        throw NSError(domain: "AudioGeneration", code: -1, userInfo: [NSLocalizedDescriptionKey: "No response"])
    }

    guard response.statusCode == 200 else {
        let errorBody = responseData.flatMap { String(data: $0, encoding: .utf8) } ?? "Unknown error"
        throw NSError(domain: "AudioGeneration", code: response.statusCode,
                      userInfo: [NSLocalizedDescriptionKey: "API error (\(response.statusCode)): \(errorBody)"])
    }

    guard let data = responseData else {
        throw NSError(domain: "AudioGeneration", code: -1, userInfo: [NSLocalizedDescriptionKey: "No data"])
    }

    return data
}

func saveAudio(data: Data, symbolId: String, language: String) throws {
    let dirPath = "\(audioOutputBase)/\(language)"
    let filePath = "\(dirPath)/\(symbolId).mp3"

    // Create directory if needed
    try FileManager.default.createDirectory(atPath: dirPath, withIntermediateDirectories: true)

    // Write file
    try data.write(to: URL(fileURLWithPath: filePath))
}

func audioExists(symbolId: String, language: String) -> Bool {
    let filePath = "\(audioOutputBase)/\(language)/\(symbolId).mp3"
    return FileManager.default.fileExists(atPath: filePath)
}

// MARK: - Main

func main() {
    print("ElevenLabs Audio Generator")
    print("==========================")
    print("")

    // Load manifest
    let manifest: SymbolManifest
    do {
        manifest = try loadManifest()
        print("Loaded manifest: \(manifest.symbols.count) symbols")
        print("Voice: \(manifest.voiceSettings.voiceName) (\(manifest.voiceSettings.voiceId))")
        print("")
    } catch {
        print("Error loading manifest: \(error)")
        exit(1)
    }

    // Filter symbols and languages
    let symbolsToProcess = manifest.symbols.filter { symbol in
        specificSymbol == nil || symbol.id == specificSymbol
    }

    let languagesToProcess = languages.filter { lang in
        specificLanguage == nil || lang == specificLanguage
    }

    var generated = 0
    var skipped = 0
    var failed = 0

    for symbol in symbolsToProcess {
        for language in languagesToProcess {
            guard let text = symbol.labels[language] else {
                print("  [\(symbol.id)] No label for \(language), skipping")
                continue
            }

            let outputPath = "\(language)/\(symbol.id).mp3"

            // Check if file exists
            if !forceRegenerate && audioExists(symbolId: symbol.id, language: language) {
                print("  [\(symbol.id)] \(outputPath) exists, skipping")
                skipped += 1
                continue
            }

            print("  [\(symbol.id)] Generating \(outputPath) for '\(text)'...", terminator: "")
            fflush(stdout)

            do {
                let audioData = try generateAudio(
                    text: text,
                    voiceId: manifest.voiceSettings.voiceId,
                    settings: manifest.voiceSettings
                )
                try saveAudio(data: audioData, symbolId: symbol.id, language: language)
                print(" done (\(audioData.count) bytes)")
                generated += 1

                // Rate limiting - ElevenLabs has limits
                Thread.sleep(forTimeInterval: 0.5)
            } catch {
                print(" FAILED: \(error.localizedDescription)")
                failed += 1
            }
        }
    }

    print("")
    print("Summary:")
    print("  Generated: \(generated)")
    print("  Skipped: \(skipped)")
    print("  Failed: \(failed)")

    if failed > 0 {
        exit(1)
    }
}

main()
