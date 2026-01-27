import Foundation
import Security

/// Secure passphrase storage for caregiver access using iOS Keychain.
enum KeychainHelper {
    private static let service = "com.flynnapp.FlynnAAC"
    private static let passphraseKey = "CaregiverPassphrase"

    // MARK: - Public API

    /// Saves the passphrase securely to the Keychain.
    /// - Parameter passphrase: The passphrase to store.
    /// - Returns: `true` if save was successful, `false` otherwise.
    @discardableResult
    static func savePassphrase(_ passphrase: String) -> Bool {
        guard let data = passphrase.data(using: .utf8) else { return false }

        // Delete any existing passphrase first
        deletePassphrase()

        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: passphraseKey,
            kSecValueData as String: data,
            kSecAttrAccessible as String: kSecAttrAccessibleWhenUnlockedThisDeviceOnly
        ]

        let status = SecItemAdd(query as CFDictionary, nil)
        return status == errSecSuccess
    }

    /// Retrieves the stored passphrase from the Keychain.
    /// - Returns: The passphrase if stored, `nil` otherwise.
    static func getPassphrase() -> String? {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: passphraseKey,
            kSecReturnData as String: true,
            kSecMatchLimit as String: kSecMatchLimitOne
        ]

        var result: AnyObject?
        let status = SecItemCopyMatching(query as CFDictionary, &result)

        guard status == errSecSuccess,
              let data = result as? Data,
              let passphrase = String(data: data, encoding: .utf8) else {
            return nil
        }

        return passphrase
    }

    /// Checks if a passphrase has been configured.
    /// - Returns: `true` if a passphrase exists in the Keychain.
    static func hasPassphrase() -> Bool {
        getPassphrase() != nil
    }

    /// Verifies if the provided passphrase matches the stored one.
    /// - Parameter passphrase: The passphrase to verify.
    /// - Returns: `true` if the passphrase matches.
    static func verifyPassphrase(_ passphrase: String) -> Bool {
        guard let stored = getPassphrase() else { return false }
        return stored == passphrase
    }

    /// Deletes the stored passphrase from the Keychain.
    /// - Returns: `true` if deletion was successful or item didn't exist.
    @discardableResult
    static func deletePassphrase() -> Bool {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: passphraseKey
        ]

        let status = SecItemDelete(query as CFDictionary)
        return status == errSecSuccess || status == errSecItemNotFound
    }
}
