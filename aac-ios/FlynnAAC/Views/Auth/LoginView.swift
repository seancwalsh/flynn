import SwiftUI

/// Login screen for email/password authentication
struct LoginView: View {
    @ObservedObject var authService: AuthService
    @State private var email = ""
    @State private var password = ""
    @State private var showPassword = false
    @State private var showRegistration = false
    @FocusState private var focusedField: Field?
    
    enum Field: Hashable {
        case email, password
    }
    
    var body: some View {
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
                VStack(spacing: 32) {
                    // Logo and title
                    VStack(spacing: 8) {
                        Text("Flynn")
                            .font(.custom("Bradley Hand", size: 56))
                            .fontWeight(.bold)
                            .foregroundStyle(
                                LinearGradient(
                                    colors: [
                                        Color(red: 0.36, green: 0.55, blue: 0.87),
                                        Color(red: 0.58, green: 0.44, blue: 0.78)
                                    ],
                                    startPoint: .leading,
                                    endPoint: .trailing
                                )
                            )
                        
                        Text("AAC")
                            .font(.system(size: 18, weight: .medium, design: .rounded))
                            .foregroundStyle(.secondary)
                        
                        Text("Augmentative & Alternative Communication")
                            .font(.system(size: 14, design: .rounded))
                            .foregroundStyle(.tertiary)
                            .padding(.top, 4)
                    }
                    .padding(.top, 60)
                    
                    // Login form
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
                                        TextField("Enter your password", text: $password)
                                    } else {
                                        SecureField("Enter your password", text: $password)
                                    }
                                }
                                .textContentType(.password)
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
                        }
                        
                        // Error message
                        if let error = authService.lastError {
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
                        
                        // Login button
                        Button {
                            Task {
                                await login()
                            }
                        } label: {
                            Group {
                                if authService.isLoading {
                                    ProgressView()
                                        .tint(.white)
                                } else {
                                    Text("Sign In")
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
                    
                    // Create account link
                    VStack(spacing: 16) {
                        Divider()
                            .padding(.horizontal, 24)
                        
                        HStack {
                            Text("Don't have an account?")
                                .foregroundStyle(.secondary)
                            
                            Button("Create one") {
                                showRegistration = true
                            }
                            .fontWeight(.semibold)
                            .foregroundStyle(Color(red: 0.36, green: 0.55, blue: 0.87))
                        }
                        .font(.system(size: 15))
                    }
                    
                    Spacer()
                }
            }
        }
        .sheet(isPresented: $showRegistration) {
            RegisterView(authService: authService)
        }
        .onSubmit {
            switch focusedField {
            case .email:
                focusedField = .password
            case .password:
                Task { await login() }
            case .none:
                break
            }
        }
    }
    
    private var isFormValid: Bool {
        !email.isEmpty && !password.isEmpty && email.contains("@")
    }
    
    private func login() async {
        authService.clearError()
        focusedField = nil
        
        do {
            try await authService.login(email: email, password: password)
        } catch {
            // Error is already stored in authService
        }
    }
}

#Preview {
    LoginView(authService: AuthService.shared)
}
