#!/usr/bin/env swift

import Foundation

// MARK: - Configuration

let apiKey = "sk_64a2bd11ab472b1b051910c50ba0c0a9f57453ec302ff6e2"
let voiceId = "EXAVITQu4vr4xnSDxMaL" // Bella
let baseURL = "https://api.elevenlabs.io/v1"
let outputDir = "FlynnAAC/Resources/Audio"

// MARK: - Vocabulary Data

struct WordEntry {
    let id: String
    let english: String
    let bulgarian: String
}

// All vocabulary words from VocabularyStructure.swift
let vocabulary: [WordEntry] = [
    // Pronouns
    WordEntry(id: "i", english: "I", bulgarian: "аз"),
    WordEntry(id: "you", english: "you", bulgarian: "ти"),
    WordEntry(id: "he", english: "he", bulgarian: "той"),
    WordEntry(id: "she", english: "she", bulgarian: "тя"),
    WordEntry(id: "it", english: "it", bulgarian: "то"),
    WordEntry(id: "we", english: "we", bulgarian: "ние"),
    WordEntry(id: "they", english: "they", bulgarian: "те"),

    // Core Verbs
    WordEntry(id: "want", english: "want", bulgarian: "искам"),
    WordEntry(id: "like", english: "like", bulgarian: "харесвам"),
    WordEntry(id: "have", english: "have", bulgarian: "имам"),
    WordEntry(id: "need", english: "need", bulgarian: "трябва"),
    WordEntry(id: "go", english: "go", bulgarian: "отивам"),
    WordEntry(id: "get", english: "get", bulgarian: "вземам"),
    WordEntry(id: "help", english: "help", bulgarian: "помощ"),
    WordEntry(id: "make", english: "make", bulgarian: "правя"),
    WordEntry(id: "do", english: "do", bulgarian: "правя"),
    WordEntry(id: "put", english: "put", bulgarian: "слагам"),
    WordEntry(id: "see", english: "see", bulgarian: "виждам"),
    WordEntry(id: "eat", english: "eat", bulgarian: "ям"),
    WordEntry(id: "drink", english: "drink", bulgarian: "пия"),
    WordEntry(id: "play", english: "play", bulgarian: "играя"),

    // Social/Core
    WordEntry(id: "more", english: "more", bulgarian: "още"),
    WordEntry(id: "stop", english: "stop", bulgarian: "спирам"),
    WordEntry(id: "yes", english: "yes", bulgarian: "да"),
    WordEntry(id: "no", english: "no", bulgarian: "не"),
    WordEntry(id: "not", english: "not", bulgarian: "не"),
    WordEntry(id: "can", english: "can", bulgarian: "мога"),
    WordEntry(id: "done", english: "done", bulgarian: "готово"),

    // Prepositions
    WordEntry(id: "in", english: "in", bulgarian: "в"),
    WordEntry(id: "out", english: "out", bulgarian: "вън"),
    WordEntry(id: "on", english: "on", bulgarian: "на"),
    WordEntry(id: "off", english: "off", bulgarian: "от"),
    WordEntry(id: "up", english: "up", bulgarian: "горе"),
    WordEntry(id: "down", english: "down", bulgarian: "долу"),
    WordEntry(id: "here", english: "here", bulgarian: "тук"),

    // Describing
    WordEntry(id: "good", english: "good", bulgarian: "добър"),
    WordEntry(id: "bad", english: "bad", bulgarian: "лош"),
    WordEntry(id: "big", english: "big", bulgarian: "голям"),
    WordEntry(id: "little", english: "little", bulgarian: "малък"),
    WordEntry(id: "what", english: "what", bulgarian: "какво"),
    WordEntry(id: "where", english: "where", bulgarian: "къде"),
    WordEntry(id: "all", english: "all", bulgarian: "всичко"),

    // Food
    WordEntry(id: "apple", english: "apple", bulgarian: "ябълка"),
    WordEntry(id: "water", english: "water", bulgarian: "вода"),
    WordEntry(id: "milk", english: "milk", bulgarian: "мляко"),
    WordEntry(id: "bread", english: "bread", bulgarian: "хляб"),
    WordEntry(id: "juice", english: "juice", bulgarian: "сок"),
    WordEntry(id: "cookie", english: "cookie", bulgarian: "бисквита"),
    WordEntry(id: "banana", english: "banana", bulgarian: "банан"),
    WordEntry(id: "chicken", english: "chicken", bulgarian: "пиле"),
    WordEntry(id: "rice", english: "rice", bulgarian: "ориз"),
    WordEntry(id: "pizza", english: "pizza", bulgarian: "пица"),
    WordEntry(id: "cheese", english: "cheese", bulgarian: "сирене"),
    WordEntry(id: "egg", english: "egg", bulgarian: "яйце"),
    WordEntry(id: "sandwich", english: "sandwich", bulgarian: "сандвич"),
    WordEntry(id: "cereal", english: "cereal", bulgarian: "зърнена закуска"),
    WordEntry(id: "soup", english: "soup", bulgarian: "супа"),
    WordEntry(id: "food", english: "food", bulgarian: "храна"),

    // People
    WordEntry(id: "mom", english: "mom", bulgarian: "мама"),
    WordEntry(id: "dad", english: "dad", bulgarian: "татко"),
    WordEntry(id: "teacher", english: "teacher", bulgarian: "учител"),
    WordEntry(id: "friend", english: "friend", bulgarian: "приятел"),
    WordEntry(id: "baby", english: "baby", bulgarian: "бебе"),
    WordEntry(id: "doctor", english: "doctor", bulgarian: "лекар"),
    WordEntry(id: "grandma", english: "grandma", bulgarian: "баба"),
    WordEntry(id: "grandpa", english: "grandpa", bulgarian: "дядо"),
    WordEntry(id: "brother", english: "brother", bulgarian: "брат"),
    WordEntry(id: "sister", english: "sister", bulgarian: "сестра"),
    WordEntry(id: "family", english: "family", bulgarian: "семейство"),
    WordEntry(id: "boy", english: "boy", bulgarian: "момче"),
    WordEntry(id: "girl", english: "girl", bulgarian: "момиче"),

    // Places
    WordEntry(id: "home", english: "home", bulgarian: "вкъщи"),
    WordEntry(id: "school", english: "school", bulgarian: "училище"),
    WordEntry(id: "bathroom", english: "bathroom", bulgarian: "баня"),
    WordEntry(id: "outside", english: "outside", bulgarian: "навън"),
    WordEntry(id: "store", english: "store", bulgarian: "магазин"),
    WordEntry(id: "park", english: "park", bulgarian: "парк"),
    WordEntry(id: "bedroom", english: "bedroom", bulgarian: "спалня"),
    WordEntry(id: "kitchen", english: "kitchen", bulgarian: "кухня"),
    WordEntry(id: "car", english: "car", bulgarian: "кола"),
    WordEntry(id: "hospital", english: "hospital", bulgarian: "болница"),
    WordEntry(id: "playground", english: "playground", bulgarian: "площадка"),
    WordEntry(id: "restaurant", english: "restaurant", bulgarian: "ресторант"),

    // Things
    WordEntry(id: "toy", english: "toy", bulgarian: "играчка"),
    WordEntry(id: "book", english: "book", bulgarian: "книга"),
    WordEntry(id: "ball", english: "ball", bulgarian: "топка"),
    WordEntry(id: "phone", english: "phone", bulgarian: "телефон"),
    WordEntry(id: "bed", english: "bed", bulgarian: "легло"),
    WordEntry(id: "table", english: "table", bulgarian: "маса"),
    WordEntry(id: "chair", english: "chair", bulgarian: "стол"),
    WordEntry(id: "tv", english: "TV", bulgarian: "телевизор"),
    WordEntry(id: "computer", english: "computer", bulgarian: "компютър"),
    WordEntry(id: "clothes", english: "clothes", bulgarian: "дрехи"),
    WordEntry(id: "cup", english: "cup", bulgarian: "чаша"),
    WordEntry(id: "door", english: "door", bulgarian: "врата"),

    // Feelings
    WordEntry(id: "happy", english: "happy", bulgarian: "щастлив"),
    WordEntry(id: "sad", english: "sad", bulgarian: "тъжен"),
    WordEntry(id: "angry", english: "angry", bulgarian: "ядосан"),
    WordEntry(id: "tired", english: "tired", bulgarian: "уморен"),
    WordEntry(id: "scared", english: "scared", bulgarian: "уплашен"),
    WordEntry(id: "excited", english: "excited", bulgarian: "развълнуван"),
    WordEntry(id: "sick", english: "sick", bulgarian: "болен"),
    WordEntry(id: "hurt", english: "hurt", bulgarian: "наранен"),
    WordEntry(id: "hungry", english: "hungry", bulgarian: "гладен"),
    WordEntry(id: "thirsty", english: "thirsty", bulgarian: "жаден"),
    WordEntry(id: "love", english: "love", bulgarian: "обичам"),
    WordEntry(id: "surprised", english: "surprised", bulgarian: "изненадан"),

    // More Actions
    WordEntry(id: "run", english: "run", bulgarian: "тичам"),
    WordEntry(id: "walk", english: "walk", bulgarian: "ходя"),
    WordEntry(id: "jump", english: "jump", bulgarian: "скачам"),
    WordEntry(id: "sit", english: "sit", bulgarian: "седя"),
    WordEntry(id: "sleep", english: "sleep", bulgarian: "спя"),
    WordEntry(id: "read", english: "read", bulgarian: "чета"),
    WordEntry(id: "write", english: "write", bulgarian: "пиша"),
    WordEntry(id: "listen", english: "listen", bulgarian: "слушам"),
    WordEntry(id: "talk", english: "talk", bulgarian: "говоря"),
    WordEntry(id: "wait", english: "wait", bulgarian: "чакам"),
    WordEntry(id: "come", english: "come", bulgarian: "идвам"),
    WordEntry(id: "give", english: "give", bulgarian: "давам"),
    WordEntry(id: "take", english: "take", bulgarian: "вземам"),
    WordEntry(id: "open", english: "open", bulgarian: "отварям"),
    WordEntry(id: "turn", english: "turn", bulgarian: "завъртам"),

    // More Describing
    WordEntry(id: "hot", english: "hot", bulgarian: "горещ"),
    WordEntry(id: "cold", english: "cold", bulgarian: "студен"),
    WordEntry(id: "fast", english: "fast", bulgarian: "бърз"),
    WordEntry(id: "slow", english: "slow", bulgarian: "бавен"),
    WordEntry(id: "new", english: "new", bulgarian: "нов"),
    WordEntry(id: "old", english: "old", bulgarian: "стар"),
    WordEntry(id: "clean", english: "clean", bulgarian: "чист"),
    WordEntry(id: "dirty", english: "dirty", bulgarian: "мръсен"),
    WordEntry(id: "same", english: "same", bulgarian: "същият"),
    WordEntry(id: "different", english: "different", bulgarian: "различен"),
    WordEntry(id: "red", english: "red", bulgarian: "червен"),
    WordEntry(id: "blue", english: "blue", bulgarian: "син"),
    WordEntry(id: "green", english: "green", bulgarian: "зелен"),
    WordEntry(id: "yellow", english: "yellow", bulgarian: "жълт"),

    // Time
    WordEntry(id: "now", english: "now", bulgarian: "сега"),
    WordEntry(id: "later", english: "later", bulgarian: "по-късно"),
    WordEntry(id: "today", english: "today", bulgarian: "днес"),
    WordEntry(id: "tomorrow", english: "tomorrow", bulgarian: "утре"),
    WordEntry(id: "morning", english: "morning", bulgarian: "сутрин"),
    WordEntry(id: "night", english: "night", bulgarian: "нощ"),
    WordEntry(id: "before", english: "before", bulgarian: "преди"),
    WordEntry(id: "after", english: "after", bulgarian: "след"),
    WordEntry(id: "always", english: "always", bulgarian: "винаги"),
    WordEntry(id: "never", english: "never", bulgarian: "никога"),
    WordEntry(id: "again", english: "again", bulgarian: "отново"),
    WordEntry(id: "first", english: "first", bulgarian: "първо"),

    // Questions
    WordEntry(id: "who", english: "who", bulgarian: "кой"),
    WordEntry(id: "why", english: "why", bulgarian: "защо"),
    WordEntry(id: "how", english: "how", bulgarian: "как"),
    WordEntry(id: "when", english: "when", bulgarian: "кога"),
    WordEntry(id: "which", english: "which", bulgarian: "кой"),

    // Social
    WordEntry(id: "please", english: "please", bulgarian: "моля"),
    WordEntry(id: "thanks", english: "thank you", bulgarian: "благодаря"),
    WordEntry(id: "sorry", english: "sorry", bulgarian: "съжалявам"),
    WordEntry(id: "hello", english: "hello", bulgarian: "здравей"),
    WordEntry(id: "goodbye", english: "goodbye", bulgarian: "довиждане"),
    WordEntry(id: "my", english: "my", bulgarian: "мой"),
    WordEntry(id: "your", english: "your", bulgarian: "твой"),
    WordEntry(id: "this", english: "this", bulgarian: "това"),
    WordEntry(id: "that_thing", english: "that", bulgarian: "онова"),
]

