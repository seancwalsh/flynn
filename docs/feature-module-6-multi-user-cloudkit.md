# Feature Module 6: Multi-User Access & CloudKit Sharing

## User Stories

1. **As a parent**, I can create a "child profile" that contains all vocabulary, settings, and usage data for my child, so all data is organized under one entity that can be shared with others.

2. **As a parent**, I can invite other caregivers (spouse, therapists) to access my child's profile by sending an invite via email or iMessage, so they can use the AAC app and companion app with shared data.

3. **As a parent**, I can set permission levels for each invited caregiver (full access, data view only, AAC use only), so I control who can modify vocabulary and settings vs. who can only view or use.

4. **As a parent**, I can revoke a caregiver's access at any time, so I maintain control over who has access to my child's data if relationships change.

5. **As a therapist**, I can accept an invitation to access a child's profile, and the child appears in my companion app alongside any other children I work with, so I can support multiple clients from one app.

6. **As a caregiver**, I can see who else has access to the child's profile and their permission levels, so I know who is part of the care team.

7. **As a caregiver**, my profile information (name, role, personality preference) syncs across all my devices via my iCloud account, so I have a consistent experience on iPhone and iPad.

8. **As a system**, all data syncs across devices within 30 seconds when online, using CloudKit zones with appropriate sharing permissions, so all caregivers see up-to-date information.

9. **As a system**, when multiple caregivers make changes simultaneously, conflicts are resolved gracefully - log entries are append-only (no conflicts), vocabulary changes use last-write-wins with change history preserved, so no data is lost.

10. **As a parent**, I can view an audit log showing who made vocabulary changes and when, so I can track modifications made by therapists or other caregivers.

11. **As a caregiver on the child AAC app**, I can quickly switch my active caregiver profile with 2 taps (not buried in settings), so usage is correctly attributed when handing the device between caregivers during the day.

12. **As a parent**, I can set up the child's AAC app on a new device by signing into iCloud, and all vocabulary, settings, and symbol positions sync automatically, so device setup is effortless.

## Acceptance Criteria

- Child profile creation requires at least one parent-level admin
- Invitations use native iOS CloudKit sharing UI (UICloudSharingController)
- Permission levels: Admin (full control), Editor (modify vocabulary, view all data), Viewer (view data only), User (AAC app use only, minimal companion access)
- Access revocation takes effect within 60 seconds across all devices
- Therapists can have access to multiple child profiles from different families
- All sync operations complete within 30 seconds on reasonable network
- Conflict resolution: append-only for logs, last-write-wins for settings with full history
- Audit log captures: who, what, when for all vocabulary and settings changes
- Caregiver switcher accessible from AAC app home screen (not in settings)
- New device setup completes within 2 minutes of iCloud sign-in

## Test Specifications

### TEST: child_profile_creation

```
GIVEN parent opens app for first time
WHEN parent creates child profile with name and photo
THEN profile is created in private CloudKit zone
AND parent is automatically assigned Admin permission
AND profile is ready for sharing
```

### TEST: invite_caregiver_flow

```
GIVEN parent is Admin on child profile
WHEN parent taps "invite caregiver" and enters therapist email
THEN native iOS share sheet appears
AND invitation sent via selected method (email/iMessage)
AND pending invitation visible in access list
```

### TEST: permission_levels_enforced_admin

```
GIVEN caregiver has Admin permission
THEN caregiver can: modify vocabulary, change settings, view all data, invite others, revoke access
```

### TEST: permission_levels_enforced_editor

```
GIVEN caregiver has Editor permission
THEN caregiver can: modify vocabulary, view all data
AND caregiver cannot: change sharing settings, invite/revoke others
```

### TEST: permission_levels_enforced_viewer

```
GIVEN caregiver has Viewer permission
THEN caregiver can: view all data in companion app
AND caregiver cannot: modify vocabulary, use AAC app with logging
```

### TEST: permission_levels_enforced_user

```
GIVEN caregiver has User permission
THEN caregiver can: use AAC app (usage logged under their profile)
AND caregiver can: view basic dashboard in companion app
AND caregiver cannot: modify vocabulary, view detailed analytics
```

### TEST: revoke_access_immediate

```
GIVEN therapist has Editor access to child profile
WHEN parent revokes therapist access
THEN within 60 seconds therapist's app shows "access removed"
AND child profile disappears from therapist's app
AND therapist cannot access any data
```

### TEST: therapist_multiple_children

```
GIVEN therapist is invited to Child A (Family 1) and Child B (Family 2)
WHEN therapist opens companion app
THEN both children appear in therapist's dashboard
AND data is completely separated between children
AND therapist permissions may differ per child
```

### TEST: access_list_visibility

```
GIVEN child profile has 4 caregivers with access
WHEN any caregiver views "Care Team" screen
THEN all 4 caregivers listed with names and roles
AND permission level visible for each
AND only Admins see invite/revoke options
```

### TEST: caregiver_profile_syncs

```
GIVEN caregiver sets role to "ABA therapist" on iPhone
WHEN caregiver opens companion app on iPad
THEN role is already set to "ABA therapist"
AND personality preference also synced
```

### TEST: data_sync_timing

```
GIVEN caregiver adds new symbol on Device A
WHEN Device B is online
THEN new symbol appears on Device B within 30 seconds
```

### TEST: conflict_resolution_logs_append

```
GIVEN Device A logs symbol tap at 10:00:00.000
AND Device B logs symbol tap at 10:00:00.001 (offline)
WHEN Device B syncs
THEN both log entries preserved
AND no data lost or overwritten
```

### TEST: conflict_resolution_vocabulary_lww

```
GIVEN Device A changes "biscuit" label to "cookie" at 10:00
AND Device B changes "biscuit" label to "cracker" at 10:01 (offline)
WHEN Device B syncs
THEN label is "cracker" (last write wins)
AND change history shows both edits with timestamps and authors
```

### TEST: audit_log_vocabulary_changes

```
GIVEN therapist adds symbol "puzzle" at 2:30pm
WHEN parent views audit log
THEN entry shows:
  - action: "symbol added"
  - symbol: "puzzle"
  - by: [therapist name]
  - timestamp: 2:30pm
  - device: [device name]
```

### TEST: caregiver_switcher_accessible

```
GIVEN AAC app is open on home grid
THEN caregiver switcher is visible (corner avatar or similar)
AND switcher requires exactly 2 taps to change active caregiver
AND switcher does not require leaving home grid
```

### TEST: caregiver_switch_updates_logging

```
GIVEN active caregiver is "Mom"
WHEN caregiver switches to "ABA therapist"
THEN subsequent symbol taps logged with caregiver="ABA therapist"
AND switch event itself is logged
```

### TEST: new_device_setup_sync

```
GIVEN parent has existing child profile with 50 symbols
WHEN parent signs into iCloud on new iPad and opens AAC app
THEN child profile appears automatically
AND all 50 symbols sync with correct positions
AND all settings sync
AND setup completes within 2 minutes
```
