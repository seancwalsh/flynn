import SwiftUI

// MARK: - Bulgarian Verb Conjugation

/// Grammatical person for verb conjugation
enum GrammaticalPerson: String, Codable, CaseIterable {
    case first = "1"
    case second = "2"
    case third = "3"
}

/// Grammatical number for verb conjugation
enum GrammaticalNumber: String, Codable, CaseIterable {
    case singular = "sg"
    case plural = "pl"
}

/// A single conjugated form with metadata
struct ConjugatedForm: Codable, Equatable {
    let form: String
    let person: GrammaticalPerson
    let number: GrammaticalNumber

    /// Short description like "I want", "you want", etc.
    var pronoun: String {
        switch (person, number) {
        case (.first, .singular): return "аз"
        case (.second, .singular): return "ти"
        case (.third, .singular): return "той/тя"
        case (.first, .plural): return "ние"
        case (.second, .plural): return "вие"
        case (.third, .plural): return "те"
        }
    }
}

/// Complete conjugation table for a Bulgarian verb
struct BulgarianConjugation: Codable, Equatable {
    let verbId: String
    let infinitive: String  // Citation form (1st person singular present)
    let english: String

    // Present tense conjugations
    let first_sg: String   // аз искам
    let second_sg: String  // ти искаш
    let third_sg: String   // той/тя иска
    let first_pl: String   // ние искаме
    let second_pl: String  // вие искате
    let third_pl: String   // те искат

    /// Get a specific conjugated form
    func form(person: GrammaticalPerson, number: GrammaticalNumber) -> String {
        switch (person, number) {
        case (.first, .singular): return first_sg
        case (.second, .singular): return second_sg
        case (.third, .singular): return third_sg
        case (.first, .plural): return first_pl
        case (.second, .plural): return second_pl
        case (.third, .plural): return third_pl
        }
    }

    /// All conjugated forms
    var allForms: [ConjugatedForm] {
        [
            ConjugatedForm(form: first_sg, person: .first, number: .singular),
            ConjugatedForm(form: second_sg, person: .second, number: .singular),
            ConjugatedForm(form: third_sg, person: .third, number: .singular),
            ConjugatedForm(form: first_pl, person: .first, number: .plural),
            ConjugatedForm(form: second_pl, person: .second, number: .plural),
            ConjugatedForm(form: third_pl, person: .third, number: .plural),
        ]
    }
}

// MARK: - Fitzgerald Key Color Coding (Standard in AAC)

enum WordCategory: String, Codable, CaseIterable {
    case pronoun = "pronoun"           // Yellow - People/Pronouns
    case verb = "verb"                 // Green - Actions
    case describing = "describing"     // Blue - Adjectives/Adverbs
    case noun = "noun"                 // Orange - Things/Nouns
    case social = "social"             // White/Pink - Social words
    case question = "question"         // Purple - Questions
    case preposition = "preposition"   // Pink - Location words
    case time = "time"                 // Grey - Time words
    case category = "category"         // Folder icons

    var color: Color {
        switch self {
        case .pronoun: return Color.yellow
        case .verb: return Color.green
        case .describing: return Color.blue
        case .noun: return Color.orange
        case .social: return Color.pink.opacity(0.7)
        case .question: return Color.purple
        case .preposition: return Color.pink
        case .time: return Color.gray
        case .category: return Color.brown
        }
    }
}

// MARK: - Vocabulary Word Definition

struct VocabularyWord: Identifiable, Codable {
    let id: String
    let english: String
    let bulgarian: String
    let category: WordCategory
    let arasaacId: Int?
    let gridPosition: GridPosition?  // Position on home screen (nil = in folder only)

    init(
        id: String,
        english: String,
        bulgarian: String,
        category: WordCategory,
        arasaacId: Int? = nil,
        row: Int? = nil,
        col: Int? = nil
    ) {
        self.id = id
        self.english = english
        self.bulgarian = bulgarian
        self.category = category
        self.arasaacId = arasaacId
        if let r = row, let c = col {
            self.gridPosition = GridPosition(row: r, col: c)
        } else {
            self.gridPosition = nil
        }
    }

    func label(for language: Language) -> String {
        language == .english ? english : bulgarian
    }
}

// MARK: - Category Folder Definition

struct CategoryFolder: Identifiable, Codable {
    let id: String
    let english: String
    let bulgarian: String
    let arasaacId: Int?
    let gridPosition: GridPosition
    let words: [VocabularyWord]

    func label(for language: Language) -> String {
        language == .english ? english : bulgarian
    }
}

// MARK: - Complete Vocabulary Structure

struct VocabularyStructure {
    // Grid size: 7 columns x 8 rows = 56 buttons
    static let gridColumns = 7
    static let gridRows = 8

