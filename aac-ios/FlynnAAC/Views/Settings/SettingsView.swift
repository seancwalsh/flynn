import SwiftUI

struct SettingsView: View {
    @Binding var settings: AppSettings
    let hiddenItems: HiddenItemsStore
    let onEditVocabulary: () -> Void

    @Environment(\.dismiss) private var dismiss
    @Environment(\.authService) private var authService
    @StateObject private var preloadService = ImagePreloadService.shared
    @State private var showChangePassphrase = false
    @State private var showDeletePassphraseConfirmation = false
    @State private var showLogoutConfirmation = false
    @State private var showRefreshImagesConfirmation = false

    init(
        settings: Binding<AppSettings>,
        hiddenItems: HiddenItemsStore = HiddenItemsStore(),
        onEditVocabulary: @escaping () -> Void = {}
    ) {
        self._settings = settings
        self.hiddenItems = hiddenItems
        self.onEditVocabulary = onEditVocabulary
    }

    var body: some View {
        NavigationStack {
            Form {
                // Account section
                if authService.isAuthenticated, let user = authService.currentUser {
                    Section("Account") {
                        HStack {
                            Image(systemName: "person.circle.fill")
                                .font(.largeTitle)
                                .foregroundStyle(.secondary)
                            
                            VStack(alignment: .leading, spacing: 2) {
                                Text(user.email)
                                    .font(.body.weight(.medium))
                                Text(user.role.rawValue.capitalized)
                                    .font(.subheadline)
                                    .foregroundStyle(.secondary)
                            }
                        }
                        .padding(.vertical, 4)
                        .accessibilityElement(children: .combine)
                        
                        Button(role: .destructive) {
                            showLogoutConfirmation = true
                        } label: {
                            Label("Sign Out", systemImage: "rectangle.portrait.and.arrow.right")
                        }
                    }
                }
                Section("Language") {
                    Picker("Language", selection: $settings.language) {
                        ForEach(Language.allCases, id: \.self) { language in
                            Text(language.displayName).tag(language)
                        }
                    }
                }

                Section("Grid Size") {
                    Stepper("Rows: \(settings.gridRows)", value: $settings.gridRows, in: 2...8)
                    Stepper("Columns: \(settings.gridColumns)", value: $settings.gridColumns, in: 2...8)

                    Text("Touch target: \(Int(touchTargetSize))pt")
                        .foregroundColor(touchTargetSize >= 60 ? .secondary : .red)
                }

                Section("Accessibility") {
                    Toggle("Animations", isOn: $settings.animationsEnabled)

                    VStack(alignment: .leading) {
                        Text("Speech Rate")
                        Slider(value: $settings.speechRate, in: 0.1...1.0)
                    }
                }

                Section("Navigation") {
                    Toggle("Return to home after selection", isOn: $settings.autoReturnToHome)
                }

                Section {
                    Button(action: { showRefreshImagesConfirmation = true }) {
                        HStack {
                            Label("Refresh Symbol Images", systemImage: "arrow.clockwise")
                            Spacer()
                            if preloadService.isPreloading {
                                ProgressView()
                            }
                        }
                    }
                    .disabled(preloadService.isPreloading)
                } header: {
                    Text("Images")
                } footer: {
                    Text("Re-download all ARASAAC symbol images. Use if images appear corrupted or missing.")
                }

                // Caregiver Access section
                Section {
                    // Edit Vocabulary button
                    Button(action: onEditVocabulary) {
                        HStack {
                            Label("Edit Vocabulary", systemImage: "pencil.circle")
                            Spacer()
                            Image(systemName: "chevron.right")
                                .font(.system(size: 13, weight: .semibold))
                                .foregroundStyle(.tertiary)
                        }
                    }
                    .foregroundStyle(.primary)

                    // Hidden items count
                    if hiddenItems.totalHiddenCount > 0 {
                        HStack {
                            Text("Hidden Items")
                            Spacer()
                            Text(hiddenItemsSummary)
                                .foregroundStyle(.secondary)
                        }
                    }

                    // Change Passphrase (if set)
                    if KeychainHelper.hasPassphrase() {
                        Button(action: { showChangePassphrase = true }) {
                            Label("Change Passphrase", systemImage: "key")
                        }

                        Button(role: .destructive, action: { showDeletePassphraseConfirmation = true }) {
                            Label("Remove Passphrase", systemImage: "key.slash")
                        }
                    }
                } header: {
                    Text("Caregiver Access")
                } footer: {
                    Text("Edit vocabulary to hide cards that are too advanced. Hidden cards remain in place as invisible spaces to preserve motor planning.")
                }
            }
            .navigationTitle("Settings")
            .toolbar {
                ToolbarItem(placement: .confirmationAction) {
                    Button("Done") {
                        dismiss()
                    }
                }
            }
            .sheet(isPresented: $showChangePassphrase) {
                ChangePassphraseView(
                    onComplete: { showChangePassphrase = false },
                    onCancel: { showChangePassphrase = false }
                )
            }
            .confirmationDialog(
                "Remove Passphrase",
                isPresented: $showDeletePassphraseConfirmation,
                titleVisibility: .visible
            ) {
                Button("Remove", role: .destructive) {
                    KeychainHelper.deletePassphrase()
                }
                Button("Cancel", role: .cancel) {}
            } message: {
                Text("This will remove passphrase protection. Anyone will be able to edit the vocabulary.")
            }
            .confirmationDialog(
                "Sign Out",
                isPresented: $showLogoutConfirmation,
                titleVisibility: .visible
            ) {
                Button("Sign Out", role: .destructive) {
                    Task {
                        await authService.logout()
                        dismiss()
                    }
                }
                Button("Cancel", role: .cancel) {}
            } message: {
                Text("Are you sure you want to sign out? Your local settings will be preserved.")
            }
            .confirmationDialog(
                "Refresh Images",
                isPresented: $showRefreshImagesConfirmation,
                titleVisibility: .visible
            ) {
                Button("Refresh") {
                    Task {
                        await preloadService.refreshImages()
                    }
                }
                Button("Cancel", role: .cancel) {}
            } message: {
                Text("This will re-download all symbol images. This requires an internet connection and may take a few minutes.")
            }
        }
    }

