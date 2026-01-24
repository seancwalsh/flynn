import Foundation
import SwiftUI

actor ARASAACService {
    static let shared = ARASAACService()

    private let baseURL = "https://api.arasaac.org/api"
    private let cacheDirectory: URL
    private let fileManager = FileManager.default

    // Mapping of app symbol IDs to ARASAAC pictogram IDs
    // Find IDs at: https://arasaac.org/pictograms/search
    private let pictogramMapping: [String: Int] = [
        // Core communication
        "want": 5441,      // want
        "more": 5508,      // more
        "help": 32648,     // help
        "stop": 7196,      // stop
        "yes": 5584,       // yes
        "no": 5526,        // no

        // Food category
        "food": 4610,      // food
        "apple": 2462,     // apple
        "water": 2816,     // water
        "milk": 2445,      // milk

        // Common actions
        "go": 6483,        // go
        "eat": 2397,       // eat
        "drink": 2393,     // drink
        "play": 3281,      // play
        "sleep": 4641,     // sleep
        "bathroom": 2500,  // bathroom

        // People
        "mom": 2471,       // mom
        "dad": 2472,       // dad
        "me": 6631,        // me
        "you": 6668,       // you

        // Feelings
        "happy": 4618,     // happy
        "sad": 4619,       // sad
        "angry": 4609,     // angry
        "tired": 4626,     // tired
        "hurt": 4608,      // hurt

        // Places
        "home": 2499,      // home
        "school": 2649,    // school
        "outside": 4813    // outside
    ]

    init() {
        let cachesURL = fileManager.urls(for: .cachesDirectory, in: .userDomainMask).first!
        cacheDirectory = cachesURL.appendingPathComponent("ARASAACPictograms", isDirectory: true)

        if !fileManager.fileExists(atPath: cacheDirectory.path) {
            try? fileManager.createDirectory(at: cacheDirectory, withIntermediateDirectories: true)
        }
    }

    /// Get ARASAAC pictogram ID for a symbol
    func getPictogramId(for symbolId: String) -> Int? {
        pictogramMapping[symbolId]
    }

    /// Get the URL for a pictogram image
    func getPictogramURL(for symbolId: String) -> URL? {
        guard let pictogramId = pictogramMapping[symbolId] else { return nil }
        return URL(string: "\(baseURL)/pictograms/\(pictogramId)?download=false")
    }

    /// Get cached image path if available
    func getCachedImagePath(for symbolId: String) -> URL? {
        guard let pictogramId = pictogramMapping[symbolId] else { return nil }
        let filePath = cacheDirectory.appendingPathComponent("\(pictogramId).png")
        if fileManager.fileExists(atPath: filePath.path) {
            return filePath
        }
        return nil
    }

    /// Download and cache a pictogram
    func downloadPictogram(for symbolId: String) async throws -> URL {
        guard let pictogramId = pictogramMapping[symbolId] else {
            throw ARASAACError.unknownSymbol
        }

        // Check cache first
        let filePath = cacheDirectory.appendingPathComponent("\(pictogramId).png")
        if fileManager.fileExists(atPath: filePath.path) {
            return filePath
        }

        // Download from ARASAAC
        guard let url = URL(string: "\(baseURL)/pictograms/\(pictogramId)?download=false") else {
            throw ARASAACError.invalidURL
        }

        let (data, response) = try await URLSession.shared.data(from: url)

        guard let httpResponse = response as? HTTPURLResponse,
              httpResponse.statusCode == 200 else {
            throw ARASAACError.downloadFailed
        }

        // Save to cache
        try data.write(to: filePath)
        return filePath
    }

    /// Preload all mapped pictograms
    func preloadAllPictograms() async {
        for symbolId in pictogramMapping.keys {
            try? await downloadPictogram(for: symbolId)
        }
    }

    /// Clear the pictogram cache
    func clearCache() throws {
        let contents = try fileManager.contentsOfDirectory(at: cacheDirectory, includingPropertiesForKeys: nil)
        for file in contents {
            try fileManager.removeItem(at: file)
        }
    }
}

enum ARASAACError: Error {
    case unknownSymbol
    case invalidURL
    case downloadFailed
}
