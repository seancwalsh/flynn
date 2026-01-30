# Child Selection Onboarding UI - Complete

**Date:** 2026-01-30
**Commit:** `1e7a0cc`
**Status:** ✅ Complete

## Overview

Added a beautiful onboarding screen that prompts caregivers to select which child the iPad device is registered to after logging in. This completes the authentication flow and enables proper usage tracking with device registration.

## What Was Added

### New File
**`aac-ios/FlynnAAC/Views/Onboarding/ChildSelectionView.swift`** (416 lines)

A SwiftUI view that:
- ✅ Fetches children from backend API (`GET /api/v1/children`)
- ✅ Displays children in beautiful cards with avatars and ages
- ✅ Allows caregiver to select which child uses this device
- ✅ Registers device via `DeviceManager.registerDevice(childId:)`
- ✅ Shows loading, error, and empty states
- ✅ Provides haptic feedback on selection
- ✅ Matches app's design system (gradients, colors, fonts)

### Modified File
**`aac-ios/FlynnAAC/Views/Auth/AuthContainerView.swift`**

Updated to:
- ✅ Check device registration status after login
- ✅ Show `ChildSelectionView` if device not registered
- ✅ Skip onboarding if device already registered
- ✅ Re-check onboarding when auth state changes

## Complete Authentication Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    1. App Launch                                 │
├─────────────────────────────────────────────────────────────────┤
│ AuthContainerView checks:                                        │
│ - Is Clerk session active?                                      │
│ - Is device registered to a child?                              │
└─────────────────────────────────────────────────────────────────┘
                               ↓
        ┌──────────────────────┴──────────────────────┐
        │                                              │
        ↓                                              ↓
┌──────────────┐                            ┌──────────────────┐
│ NOT          │                            │ Clerk Session    │
│ Authenticated│                            │ ACTIVE           │
└──────────────┘                            └──────────────────┘
        ↓                                              ↓
┌──────────────────────────┐              ┌─────────────────────────┐
│ 2. Show LoginView        │              │ Check Device            │
│                          │              │ Registration            │
│ - Clerk email/password   │              └─────────────────────────┘
│ - Sign in button         │                          ↓
│ - "Forgot password"      │              ┌───────────┴────────────┐
└──────────────────────────┘              │                        │
        ↓                                  ↓                        ↓
┌──────────────────────────┐     ┌─────────────────┐    ┌──────────────────┐
│ Login Success            │     │ NOT REGISTERED  │    │ REGISTERED       │
│ ✅ Clerk JWT obtained    │     └─────────────────┘    └──────────────────┘
└──────────────────────────┘              ↓                        ↓
        ↓                         ┌─────────────────────┐  ┌──────────────────┐
        └────────────────────────>│ 3. Show             │  │ 4. Show Main App │
                                  │ ChildSelectionView  │  │ (ContentView)    │
                                  └─────────────────────┘  └──────────────────┘
                                           ↓
                                  ┌─────────────────────┐
                                  │ GET /children       │
                                  │ (with Clerk JWT)    │
                                  └─────────────────────┘
                                           ↓
                        ┌──────────────────┴───────────────────┐
                        │                                       │
                        ↓                                       ↓
                 ┌─────────────┐                     ┌──────────────────┐
                 │ No Children │                     │ Show Child Cards │
                 │ Found       │                     │ - Name           │
                 └─────────────┘                     │ - Age            │
                        ↓                            │ - Avatar         │
                 ┌─────────────────┐                └──────────────────┘
                 │ Empty State:    │                         ↓
                 │ "Add child in   │                ┌──────────────────┐
                 │ web dashboard"  │                │ Caregiver Selects│
                 └─────────────────┘                │ Child            │
                                                    └──────────────────┘
                                                             ↓
                                                    ┌──────────────────┐
                                                    │ DeviceManager    │
                                                    │ .registerDevice  │
                                                    │ (childId)        │
                                                    └──────────────────┘
                                                             ↓
                                                    ┌──────────────────┐
                                                    │ Haptic Feedback  │
                                                    │ Save to          │
                                                    │ UserDefaults     │
                                                    └──────────────────┘
                                                             ↓
                                                    ┌──────────────────┐
                                                    │ 4. Show Main App │
                                                    │ (ContentView)    │
                                                    └──────────────────┘
