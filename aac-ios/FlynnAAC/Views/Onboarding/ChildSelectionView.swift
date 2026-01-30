import SwiftUI

/// Child model for onboarding selection
struct SelectableChild: Codable, Identifiable {
    let id: String
    let name: String
    let dateOfBirth: String?
    let profileImageUrl: String?
}

/// Onboarding view for selecting which child this device is registered to
///
/// Design principles:
/// - Uses Liquid Glass for navigation layer (not content)
/// - Applies Regular variant for automatic legibility
/// - Uses semantic colors and SF Symbols
/// - Provides sensory feedback via modern `.sensoryFeedback` modifier
/// - Adopts iOS 26 containerRelativeShape for visual harmony
struct ChildSelectionView: View {
    @StateObject private var deviceManager = DeviceManager.shared
    @State private var children: [SelectableChild] = []
    @State private var selectedChildId: String?
    @State private var isLoading = true
    @State private var errorMessage: String?
    @State private var successTrigger = false

    let onComplete: () -> Void

    var body: some View {
        ZStack {
            // Background - use semantic colors, not custom gradients
            Color(.systemGroupedBackground)
                .ignoresSafeArea()

            VStack(spacing: 40) {
                // Header
                headerView
                    .padding(.top, 60)

                // Content (not using Liquid Glass - content layer)
                Group {
                    if isLoading {
                        loadingView
                    } else if let errorMessage = errorMessage {
                        errorView(message: errorMessage)
                    } else if children.isEmpty {
                        emptyStateView
                    } else {
                        childrenListView
                    }
                }

                Spacer()
            }
            .padding()
        }
        .task {
            await loadChildren()
        }
    }

    // MARK: - Header

    private var headerView: some View {
        VStack(spacing: 16) {
            // App icon - using SF Symbol for consistency
            Image(systemName: "brain.head.profile")
                .font(.system(size: 64, weight: .medium))
                .foregroundStyle(.tint)
                .symbolRenderingMode(.hierarchical)
                .symbolEffect(.pulse.byLayer, options: .repeating, isActive: isLoading)

            Text("Flynn AAC")
                .font(.largeTitle.weight(.bold))
                .foregroundStyle(.primary)

            VStack(spacing: 8) {
                Text("Select Child")
                    .font(.title2.weight(.semibold))
                    .foregroundStyle(.primary)

                Text("Choose which child will use this device")
                    .font(.body)
                    .foregroundStyle(.secondary)
                    .multilineTextAlignment(.center)
            }
        }
    }

    // MARK: - Loading View

    private var loadingView: some View {
        VStack(spacing: 20) {
            ProgressView()
                .controlSize(.large)

            Text("Loading children...")
                .font(.subheadline)
                .foregroundStyle(.secondary)
        }
        .padding(60)
    }

    // MARK: - Error View

    private func errorView(message: String) -> some View {
        VStack(spacing: 24) {
            Image(systemName: "exclamationmark.triangle.fill")
                .font(.system(size: 56))
                .foregroundStyle(.orange)
                .symbolEffect(.bounce, value: errorMessage)

            VStack(spacing: 12) {
                Text("Unable to Load Children")
                    .font(.headline)
                    .foregroundStyle(.primary)

                Text(message)
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                    .multilineTextAlignment(.center)
                    .fixedSize(horizontal: false, vertical: true)
            }

            Button {
                Task {
                    await loadChildren()
                }
            } label: {
                Label("Try Again", systemImage: "arrow.clockwise")
                    .font(.body.weight(.semibold))
            }
            .buttonStyle(.borderedProminent)
            .controlSize(.large)
            .sensoryFeedback(.impact, trigger: errorMessage)
        }
        .padding(40)
        .frame(maxWidth: 480)
    }

    // MARK: - Empty State

    private var emptyStateView: some View {
        VStack(spacing: 24) {
            Image(systemName: "person.2.slash.fill")
                .font(.system(size: 56))
                .foregroundStyle(.secondary)
                .symbolEffect(.pulse)

            VStack(spacing: 12) {
                Text("No Children Found")
                    .font(.headline)
                    .foregroundStyle(.primary)

                Text("Please add a child to your family in the web dashboard first.")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                    .multilineTextAlignment(.center)
                    .fixedSize(horizontal: false, vertical: true)
            }
        }
        .padding(40)
        .frame(maxWidth: 480)
    }

