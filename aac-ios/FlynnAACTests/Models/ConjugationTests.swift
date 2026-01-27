import Foundation
import Testing
@testable import FlynnAAC

/// Tests for Bulgarian verb conjugation support
struct ConjugationTests {

    // MARK: - BulgarianConjugation Data Structure

    @Test func conjugationHasAllSixForms() {
        let conjugation = BulgarianConjugation(
            verbId: "want",
            infinitive: "искам",
            english: "want",
            first_sg: "искам",
            second_sg: "искаш",
            third_sg: "иска",
            first_pl: "искаме",
            second_pl: "искате",
            third_pl: "искат"
        )

        #expect(conjugation.first_sg == "искам")
        #expect(conjugation.second_sg == "искаш")
        #expect(conjugation.third_sg == "иска")
        #expect(conjugation.first_pl == "искаме")
        #expect(conjugation.second_pl == "искате")
        #expect(conjugation.third_pl == "искат")
    }

    @Test func conjugationAllFormsReturnsCorrectCount() {
        let conjugation = BulgarianConjugation(
            verbId: "want",
            infinitive: "искам",
            english: "want",
            first_sg: "искам",
            second_sg: "искаш",
            third_sg: "иска",
            first_pl: "искаме",
            second_pl: "искате",
            third_pl: "искат"
        )

        #expect(conjugation.allForms.count == 6,
               "Conjugation must have exactly 6 forms (3 singular + 3 plural)")
    }

    @Test func conjugationFormLookupByPersonAndNumber() {
        let conjugation = BulgarianConjugation(
            verbId: "go",
            infinitive: "отивам",
            english: "go",
            first_sg: "отивам",
            second_sg: "отиваш",
            third_sg: "отива",
            first_pl: "отиваме",
            second_pl: "отивате",
            third_pl: "отиват"
        )

        #expect(conjugation.form(person: .first, number: .singular) == "отивам")
        #expect(conjugation.form(person: .second, number: .singular) == "отиваш")
        #expect(conjugation.form(person: .third, number: .singular) == "отива")
        #expect(conjugation.form(person: .first, number: .plural) == "отиваме")
        #expect(conjugation.form(person: .second, number: .plural) == "отивате")
        #expect(conjugation.form(person: .third, number: .plural) == "отиват")
    }

    // MARK: - VocabularyStructure Conjugation Lookup

    @Test func vocabularyStructureHasConjugationsForVerbs() {
        // Core verbs should have conjugations defined
        let coreVerbs = ["want", "go", "eat", "drink", "play", "sleep", "like"]

        for verbId in coreVerbs {
            let conjugation = VocabularyStructure.conjugation(for: verbId)
            #expect(conjugation != nil,
                   "Verb '\(verbId)' should have a conjugation defined")
        }
    }

    @Test func conjugationLookupReturnsNilForNonVerbs() {
        // Non-verb symbols should not have conjugations
        let nonVerbs = ["apple", "water", "happy", "mom"]

        for symbolId in nonVerbs {
            let conjugation = VocabularyStructure.conjugation(for: symbolId)
            #expect(conjugation == nil,
                   "Non-verb '\(symbolId)' should not have a conjugation")
        }
    }

    @Test func allVerbConjugationsHaveCorrectVerbId() {
        for (verbId, conjugation) in VocabularyStructure.verbConjugations {
            #expect(conjugation.verbId == verbId,
                   "Conjugation verbId '\(conjugation.verbId)' should match key '\(verbId)'")
        }
    }

    // MARK: - ConjugatedForm Structure

    @Test func conjugatedFormHasCorrectPronoun() {
        let form = ConjugatedForm(form: "искам", person: .first, number: .singular)
        #expect(form.pronoun == "аз", "First person singular pronoun should be 'аз'")

        let form2 = ConjugatedForm(form: "искаш", person: .second, number: .singular)
        #expect(form2.pronoun == "ти", "Second person singular pronoun should be 'ти'")

        let form3 = ConjugatedForm(form: "иска", person: .third, number: .singular)
        #expect(form3.pronoun == "той/тя", "Third person singular pronoun should be 'той/тя'")

        let form4 = ConjugatedForm(form: "искаме", person: .first, number: .plural)
        #expect(form4.pronoun == "ние", "First person plural pronoun should be 'ние'")

        let form5 = ConjugatedForm(form: "искате", person: .second, number: .plural)
        #expect(form5.pronoun == "вие", "Second person plural pronoun should be 'вие'")

        let form6 = ConjugatedForm(form: "искат", person: .third, number: .plural)
        #expect(form6.pronoun == "те", "Third person plural pronoun should be 'те'")
    }

    // MARK: - First Person Default Behavior

    @Test func firstPersonSingularIsDefaultForm() {
        // When user taps a verb in Bulgarian mode, first_sg should be the default
        let conjugation = VocabularyStructure.conjugation(for: "want")!
        let defaultForm = conjugation.first_sg

        #expect(defaultForm == "искам",
               "Default form should be first person singular 'искам'")
    }

    // MARK: - Pronoun Symbol Mapping

    @Test func pronounSymbolIdsExist() {
        // Verify that the pronoun symbols we reference in ConjugationPickerView exist
        let pronounSymbolIds = ["i", "you", "he", "she", "we", "they"]
        let allWords = VocabularyStructure.allWords

        for symbolId in pronounSymbolIds {
            let wordExists = allWords.contains { $0.id == symbolId }

            #expect(wordExists,
                   "Pronoun symbol '\(symbolId)' should exist in vocabulary")
        }
    }
}
