import SwiftUI

// MARK: - Flynn Design System
// A warm, sensory-friendly visual foundation for a child with autism
// who has sensitivities to bright colors, high contrast, and busy patterns.
//
// Design Philosophy:
// - Calm, warm, distraction-free
// - Symbols do the talking, UI disappears
// - No bright primaries, no harsh contrast, no visual noise

/// The central theme configuration for Flynn AAC
enum FlynnTheme {

    // MARK: - Colors

    /// Color tokens for both light and dark modes
    /// All colors are warm and muted - no bright primaries
    enum Colors {

        // MARK: Backgrounds
        // Light mode: warm paper texture feel (cream/off-white)
        // Dark mode: warm charcoal (NOT pure black)

        /// Primary background - the main canvas
        /// Light: warm cream (#FAF8F5), Dark: warm charcoal (#1C1917)
        static let background = Color("Background", bundle: .main)

        /// Secondary background - cards, elevated surfaces
        /// Light: slightly warmer (#F5F2ED), Dark: elevated charcoal (#292524)
        static let surface = Color("Surface", bundle: .main)

        /// Tertiary background - subtle differentiation
        /// Light: warm gray (#EDEAE5), Dark: deeper charcoal (#1A1715)
        static let surfaceSecondary = Color("SurfaceSecondary", bundle: .main)

        // MARK: Text Colors
        // Warm grays, never pure black or white

        /// Primary text - high readability, warm tone
        /// Light: warm near-black (#2D2926), Dark: warm off-white (#F5F2ED)
        static let textPrimary = Color("TextPrimary", bundle: .main)

        /// Secondary text - supporting information
        /// Light: warm gray (#6B6560), Dark: warm light gray (#A8A29E)
        static let textSecondary = Color("TextSecondary", bundle: .main)

        /// Muted text - timestamps, hints
        /// Light: warm light gray (#9C9690), Dark: warm mid gray (#78716C)
        static let textMuted = Color("TextMuted", bundle: .main)

        // MARK: Borders & Separators
        // Subtle, warm, never harsh

        /// Grid lines and subtle borders - barely visible
        /// Light: warm gray at 30% (#D6D3CE), Dark: warm gray at 20% (#3D3835)
        static let border = Color("Border", bundle: .main)

        /// Stronger borders when needed
        /// Light: warm gray (#C4C0BA), Dark: warm gray (#525048)
        static let borderStrong = Color("BorderStrong", bundle: .main)

        // MARK: Accent Colors
        // Desaturated, gentle, warm-leaning

        /// Primary accent - for interactive elements
        /// A warm, muted terracotta/amber tone
        static let accent = Color("Accent", bundle: .main)

        /// Accent hover/pressed state
        static let accentPressed = Color("AccentPressed", bundle: .main)

        // MARK: LAMP Category Colors (Semantic Word Types)
        // Muted versions for motor planning color-coding
        // These help with visual consistency but are never bright

        /// Verbs - soft sage green
        /// Actions like "want", "go", "eat"
        static let categoryVerb = Color("CategoryVerb", bundle: .main)

        /// Nouns - dusty yellow/ochre
        /// Objects like "apple", "water", "book"
        static let categoryNoun = Color("CategoryNoun", bundle: .main)

        /// Descriptors - soft lavender/muted purple
        /// Adjectives like "big", "hot", "more"
        static let categoryDescriptor = Color("CategoryDescriptor", bundle: .main)

        /// Social/Pragmatic - muted rose
        /// Words like "please", "thank you", "hi"
        static let categorySocial = Color("CategorySocial", bundle: .main)

        /// Questions - dusty blue
        /// Words like "what", "where", "who"
        static let categoryQuestion = Color("CategoryQuestion", bundle: .main)

        /// Pronouns/People - warm sand
        /// Words like "I", "you", "mommy"
        static let categoryPronoun = Color("CategoryPronoun", bundle: .main)

        /// Prepositions/Location - muted teal
        /// Words like "in", "on", "under"
        static let categoryPreposition = Color("CategoryPreposition", bundle: .main)

        /// Miscellaneous - neutral warm gray
        /// For symbols that don't fit categories
        static let categoryMisc = Color("CategoryMisc", bundle: .main)

        // MARK: Semantic Colors
        // For status indicators - warm/muted versions

        /// Success - muted sage (not bright green)
        static let success = Color("Success", bundle: .main)

        /// Warning - muted amber (not bright yellow)
        static let warning = Color("Warning", bundle: .main)

        /// Error - muted rose (not bright red)
        /// Used sparingly - errors should be calm, not alarming
        static let error = Color("Error", bundle: .main)

        // MARK: Hardcoded Fallbacks
        // When asset catalog colors aren't available