    // MARK: - Home Screen Core Words (Rows 0-5)
    static let coreWords: [VocabularyWord] = [
        // Row 0 - Pronouns (Yellow)
        VocabularyWord(id: "i", english: "I", bulgarian: "аз", category: .pronoun, arasaacId: 6632, row: 0, col: 0),
        VocabularyWord(id: "you", english: "you", bulgarian: "ти", category: .pronoun, arasaacId: 6625, row: 0, col: 1),
        VocabularyWord(id: "he", english: "he", bulgarian: "той", category: .pronoun, arasaacId: 6480, row: 0, col: 2),
        VocabularyWord(id: "she", english: "she", bulgarian: "тя", category: .pronoun, arasaacId: 7028, row: 0, col: 3),
        VocabularyWord(id: "it", english: "it", bulgarian: "то", category: .pronoun, arasaacId: 31670, row: 0, col: 4),
        VocabularyWord(id: "we", english: "we", bulgarian: "ние", category: .pronoun, arasaacId: 7185, row: 0, col: 5),
        VocabularyWord(id: "they", english: "they", bulgarian: "те", category: .pronoun, arasaacId: 7032, row: 0, col: 6),

        // Row 1 - Core Verbs (Green)
        VocabularyWord(id: "want", english: "want", bulgarian: "искам", category: .verb, arasaacId: 5441, row: 1, col: 0),
        VocabularyWord(id: "like", english: "like", bulgarian: "харесвам", category: .verb, arasaacId: 37826, row: 1, col: 1),
        VocabularyWord(id: "have", english: "have", bulgarian: "имам", category: .verb, arasaacId: 32761, row: 1, col: 2),
        VocabularyWord(id: "need", english: "need", bulgarian: "трябва", category: .verb, arasaacId: 37160, row: 1, col: 3),
        VocabularyWord(id: "go", english: "go", bulgarian: "отивам", category: .verb, arasaacId: 8142, row: 1, col: 4),
        VocabularyWord(id: "get", english: "get", bulgarian: "вземам", category: .verb, arasaacId: 24208, row: 1, col: 5),
        VocabularyWord(id: "help", english: "help", bulgarian: "помощ", category: .verb, arasaacId: 32648, row: 1, col: 6),

        // Row 2 - More Core Verbs & Social (Green/Pink)
        VocabularyWord(id: "make", english: "make", bulgarian: "правя", category: .verb, arasaacId: 32751, row: 2, col: 0),
        VocabularyWord(id: "do", english: "do", bulgarian: "правя", category: .verb, arasaacId: 32751, row: 2, col: 1),
        VocabularyWord(id: "put", english: "put", bulgarian: "слагам", category: .verb, arasaacId: 32757, row: 2, col: 2),
        VocabularyWord(id: "see", english: "see", bulgarian: "виждам", category: .verb, arasaacId: 6564, row: 2, col: 3),
        VocabularyWord(id: "eat", english: "eat", bulgarian: "ям", category: .verb, arasaacId: 6456, row: 2, col: 4),
        VocabularyWord(id: "drink", english: "drink", bulgarian: "пия", category: .verb, arasaacId: 6061, row: 2, col: 5),
        VocabularyWord(id: "play", english: "play", bulgarian: "играя", category: .verb, arasaacId: 23392, row: 2, col: 6),

        // Row 3 - Essential Words (Mixed)
        VocabularyWord(id: "more", english: "more", bulgarian: "още", category: .social, arasaacId: 5508, row: 3, col: 0),
        VocabularyWord(id: "stop", english: "stop", bulgarian: "спирам", category: .verb, arasaacId: 7196, row: 3, col: 1),
        VocabularyWord(id: "yes", english: "yes", bulgarian: "да", category: .social, arasaacId: 5584, row: 3, col: 2),
        VocabularyWord(id: "no", english: "no", bulgarian: "не", category: .social, arasaacId: 5526, row: 3, col: 3),
        VocabularyWord(id: "not", english: "not", bulgarian: "не", category: .social, arasaacId: 32308, row: 3, col: 4),
        VocabularyWord(id: "can", english: "can", bulgarian: "мога", category: .verb, arasaacId: 6544, row: 3, col: 5),
        VocabularyWord(id: "done", english: "done", bulgarian: "готово", category: .social, arasaacId: 10367, row: 3, col: 6),

        // Row 4 - Prepositions (Pink)
        VocabularyWord(id: "in", english: "in", bulgarian: "в", category: .preposition, arasaacId: 7034, row: 4, col: 0),
        VocabularyWord(id: "out", english: "out", bulgarian: "вън", category: .preposition, arasaacId: 8252, row: 4, col: 1),
        VocabularyWord(id: "on", english: "on", bulgarian: "на", category: .preposition, arasaacId: 7814, row: 4, col: 2),
        VocabularyWord(id: "off", english: "off", bulgarian: "от", category: .preposition, arasaacId: 7020, row: 4, col: 3),
        VocabularyWord(id: "up", english: "up", bulgarian: "горе", category: .preposition, arasaacId: 5388, row: 4, col: 4),
        VocabularyWord(id: "down", english: "down", bulgarian: "долу", category: .preposition, arasaacId: 37428, row: 4, col: 5),
        VocabularyWord(id: "here", english: "here", bulgarian: "тук", category: .preposition, arasaacId: 5382, row: 4, col: 6),

        // Row 5 - Describing & Questions (Blue/Purple)
        VocabularyWord(id: "good", english: "good", bulgarian: "добър", category: .describing, arasaacId: 4581, row: 5, col: 0),
        VocabularyWord(id: "bad", english: "bad", bulgarian: "лош", category: .describing, arasaacId: 5504, row: 5, col: 1),
        VocabularyWord(id: "big", english: "big", bulgarian: "голям", category: .describing, arasaacId: 4658, row: 5, col: 2),
        VocabularyWord(id: "little", english: "little", bulgarian: "малък", category: .describing, arasaacId: 25839, row: 5, col: 3),
        VocabularyWord(id: "what", english: "what", bulgarian: "какво", category: .question, arasaacId: 22620, row: 5, col: 4),
        VocabularyWord(id: "where", english: "where", bulgarian: "къде", category: .question, arasaacId: 7764, row: 5, col: 5),
        VocabularyWord(id: "all", english: "all", bulgarian: "всичко", category: .describing, arasaacId: 5596, row: 5, col: 6),
    ]