// MARK: - API Functions

func generateAudio(text: String, outputPath: String) async throws {
    guard let url = URL(string: "\(baseURL)/text-to-speech/\(voiceId)") else {
        throw NSError(domain: "InvalidURL", code: 1)
    }

    var request = URLRequest(url: url)
    request.httpMethod = "POST"
    request.setValue("application/json", forHTTPHeaderField: "Content-Type")
    request.setValue(apiKey, forHTTPHeaderField: "xi-api-key")
    request.setValue("audio/mpeg", forHTTPHeaderField: "Accept")

    let body: [String: Any] = [
        "text": text,
        "model_id": "eleven_turbo_v2_5",
        "voice_settings": [
            "stability": 0.85,
            "similarity_boost": 0.3
        ]
    ]

    request.httpBody = try JSONSerialization.data(withJSONObject: body)

    let (data, response) = try await URLSession.shared.data(for: request)

    guard let httpResponse = response as? HTTPURLResponse, httpResponse.statusCode == 200 else {
        let message = String(data: data, encoding: .utf8) ?? "Unknown error"
        throw NSError(domain: "APIError", code: 2, userInfo: [NSLocalizedDescriptionKey: message])
    }

    try data.write(to: URL(fileURLWithPath: outputPath))
}

// MARK: - Main

