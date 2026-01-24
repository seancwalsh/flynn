import Foundation

enum Language: String, Codable, CaseIterable {
    case english = "en"
    case bulgarian = "bg"

    var displayName: String {
        switch self {
        case .english: return "English"
        case .bulgarian: return "Български"
        }
    }

    var voiceIdentifier: String {
        switch self {
        case .english: return "com.apple.ttsbundle.Samantha-compact"
        case .bulgarian: return "com.apple.ttsbundle.Daria-compact"
        }
    }
}
