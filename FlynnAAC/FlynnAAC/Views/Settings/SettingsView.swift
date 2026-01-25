import SwiftUI

struct SettingsView: View {
    @Binding var settings: AppSettings
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            Form {
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
            }
            .navigationTitle("Settings")
            .toolbar {
                ToolbarItem(placement: .confirmationAction) {
                    Button("Done") {
                        dismiss()
                    }
                }
            }
        }
    }

    private var touchTargetSize: CGFloat {
        // Calculate approximate touch target based on grid size
        // Assuming iPad width of ~768pt with padding
        let availableWidth: CGFloat = 700
        return availableWidth / CGFloat(settings.gridColumns)
    }
}