        enum Fallback {
            // Light mode
            static let backgroundLight = Color(red: 0.98, green: 0.97, blue: 0.96) // #FAF8F5
            static let surfaceLight = Color(red: 0.96, green: 0.95, blue: 0.93)    // #F5F2ED
            static let textPrimaryLight = Color(red: 0.18, green: 0.16, blue: 0.15) // #2D2926

            // Dark mode - warm charcoal, NOT pure black
            static let backgroundDark = Color(red: 0.11, green: 0.10, blue: 0.09)   // #1C1917
            static let surfaceDark = Color(red: 0.16, green: 0.14, blue: 0.14)      // #292524
            static let textPrimaryDark = Color(red: 0.96, green: 0.95, blue: 0.93)  // #F5F2ED

            // LAMP categories (work in both modes)
            static let verb = Color(red: 0.58, green: 0.68, blue: 0.55)        // Sage green
            static let noun = Color(red: 0.80, green: 0.72, blue: 0.52)        // Dusty yellow
            static let descriptor = Color(red: 0.65, green: 0.60, blue: 0.72)  // Soft lavender
            static let social = Color(red: 0.78, green: 0.58, blue: 0.60)      // Muted rose
            static let question = Color(red: 0.55, green: 0.65, blue: 0.72)    // Dusty blue
            static let pronoun = Color(red: 0.78, green: 0.72, blue: 0.62)     // Warm sand
            static let preposition = Color(red: 0.52, green: 0.68, blue: 0.68) // Muted teal
        }
    }

    // MARK: - Typography

    /// Typography scale designed for:
    /// - High legibility at small sizes
    /// - Bulgarian Cyrillic and English Latin support
    /// - Clean, calm appearance
    enum Typography {

        // MARK: Font Families

        /// Primary font for symbol labels and UI
        /// System font with rounded design for warmth
        static let primaryFamily = Font.Design.rounded

        /// Monospace for any data display (rare in child app)
        static let monoFamily = Font.Design.monospaced

        // MARK: Symbol Label Sizes
        // These must be highly legible at small sizes

        /// Small grid (5x5 or larger) - compact but readable
        static let symbolLabelSmall = Font.system(size: 11, weight: .medium, design: primaryFamily)

        /// Medium grid (4x4) - standard size
        static let symbolLabelMedium = Font.system(size: 13, weight: .medium, design: primaryFamily)

        /// Large grid (3x3 or smaller) - maximum readability
        static let symbolLabelLarge = Font.system(size: 15, weight: .medium, design: primaryFamily)

        // MARK: UI Text

        /// Phrase bar text - slightly larger for the communication output
        static let phraseBar = Font.system(size: 16, weight: .medium, design: primaryFamily)

        /// Navigation text - buttons, toggles
        static let navigation = Font.system(size: 14, weight: .semibold, design: primaryFamily)

        /// Category folder labels
        static let categoryLabel = Font.system(size: 12, weight: .semibold, design: primaryFamily)

        /// Caption text - timestamps, hints
        static let caption = Font.system(size: 10, weight: .regular, design: primaryFamily)

        // MARK: Letter Spacing
        // Generous spacing improves readability, especially for Cyrillic

        /// Standard tracking for labels
        static let trackingStandard: CGFloat = 0.3

        /// Tighter tracking for larger text
        static let trackingTight: CGFloat = 0.1

        /// Wider tracking for small text
        static let trackingWide: CGFloat = 0.5
    }

    // MARK: - Layout & Spacing

    /// Spacing system based on 4px base unit
    /// Consistent, generous spacing creates calm visual rhythm
    enum Layout {

        // MARK: Base Unit
        /// 4px base unit for all spacing calculations
        static let unit: CGFloat = 4

        // MARK: Spacing Scale
        static let spacing2: CGFloat = unit * 0.5   // 2px - hairline
        static let spacing4: CGFloat = unit         // 4px - minimal
        static let spacing6: CGFloat = unit * 1.5   // 6px - compact
        static let spacing8: CGFloat = unit * 2    // 8px - tight
        static let spacing12: CGFloat = unit * 3   // 12px - compact
        static let spacing16: CGFloat = unit * 4   // 16px - standard
        static let spacing20: CGFloat = unit * 5   // 20px - comfortable
        static let spacing24: CGFloat = unit * 6   // 24px - generous
        static let spacing32: CGFloat = unit * 8   // 32px - spacious
        static let spacing48: CGFloat = unit * 12  // 48px - section
        static let spacing64: CGFloat = unit * 16  // 64px - large section

        // MARK: Touch Targets
        /// Minimum touch target size for accessibility
        /// Critical for motor planning - must be easy to tap accurately
        static let minimumTouchTarget: CGFloat = 60