```

## UI/UX Design

### Color Scheme
Matches app's beautiful gradient design system:
- **Background:** Soft lavender → soft blue → warm cream gradient
- **Primary:** Blue-purple gradient for buttons and selections
- **Cards:** Semi-transparent white with subtle shadows
- **Selected State:** Blue-purple border with increased shadow and scale

### Child Cards
Each card displays:
- **Avatar:** Circle with gradient background + first letter of name
- **Name:** Headline font in primary color
- **Age:** Calculated from date of birth (e.g., "5 years old")
- **Selection:** Checkmark icon in gradient colors
- **Animation:** Scale up slightly when selected

### States

#### Loading State
```
┌───────────────────────────┐
│    Flynn                  │
│                           │
│   [Loading Spinner]       │
│   Loading children...     │
└───────────────────────────┘
```

#### Error State
```
┌───────────────────────────┐
│    ⚠️                     │
│  Unable to Load Children  │
│                           │
│  [Error message]          │
│                           │
│  [Try Again Button]       │
└───────────────────────────┘
```

#### Empty State
```
┌───────────────────────────┐
│    👥                     │
│  No Children Found        │
│                           │
│  Please add a child to    │
│  your family in the web   │
│  dashboard first.         │
└───────────────────────────┘
```

#### Children List
```
┌───────────────────────────────────────┐
│              Flynn                     │
│          Select Child                  │
│  Choose which child will use this      │
│           device                       │
│                                        │
│  ┌──────────────────────────────┐     │
│  │ [E] Emma Smith      ✓        │     │ ← Selected
│  │     5 years old              │     │
│  └──────────────────────────────┘     │
│                                        │
│  ┌──────────────────────────────┐     │
│  │ [J] Jack Smith               │     │
│  │     7 years old              │     │
│  └──────────────────────────────┘     │
│                                        │
│  ┌──────────────────────────────┐     │
│  │         Continue             │     │
│  └──────────────────────────────┘     │
└───────────────────────────────────────┘
```

## Integration Points

### DeviceManager
- `DeviceManager.shared.isDeviceRegistered` - Check registration status
- `DeviceManager.shared.registerDevice(childId:)` - Save selection
- Persists to UserDefaults with key `"flynn.device.child_id"`

### APIClient
- Fetches children: `GET /api/v1/children`
- Uses caregiver's Clerk JWT for authentication
- Parses response into `SelectableChild` models

### AuthContainerView
- Checks `isDeviceRegistered` after login
- Shows `ChildSelectionView` if not registered
- Shows main app if already registered
- Re-checks on auth state changes

## API Integration

### Request
```http
GET /api/v1/children HTTP/1.1
Host: api.flynnapp.com
Authorization: Bearer <clerk-jwt-token>
```

### Response
```json
{
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "name": "Emma Smith",
      "dateOfBirth": "2019-03-15T00:00:00Z",
      "profileImageUrl": null
    },
    {
      "id": "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
      "name": "Jack Smith",
      "dateOfBirth": "2017-08-22T00:00:00Z",
      "profileImageUrl": null
    }
  ]
}
```

## User Experience Flow

### First Time Setup
1. Caregiver downloads Flynn AAC app
2. Opens app → sees login screen
3. Enters Clerk email/password → logs in
4. **NEW:** Sees "Select Child" screen
5. Taps on their child's card
6. Taps "Continue"
7. Device is registered → shows main app
8. Child can start using symbols

### Subsequent Opens
1. Caregiver opens app
2. Clerk session restored automatically
3. Device already registered → shows main app immediately
4. No onboarding needed

### Switching Children
Currently requires:
1. Calling `DeviceManager.shared.unregisterDevice()`
2. Restarting app or triggering onboarding flow

**Future enhancement:** Add "Switch Child" option in settings.

## Error Handling

### Network Errors
- Shows error message
- Provides "Try Again" button
- Logs error to console

### No Children Found
- Shows empty state
- Explains how to add children (web dashboard)

### Invalid Response
- Treats as network error
- Shows retry option

## Accessibility

- ✅ All text uses semantic text styles
- ✅ Buttons have appropriate labels
- ✅ Color contrast meets WCAG standards
- ✅ Dynamic Type supported (system fonts)
- ✅ VoiceOver friendly (button roles, labels)

## Testing Checklist

### Manual Testing
- [ ] Launch app without Clerk session → see login
- [ ] Log in → see child selection
- [ ] Select child → see main app
- [ ] Restart app → skip child selection (already registered)
- [ ] No children in account → see empty state
- [ ] Network error → see error state with retry
- [ ] Multiple children → all display correctly
- [ ] Selection animation works smoothly
- [ ] Continue button disabled when no selection

### Edge Cases
- [ ] Device switches WiFi during load
- [ ] User has 10+ children (scrolling)
- [ ] Child with very long name (text truncation)
- [ ] Child with no date of birth (age not shown)
- [ ] Backend returns empty array
- [ ] Backend returns 403 Forbidden
- [ ] JWT token expired during fetch

## Future Enhancements

### Phase 1 (Short-term)
- [ ] Add "Switch Child" in settings
- [ ] Add profile images for children
- [ ] Cache children list locally
- [ ] Add pull-to-refresh

### Phase 2 (Medium-term)
- [ ] Support multiple device registrations
- [ ] Show which devices are registered to each child
- [ ] Add "This device is for [Name]" confirmation screen

### Phase 3 (Long-term)
- [ ] Automatic child detection (if family has only 1 child)
- [ ] Quick switch between children (for shared devices)
- [ ] Show recent activity preview per child

## Files

### Created
- ✨ `aac-ios/FlynnAAC/Views/Onboarding/ChildSelectionView.swift` (416 lines)

### Modified
- ✏️ `aac-ios/FlynnAAC/Views/Auth/AuthContainerView.swift`

## Dependencies

- ✅ DeviceManager (already exists)
- ✅ APIClient (already exists)
- ✅ AuthService (already exists)
- ✅ Backend `/api/v1/children` endpoint (already exists)
- ✅ Clerk authentication (already exists)

## Summary

The onboarding UI completes the authentication story by connecting:
1. **Who logs in:** Caregiver (via Clerk)
2. **Who gets tracked:** Child (via device registration)
3. **How data syncs:** With caregiver's JWT token

This simple but essential flow ensures:
- ✅ Usage logs are attributed to the correct child
- ✅ Backend can verify caregiver has access to that child
- ✅ Device persists registration across app launches
- ✅ Beautiful UX matching app's design language

---

**Status:** ✅ **COMPLETE & COMMITTED**
**Commit:** `1e7a0cc` - feat: add child selection onboarding UI for iPad app
