import SwiftUI

/// Non-blocking error notification banner
///
/// Displays at the top of the screen with slide-in animation.
/// Auto-dismisses after 5 seconds or can be manually dismissed.
struct ErrorBanner: View {
    @ObservedObject var errorService = ErrorNotificationService.shared
    
    var body: some View {
        VStack {
            if let notification = errorService.currentNotification {
                ErrorBannerContent(
                    notification: notification,
                    onDismiss: { errorService.dismiss() }
                )
                .transition(.move(edge: .top).combined(with: .opacity))
                .zIndex(100)
            }
            Spacer()
        }
        .animation(.spring(response: 0.3, dampingFraction: 0.7), value: errorService.currentNotification)
    }
}

/// The actual banner content
struct ErrorBannerContent: View {
    let notification: ErrorNotification
    let onDismiss: () -> Void
    
    @State private var offset: CGFloat = 0
    @GestureState private var dragOffset: CGFloat = 0
    
    private var error: AppError { notification.error }
    
    var body: some View {
        HStack(spacing: 12) {
            // Icon
            Image(systemName: error.icon)
                .font(.system(size: 20, weight: .medium))
                .foregroundStyle(error.severity.color)
                .frame(width: 28)
            
            // Text
            VStack(alignment: .leading, spacing: 2) {
                Text(error.title)
                    .font(.system(size: 14, weight: .semibold))
                    .foregroundStyle(.primary)
                
                Text(error.message)
                    .font(.system(size: 12))
                    .foregroundStyle(.secondary)
                    .lineLimit(2)
            }
            
            Spacer()
            
            // Dismiss button
            Button(action: onDismiss) {
                Image(systemName: "xmark")
                    .font(.system(size: 12, weight: .medium))
                    .foregroundStyle(.secondary)
                    .frame(width: 24, height: 24)
                    .background(
                        Circle()
                            .fill(Color.gray.opacity(0.15))
                    )
            }
            .buttonStyle(.plain)
            .accessibilityLabel("Dismiss notification")
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 12)
        .background(
            RoundedRectangle(cornerRadius: 14)
                .fill(.ultraThinMaterial)
                .shadow(color: .black.opacity(0.1), radius: 8, x: 0, y: 4)
        )
        .overlay(
            RoundedRectangle(cornerRadius: 14)
                .stroke(error.severity.color.opacity(0.3), lineWidth: 1)
        )
        .padding(.horizontal, 16)
        .padding(.top, 8)
        .offset(y: offset + dragOffset)
        .gesture(
            DragGesture()
                .updating($dragOffset) { value, state, _ in
                    if value.translation.height < 0 {
                        state = value.translation.height
                    }
                }
                .onEnded { value in
                    if value.translation.height < -50 {
                        onDismiss()
                    }
                }
        )
        // Accessibility
        .accessibilityElement(children: .combine)
        .accessibilityLabel("\(error.title): \(error.message)")
        .accessibilityHint("Swipe up or double tap to dismiss")
        .accessibilityAddTraits(.isButton)
        .onTapGesture(count: 2) {
            onDismiss()
        }
    }
}

/// View modifier to add error banner to any view
struct ErrorBannerModifier: ViewModifier {
    func body(content: Content) -> some View {
        ZStack {
            content
            ErrorBanner()
        }
    }
}

extension View {
    /// Adds an error banner overlay to the view
    func withErrorBanner() -> some View {
        modifier(ErrorBannerModifier())
    }
}

// MARK: - Preview

#Preview("Error Banner") {
    VStack {
        Button("Show Image Error") {
            ErrorNotificationService.shared.show(.imageLoadFailed(symbolId: "water"))
        }
        
        Button("Show Audio Fallback") {
            ErrorNotificationService.shared.show(.audioFallback(reason: "Using system voice instead of ElevenLabs"))
        }
        
        Button("Show Network Error") {
            ErrorNotificationService.shared.show(.networkUnavailable)
        }
        
        Spacer()
    }
    .padding()
    .withErrorBanner()
}
