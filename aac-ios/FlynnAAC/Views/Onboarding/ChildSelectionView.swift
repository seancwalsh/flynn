import SwiftUI
import UIKit

/// Child model for onboarding selection
struct SelectableChild: Codable, Identifiable {
    let id: String
    let name: String
    let dateOfBirth: String?
    let profileImageUrl: String?
}

/// Onboarding view for selecting which child this device is registered to
struct ChildSelectionView: View {
    @StateObject private var deviceManager = DeviceManager.shared
    @State private var children: [SelectableChild] = []
    @State private var selectedChildId: String?
    @State private var isLoading = true
    @State private var errorMessage: String?

    let onComplete: () -> Void

    var body: some View {
        ZStack {
            // Beautiful gradient background matching app style
            LinearGradient(
                colors: [
                    Color(red: 0.95, green: 0.93, blue: 0.98),  // Soft lavender
                    Color(red: 0.92, green: 0.96, blue: 0.98),  // Soft blue
                    Color(red: 0.96, green: 0.94, blue: 0.92)   // Warm cream
                ],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
            .ignoresSafeArea()

            VStack(spacing: 32) {
                // Header
                VStack(spacing: 12) {
                    Text("Flynn")
                        .font(.custom("Bradley Hand", size: 48))
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

                    Text("Select Child")
                        .font(.title2)
                        .fontWeight(.semibold)
                        .foregroundColor(.primary)

                    Text("Choose which child will use this device")
                        .font(.body)
                        .foregroundColor(.secondary)
                        .multilineTextAlignment(.center)
                        .padding(.horizontal)
                }
                .padding(.top, 60)

                // Content
                if isLoading {
                    loadingView
                } else if let errorMessage = errorMessage {
                    errorView(message: errorMessage)
                } else if children.isEmpty {
                    emptyStateView
                } else {
                    childrenListView
                }

                Spacer()
            }
            .padding()
        }
        .task {
            await loadChildren()
        }
    }

    // MARK: - Loading View

    private var loadingView: some View {
        VStack(spacing: 16) {
            ProgressView()
                .scaleEffect(1.5)

            Text("Loading children...")
                .font(.subheadline)
                .foregroundColor(.secondary)
        }
        .padding(40)
    }

    // MARK: - Error View

    private func errorView(message: String) -> some View {
        VStack(spacing: 20) {
            Image(systemName: "exclamationmark.triangle.fill")
                .font(.system(size: 48))
                .foregroundColor(.orange)

            Text("Unable to Load Children")
                .font(.headline)

            Text(message)
                .font(.subheadline)
                .foregroundColor(.secondary)
                .multilineTextAlignment(.center)
                .padding(.horizontal)

            Button(action: {
                Task {
                    await loadChildren()
                }
            }) {
                Label("Try Again", systemImage: "arrow.clockwise")
                    .font(.body.weight(.semibold))
                    .foregroundColor(.white)
                    .padding(.horizontal, 24)
                    .padding(.vertical, 12)
                    .background(
                        LinearGradient(
                            colors: [
                                Color(red: 0.36, green: 0.55, blue: 0.87),
                                Color(red: 0.58, green: 0.44, blue: 0.78)
                            ],
                            startPoint: .leading,
                            endPoint: .trailing
                        )
                    )
                    .cornerRadius(12)
            }
        }
        .padding(40)
    }

    // MARK: - Empty State View

    private var emptyStateView: some View {
        VStack(spacing: 20) {
            Image(systemName: "person.2.slash")
                .font(.system(size: 48))
                .foregroundColor(.secondary)

            Text("No Children Found")
                .font(.headline)

            Text("Please add a child to your family in the web dashboard first.")
                .font(.subheadline)
                .foregroundColor(.secondary)
                .multilineTextAlignment(.center)
                .padding(.horizontal)
        }
        .padding(40)
    }

    // MARK: - Children List View

    private var childrenListView: some View {
        VStack(spacing: 16) {
            ScrollView {
                VStack(spacing: 12) {
                    ForEach(children) { child in
                        childCard(child)
                    }
                }
                .padding(.horizontal)
            }

            // Continue Button
            Button(action: {
                completeSelection()
            }) {
                Text("Continue")
                    .font(.body.weight(.semibold))
                    .foregroundColor(.white)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 16)
                    .background(
                        selectedChildId != nil
                            ? LinearGradient(
                                colors: [
                                    Color(red: 0.36, green: 0.55, blue: 0.87),
                                    Color(red: 0.58, green: 0.44, blue: 0.78)
                                ],
                                startPoint: .leading,
                                endPoint: .trailing
                            )
                            : LinearGradient(
                                colors: [Color.gray.opacity(0.5)],
                                startPoint: .leading,
                                endPoint: .trailing
                            )
                    )
                    .cornerRadius(16)
            }
            .disabled(selectedChildId == nil)
            .padding(.horizontal)
            .padding(.bottom, 20)
        }
    }