func main() async {
    let fileManager = FileManager.default

    // Create output directories
    let enDir = "\(outputDir)/en"
    let bgDir = "\(outputDir)/bg"

    try? fileManager.createDirectory(atPath: enDir, withIntermediateDirectories: true)
    try? fileManager.createDirectory(atPath: bgDir, withIntermediateDirectories: true)

    var generated = 0
    var skipped = 0
    var failed = 0

    for word in vocabulary {
        // Generate English
        let enPath = "\(enDir)/\(word.id).mp3"
        if !fileManager.fileExists(atPath: enPath) {
            do {
                print("Generating EN: \(word.id) (\(word.english))...")
                try await generateAudio(text: word.english, outputPath: enPath)
                generated += 1
                // Rate limiting - wait 500ms between requests
                try await Task.sleep(nanoseconds: 500_000_000)
            } catch {
                print("  ERROR: \(error.localizedDescription)")
                failed += 1
            }
        } else {
            skipped += 1
        }

        // Generate Bulgarian
        let bgPath = "\(bgDir)/\(word.id).mp3"
        if !fileManager.fileExists(atPath: bgPath) {
            do {
                print("Generating BG: \(word.id) (\(word.bulgarian))...")
                try await generateAudio(text: word.bulgarian, outputPath: bgPath)
                generated += 1
                // Rate limiting
                try await Task.sleep(nanoseconds: 500_000_000)
            } catch {
                print("  ERROR: \(error.localizedDescription)")
                failed += 1
            }
        } else {
            skipped += 1
        }
    }

    print("\n=== Summary ===")
    print("Generated: \(generated)")
    print("Skipped (already exist): \(skipped)")
    print("Failed: \(failed)")
    print("Total words: \(vocabulary.count)")
}

// Run
await main()