    // MARK: - Category Folders (Row 6-7)
    static let categoryFolders: [CategoryFolder] = [
        // Row 6 - Category Folders
        CategoryFolder(
            id: "food",
            english: "Food",
            bulgarian: "Храна",
            arasaacId: 4610,
            gridPosition: GridPosition(row: 6, col: 0),
            words: foodWords
        ),
        CategoryFolder(
            id: "people",
            english: "People",
            bulgarian: "Хора",
            arasaacId: 34560,
            gridPosition: GridPosition(row: 6, col: 1),
            words: peopleWords
        ),
        CategoryFolder(
            id: "places",
            english: "Places",
            bulgarian: "Места",
            arasaacId: 6964,
            gridPosition: GridPosition(row: 6, col: 2),
            words: placesWords
        ),
        CategoryFolder(
            id: "things",
            english: "Things",
            bulgarian: "Неща",
            arasaacId: 9813,
            gridPosition: GridPosition(row: 6, col: 3),
            words: thingsWords
        ),
        CategoryFolder(
            id: "feelings",
            english: "Feelings",
            bulgarian: "Чувства",
            arasaacId: 35533,
            gridPosition: GridPosition(row: 6, col: 4),
            words: feelingsWords
        ),
        CategoryFolder(
            id: "actions",
            english: "Actions",
            bulgarian: "Действия",
            arasaacId: 6465,
            gridPosition: GridPosition(row: 6, col: 5),
            words: actionsWords
        ),
        CategoryFolder(
            id: "describing",
            english: "Describing",
            bulgarian: "Описание",
            arasaacId: 4658,
            gridPosition: GridPosition(row: 6, col: 6),
            words: describingWords
        ),

        // Row 7 - More Categories
        CategoryFolder(
            id: "time",
            english: "Time",
            bulgarian: "Време",
            arasaacId: 22631,
            gridPosition: GridPosition(row: 7, col: 0),
            words: timeWords
        ),
        CategoryFolder(
            id: "questions",
            english: "Questions",
            bulgarian: "Въпроси",
            arasaacId: 22620,
            gridPosition: GridPosition(row: 7, col: 1),
            words: questionWords
        ),
        CategoryFolder(
            id: "social",
            english: "Chat",
            bulgarian: "Чат",
            arasaacId: 6522,
            gridPosition: GridPosition(row: 7, col: 2),
            words: socialWords
        ),
    ]

    // MARK: - Fringe Vocabulary (Inside Folders)

