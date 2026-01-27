import SwiftUI

/// Modal view for entering the caregiver passphrase to access edit mode.
/// Shows a lock icon, secure text field, and cancel/enter buttons.
/// Includes gentle shake animation on incorrect passphrase.
struct PassphrasePromptView: View {
    let onAuthenticated: () -> Void
    let onCancel: () -> Void

    @State private var passphrase = ""
    @State private var showError = false
    @State private var shakeOffset: CGFloat = 0
    @FocusState private var isTextFieldFocused: Bool

    var body: some View {
        VStack(spacing: FlynnTheme.Layout.spacing24) {
            // Lock icon
            Image(systemName: "lock.fill")
                .font(.system(size: 48, weight: .medium))
                .foregroundStyle(FlynnTheme.Colors.accent)
                .padding(.top, FlynnTheme.Layout.spacing16)

            // Title
            Text("Enter Passphrase")
                .font(.system(size: 20, weight: .semibold, design: .rounded))
                .foregroundStyle(.primary)

            // Secure text field
            VStack(spacing: FlynnTheme.Layout.spacing8) {
                SecureField("Passphrase", text: $passphrase)
                    .textFieldStyle(.roundedBorder)
                    .font(.system(size: 16, design: .rounded))
                    .frame(maxWidth: 280)
                    .focused($isTextFieldFocused)
                    .onSubmit {
                        verifyPassphrase()
                    }
                    .offset(x: shakeOffset)

                if showError {
                    Text("Incorrect passphrase")
                        .font(.system(size: 14, design: .rounded))
                        .foregroundStyle(FlynnTheme.Colors.error)
                }
            }

            // Buttons
            HStack(spacing: FlynnTheme.Layout.spacing16) {
                Button(action: onCancel) {
                    Text("Cancel")
                        .font(.system(size: 16, weight: .medium, design: .rounded))
                        .foregroundStyle(.secondary)
                        .padding(.horizontal, FlynnTheme.Layout.spacing20)
                        .padding(.vertical, FlynnTheme.Layout.spacing12)
                }
                .buttonStyle(.plain)

                Button(action: verifyPassphrase) {
                    Text("Enter")
                        .font(.system(size: 16, weight: .semibold, design: .rounded))
                        .foregroundStyle(.white)
                        .padding(.horizontal, FlynnTheme.Layout.spacing24)
                        .padding(.vertical, FlynnTheme.Layout.spacing12)
                        .background(FlynnTheme.Colors.accent)
                        .clipShape(Capsule())
                }
                .buttonStyle(.plain)
                .disabled(passphrase.isEmpty)
                .opacity(passphrase.isEmpty ? 0.5 : 1.0)
            }
            .padding(.bottom, FlynnTheme.Layout.spacing16)
        }
        .padding(FlynnTheme.Layout.spacing24)
        .background(.regularMaterial)
        .clipShape(RoundedRectangle(cornerRadius: FlynnTheme.Layout.cornerRadiusLarge))
        .shadow(color: .black.opacity(0.15), radius: 20, y: 10)
        .onAppear {
            isTextFieldFocused = true
        }
    }

    private func verifyPassphrase() {
        if KeychainHelper.verifyPassphrase(passphrase) {
            onAuthenticated()
        } else {
            showError = true
            triggerShakeAnimation()
            passphrase = ""
        }
    }

    private func triggerShakeAnimation() {
        withAnimation(.easeInOut(duration: 0.08)) {
            shakeOffset = 10
        }
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.08) {
            withAnimation(.easeInOut(duration: 0.08)) {
                shakeOffset = -10
            }
        }
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.16) {
            withAnimation(.easeInOut(duration: 0.08)) {
                shakeOffset = 8
            }
        }
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.24) {
            withAnimation(.easeInOut(duration: 0.08)) {
                shakeOffset = -6
            }
        }
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.32) {
            withAnimation(.easeInOut(duration: 0.08)) {
                shakeOffset = 0
            }
        }
    }
}

#Preview {
    ZStack {
        Color.black.opacity(0.3)
            .ignoresSafeArea()

        PassphrasePromptView(
            onAuthenticated: {},
            onCancel: {}
        )
    }
}
