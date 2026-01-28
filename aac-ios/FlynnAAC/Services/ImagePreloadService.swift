import Foundation
import SwiftUI

/// Service to preload all ARASAAC images on first launch
/// Prevents loading delays when using the app for the first time
@MainActor
final class ImagePreloadService: ObservableObject {
    static let shared = ImagePreloadService()
    
    // Preload state
    @Published private(set) var isPreloading = false
    @Published private(set) var progress: Double = 0
    @Published private(set) var loadedCount: Int = 0
    @Published private(set) var totalCount: Int = 0
    @Published private(set) var failedCount: Int = 0
    @Published private(set) var preloadComplete = false
    
    // UserDefaults keys
    private let preloadCompletedKey = "arasaac_preload_completed"
    private let preloadVersionKey = "arasaac_preload_version"
    private let currentPreloadVersion = 1 // Increment when vocabulary changes
    
    private init() {
        // Check if preload was already completed for this version
        let storedVersion = UserDefaults.standard.integer(forKey: preloadVersionKey)
        preloadComplete = UserDefaults.standard.bool(forKey: preloadCompletedKey) && storedVersion == currentPreloadVersion
    }
    
    /// Check if preload is needed
    var needsPreload: Bool {
        !preloadComplete && !isPreloading
    }
    
    /// Start preloading all vocabulary images
    func startPreload() async {
        guard needsPreload else { return }
        
        isPreloading = true
        progress = 0
        loadedCount = 0
        failedCount = 0
        
        // Get all symbol IDs that need images
        let allSymbolIds = getAllSymbolIds()
        totalCount = allSymbolIds.count
        
        // Preload in batches for better performance
        let batchSize = 10
        let batches = stride(from: 0, to: allSymbolIds.count, by: batchSize).map {
            Array(allSymbolIds[$0..<min($0 + batchSize, allSymbolIds.count)])
        }
        
        for batch in batches {
            await withTaskGroup(of: Bool.self) { group in
                for symbolId in batch {
                    group.addTask {
                        await self.preloadImage(for: symbolId)
                    }
                }
                
                for await success in group {
                    await MainActor.run {
                        loadedCount += 1
                        if !success {
                            failedCount += 1
                        }
                        progress = Double(loadedCount) / Double(totalCount)
                    }
                }
            }
        }
        
        // Mark as complete
        preloadComplete = true
        isPreloading = false
        
        // Persist completion status
        UserDefaults.standard.set(true, forKey: preloadCompletedKey)
        UserDefaults.standard.set(currentPreloadVersion, forKey: preloadVersionKey)
        
        print("✅ Image preload complete: \(loadedCount - failedCount)/\(totalCount) succeeded, \(failedCount) failed")
    }
    
    /// Preload a single image
    private func preloadImage(for symbolId: String) async -> Bool {
        do {
            _ = try await ARASAACService.shared.downloadPictogram(for: symbolId)
            return true
        } catch {
            // Log but don't fail - image will be loaded on demand
            print("⚠️ Failed to preload image for \(symbolId): \(error)")
            return false
        }
    }
    
    /// Get all symbol IDs from vocabulary structure
    private func getAllSymbolIds() -> [String] {
        var symbolIds: Set<String> = []
        
        // Add core words
        for symbol in VocabularyStructure.coreWords {
            symbolIds.insert(symbol.id)
        }
        
        // Add all symbols from category folders (recursively)
        func collectSymbols(from category: Category) {
            for symbol in category.symbols {
                symbolIds.insert(symbol.id)
            }
            for subcategory in category.subcategories {
                collectSymbols(from: subcategory)
            }
        }
        
        for category in VocabularyStructure.categoryFolders {
            collectSymbols(from: category)
        }
        
        // Only include symbols that have ARASAAC mappings
        return Array(symbolIds).filter { VocabularyStructure.arasaacMapping[$0] != nil }
    }
    
    /// Reset preload state (for testing or manual refresh)
    func resetPreload() {
        UserDefaults.standard.removeObject(forKey: preloadCompletedKey)
        UserDefaults.standard.removeObject(forKey: preloadVersionKey)
        preloadComplete = false
        progress = 0
        loadedCount = 0
        failedCount = 0
    }
    
    /// Refresh images (re-download all, even if cached)
    func refreshImages() async {
        // Clear cache first
        try? await ARASAACService.shared.clearCache()
        resetPreload()
        await startPreload()
    }
}