    static let foodWords: [VocabularyWord] = [
        VocabularyWord(id: "apple", english: "apple", bulgarian: "ябълка", category: .noun, arasaacId: 2462),
        VocabularyWord(id: "water", english: "water", bulgarian: "вода", category: .noun, arasaacId: 32464),
        VocabularyWord(id: "milk", english: "milk", bulgarian: "мляко", category: .noun, arasaacId: 2445),
        VocabularyWord(id: "bread", english: "bread", bulgarian: "хляб", category: .noun, arasaacId: 2494),
        VocabularyWord(id: "juice", english: "juice", bulgarian: "сок", category: .noun, arasaacId: 11461),
        VocabularyWord(id: "cookie", english: "cookie", bulgarian: "бисквита", category: .noun, arasaacId: 8312),
        VocabularyWord(id: "banana", english: "banana", bulgarian: "банан", category: .noun, arasaacId: 2530),
        VocabularyWord(id: "chicken", english: "chicken", bulgarian: "пиле", category: .noun, arasaacId: 4952),
        VocabularyWord(id: "rice", english: "rice", bulgarian: "ориз", category: .noun, arasaacId: 6911),
        VocabularyWord(id: "pizza", english: "pizza", bulgarian: "пица", category: .noun, arasaacId: 2527),
        VocabularyWord(id: "cheese", english: "cheese", bulgarian: "сирене", category: .noun, arasaacId: 2541),
        VocabularyWord(id: "egg", english: "egg", bulgarian: "яйце", category: .noun, arasaacId: 2427),
        VocabularyWord(id: "sandwich", english: "sandwich", bulgarian: "сандвич", category: .noun, arasaacId: 2281),
        VocabularyWord(id: "cereal", english: "cereal", bulgarian: "зърнена закуска", category: .noun, arasaacId: 34749),
        VocabularyWord(id: "soup", english: "soup", bulgarian: "супа", category: .noun, arasaacId: 2573),
    ]

    static let peopleWords: [VocabularyWord] = [
        VocabularyWord(id: "mom", english: "mom", bulgarian: "мама", category: .noun, arasaacId: 2458),
        VocabularyWord(id: "dad", english: "dad", bulgarian: "татко", category: .noun, arasaacId: 31146),
        VocabularyWord(id: "teacher", english: "teacher", bulgarian: "учител", category: .noun, arasaacId: 6556),
        VocabularyWord(id: "friend", english: "friend", bulgarian: "приятел", category: .noun, arasaacId: 25790),
        VocabularyWord(id: "baby", english: "baby", bulgarian: "бебе", category: .noun, arasaacId: 6060),
        VocabularyWord(id: "doctor", english: "doctor", bulgarian: "лекар", category: .noun, arasaacId: 6561),
        VocabularyWord(id: "grandma", english: "grandma", bulgarian: "баба", category: .noun, arasaacId: 23710),
        VocabularyWord(id: "grandpa", english: "grandpa", bulgarian: "дядо", category: .noun, arasaacId: 23718),
        VocabularyWord(id: "brother", english: "brother", bulgarian: "брат", category: .noun, arasaacId: 2423),
        VocabularyWord(id: "sister", english: "sister", bulgarian: "сестра", category: .noun, arasaacId: 2422),
        VocabularyWord(id: "family", english: "family", bulgarian: "семейство", category: .noun, arasaacId: 38351),
        VocabularyWord(id: "boy", english: "boy", bulgarian: "момче", category: .noun, arasaacId: 7176),
        VocabularyWord(id: "girl", english: "girl", bulgarian: "момиче", category: .noun, arasaacId: 27509),
    ]

    static let placesWords: [VocabularyWord] = [
        VocabularyWord(id: "home", english: "home", bulgarian: "вкъщи", category: .noun, arasaacId: 6964),
        VocabularyWord(id: "school", english: "school", bulgarian: "училище", category: .noun, arasaacId: 32446),
        VocabularyWord(id: "bathroom", english: "bathroom", bulgarian: "баня", category: .noun, arasaacId: 5921),
        VocabularyWord(id: "outside", english: "outside", bulgarian: "навън", category: .noun, arasaacId: 5475),
        VocabularyWord(id: "store", english: "store", bulgarian: "магазин", category: .noun, arasaacId: 35695),
        VocabularyWord(id: "park", english: "park", bulgarian: "парк", category: .noun, arasaacId: 5379),
        VocabularyWord(id: "bedroom", english: "bedroom", bulgarian: "спалня", category: .noun, arasaacId: 5988),
        VocabularyWord(id: "kitchen", english: "kitchen", bulgarian: "кухня", category: .noun, arasaacId: 10752),
        VocabularyWord(id: "car", english: "car", bulgarian: "кола", category: .noun, arasaacId: 2339),
        VocabularyWord(id: "hospital", english: "hospital", bulgarian: "болница", category: .noun, arasaacId: 36210),
        VocabularyWord(id: "playground", english: "playground", bulgarian: "площадка", category: .noun, arasaacId: 33064),
        VocabularyWord(id: "restaurant", english: "restaurant", bulgarian: "ресторант", category: .noun, arasaacId: 32408),
    ]

