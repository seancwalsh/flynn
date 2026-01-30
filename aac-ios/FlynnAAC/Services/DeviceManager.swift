import Foundation

/// Manages device registration to associate the device with a specific child
/// This allows the app to know which child's usage data to log
@MainActor
class DeviceManager: ObservableObject {
    static let shared = DeviceManager()

    /// The ID of the child this device is registered to
    @Published var registeredChildId: String?

    /// Storage key for persisting registered child ID
    private let storageKey = "flynn.device.child_id"

    private init() {
        loadRegisteredChild()
    }

    // MARK: - Public API

    /// Check if device is registered to a child
    var isDeviceRegistered: Bool {
        return registeredChildId != nil
    }

    /// Register this device to a specific child
    /// - Parameter childId: The ID of the child to register to
    func registerDevice(childId: String) {
        registeredChildId = childId
        UserDefaults.standard.set(childId, forKey: storageKey)

        print("📱 DeviceManager: Registered device to child \(childId)")
    }

    /// Unregister this device (clear child association)
    func unregisterDevice() {
        let previousChildId = registeredChildId
        registeredChildId = nil
        UserDefaults.standard.removeObject(forKey: storageKey)

        if let childId = previousChildId {
            print("📱 DeviceManager: Unregistered device from child \(childId)")
        }
    }

    /// Switch to a different child (unregister then register)
    /// - Parameter newChildId: The ID of the new child to register to
    func switchChild(to newChildId: String) {
        let oldChildId = registeredChildId
        registerDevice(childId: newChildId)

        if let oldId = oldChildId, oldId != newChildId {
            print("📱 DeviceManager: Switched from child \(oldId) to \(newChildId)")
        }
    }

    // MARK: - Private Helpers

    /// Load registered child ID from UserDefaults
    private func loadRegisteredChild() {
        registeredChildId = UserDefaults.standard.string(forKey: storageKey)

        if let childId = registeredChildId {
            print("📱 DeviceManager: Loaded registered child \(childId)")
        } else {
            print("📱 DeviceManager: No registered child found")
        }
    }
}