    // MARK: - Children List

    private var childrenListView: some View {
        VStack(spacing: 24) {
            ScrollView {
                VStack(spacing: 16) {
                    ForEach(children) { child in
                        childCard(child)
                    }
                }
                .padding(.horizontal, 4)
            }
            .scrollIndicators(.hidden)

            // Continue Button - uses Liquid Glass (navigation layer)
            Button {
                completeSelection()
            } label: {
                Text("Continue")
                    .font(.body.weight(.semibold))
                    .frame(maxWidth: .infinity)
                    .frame(height: 54)
            }
            .buttonStyle(.borderedProminent)
            .controlSize(.large)
            .disabled(selectedChildId == nil)
            .glassEffect() // Liquid Glass for navigation control
            .sensoryFeedback(.success, trigger: successTrigger)
            .padding(.horizontal)
            .padding(.bottom, 8)
        }
    }

    // MARK: - Child Card

    private func childCard(_ child: SelectableChild) -> some View {
        Button {
            withAnimation(.spring(response: 0.35, dampingFraction: 0.7)) {
                selectedChildId = child.id
            }
        } label: {
            HStack(spacing: 16) {
                // Avatar with SF Symbol
                ZStack {
                    Circle()
                        .fill(.tint.opacity(0.15))
                        .frame(width: 64, height: 64)

                    if let firstLetter = child.name.first {
                        Text(String(firstLetter).uppercased())
                            .font(.title.weight(.bold))
                            .foregroundStyle(.tint)
                    } else {
                        Image(systemName: "person.fill")
                            .font(.title2)
                            .foregroundStyle(.tint)
                    }
                }

                // Name and info
                VStack(alignment: .leading, spacing: 6) {
                    Text(child.name)
                        .font(.headline)
                        .foregroundStyle(.primary)

                    if let dob = child.dateOfBirth {
                        Label(formatDateOfBirth(dob), systemImage: "calendar")
                            .font(.subheadline)
                            .foregroundStyle(.secondary)
                    }
                }

                Spacer()

                // Selection indicator with SF Symbol animation
                if selectedChildId == child.id {
                    Image(systemName: "checkmark.circle.fill")
                        .font(.title2)
                        .foregroundStyle(.tint)
                        .symbolEffect(.bounce, value: selectedChildId)
                        .transition(.scale.combined(with: .opacity))
                }
            }
            .padding(20)
            .background {
                RoundedRectangle(cornerRadius: 20, style: .continuous)
                    .fill(Color(.secondarySystemGroupedBackground))
                    .shadow(
                        color: .black.opacity(selectedChildId == child.id ? 0.1 : 0.05),
                        radius: selectedChildId == child.id ? 12 : 6,
                        y: selectedChildId == child.id ? 6 : 3
                    )
            }
            .overlay {
                RoundedRectangle(cornerRadius: 20, style: .continuous)
                    .strokeBorder(.tint.opacity(selectedChildId == child.id ? 0.5 : 0), lineWidth: 2)
            }
            .scaleEffect(selectedChildId == child.id ? 1.02 : 1.0)
            .containerRelativeShape(.roundedRectangle) // iOS 26 - visual harmony
        }
        .buttonStyle(.plain)
        .sensoryFeedback(.selection, trigger: selectedChildId)
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

        // Trigger sensory feedback
        successTrigger.toggle()

        print("✅ ChildSelectionView: Device registered to child \(childId)")

        // Complete onboarding with slight delay for feedback
        Task {
            try? await Task.sleep(for: .milliseconds(300))
            onComplete()
        }
    }

    private func formatDateOfBirth(_ dateString: String) -> String {
        // Parse ISO date and calculate age
        let formatter = ISO8601DateFormatter()
        guard let date = formatter.date(from: dateString) else {
            return "Unknown age"
        }

        let calendar = Calendar.current
        let now = Date()
        let ageComponents = calendar.dateComponents([.year], from: date, to: now)

        if let years = ageComponents.year, years > 0 {
            return "\(years) year\(years == 1 ? "" : "s") old"
        }

        return "Under 1 year"
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

#Preview("With Children") {
    ChildSelectionView {
        print("Onboarding complete")
    }
}

#Preview("Loading") {
    ChildSelectionView {
        print("Onboarding complete")
    }
}

#Preview("Empty State") {
    ChildSelectionView {
        print("Onboarding complete")
    }
}