    static let thingsWords: [VocabularyWord] = [
        VocabularyWord(id: "toy", english: "toy", bulgarian: "играчка", category: .noun, arasaacId: 9813),
        VocabularyWord(id: "book", english: "book", bulgarian: "книга", category: .noun, arasaacId: 25191),
        VocabularyWord(id: "ball", english: "ball", bulgarian: "топка", category: .noun, arasaacId: 3241),
        VocabularyWord(id: "phone", english: "phone", bulgarian: "телефон", category: .noun, arasaacId: 26479),
        VocabularyWord(id: "bed", english: "bed", bulgarian: "легло", category: .noun, arasaacId: 25900),
        VocabularyWord(id: "table", english: "table", bulgarian: "маса", category: .noun, arasaacId: 3129),
        VocabularyWord(id: "chair", english: "chair", bulgarian: "стол", category: .noun, arasaacId: 3155),
        VocabularyWord(id: "tv", english: "TV", bulgarian: "телевизор", category: .noun, arasaacId: 25498),
        VocabularyWord(id: "computer", english: "computer", bulgarian: "компютър", category: .noun, arasaacId: 7190),
        VocabularyWord(id: "clothes", english: "clothes", bulgarian: "дрехи", category: .noun, arasaacId: 7233),
        VocabularyWord(id: "cup", english: "cup", bulgarian: "чаша", category: .noun, arasaacId: 2582),
        VocabularyWord(id: "door", english: "door", bulgarian: "врата", category: .noun, arasaacId: 3244),
    ]

    static let feelingsWords: [VocabularyWord] = [
        VocabularyWord(id: "happy", english: "happy", bulgarian: "щастлив", category: .describing, arasaacId: 35533),
        VocabularyWord(id: "sad", english: "sad", bulgarian: "тъжен", category: .describing, arasaacId: 35545),
        VocabularyWord(id: "angry", english: "angry", bulgarian: "ядосан", category: .describing, arasaacId: 35539),
        VocabularyWord(id: "tired", english: "tired", bulgarian: "уморен", category: .describing, arasaacId: 35537),
        VocabularyWord(id: "scared", english: "scared", bulgarian: "уплашен", category: .describing, arasaacId: 35535),
        VocabularyWord(id: "excited", english: "excited", bulgarian: "развълнуван", category: .describing, arasaacId: 39090),
        VocabularyWord(id: "sick", english: "sick", bulgarian: "болен", category: .describing, arasaacId: 7040),
        VocabularyWord(id: "hurt", english: "hurt", bulgarian: "наранен", category: .describing, arasaacId: 5484),
        VocabularyWord(id: "hungry", english: "hungry", bulgarian: "гладен", category: .describing, arasaacId: 4962),
        VocabularyWord(id: "thirsty", english: "thirsty", bulgarian: "жаден", category: .describing, arasaacId: 4963),
        VocabularyWord(id: "love", english: "love", bulgarian: "обичам", category: .describing, arasaacId: 37721),
        VocabularyWord(id: "surprised", english: "surprised", bulgarian: "изненадан", category: .describing, arasaacId: 35529),
    ]

    static let actionsWords: [VocabularyWord] = [
        VocabularyWord(id: "run", english: "run", bulgarian: "тичам", category: .verb, arasaacId: 6465),
        VocabularyWord(id: "walk", english: "walk", bulgarian: "ходя", category: .verb, arasaacId: 29951),
        VocabularyWord(id: "jump", english: "jump", bulgarian: "скачам", category: .verb, arasaacId: 39052),
        VocabularyWord(id: "sit", english: "sit", bulgarian: "седя", category: .verb, arasaacId: 6611),
        VocabularyWord(id: "sleep", english: "sleep", bulgarian: "спя", category: .verb, arasaacId: 6479),
        VocabularyWord(id: "read", english: "read", bulgarian: "чета", category: .verb, arasaacId: 7141),
        VocabularyWord(id: "write", english: "write", bulgarian: "пиша", category: .verb, arasaacId: 2380),
        VocabularyWord(id: "listen", english: "listen", bulgarian: "слушам", category: .verb, arasaacId: 6572),
        VocabularyWord(id: "talk", english: "talk", bulgarian: "говоря", category: .verb, arasaacId: 6517),
        VocabularyWord(id: "wait", english: "wait", bulgarian: "чакам", category: .verb, arasaacId: 36914),
        VocabularyWord(id: "come", english: "come", bulgarian: "идвам", category: .verb, arasaacId: 32669),
        VocabularyWord(id: "give", english: "give", bulgarian: "давам", category: .verb, arasaacId: 28431),
        VocabularyWord(id: "take", english: "take", bulgarian: "вземам", category: .verb, arasaacId: 10148),
        VocabularyWord(id: "open", english: "open", bulgarian: "отварям", category: .verb, arasaacId: 24825),
        VocabularyWord(id: "turn", english: "turn", bulgarian: "завъртам", category: .verb, arasaacId: 6630),
    ]