        /// Recommended touch target for primary actions
        static let recommendedTouchTarget: CGFloat = 72

        // MARK: Grid Cell
        /// Padding inside each grid cell
        static let gridCellPadding: CGFloat = spacing8

        /// Space between grid cells
        static let gridCellSpacing: CGFloat = spacing4

        /// Grid line width - subtle, warm
        static let gridLineWidth: CGFloat = 1

        // MARK: Phrase Bar
        /// Height of the phrase bar
        static let phraseBarHeight: CGFloat = 72

        /// Padding inside phrase bar
        static let phraseBarPadding: CGFloat = spacing12

        /// Size of symbols in phrase bar
        static let phraseBarSymbolSize: CGFloat = 48

        // MARK: Screen Margins
        /// Standard screen edge padding
        static let screenMargin: CGFloat = spacing16

        /// Safe area additional padding
        static let safeAreaPadding: CGFloat = spacing8

        // MARK: Corner Radius
        /// Subtle rounding for warmth
        static let cornerRadiusSmall: CGFloat = 6
        static let cornerRadiusMedium: CGFloat = 10
        static let cornerRadiusLarge: CGFloat = 14
    }

    // MARK: - Animation

    /// Animation specs - minimal, gentle, never flashy
    /// Child has sensory sensitivities - animations must be calm
    enum Animation {

        // MARK: Tap Feedback
        /// Scale factor for tap feedback - subtle, not dramatic
        /// 105% maximum, as specified in design requirements
        static let tapScale: CGFloat = 1.05

        /// Duration of scale-up animation
        static let tapScaleUpDuration: Double = 0.08

        /// Duration of scale-down animation
        static let tapScaleDownDuration: Double = 0.12

        /// Opacity change on press
        static let pressedOpacity: Double = 0.85

        // MARK: Transitions
        /// Standard transition duration
        static let transitionDuration: Double = 0.2

        /// Quick transition for immediate feedback
        static let transitionQuick: Double = 0.12

        /// Slow transition for deliberate changes
        static let transitionSlow: Double = 0.35

        // MARK: Easing
        /// Standard easing curve - smooth, not bouncy
        static let standardEasing = SwiftUI.Animation.easeInOut(duration: transitionDuration)

        /// Quick easing for tap feedback
        static let quickEasing = SwiftUI.Animation.easeOut(duration: transitionQuick)

        /// Gentle easing for state changes
        static let gentleEasing = SwiftUI.Animation.easeInOut(duration: transitionSlow)

        // MARK: Spring (Minimal)
        /// Very subtle spring - barely perceptible bounce
        /// Used sparingly, if at all
        static let subtleSpring = SwiftUI.Animation.spring(response: 0.3, dampingFraction: 0.8)

        // MARK: What NOT to use
        // - No bouncy springs (dampingFraction < 0.7)
        // - No long animations (> 0.5s)
        // - No particle effects
        // - No playful wobbles
        // - No celebration animations
    }

    // MARK: - Shadows

    /// Shadow specs - subtle, warm, never harsh
    enum Shadows {

        /// Subtle elevation shadow
        static let subtle = Shadow(
            color: Color.black.opacity(0.06),
            radius: 4,
            x: 0,
            y: 2
        )

        /// Medium elevation shadow
        static let medium = Shadow(
            color: Color.black.opacity(0.08),
            radius: 8,
            x: 0,
            y: 4
        )

        /// No shadow - prefer flat design in most cases
        static let none = Shadow(
            color: Color.clear,
            radius: 0,
            x: 0,
            y: 0
        )
    }
}

// MARK: - Shadow Helper

struct Shadow {
    let color: Color
    let radius: CGFloat
    let x: CGFloat
    let y: CGFloat
}

// MARK: - View Modifiers

extension View {

    /// Apply tap feedback animation
    /// - Parameter isPressed: Whether the view is currently pressed
    /// - Parameter animationsEnabled: Whether animations are enabled in settings
    func flynnTapFeedback(isPressed: Bool, animationsEnabled: Bool = true) -> some View {
        self
            .scaleEffect(isPressed && animationsEnabled ? FlynnTheme.Animation.tapScale : 1.0)
            .opacity(isPressed ? FlynnTheme.Animation.pressedOpacity : 1.0)
            .animation(
                animationsEnabled ? FlynnTheme.Animation.quickEasing : .none,
                value: isPressed
            )
    }

    /// Apply symbol cell styling
    func flynnSymbolCell(category: SymbolCategory? = nil) -> some View {
        self
            .padding(FlynnTheme.Layout.gridCellPadding)
            .background(category?.color.opacity(0.15) ?? FlynnTheme.Colors.surface)
            .cornerRadius(FlynnTheme.Layout.cornerRadiusMedium)
    }

