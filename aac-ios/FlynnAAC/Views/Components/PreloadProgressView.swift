import SwiftUI

/// Full-screen progress view shown during initial image preload
struct PreloadProgressView: View {
    @ObservedObject var preloadService = ImagePreloadService.shared
    let onComplete: () -> Void
    
    var body: some View {
        ZStack {
            // Background gradient
            LinearGradient(
                colors: [
                    Color(red: 0.95, green: 0.93, blue: 0.98),
                    Color(red: 0.92, green: 0.96, blue: 0.98),
                    Color(red: 0.96, green: 0.94, blue: 0.92)
                ],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
            .ignoresSafeArea()
            
            VStack(spacing: 32) {
                Spacer()
                
                // Logo
                VStack(spacing: 8) {
                    Text("Flynn")
                        .font(.custom("Bradley Hand", size: 56))
                        .fontWeight(.bold)
                        .foregroundStyle(
                            LinearGradient(
                                colors: [
                                    Color(red: 0.36, green: 0.55, blue: 0.87),
                                    Color(red: 0.58, green: 0.44, blue: 0.78)
                                ],
                                startPoint: .leading,
                                endPoint: .trailing
                            )
                        )
                    
                    Text("AAC")
                        .font(.system(size: 18, weight: .medium, design: .rounded))
                        .foregroundStyle(.secondary)
                }
                
                // Progress section
                VStack(spacing: 16) {
                    // Status text
                    Text(statusText)
                        .font(.system(size: 16, weight: .medium))
                        .foregroundStyle(.secondary)
                        .animation(.easeInOut, value: preloadService.isPreloading)
                    
                    // Progress bar
                    VStack(spacing: 8) {
                        GeometryReader { geometry in
                            ZStack(alignment: .leading) {
                                // Background track
                                RoundedRectangle(cornerRadius: 8)
                                    .fill(Color.gray.opacity(0.2))
                                
                                // Progress fill
                                RoundedRectangle(cornerRadius: 8)
                                    .fill(
                                        LinearGradient(
                                            colors: [
                                                Color(red: 0.36, green: 0.55, blue: 0.87),
                                                Color(red: 0.58, green: 0.44, blue: 0.78)
                                            ],
                                            startPoint: .leading,
                                            endPoint: .trailing
                                        )
                                    )
                                    .frame(width: geometry.size.width * preloadService.progress)
                                    .animation(.spring(response: 0.3), value: preloadService.progress)
                            }
                        }
                        .frame(height: 12)
                        
                        // Count text
                        if preloadService.isPreloading {
                            Text("\(preloadService.loadedCount) / \(preloadService.totalCount) images")
                                .font(.system(size: 12, design: .monospaced))
                                .foregroundStyle(.tertiary)
                        }
                    }
                    .frame(width: 280)
                }
                .padding(.vertical, 24)
                .padding(.horizontal, 32)
                .background(
                    RoundedRectangle(cornerRadius: 20)
                        .fill(.ultraThinMaterial)
                )
                
                Spacer()
                Spacer()
            }
            .padding()
        }
        .task {
            await preloadService.startPreload()
            // Small delay to show completion
            try? await Task.sleep(nanoseconds: 500_000_000)
            onComplete()
        }
    }
    
    private var statusText: String {
        if preloadService.preloadComplete {
            return "Ready to communicate! ✨"
        } else if preloadService.isPreloading {
            return "Loading symbols..."
        } else {
            return "Preparing..."
        }
    }
}

/// View modifier to show preload screen on first launch
struct PreloadOnFirstLaunchModifier: ViewModifier {
    @StateObject private var preloadService = ImagePreloadService.shared
    @State private var showMainContent = false
    
    func body(content: Content) -> some View {
        ZStack {
            if showMainContent || preloadService.preloadComplete {
                content
                    .transition(.opacity)
            } else {
                PreloadProgressView {
                    withAnimation(.easeInOut(duration: 0.5)) {
                        showMainContent = true
                    }
                }
                .transition(.opacity)
            }
        }
        .animation(.easeInOut(duration: 0.5), value: showMainContent)
        .onAppear {
            // If already preloaded, show main content immediately
            if preloadService.preloadComplete {
                showMainContent = true
            }
        }
    }
}

extension View {
    /// Shows preload progress on first launch, then transitions to main content
    func preloadOnFirstLaunch() -> some View {
        modifier(PreloadOnFirstLaunchModifier())
    }
}

// MARK: - Preview

#Preview("Preload Progress") {
    PreloadProgressView(onComplete: {})
}