    static let describingWords: [VocabularyWord] = [
        VocabularyWord(id: "hot", english: "hot", bulgarian: "горещ", category: .describing, arasaacId: 2300),
        VocabularyWord(id: "cold", english: "cold", bulgarian: "студен", category: .describing, arasaacId: 4652),
        VocabularyWord(id: "fast", english: "fast", bulgarian: "бърз", category: .describing, arasaacId: 5306),
        VocabularyWord(id: "slow", english: "slow", bulgarian: "бавен", category: .describing, arasaacId: 4676),
        VocabularyWord(id: "new", english: "new", bulgarian: "нов", category: .describing, arasaacId: 11316),
        VocabularyWord(id: "old", english: "old", bulgarian: "стар", category: .describing, arasaacId: 11394),
        VocabularyWord(id: "clean", english: "clean", bulgarian: "чист", category: .describing, arasaacId: 26172),
        VocabularyWord(id: "dirty", english: "dirty", bulgarian: "мръсен", category: .describing, arasaacId: 4750),
        VocabularyWord(id: "same", english: "same", bulgarian: "същият", category: .describing, arasaacId: 4667),
        VocabularyWord(id: "different", english: "different", bulgarian: "различен", category: .describing, arasaacId: 4628),
        VocabularyWord(id: "red", english: "red", bulgarian: "червен", category: .describing, arasaacId: 2808),
        VocabularyWord(id: "blue", english: "blue", bulgarian: "син", category: .describing, arasaacId: 4869),
        VocabularyWord(id: "green", english: "green", bulgarian: "зелен", category: .describing, arasaacId: 4887),
        VocabularyWord(id: "yellow", english: "yellow", bulgarian: "жълт", category: .describing, arasaacId: 2648),
    ]

    static let timeWords: [VocabularyWord] = [
        VocabularyWord(id: "now", english: "now", bulgarian: "сега", category: .time, arasaacId: 32747),
        VocabularyWord(id: "later", english: "later", bulgarian: "по-късно", category: .time, arasaacId: 32749),
        VocabularyWord(id: "today", english: "today", bulgarian: "днес", category: .time, arasaacId: 7131),
        VocabularyWord(id: "tomorrow", english: "tomorrow", bulgarian: "утре", category: .time, arasaacId: 38278),
        VocabularyWord(id: "morning", english: "morning", bulgarian: "сутрин", category: .time, arasaacId: 25704),
        VocabularyWord(id: "night", english: "night", bulgarian: "нощ", category: .time, arasaacId: 26997),
        VocabularyWord(id: "before", english: "before", bulgarian: "преди", category: .time, arasaacId: 32745),
        VocabularyWord(id: "after", english: "after", bulgarian: "след", category: .time, arasaacId: 32749),
        VocabularyWord(id: "always", english: "always", bulgarian: "винаги", category: .time, arasaacId: 17322),
        VocabularyWord(id: "never", english: "never", bulgarian: "никога", category: .time, arasaacId: 5527),
        VocabularyWord(id: "again", english: "again", bulgarian: "отново", category: .time, arasaacId: 37163),
        VocabularyWord(id: "first", english: "first", bulgarian: "първо", category: .time, arasaacId: 37753),
    ]

    static let questionWords: [VocabularyWord] = [
        VocabularyWord(id: "who", english: "who", bulgarian: "кой", category: .question, arasaacId: 9853),
        VocabularyWord(id: "why", english: "why", bulgarian: "защо", category: .question, arasaacId: 36719),
        VocabularyWord(id: "how", english: "how", bulgarian: "как", category: .question, arasaacId: 22619),
        VocabularyWord(id: "when", english: "when", bulgarian: "кога", category: .question, arasaacId: 32874),
        VocabularyWord(id: "which", english: "which", bulgarian: "кой/коя", category: .question, arasaacId: 22620),
    ]

    static let socialWords: [VocabularyWord] = [
        VocabularyWord(id: "please", english: "please", bulgarian: "моля", category: .social, arasaacId: 8195),
        VocabularyWord(id: "thanks", english: "thank you", bulgarian: "благодаря", category: .social, arasaacId: 6627),
        VocabularyWord(id: "sorry", english: "sorry", bulgarian: "съжалявам", category: .social, arasaacId: 11625),
        VocabularyWord(id: "hello", english: "hello", bulgarian: "здравей", category: .social, arasaacId: 6522),
        VocabularyWord(id: "goodbye", english: "goodbye", bulgarian: "довиждане", category: .social, arasaacId: 6028),
        VocabularyWord(id: "my", english: "my", bulgarian: "мой", category: .pronoun, arasaacId: 12264),
        VocabularyWord(id: "your", english: "your", bulgarian: "твой", category: .pronoun, arasaacId: 12281),
        VocabularyWord(id: "this", english: "this", bulgarian: "това", category: .pronoun, arasaacId: 7095),
        VocabularyWord(id: "that_thing", english: "that", bulgarian: "онова", category: .pronoun, arasaacId: 6906),
    ]

