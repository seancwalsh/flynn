import SwiftUI

/// First-time passphrase setup view.
/// Allows creating and confirming a new passphrase.
/// Minimum 4 characters required.
struct PassphraseSetupView: View {
    let onComplete: () -> Void
    let onCancel: () -> Void

    @State private var passphrase = ""
    @State private var confirmPassphrase = ""
    @State private var showError = false
    @State private var errorMessage = ""
    @FocusState private var focusedField: Field?

    private enum Field {
        case passphrase
        case confirm
    }

    private var isValid: Bool {
        passphrase.count >= 4 && passphrase == confirmPassphrase
    }

    var body: some View {
        NavigationStack {
            Form {
                Section {
                    VStack(alignment: .leading, spacing: FlynnTheme.Layout.spacing8) {
                        Text("Create a passphrase to protect edit mode.")
                            .font(.system(size: 15, design: .rounded))
                            .foregroundStyle(.secondary)

                        Text("This prevents accidental changes to the vocabulary.")
                            .font(.system(size: 14, design: .rounded))
                            .foregroundStyle(.tertiary)
                    }
                    .listRowBackground(Color.clear)
                }

                Section("Passphrase") {
                    SecureField("Enter passphrase", text: $passphrase)
                        .textContentType(.newPassword)
                        .focused($focusedField, equals: .passphrase)
                        .onSubmit {
                            focusedField = .confirm
                        }

                    SecureField("Confirm passphrase", text: $confirmPassphrase)
                        .textContentType(.newPassword)
                        .focused($focusedField, equals: .confirm)
                        .onSubmit {
                            if isValid {
                                savePassphrase()
                            }
                        }

                    if showError {
                        Text(errorMessage)
                            .font(.system(size: 14, design: .rounded))
                            .foregroundStyle(FlynnTheme.Colors.error)
                    }
                }

                Section {
                    VStack(alignment: .leading, spacing: FlynnTheme.Layout.spacing4) {
                        HStack(spacing: FlynnTheme.Layout.spacing8) {
                            Image(systemName: passphrase.count >= 4 ? "checkmark.circle.fill" : "circle")
                                .foregroundStyle(passphrase.count >= 4 ? FlynnTheme.Colors.success : .secondary)
                            Text("At least 4 characters")
                        }

                        HStack(spacing: FlynnTheme.Layout.spacing8) {
                            Image(systemName: (passphrase == confirmPassphrase && !passphrase.isEmpty) ? "checkmark.circle.fill" : "circle")
                                .foregroundStyle((passphrase == confirmPassphrase && !passphrase.isEmpty) ? FlynnTheme.Colors.success : .secondary)
                            Text("Passphrases match")
                        }
                    }
                    .font(.system(size: 14, design: .rounded))
                    .foregroundStyle(.secondary)
                } header: {
                    Text("Requirements")
                }

                Section {
                    HStack {
                        Image(systemName: "lightbulb.fill")
                            .foregroundStyle(.yellow)
                        Text("Choose something easy to remember but hard to guess. You can change it later in Settings.")
                            .font(.system(size: 13, design: .rounded))
                            .foregroundStyle(.secondary)
                    }
                }
            }
            .navigationTitle("Set Up Passphrase")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") {
                        onCancel()
                    }
                }

                ToolbarItem(placement: .confirmationAction) {
                    Button("Save") {
                        savePassphrase()
                    }
                    .disabled(!isValid)
                }
            }
            .onAppear {
                focusedField = .passphrase
            }
        }
    }

    private func savePassphrase() {
        guard passphrase.count >= 4 else {
            showError = true
            errorMessage = "Passphrase must be at least 4 characters"
            return
        }

        guard passphrase == confirmPassphrase else {
            showError = true
            errorMessage = "Passphrases do not match"
            return
        }

        if KeychainHelper.savePassphrase(passphrase) {
            onComplete()
        } else {
            showError = true
            errorMessage = "Failed to save passphrase. Please try again."
        }
    }
}

#Preview {
    PassphraseSetupView(
        onComplete: {},
        onCancel: {}
    )
}
