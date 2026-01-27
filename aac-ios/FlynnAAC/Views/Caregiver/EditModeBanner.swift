import SwiftUI

/// Full-width banner displayed when edit mode is active.
/// Shows contextual hidden count and provides bulk actions.
struct EditModeBanner: View {
    let hiddenCount: Int
    let onShowAll: () -> Void
    let onHideAll: () -> Void
    let onDone: () -> Void

    @State private var showHideAllConfirmation = false

    var body: some View {
        HStack(spacing: FlynnTheme.Layout.spacing12) {
            // Edit mode indicator
            HStack(spacing: FlynnTheme.Layout.spacing8) {
                Image(systemName: "pencil.circle.fill")
                    .font(.system(size: 18, weight: .medium))
                Text("EDIT MODE")
                    .font(.system(size: 14, weight: .bold, design: .rounded))
            }
            .foregroundStyle(FlynnTheme.Colors.warning)

            // Hidden count
            if hiddenCount > 0 {
                Text("\(hiddenCount) hidden here")
                    .font(.system(size: 13, weight: .medium, design: .rounded))
                    .foregroundStyle(.secondary)
            }

            Spacer()

            // Bulk actions
            HStack(spacing: FlynnTheme.Layout.spacing8) {
                // Show All / Hide All toggle
                if hiddenCount > 0 {
                    Button(action: onShowAll) {
                        Text("Show All")
                            .font(.system(size: 13, weight: .medium, design: .rounded))
                            .foregroundStyle(FlynnTheme.Colors.accent)
                            .padding(.horizontal, FlynnTheme.Layout.spacing12)
                            .padding(.vertical, FlynnTheme.Layout.spacing6)
                            .background(FlynnTheme.Colors.accent.opacity(0.15))
                            .clipShape(Capsule())
                    }
                    .buttonStyle(.plain)
                } else {
                    Button(action: { showHideAllConfirmation = true }) {
                        Text("Hide All")
                            .font(.system(size: 13, weight: .medium, design: .rounded))
                            .foregroundStyle(.secondary)
                            .padding(.horizontal, FlynnTheme.Layout.spacing12)
                            .padding(.vertical, FlynnTheme.Layout.spacing6)
                            .background(Color.secondary.opacity(0.1))
                            .clipShape(Capsule())
                    }
                    .buttonStyle(.plain)
                }

                // Done button
                Button(action: onDone) {
                    Text("Done")
                        .font(.system(size: 14, weight: .semibold, design: .rounded))
                        .foregroundStyle(.white)
                        .padding(.horizontal, FlynnTheme.Layout.spacing16)
                        .padding(.vertical, FlynnTheme.Layout.spacing8)
                        .background(FlynnTheme.Colors.accent)
                        .clipShape(Capsule())
                }
                .buttonStyle(.plain)
            }
        }
        .padding(.horizontal, FlynnTheme.Layout.spacing16)
        .padding(.vertical, FlynnTheme.Layout.spacing12)
        .background(FlynnTheme.Colors.warning.opacity(0.2))
        .confirmationDialog(
            "Hide All Items",
            isPresented: $showHideAllConfirmation,
            titleVisibility: .visible
        ) {
            Button("Hide All", role: .destructive) {
                onHideAll()
            }
            Button("Cancel", role: .cancel) {}
        } message: {
            Text("This will hide all symbols and folders in the current view. You can show them again later.")
        }
        .accessibilityElement(children: .combine)
        .accessibilityLabel("Edit mode active. \(hiddenCount) items hidden in current view.")
    }
}

#Preview("With Hidden Items") {
    VStack {
        EditModeBanner(
            hiddenCount: 3,
            onShowAll: {},
            onHideAll: {},
            onDone: {}
        )
        Spacer()
    }
}

#Preview("No Hidden Items") {
    VStack {
        EditModeBanner(
            hiddenCount: 0,
            onShowAll: {},
            onHideAll: {},
            onDone: {}
        )
        Spacer()
    }
}
