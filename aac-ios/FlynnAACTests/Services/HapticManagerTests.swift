import XCTest
@testable import FlynnAAC

/// Tests for HapticManager functionality
///
/// Note: These tests verify the HapticManager API exists and can be called.
/// Actual haptic feedback cannot be tested programmatically on simulator.
final class HapticManagerTests: XCTestCase {
    
    // MARK: - Singleton Tests
    
    func testSharedInstanceExists() {
        let manager = HapticManager.shared
        XCTAssertNotNil(manager, "HapticManager shared instance should exist")
    }
    
    func testSharedInstanceIsSingleton() {
        let manager1 = HapticManager.shared
        let manager2 = HapticManager.shared
        XCTAssertTrue(manager1 === manager2, "HapticManager should return same instance")
    }
    
    // MARK: - API Existence Tests
    // These verify the methods exist and can be called without crashing
    
    func testSymbolTappedMethodExists() {
        // Should not throw/crash
        HapticManager.shared.symbolTapped()
    }
    
    func testCategoryTappedMethodExists() {
        HapticManager.shared.categoryTapped()
    }
    
    func testLongPressStartedMethodExists() {
        HapticManager.shared.longPressStarted()
    }
    
    func testPhraseSpokenMethodExists() {
        HapticManager.shared.phraseSpoken()
    }
    
    func testPhraseClearMethodExists() {
        HapticManager.shared.phraseClear()
    }
    
    func testSymbolRemovedMethodExists() {
        HapticManager.shared.symbolRemoved()
    }
    
    func testErrorMethodExists() {
        HapticManager.shared.error()
    }
    
    func testWarningMethodExists() {
        HapticManager.shared.warning()
    }
    
    func testNavigateMethodExists() {
        HapticManager.shared.navigate()
    }
    
    func testToggleChangedMethodExists() {
        HapticManager.shared.toggleChanged()
    }
    
    func testPrepareGeneratorsMethodExists() {
        HapticManager.shared.prepareGenerators()
    }
    
    // MARK: - Rapid Call Tests
    // Verify methods can be called rapidly without issues
    
    func testRapidSymbolTaps() {
        for _ in 0..<100 {
            HapticManager.shared.symbolTapped()
        }
        // No crash = success
    }
    
    func testMixedRapidCalls() {
        for _ in 0..<50 {
            HapticManager.shared.symbolTapped()
            HapticManager.shared.categoryTapped()
            HapticManager.shared.navigate()
        }
        // No crash = success
    }
}
