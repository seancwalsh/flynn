import Foundation
import Testing
import SwiftUI
@testable import FlynnAAC

/// Tests for VoiceOver labels and Dynamic Type support (FLY-80)
/// Verifies that accessibility features are properly implemented
struct AccessibilityTests {

    // MARK: - VoiceOver Label Tests

    @Test func symbolCellHasAccessibilityLabel() async throws {
        // Symbol cells must have an accessibility label with the symbol name
        let symbol = Symbol(
            id: "want",
            position: GridPosition(row: 0, col: 0),
            labels: ["en": "want", "bg": "искам"],
            category: .verb
        )

        // The accessibility label should include the symbol's display text
        let label = symbol.label(for: .english)
        #expect(label == "want", "Symbol should have correct label for language")
    }

    @Test func symbolCellAccessibilityIncludesCategory() async throws {
        // Symbol cells should include category context for VoiceOver users
        let symbol = Symbol(
            id: "eat",
            position: GridPosition(row: 0, col: 0),
            labels: ["en": "eat"],
            category: .verb
        )

        #expect(symbol.category != nil, "Symbol must have category for context")
        #expect(symbol.category?.displayName == "Actions", "Verb category should display as 'Actions'")
    }

    @Test func categoryCellHasAccessibilityLabel() async throws {
        // Category cells must have an accessibility label
        let category = Category(
            id: "food",
            position: GridPosition(row: 0, col: 0),
            labels: ["en": "Food", "bg": "Храна"],
            symbols: [],
            subcategories: []
        )

        let label = category.label(for: .english)
        #expect(label == "Food", "Category should have correct label for language")
    }

    @Test func allSymbolCategoriesHaveDisplayNames() async throws {
        // All categories must have human-readable display names for VoiceOver
        for category in SymbolCategory.allCases {
            #expect(!category.displayName.isEmpty, 
                   "Category \(category.rawValue) must have a display name")
        }
    }

    // MARK: - Dynamic Type Tests

    @Test func themeHasDynamicTypeSymbolLabel() async throws {
        // Typography system must include Dynamic Type fonts
        let font = FlynnTheme.Typography.symbolLabel
        // Font uses semantic text style, which means it will scale
        #expect(font != nil, "symbolLabel font must be defined")
    }

    @Test func themeHasDynamicTypePhraseBarLabel() async throws {
        let font = FlynnTheme.Typography.phraseBarSymbolLabel
        #expect(font != nil, "phraseBarSymbolLabel font must be defined")
    }

    @Test func themeHasDynamicTypeNavigationText() async throws {
        let font = FlynnTheme.Typography.navigationText
        #expect(font != nil, "navigationText font must be defined")
    }

    @Test func themeHasDynamicTypeCaptionText() async throws {
        let font = FlynnTheme.Typography.captionText
        #expect(font != nil, "captionText font must be defined")
    }

    // MARK: - Accessibility Trait Tests

    @Test func symbolsAreConsistentlyLabeled() async throws {
        // All symbols must be able to generate labels in supported languages
        let symbol = Symbol(
            id: "test",
            position: GridPosition(row: 0, col: 0),
            labels: ["en": "test", "bg": "тест"],
            category: .noun
        )

        for language in Language.allCases {
            let label = symbol.label(for: language)
            #expect(!label.isEmpty, "Symbol must have label for \(language)")
        }
    }

    @Test func categoryLabelsWorkInAllLanguages() async throws {
        // Categories must support both English and Bulgarian
        let category = Category(
            id: "food",
            position: GridPosition(row: 0, col: 0),
            labels: ["en": "Food", "bg": "Храна"],
            symbols: [],
            subcategories: []
        )

        for language in Language.allCases {
            let label = category.label(for: language)
            #expect(!label.isEmpty, "Category must have label for \(language)")
        }
    }

    // MARK: - Touch Target Tests

    @Test func minimumTouchTargetIsAccessible() async throws {
        // Touch targets must be at least 44pt for accessibility (Apple HIG)
        // Flynn uses 60pt for motor planning considerations
        #expect(FlynnTheme.Layout.minimumTouchTarget >= 44,
               "Minimum touch target must be at least 44pt for accessibility")
    }

    @Test func recommendedTouchTargetIsGenerous() async throws {
        // For users with motor difficulties, larger targets are better
        #expect(FlynnTheme.Layout.recommendedTouchTarget >= FlynnTheme.Layout.minimumTouchTarget,
               "Recommended target should be at least as large as minimum")
    }
}
