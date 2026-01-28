import SwiftUI

struct ARASAACImageView: View {
    let symbolId: String

    @State private var image: UIImage?
    @State private var isLoading = true
    @State private var loadFailed = false

    var body: some View {
        Group {
            if let image = image {
                Image(uiImage: image)
                    .resizable()
                    .aspectRatio(contentMode: .fit)
            } else if isLoading {
                ProgressView()
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else {
                // Fallback to SF Symbol
                Image(systemName: SymbolCell.sfSymbolMapping[symbolId] ?? "questionmark.circle")
                    .resizable()
                    .aspectRatio(contentMode: .fit)
                    .foregroundStyle(loadFailed ? FlynnTheme.Colors.textTertiary : FlynnTheme.Colors.textSecondary)
            }
        }
        .task {
            await loadImage()
        }
    }

    private func loadImage() async {
        // Check cache first
        if let cachedPath = await ARASAACService.shared.getCachedImagePath(for: symbolId),
           let cachedImage = UIImage(contentsOfFile: cachedPath.path) {
            self.image = cachedImage
            self.isLoading = false
            return
        }

        // Download from ARASAAC
        do {
            let imagePath = try await ARASAACService.shared.downloadPictogram(for: symbolId)
            if let downloadedImage = UIImage(contentsOfFile: imagePath.path) {
                self.image = downloadedImage
            } else {
                // Image file exists but couldn't be loaded
                self.loadFailed = true
                await reportLoadError()
            }
        } catch {
            print("Failed to load ARASAAC pictogram for \(symbolId): \(error)")
            self.loadFailed = true
            await reportLoadError()
        }

        self.isLoading = false
    }
    
    @MainActor
    private func reportLoadError() {
        // Report to error notification service
        // Use a slight delay to avoid showing errors for every cell during initial load
        Task {
            try? await Task.sleep(nanoseconds: 500_000_000) // 0.5s delay
            ErrorNotificationService.shared.reportImageLoadFailed(symbolId: symbolId)
        }
    }
}
