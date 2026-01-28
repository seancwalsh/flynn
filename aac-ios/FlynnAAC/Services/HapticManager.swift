import UIKit
import SwiftUI

/// Centralized haptic feedback manager for consistent tactile feedback throughout the app
/// 
/// Usage:
/// ```swift
/// HapticManager.shared.symbolTapped()
/// HapticManager.shared.phraseSpoken()
/// ```
final class HapticManager {
    static let shared = HapticManager()
    
    // Pre-initialized generators for performance
    private let lightGenerator = UIImpactFeedbackGenerator(style: .light)
    private let mediumGenerator = UIImpactFeedbackGenerator(style: .medium)
    private let heavyGenerator = UIImpactFeedbackGenerator(style: .heavy)
    private let notificationGenerator = UINotificationFeedbackGenerator()
    private let selectionGenerator = UISelectionFeedbackGenerator()
    
    private init() {
        // Prepare generators on init for faster first response
        prepareGenerators()
    }
    
    /// Prepare generators for immediate feedback (call before expected interaction)
    func prepareGenerators() {
        lightGenerator.prepare()
        mediumGenerator.prepare()
        notificationGenerator.prepare()
        selectionGenerator.prepare()
    }
    
    // MARK: - Symbol Interaction Haptics
    
    /// Medium impact for symbol taps - primary interaction
    func symbolTapped() {
        mediumGenerator.impactOccurred()
        mediumGenerator.prepare() // Prepare for next tap
    }
    
    /// Light impact for category navigation
    func categoryTapped() {
        lightGenerator.impactOccurred()
        lightGenerator.prepare()
    }
    
    /// Selection feedback for long press initiation
    func longPressStarted() {
        selectionGenerator.selectionChanged()
    }
    
    // MARK: - Phrase Bar Haptics
    
    /// Success notification when phrase is spoken
    func phraseSpoken() {
        notificationGenerator.notificationOccurred(.success)
        notificationGenerator.prepare()
    }
    
    /// Light impact when clearing phrase bar
    func phraseClear() {
        lightGenerator.impactOccurred()
        lightGenerator.prepare()
    }
    
    /// Selection feedback when removing a symbol from phrase
    func symbolRemoved() {
        selectionGenerator.selectionChanged()
        selectionGenerator.prepare()
    }
    
    // MARK: - Error & Alert Haptics
    
    /// Error notification for invalid actions
    func error() {
        notificationGenerator.notificationOccurred(.error)
        notificationGenerator.prepare()
    }
    
    /// Warning notification for attention-needed situations
    func warning() {
        notificationGenerator.notificationOccurred(.warning)
        notificationGenerator.prepare()
    }
    
    // MARK: - Navigation Haptics
    
    /// Light impact for back button / navigation
    func navigate() {
        lightGenerator.impactOccurred()
        lightGenerator.prepare()
    }
    
    /// Selection feedback for settings toggle
    func toggleChanged() {
        selectionGenerator.selectionChanged()
        selectionGenerator.prepare()
    }
}

// MARK: - SwiftUI View Extension

extension View {
    /// Adds haptic feedback to a tap gesture
    func hapticOnTap(_ haptic: @escaping () -> Void) -> some View {
        self.simultaneousGesture(
            TapGesture()
                .onEnded { _ in
                    haptic()
                }
        )
    }
}
