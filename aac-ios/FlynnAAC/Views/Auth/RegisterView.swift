import SwiftUI
import ClerkSDK

/// Registration screen using Clerk authentication
struct RegisterView: View {
    @ObservedObject var authService: AuthService
    @Environment(\.dismiss) private var dismiss
    
    @State private var email = ""
    @State private var password = ""
    @State private var confirmPassword = ""
    @State private var selectedRole: UserRole = .caregiver
    @State private var showPassword = false
    @State private var agreedToTerms = false
    @State private var showVerification = false
    @State private var verificationCode = ""
    @FocusState private var focusedField: Field?
    
    enum Field: Hashable {
        case email, password, confirmPassword, verificationCode
    }
    
    var body: some View {
        NavigationStack {
            ZStack {
                // Background gradient
                LinearGradient(
                    colors: [
                        Color(red: 0.95, green: 0.93, blue: 0.98),
                        Color(red: 0.92, green: 0.96, blue: 0.98),
                        Color(red: 0.96, green: 0.94, blue: 0.92)
                    ],
                    startPoint: .topLeading,
                    endPoint: .bottomTrailing
                )
                .ignoresSafeArea()
                
                ScrollView {
                    if showVerification {
                        verificationView
                    } else {
                        registrationForm
                    }
                }
            }
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Button("Cancel") {
                        dismiss()
                    }
                }
            }
        }
    }
    
    // MARK: - Registration Form
    
    private var registrationForm: some View {
        VStack(spacing: 24) {
            // Header
            VStack(spacing: 8) {
                Text("Create Account")
                    .font(.system(size: 28, weight: .bold, design: .rounded))
                
                Text("Join Flynn to help your child communicate")
                    .font(.system(size: 15))
                    .foregroundStyle(.secondary)
                    .multilineTextAlignment(.center)
            }
            .padding(.top, 20)
            
            // Registration form
            VStack(spacing: 16) {
                // Email field
                VStack(alignment: .leading, spacing: 6) {
                    Text("Email")
                        .font(.system(size: 14, weight: .medium))
                        .foregroundStyle(.secondary)
                    
                    TextField("Enter your email", text: $email)
                        .textContentType(.emailAddress)
                        .keyboardType(.emailAddress)
                        .autocapitalization(.none)
                        .autocorrectionDisabled()
                        .focused($focusedField, equals: .email)
                        .padding()
                        .background(
                            RoundedRectangle(cornerRadius: 12)
                                .fill(.white.opacity(0.8))
                                .shadow(color: .black.opacity(0.05), radius: 2, y: 1)
                        )
                }
                
                // Password field
                VStack(alignment: .leading, spacing: 6) {
                    Text("Password")
                        .font(.system(size: 14, weight: .medium))
                        .foregroundStyle(.secondary)
                    
                    HStack {
                        Group {
                            if showPassword {
                                TextField("At least 8 characters", text: $password)
                            } else {
                                SecureField("At least 8 characters", text: $password)
                            }
                        }
                        .textContentType(.newPassword)
                        .autocapitalization(.none)
                        .autocorrectionDisabled()
                        .focused($focusedField, equals: .password)
                        
                        Button {
                            showPassword.toggle()
                        } label: {
                            Image(systemName: showPassword ? "eye.slash" : "eye")
                                .foregroundStyle(.secondary)
                        }
                    }
                    .padding()
                    .background(
                        RoundedRectangle(cornerRadius: 12)
                            .fill(.white.opacity(0.8))
                            .shadow(color: .black.opacity(0.05), radius: 2, y: 1)
                    )
                    
                    if !password.isEmpty && password.count < 8 {
                        Text("Password must be at least 8 characters")
                            .font(.system(size: 12))
                            .foregroundStyle(.red)
                    }
                }
                
                // Confirm password field
                VStack(alignment: .leading, spacing: 6) {
                    Text("Confirm Password")
                        .font(.system(size: 14, weight: .medium))
                        .foregroundStyle(.secondary)
                    
                    SecureField("Re-enter your password", text: $confirmPassword)
                        .textContentType(.newPassword)
                        .autocapitalization(.none)
                        .autocorrectionDisabled()
                        .focused($focusedField, equals: .confirmPassword)
                        .padding()
                        .background(
                            RoundedRectangle(cornerRadius: 12)
                                .fill(.white.opacity(0.8))
                                .shadow(color: .black.opacity(0.05), radius: 2, y: 1)
                        )
                    
                    if !confirmPassword.isEmpty && password != confirmPassword {
                        Text("Passwords don't match")
                            .font(.system(size: 12))
                            .foregroundStyle(.red)
                    }
                }
                
                // Role picker
                VStack(alignment: .leading, spacing: 6) {
                    Text("I am a...")
                        .font(.system(size: 14, weight: .medium))
                        .foregroundStyle(.secondary)
                    
                    Picker("Role", selection: $selectedRole) {
                        Text("Parent / Caregiver").tag(UserRole.caregiver)
                        Text("Speech Therapist").tag(UserRole.therapist)
                    }
                    .pickerStyle(.segmented)
                }
                
                // Terms checkbox
                HStack(alignment: .top, spacing: 12) {
                    Button {
                        agreedToTerms.toggle()
                    } label: {
                        Image(systemName: agreedToTerms ? "checkmark.square.fill" : "square")
                            .foregroundStyle(agreedToTerms ? Color(red: 0.36, green: 0.55, blue: 0.87) : .secondary)
                            .font(.system(size: 22))
                    }
                    
                    Text("I agree to the Terms of Service and Privacy Policy")
                        .font(.system(size: 14))
                        .foregroundStyle(.secondary)
                }
                .padding(.top, 8)
                
                // Error message
                if let error = authService.lastError, error.code != "VERIFICATION_NEEDED" {
                    HStack {
                        Image(systemName: "exclamationmark.triangle.fill")
                            .foregroundStyle(.red)
                        Text(error.localizedDescription)
                            .font(.system(size: 14))
                            .foregroundStyle(.red)
                    }
                    .padding(.horizontal)
                    .padding(.vertical, 8)
                    .background(
                        RoundedRectangle(cornerRadius: 8)
                            .fill(.red.opacity(0.1))
                    )
                }
                
                // Register button
                Button {
                    Task {
                        await register()
                    }
                } label: {
                    Group {
                        if authService.isLoading {
                            ProgressView()
                                .tint(.white)
                        } else {
                            Text("Create Account")
                                .font(.system(size: 17, weight: .semibold))
                        }
                    }
                    .frame(maxWidth: .infinity)
                    .frame(height: 50)
                    .foregroundStyle(.white)
                    .background(
                        RoundedRectangle(cornerRadius: 12)
                            .fill(
                                LinearGradient(
                                    colors: [
                                        Color(red: 0.36, green: 0.55, blue: 0.87),
                                        Color(red: 0.58, green: 0.44, blue: 0.78)
                                    ],
                                    startPoint: .leading,
                                    endPoint: .trailing
                                )
                            )
                    )
                }
                .disabled(authService.isLoading || !isFormValid)
                .opacity(isFormValid ? 1 : 0.6)
                .padding(.top, 8)
            }
            .padding(.horizontal, 24)
            
            Spacer()
        }
        .onSubmit {
            switch focusedField {
            case .email:
                focusedField = .password
            case .password:
                focusedField = .confirmPassword
            case .confirmPassword:
                Task { await register() }
            default:
                break
            }
        }
    }
    
    // MARK: - Verification View
    
    private var verificationView: some View {
        VStack(spacing: 24) {
            // Header
            VStack(spacing: 8) {
                Image(systemName: "envelope.badge")
                    .font(.system(size: 60))
                    .foregroundStyle(Color(red: 0.36, green: 0.55, blue: 0.87))
                
                Text("Verify Your Email")
                    .font(.system(size: 28, weight: .bold, design: .rounded))
                
                Text("We sent a verification code to\n\(email)")
                    .font(.system(size: 15))
                    .foregroundStyle(.secondary)
                    .multilineTextAlignment(.center)
            }
            .padding(.top, 40)
            
            // Verification code field
            VStack(alignment: .leading, spacing: 6) {
                Text("Verification Code")
                    .font(.system(size: 14, weight: .medium))
                    .foregroundStyle(.secondary)
                
                TextField("Enter 6-digit code", text: $verificationCode)
                    .keyboardType(.numberPad)
                    .textContentType(.oneTimeCode)
                    .focused($focusedField, equals: .verificationCode)
                    .padding()
                    .background(
                        RoundedRectangle(cornerRadius: 12)
                            .fill(.white.opacity(0.8))
                            .shadow(color: .black.opacity(0.05), radius: 2, y: 1)
                    )
                    .font(.system(size: 24, weight: .medium, design: .monospaced))
                    .multilineTextAlignment(.center)
            }
            .padding(.horizontal, 24)
            
            // Error message
            if let error = authService.lastError, error.code != "VERIFICATION_NEEDED" {
                HStack {
                    Image(systemName: "exclamationmark.triangle.fill")
                        .foregroundStyle(.red)
                    Text(error.localizedDescription)
                        .font(.system(size: 14))
                        .foregroundStyle(.red)
                }
                .padding(.horizontal)
                .padding(.vertical, 8)
                .background(
                    RoundedRectangle(cornerRadius: 8)
                        .fill(.red.opacity(0.1))
                )
                .padding(.horizontal, 24)
            }
            
            // Verify button
            Button {
                Task {
                    await verifyEmail()
                }
            } label: {
                Group {
                    if authService.isLoading {
                        ProgressView()
                            .tint(.white)
                    } else {
                        Text("Verify Email")
                            .font(.system(size: 17, weight: .semibold))
                    }
                }
                .frame(maxWidth: .infinity)
                .frame(height: 50)
                .foregroundStyle(.white)
                .background(
                    RoundedRectangle(cornerRadius: 12)
                        .fill(
                            LinearGradient(
                                colors: [
                                    Color(red: 0.36, green: 0.55, blue: 0.87),
                                    Color(red: 0.58, green: 0.44, blue: 0.78)
                                ],
                                startPoint: .leading,
                                endPoint: .trailing
                            )
                        )
                )
            }
            .disabled(authService.isLoading || verificationCode.count < 6)
            .opacity(verificationCode.count >= 6 ? 1 : 0.6)
            .padding(.horizontal, 24)
            .padding(.top, 8)
            
            // Back button
            Button("Use a different email") {
                showVerification = false
                verificationCode = ""
                authService.clearError()
            }
            .font(.system(size: 15))
            .foregroundStyle(.secondary)
            
            Spacer()
        }
    }
    
    // MARK: - Helpers
    
    private var isFormValid: Bool {
        !email.isEmpty &&
        email.contains("@") &&
        password.count >= 8 &&
        password == confirmPassword &&
        agreedToTerms
    }
    
    private func register() async {
        authService.clearError()
        focusedField = nil
        
        do {
            try await authService.signUp(email: email, password: password, role: selectedRole)
            dismiss()
        } catch let error as APIError {
            // Check if we need email verification
            if error.code == "VERIFICATION_NEEDED" {
                withAnimation {
                    showVerification = true
                }
            }
            // Other errors are already stored in authService
        } catch {
            // Error is already stored in authService
        }
    }
    
    private func verifyEmail() async {
        authService.clearError()
        focusedField = nil
        
        do {
            try await authService.verifyEmail(code: verificationCode)
            dismiss()
        } catch {
            // Error is already stored in authService
        }
    }
}

#Preview {
    RegisterView(authService: AuthService.shared)
}
