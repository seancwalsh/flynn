# Hide Card Feature for Flynn AAC

## Summary
Allow caregivers to hide symbols/categories while preserving grid layout for LAMP motor planning. Hidden cards become invisible blank spaces. Passphrase-protected edit mode lets caregivers toggle visibility.

## Requirements Gathered
- **What can be hidden**: Individual symbols AND category folders
- **Hidden appearance**: Completely invisible (blank space maintains position)
- **Hidden folder behavior**: Contents implicitly inaccessible
- **Tap on blank space**: Nothing - tap passes through
- **Edit mode access**: Type a passphrase
- **Edit mode appearance**: Hidden cards show as translucent/ghost with eye-slash icon
- **Persistence**: Per-device via UserDefaults, designed for future CloudKit sync

---

## Implementation Plan

### Phase 1: Data Layer

**1.1 Create `HiddenItemsStore.swift`**
```
/FlynnAAC/FlynnAAC/Models/HiddenItemsStore.swift
```
- `hiddenSymbolIds: Set<String>` and `hiddenCategoryIds: Set<String>`
- `lastModified: Date` for future CloudKit conflict resolution
- Query methods: `isHidden(symbolId:)`, `isHidden(categoryId:)`
- Mutation: `toggleSymbol(_:)`, `toggleCategory(_:)`
- Persistence: `load()` / `save()` via UserDefaults (key: `FlynnAAC.HiddenItems`)

**1.2 Create `KeychainHelper.swift`**
```
/FlynnAAC/FlynnAAC/Services/KeychainHelper.swift
```
- Secure passphrase storage (not UserDefaults)
- `savePassphrase(_:)`, `getPassphrase()`, `deletePassphrase()`

---

### Phase 2: ViewModel Updates

**2.1 Extend `AACViewModel` in `ContentView.swift`**

Add properties:
```swift
@Published var isEditMode: Bool = false
@Published var hiddenItems: HiddenItemsStore = .load()
```

Add methods:
```swift
func enterEditMode(passphrase: String) -> Bool
func exitEditMode()
func toggleSymbolVisibility(_ symbolId: String)
func toggleCategoryVisibility(_ categoryId: String)
```

---

### Phase 3: View Components

**3.1 Create `HiddenPlaceholderCell.swift`**
```
/FlynnAAC/FlynnAAC/Views/SymbolGrid/HiddenPlaceholderCell.swift
```
- `Color.clear` with same frame constraints as `SymbolCell`
- `.allowsHitTesting(false)` - taps pass through
- Maintains grid position without visible content

**3.2 Create `GhostCell.swift`**
```
/FlynnAAC/FlynnAAC/Views/SymbolGrid/GhostCell.swift
```
- `GhostSymbolCell` and `GhostCategoryCell`
- Same visual structure as regular cells but with:
  - `.opacity(0.4)` for translucent effect
  - Eye-slash icon overlay indicating hidden state
  - Tap triggers visibility toggle (not speech)

**3.3 Create `PassphrasePromptView.swift`**
```
/FlynnAAC/FlynnAAC/Views/Settings/PassphrasePromptView.swift
```
- SecureField for passphrase entry
- Error state for incorrect passphrase
- Cancel/Enter buttons

**3.4 Create `EditModeIndicator.swift`**
```
/FlynnAAC/FlynnAAC/Views/SymbolGrid/EditModeIndicator.swift
```
- Floating pill showing "Edit Mode" when active
- Positioned top-right of grid

---

### Phase 4: Grid Integration

**4.1 Modify `SymbolGridView.swift`**

Add parameters:
```swift
let isEditMode: Bool
let hiddenItems: HiddenItemsStore
let onToggleSymbolVisibility: ((String) -> Void)?
let onToggleCategoryVisibility: ((String) -> Void)?
```

Update `ForEach` rendering logic:
```
For each gridItem:
  if hidden AND NOT edit mode -> HiddenPlaceholderCell
  if hidden AND edit mode -> GhostSymbolCell/GhostCategoryCell (tap toggles)
  if NOT hidden AND edit mode -> Regular cell with edit overlay (tap toggles)
  if NOT hidden AND NOT edit mode -> Regular cell (normal behavior)
```

---

### Phase 5: Header & ContentView Integration

**5.1 Modify `HeaderView`**
- Add `isEditMode: Bool` and `onEditModeToggle: () -> Void` parameters
- Long-press (1 second) on language button triggers edit mode entry
- When in edit mode, show "Done" button to exit

**5.2 Modify `ContentView`**
- Add `@State private var showPassphrasePrompt = false`
- Pass edit mode state and callbacks to `SymbolGridView`
- Show `PassphrasePromptView` as overlay when `showPassphrasePrompt` is true

---

### Phase 6: Settings Integration

**6.1 Modify `SettingsView.swift`**
- Add "Caregiver Access" section
- Fields: Current passphrase (if set), New passphrase, Confirm passphrase
- Validation: minimum 4 characters, passwords match
- Store in Keychain via `KeychainHelper`

---

## Files to Create
1. `/FlynnAAC/FlynnAAC/Models/HiddenItemsStore.swift`
2. `/FlynnAAC/FlynnAAC/Services/KeychainHelper.swift`
3. `/FlynnAAC/FlynnAAC/Views/SymbolGrid/HiddenPlaceholderCell.swift`
4. `/FlynnAAC/FlynnAAC/Views/SymbolGrid/GhostCell.swift`
5. `/FlynnAAC/FlynnAAC/Views/Settings/PassphrasePromptView.swift`
6. `/FlynnAAC/FlynnAAC/Views/SymbolGrid/EditModeIndicator.swift`

## Files to Modify
1. `/FlynnAAC/FlynnAAC/ContentView.swift` - AACViewModel + HeaderView + ContentView
2. `/FlynnAAC/FlynnAAC/Views/SymbolGrid/SymbolGridView.swift` - Hidden item rendering
3. `/FlynnAAC/FlynnAAC/Views/Settings/SettingsView.swift` - Passphrase configuration

---

## Verification Plan
1. **Build & Run**: Verify app compiles and launches
2. **Set passphrase**: In Settings, configure a caregiver passphrase
3. **Enter edit mode**: Long-press language button, enter passphrase
4. **Hide a symbol**: Tap a card to toggle hidden (should show ghost state)
5. **Exit edit mode**: Tap "Done" button
6. **Verify hidden**: Card space remains but is invisible; tapping does nothing
7. **Hide a category**: Enter edit mode, hide a folder
8. **Verify folder**: Folder invisible, cannot navigate into it
9. **Persistence**: Restart app, verify hidden state persists
10. **Wrong passphrase**: Try entering edit mode with wrong passphrase (should fail)