    private var touchTargetSize: CGFloat {
        // Calculate approximate touch target based on grid size
        // Assuming iPad width of ~768pt with padding
        let availableWidth: CGFloat = 700
        return availableWidth / CGFloat(settings.gridColumns)
    }

    private var hiddenItemsSummary: String {
        var parts: [String] = []
        if hiddenItems.hiddenSymbolCount > 0 {
            parts.append("\(hiddenItems.hiddenSymbolCount) symbols")
        }
        if hiddenItems.hiddenCategoryCount > 0 {
            parts.append("\(hiddenItems.hiddenCategoryCount) categories")
        }
        return parts.joined(separator: ", ")
    }
}

/// View for changing the caregiver passphrase
struct ChangePassphraseView: View {
    let onComplete: () -> Void
    let onCancel: () -> Void

    @State private var currentPassphrase = ""
    @State private var newPassphrase = ""
    @State private var confirmPassphrase = ""
    @State private var showError = false
    @State private var errorMessage = ""
    @FocusState private var focusedField: Field?

    private enum Field {
        case current
        case new
        case confirm
    }

    private var isValid: Bool {
        newPassphrase.count >= 4 && newPassphrase == confirmPassphrase
    }

    var body: some View {
        NavigationStack {
            Form {
                Section("Current Passphrase") {
                    SecureField("Enter current passphrase", text: $currentPassphrase)
                        .focused($focusedField, equals: .current)
                        .onSubmit { focusedField = .new }
                }

                Section("New Passphrase") {
                    SecureField("Enter new passphrase", text: $newPassphrase)
                        .textContentType(.newPassword)
                        .focused($focusedField, equals: .new)
                        .onSubmit { focusedField = .confirm }

                    SecureField("Confirm new passphrase", text: $confirmPassphrase)
                        .textContentType(.newPassword)
                        .focused($focusedField, equals: .confirm)

                    if showError {
                        Text(errorMessage)
                            .font(.subheadline)
                            .foregroundStyle(FlynnTheme.Colors.error)
                    }
                }

                Section {
                    VStack(alignment: .leading, spacing: FlynnTheme.Layout.spacing4) {
                        HStack(spacing: FlynnTheme.Layout.spacing8) {
                            Image(systemName: newPassphrase.count >= 4 ? "checkmark.circle.fill" : "circle")
                                .foregroundStyle(newPassphrase.count >= 4 ? FlynnTheme.Colors.success : .secondary)
                            Text("At least 4 characters")
                        }

                        HStack(spacing: FlynnTheme.Layout.spacing8) {
                            Image(systemName: (newPassphrase == confirmPassphrase && !newPassphrase.isEmpty) ? "checkmark.circle.fill" : "circle")
                                .foregroundStyle((newPassphrase == confirmPassphrase && !newPassphrase.isEmpty) ? FlynnTheme.Colors.success : .secondary)
                            Text("Passphrases match")
                        }
                    }
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                } header: {
                    Text("Requirements")
                }
            }
            .navigationTitle("Change Passphrase")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { onCancel() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Save") { savePassphrase() }
                        .disabled(!isValid || currentPassphrase.isEmpty)
                }
            }
            .onAppear { focusedField = .current }
        }
    }

    private func savePassphrase() {
        guard KeychainHelper.verifyPassphrase(currentPassphrase) else {
            showError = true
            errorMessage = "Current passphrase is incorrect"
            return
        }

        guard newPassphrase.count >= 4 else {
            showError = true
            errorMessage = "New passphrase must be at least 4 characters"
            return
        }

        guard newPassphrase == confirmPassphrase else {
            showError = true
            errorMessage = "New passphrases do not match"
            return
        }

        if KeychainHelper.savePassphrase(newPassphrase) {
            onComplete()
        } else {
            showError = true
            errorMessage = "Failed to save passphrase. Please try again."
        }
    }
}