    // MARK: - Helper Methods

    /// Get all vocabulary words (core + fringe)
    static var allWords: [VocabularyWord] {
        var words = coreWords
        for folder in categoryFolders {
            words.append(contentsOf: folder.words)
        }
        return words
    }

    /// Get ARASAAC ID mapping for all words
    static var arasaacMapping: [String: Int] {
        var mapping: [String: Int] = [:]
        for word in allWords {
            if let id = word.arasaacId {
                mapping[word.id] = id
            }
        }
        // Add folder icons
        for folder in categoryFolders {
            if let id = folder.arasaacId {
                mapping[folder.id] = id
            }
        }
        return mapping
    }

    /// Get conjugation for a verb by ID
    static func conjugation(for verbId: String) -> BulgarianConjugation? {
        verbConjugations[verbId]
    }

    // MARK: - Bulgarian Verb Conjugations
    // Generated with LLM assistance, validated by human review
    // Format: 1sg, 2sg, 3sg, 1pl, 2pl, 3pl (present tense)

    static let verbConjugations: [String: BulgarianConjugation] = [
        // Core verbs (home screen)
        "want": BulgarianConjugation(
            verbId: "want", infinitive: "искам", english: "want",
            first_sg: "искам", second_sg: "искаш", third_sg: "иска",
            first_pl: "искаме", second_pl: "искате", third_pl: "искат"
        ),
        "like": BulgarianConjugation(
            verbId: "like", infinitive: "харесвам", english: "like",
            first_sg: "харесвам", second_sg: "харесваш", third_sg: "харесва",
            first_pl: "харесваме", second_pl: "харесвате", third_pl: "харесват"
        ),
        "have": BulgarianConjugation(
            verbId: "have", infinitive: "имам", english: "have",
            first_sg: "имам", second_sg: "имаш", third_sg: "има",
            first_pl: "имаме", second_pl: "имате", third_pl: "имат"
        ),
        "go": BulgarianConjugation(
            verbId: "go", infinitive: "отивам", english: "go",
            first_sg: "отивам", second_sg: "отиваш", third_sg: "отива",
            first_pl: "отиваме", second_pl: "отивате", third_pl: "отиват"
        ),
        "get": BulgarianConjugation(
            verbId: "get", infinitive: "вземам", english: "get",
            first_sg: "вземам", second_sg: "вземаш", third_sg: "взема",
            first_pl: "вземаме", second_pl: "вземате", third_pl: "вземат"
        ),
        "make": BulgarianConjugation(
            verbId: "make", infinitive: "правя", english: "make",
            first_sg: "правя", second_sg: "правиш", third_sg: "прави",
            first_pl: "правим", second_pl: "правите", third_pl: "правят"
        ),
        "do": BulgarianConjugation(
            verbId: "do", infinitive: "правя", english: "do",
            first_sg: "правя", second_sg: "правиш", third_sg: "прави",
            first_pl: "правим", second_pl: "правите", third_pl: "правят"
        ),
        "put": BulgarianConjugation(
            verbId: "put", infinitive: "слагам", english: "put",
            first_sg: "слагам", second_sg: "слагаш", third_sg: "слага",
            first_pl: "слагаме", second_pl: "слагате", third_pl: "слагат"
        ),
        "see": BulgarianConjugation(
            verbId: "see", infinitive: "виждам", english: "see",
            first_sg: "виждам", second_sg: "виждаш", third_sg: "вижда",
            first_pl: "виждаме", second_pl: "виждате", third_pl: "виждат"
        ),
        "eat": BulgarianConjugation(
            verbId: "eat", infinitive: "ям", english: "eat",
            first_sg: "ям", second_sg: "ядеш", third_sg: "яде",
            first_pl: "ядем", second_pl: "ядете", third_pl: "ядат"
        ),
        "drink": BulgarianConjugation(
            verbId: "drink", infinitive: "пия", english: "drink",
            first_sg: "пия", second_sg: "пиеш", third_sg: "пие",
            first_pl: "пием", second_pl: "пиете", third_pl: "пият"
        ),
        "play": BulgarianConjugation(
            verbId: "play", infinitive: "играя", english: "play",
            first_sg: "играя", second_sg: "играеш", third_sg: "играе",
            first_pl: "играем", second_pl: "играете", third_pl: "играят"
        ),
        "stop": BulgarianConjugation(
            verbId: "stop", infinitive: "спирам", english: "stop",
            first_sg: "спирам", second_sg: "спираш", third_sg: "спира",
            first_pl: "спираме", second_pl: "спирате", third_pl: "спират"
        ),
        "can": BulgarianConjugation(
            verbId: "can", infinitive: "мога", english: "can",
            first_sg: "мога", second_sg: "можеш", third_sg: "може",
            first_pl: "можем", second_pl: "можете", third_pl: "могат"
        ),

        // Actions folder verbs
        "run": BulgarianConjugation(
            verbId: "run", infinitive: "тичам", english: "run",
            first_sg: "тичам", second_sg: "тичаш", third_sg: "тича",
            first_pl: "тичаме", second_pl: "тичате", third_pl: "тичат"
        ),
        "walk": BulgarianConjugation(
            verbId: "walk", infinitive: "ходя", english: "walk",
            first_sg: "ходя", second_sg: "ходиш", third_sg: "ходи",
            first_pl: "ходим", second_pl: "ходите", third_pl: "ходят"
        ),
        "jump": BulgarianConjugation(
            verbId: "jump", infinitive: "скачам", english: "jump",
            first_sg: "скачам", second_sg: "скачаш", third_sg: "скача",
            first_pl: "скачаме", second_pl: "скачате", third_pl: "скачат"
        ),
        "sit": BulgarianConjugation(
            verbId: "sit", infinitive: "седя", english: "sit",
            first_sg: "седя", second_sg: "седиш", third_sg: "седи",
            first_pl: "седим", second_pl: "седите", third_pl: "седят"
        ),
        "sleep": BulgarianConjugation(
            verbId: "sleep", infinitive: "спя", english: "sleep",
            first_sg: "спя", second_sg: "спиш", third_sg: "спи",
            first_pl: "спим", second_pl: "спите", third_pl: "спят"
        ),
        "read": BulgarianConjugation(
            verbId: "read", infinitive: "чета", english: "read",
            first_sg: "чета", second_sg: "четеш", third_sg: "чете",
            first_pl: "четем", second_pl: "четете", third_pl: "четат"
        ),
        "write": BulgarianConjugation(
            verbId: "write", infinitive: "пиша", english: "write",
            first_sg: "пиша", second_sg: "пишеш", third_sg: "пише",
            first_pl: "пишем", second_pl: "пишете", third_pl: "пишат"
        ),
        "listen": BulgarianConjugation(
            verbId: "listen", infinitive: "слушам", english: "listen",
            first_sg: "слушам", second_sg: "слушаш", third_sg: "слуша",
            first_pl: "слушаме", second_pl: "слушате", third_pl: "слушат"
        ),
        "talk": BulgarianConjugation(
            verbId: "talk", infinitive: "говоря", english: "talk",
            first_sg: "говоря", second_sg: "говориш", third_sg: "говори",
            first_pl: "говорим", second_pl: "говорите", third_pl: "говорят"
        ),
        "wait": BulgarianConjugation(
            verbId: "wait", infinitive: "чакам", english: "wait",
            first_sg: "чакам", second_sg: "чакаш", third_sg: "чака",
            first_pl: "чакаме", second_pl: "чакате", third_pl: "чакат"
        ),
        "come": BulgarianConjugation(
            verbId: "come", infinitive: "идвам", english: "come",
            first_sg: "идвам", second_sg: "идваш", third_sg: "идва",
            first_pl: "идваме", second_pl: "идвате", third_pl: "идват"
        ),
        "give": BulgarianConjugation(
            verbId: "give", infinitive: "давам", english: "give",
            first_sg: "давам", second_sg: "даваш", third_sg: "дава",
            first_pl: "даваме", second_pl: "давате", third_pl: "дават"
        ),
        "take": BulgarianConjugation(
            verbId: "take", infinitive: "вземам", english: "take",
            first_sg: "вземам", second_sg: "вземаш", third_sg: "взема",
            first_pl: "вземаме", second_pl: "вземате", third_pl: "вземат"
        ),
        "open": BulgarianConjugation(
            verbId: "open", infinitive: "отварям", english: "open",
            first_sg: "отварям", second_sg: "отваряш", third_sg: "отваря",
            first_pl: "отваряме", second_pl: "отваряте", third_pl: "отварят"
        ),
        "turn": BulgarianConjugation(
            verbId: "turn", infinitive: "завъртам", english: "turn",
            first_sg: "завъртам", second_sg: "завърташ", third_sg: "завърта",
            first_pl: "завъртаме", second_pl: "завъртате", third_pl: "завъртат"
        ),

        // Additional verbs from feelings/other categories
        "love": BulgarianConjugation(
            verbId: "love", infinitive: "обичам", english: "love",
            first_sg: "обичам", second_sg: "обичаш", third_sg: "обича",
            first_pl: "обичаме", second_pl: "обичате", third_pl: "обичат"
        ),
    ]
}