    // MARK: - Child Card

    private func childCard(_ child: SelectableChild) -> some View {
        Button(action: {
            withAnimation(.spring(response: 0.3)) {
                selectedChildId = child.id
            }
        }) {
            HStack(spacing: 16) {
                // Avatar
                ZStack {
                    Circle()
                        .fill(
                            LinearGradient(
                                colors: [
                                    Color(red: 0.36, green: 0.55, blue: 0.87).opacity(0.3),
                                    Color(red: 0.58, green: 0.44, blue: 0.78).opacity(0.3)
                                ],
                                startPoint: .topLeading,
                                endPoint: .bottomTrailing
                            )
                        )
                        .frame(width: 56, height: 56)

                    Text(child.name.prefix(1).uppercased())
                        .font(.title2.weight(.bold))
                        .foregroundColor(Color(red: 0.36, green: 0.55, blue: 0.87))
                }

                // Name and info
                VStack(alignment: .leading, spacing: 4) {
                    Text(child.name)
                        .font(.headline)
                        .foregroundColor(.primary)

                    if let dob = child.dateOfBirth {
                        Text(formatDateOfBirth(dob))
                            .font(.subheadline)
                            .foregroundColor(.secondary)
                    }
                }

                Spacer()

                // Checkmark
                if selectedChildId == child.id {
                    Image(systemName: "checkmark.circle.fill")
                        .font(.title2)
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
                        .transition(.scale.combined(with: .opacity))
                }
            }
            .padding(16)
            .background(
                RoundedRectangle(cornerRadius: 16)
                    .fill(Color.white.opacity(0.7))
                    .shadow(
                        color: selectedChildId == child.id
                            ? Color(red: 0.36, green: 0.55, blue: 0.87).opacity(0.3)
                            : Color.black.opacity(0.05),
                        radius: selectedChildId == child.id ? 12 : 8,
                        y: 4
                    )
            )
            .overlay(
                RoundedRectangle(cornerRadius: 16)
                    .stroke(
                        selectedChildId == child.id
                            ? LinearGradient(
                                colors: [
                                    Color(red: 0.36, green: 0.55, blue: 0.87),
                                    Color(red: 0.58, green: 0.44, blue: 0.78)
                                ],
                                startPoint: .leading,
                                endPoint: .trailing
                            )
                            : LinearGradient(colors: [Color.clear], startPoint: .leading, endPoint: .trailing),
                        lineWidth: 2
                    )
            )
            .scaleEffect(selectedChildId == child.id ? 1.02 : 1.0)
        }
        .buttonStyle(.plain)
    }

    // MARK: - Actions

    private func loadChildren() async {
        isLoading = true
        errorMessage = nil

        do {
            // Fetch children from backend
            let response: ChildrenResponse = try await APIClient.shared.get(path: "/children")
            children = response.data.map { child in
                SelectableChild(
                    id: child.id,
                    name: child.name,
                    dateOfBirth: child.dateOfBirth,
                    profileImageUrl: child.profileImageUrl
                )
            }

            isLoading = false

            print("✅ ChildSelectionView: Loaded \(children.count) children")
        } catch {
            isLoading = false
            errorMessage = "Failed to load children. Please check your internet connection and try again."

            print("❌ ChildSelectionView: Failed to load children: \(error)")
        }
    }

    private func completeSelection() {
        guard let childId = selectedChildId else { return }

        // Register device to selected child
        deviceManager.registerDevice(childId: childId)

        // Trigger haptic feedback
        let generator = UINotificationFeedbackGenerator()
        generator.notificationOccurred(.success)

        print("✅ ChildSelectionView: Device registered to child \(childId)")

        // Complete onboarding
        onComplete()
    }

    private func formatDateOfBirth(_ dateString: String) -> String {
        // Parse ISO date and calculate age
        let formatter = ISO8601DateFormatter()
        guard let date = formatter.date(from: dateString) else {
            return ""
        }

        let calendar = Calendar.current
        let now = Date()
        let ageComponents = calendar.dateComponents([.year], from: date, to: now)

        if let years = ageComponents.year {
            return "\(years) year\(years == 1 ? "" : "s") old"
        }

        return ""
    }
}

// MARK: - API Response Models

private struct ChildrenResponse: Codable {
    let data: [ChildData]
}

private struct ChildData: Codable {
    let id: String
    let name: String
    let dateOfBirth: String?
    let profileImageUrl: String?
}

// MARK: - Preview

#Preview {
    ChildSelectionView {
        print("Onboarding complete")
    }
}
