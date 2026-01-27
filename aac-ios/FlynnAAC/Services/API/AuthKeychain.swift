import Foundation
import Security

/// Secure storage for user info using iOS Keychain
/// Note: Clerk handles token storage, we only store user info for offline access
enum AuthKeychain {
    private static let service = "com.flynnapp.FlynnAAC"
    private static let userKey = "CurrentUser"
    
    // MARK: - User Info
    
    /// Save current user info
    @discardableResult
    static func saveUser(_ user: UserInfo) -> Bool {
        guard let data = try? JSONEncoder().encode(user) else { return false }
        
        deleteUser()
        
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: userKey,
            kSecValueData as String: data,
            kSecAttrAccessible as String: kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly
        ]
        
        let status = SecItemAdd(query as CFDictionary, nil)
        return status == errSecSuccess
    }
    
    /// Retrieve current user info
    static func getUser() -> UserInfo? {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: userKey,
            kSecReturnData as String: true,
            kSecMatchLimit as String: kSecMatchLimitOne
        ]
        
        var result: AnyObject?
        let status = SecItemCopyMatching(query as CFDictionary, &result)
        
        guard status == errSecSuccess,
              let data = result as? Data,
              let user = try? JSONDecoder().decode(UserInfo.self, from: data) else {
            return nil
        }
        
        return user
    }
    
    /// Delete stored user info
    @discardableResult
    static func deleteUser() -> Bool {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: userKey
        ]
        
        let status = SecItemDelete(query as CFDictionary)
        return status == errSecSuccess || status == errSecItemNotFound
    }
    
    // MARK: - Clear All
    
    /// Clear all authentication data
    static func clearAll() {
        deleteUser()
    }
}