    /// Apply card styling for surfaces
    func flynnCard() -> some View {
        self
            .padding(FlynnTheme.Layout.spacing16)
            .background(FlynnTheme.Colors.surface)
            .cornerRadius(FlynnTheme.Layout.cornerRadiusLarge)
    }

    /// Apply subtle border
    func flynnBorder() -> some View {
        self
            .overlay(
                RoundedRectangle(cornerRadius: FlynnTheme.Layout.cornerRadiusMedium)
                    .stroke(FlynnTheme.Colors.border, lineWidth: FlynnTheme.Layout.gridLineWidth)
            )
    }

    /// Apply standard shadow
    func flynnShadow(_ shadow: Shadow = FlynnTheme.Shadows.subtle) -> some View {
        self
            .shadow(
                color: shadow.color,
                radius: shadow.radius,
                x: shadow.x,
                y: shadow.y
            )
    }
}

// MARK: - Symbol Category

/// LAMP-style word categories for color coding
enum SymbolCategory: String, CaseIterable, Codable {
    case verb
    case noun
    case descriptor
    case social
    case question
    case pronoun
    case preposition
    case misc
    case negation
    case time

    var color: Color {
        switch self {
        case .verb: return Color(red: 0.2, green: 0.78, blue: 0.35)        // Bright green
        case .noun: return Color(red: 1.0, green: 0.55, blue: 0.0)         // Bright orange
        case .descriptor: return Color(red: 0.2, green: 0.6, blue: 1.0)    // Bright blue
        case .social: return Color(red: 1.0, green: 0.4, blue: 0.6)        // Bright pink
        case .question: return Color(red: 0.7, green: 0.3, blue: 0.9)      // Bright purple
        case .pronoun: return Color(red: 1.0, green: 0.84, blue: 0.0)      // Bright golden yellow
        case .preposition: return Color(red: 1.0, green: 0.5, blue: 0.7)   // Rose pink
        case .misc: return Color(red: 0.6, green: 0.6, blue: 0.65)         // Medium gray
        case .negation: return Color(red: 1.0, green: 0.3, blue: 0.3)      // Bright red
        case .time: return Color(red: 0.6, green: 0.6, blue: 0.65)         // Medium gray
        }
    }

    var displayName: String {
        switch self {
        case .verb: return "Actions"
        case .noun: return "Things"
        case .descriptor: return "Describing"
        case .social: return "Social"
        case .question: return "Questions"
        case .pronoun: return "People"
        case .preposition: return "Places"
        case .misc: return "Other"
        case .negation: return "Negation"
        case .time: return "Time"
        }
    }
}

// MARK: - Preview

#Preview("Design System Colors") {
    ScrollView {
        VStack(spacing: FlynnTheme.Layout.spacing24) {

            // Background colors
            VStack(alignment: .leading, spacing: FlynnTheme.Layout.spacing8) {
                Text("Backgrounds")
                    .font(FlynnTheme.Typography.navigation)
                HStack(spacing: FlynnTheme.Layout.spacing8) {
                    ColorSwatch(color: FlynnTheme.Colors.Fallback.backgroundLight, name: "Background")
                    ColorSwatch(color: FlynnTheme.Colors.Fallback.surfaceLight, name: "Surface")
                }
            }

            // Text colors
            VStack(alignment: .leading, spacing: FlynnTheme.Layout.spacing8) {
                Text("Text")
                    .font(FlynnTheme.Typography.navigation)
                HStack(spacing: FlynnTheme.Layout.spacing8) {
                    ColorSwatch(color: FlynnTheme.Colors.Fallback.textPrimaryLight, name: "Primary")
                }
            }

            // Category colors
            VStack(alignment: .leading, spacing: FlynnTheme.Layout.spacing8) {
                Text("LAMP Categories")
                    .font(FlynnTheme.Typography.navigation)
                LazyVGrid(columns: [GridItem(.adaptive(minimum: 80))], spacing: FlynnTheme.Layout.spacing8) {
                    ForEach(SymbolCategory.allCases, id: \.self) { category in
                        ColorSwatch(color: category.color, name: category.displayName)
                    }
                }
            }
        }
        .padding()
    }
}

struct ColorSwatch: View {
    let color: Color
    let name: String

    var body: some View {
        VStack(spacing: FlynnTheme.Layout.spacing4) {
            RoundedRectangle(cornerRadius: FlynnTheme.Layout.cornerRadiusSmall)
                .fill(color)
                .frame(width: 60, height: 40)
            Text(name)
                .font(FlynnTheme.Typography.caption)
                .foregroundStyle(FlynnTheme.Colors.Fallback.textPrimaryLight)
        }
    }
}
