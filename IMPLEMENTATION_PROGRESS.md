# Custom Symbol Creation - Implementation Progress

## Status: Phase A In Progress (Backend Complete, Frontend Pending)

**Last Updated:** 2026-01-31

---

## ✅ COMPLETED (Backend Infrastructure)

### Database & Schema
- ✅ **Database schema added** - 3 new tables in `/packages/backend/src/db/schema.ts`:
  - `symbol_categories` - Fitzgerald Key color-coded categories
  - `custom_symbols` - User-created symbols with approval workflow
  - `symbol_approvals` - Audit trail for approval decisions

- ✅ **Migration generated** - `drizzle/0001_vengeful_susan_delgado.sql`
  - Ready to run when database is available
  - Creates all tables, foreign keys, and indexes

### Backend API Routes
- ✅ **Complete symbols API** - `/packages/backend/src/routes/api/v1/symbols.ts`
  - ✅ `GET /symbols/categories` - List all categories
  - ✅ `POST /symbols/categories` - Create category (admin/therapist only)
  - ✅ `GET /symbols/:childId` - Get child's custom symbols (with status filter)
  - ✅ `POST /symbols/custom` - Create custom symbol (pending approval)
  - ✅ `PATCH /symbols/custom/:id` - Update symbol (creator/admin only)
  - ✅ `DELETE /symbols/custom/:id` - Delete symbol (creator/admin only)
  - ✅ `GET /symbols/pending/all` - Get pending symbols for approval (therapist/admin)
  - ✅ `POST /symbols/custom/:id/review` - Approve/reject symbol
  - ✅ `GET /symbols/custom/:id/approvals` - Get approval history
  - ✅ `POST /symbols/:childId/upload-url` - Get presigned URL (placeholder for R2)

- ✅ **Routes registered** in `/packages/backend/src/routes/api/v1/index.ts`

### Claude AI Tool
- ✅ **Tool implementation complete** - `/packages/backend/src/tools/write/create_custom_symbol.ts`
  - Uses real database (removed mock implementation)
  - Validates category exists
  - Creates symbols with pending status
  - Supports URL, upload (imageKey), and generate (placeholder) modes
  - Returns helpful error messages

### Visual Design System
- ✅ **Liquid Glass CSS** - `/packages/shared-ui/src/styles/liquid-glass.css`
  - Navigation layer styles (glass effect)
  - Content layer styles (solid)
  - Utility classes (glass-card, glass-button, glass-input, glass-badge)
  - Animation utilities (glass-appear, glass-shimmer)
  - Accessibility support (reduced motion, high contrast)
  - Dark mode support

---

## 🚧 IN PROGRESS / PENDING

### Critical Infrastructure (Blocking)
- ⏳ **Cloudflare R2 Setup** - Storage service for image uploads
  - Need: R2 bucket creation
  - Need: Environment variables (`R2_ENDPOINT`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`, `R2_PUBLIC_URL`)
  - Need: Storage service implementation at `/packages/backend/src/config/storage.ts`
  - Need: Update symbols route to use real R2 presigned URLs

- ⏳ **Image Upload Endpoint** - Direct upload with validation
  - File: `/packages/backend/src/routes/api/v1/symbols.ts` (update placeholder)
  - Add sharp for image validation/optimization
  - Add multipart form handling

- ⏳ **Database Migration Run** - Apply schema changes
  - Run: `cd packages/backend && bun run src/db/migrate.ts`
  - Requires: Database running on port 5434 (Docker: `docker-compose up postgres`)

- ⏳ **Seed Default Categories** - Create Fitzgerald Key categories
  - Create seed script with standard AAC categories:
    - People (yellow)
    - Actions/Verbs (green)
    - Descriptors (blue)
    - Nouns/Objects (orange)
    - Social/Conversational (pink)
    - Questions (purple)
    - Prepositions (white)
    - Miscellaneous (brown)

### Frontend Components (Web)

#### Shared Components (shared-ui package)
- ⏳ **ImageUploadZone** - `/packages/shared-ui/src/components/symbols/image-upload-zone.tsx`
  - Drag-and-drop support
  - File validation (type, size)
  - Instant preview with category color
  - Upload progress indicator
  - Integration with R2 presigned URLs

- ⏳ **CategoryGrid** - `/packages/shared-ui/src/components/symbols/category-grid.tsx`
  - Visual grid with Fitzgerald colors
  - Hover animations
  - Selection state with checkmark
  - Live preview of symbol with category color
  - Example symbols per category

- ⏳ **BilingualNameInput** - `/packages/shared-ui/src/components/symbols/bilingual-name-input.tsx`
  - English + Bulgarian fields
  - Smart translation suggestions (API integration)
  - Debounced translation API calls
  - "Use suggestion" button

#### Caregiver Web Portal
- ⏳ **CreateSymbolModal** - `/packages/caregiver-web/src/components/symbols/CreateSymbolModal.tsx`
  - Liquid Glass modal design
  - Integrates ImageUploadZone, CategoryGrid, BilingualNameInput
  - Form validation
  - Success/error states
  - API integration with `/api/v1/symbols/custom`

- ⏳ **Custom Symbol List** - Display created symbols with status badges
  - Pending symbols shown with transparency
  - Approved symbols fully visible
  - Rejected symbols with feedback

#### Therapist Web Portal
- ⏳ **Swipeable Approval Queue** - `/packages/therapist-web/src/routes/_app/symbol-approvals.tsx`
  - Framer Motion swipeable cards
  - Left swipe = reject
  - Right swipe = approve
  - Quick edit button (fix typos without rejection)
  - Child context (show existing symbols)
  - Batch approval support

### iOS Integration

#### Data Models
- ⏳ **Extend Symbol model** - `/aac-ios/FlynnAAC/Models/Symbol.swift`
  - Add `isCustom: Bool` field
  - Add `imageUrl: String?` field
  - Add `status: String` field (pending/approved/rejected)
  - Add `categoryColor: String?` field

#### Services
- ⏳ **CustomSymbolService** - `/aac-ios/FlynnAAC/Services/CustomSymbolService.swift`
  - Fetch custom symbols from `/api/v1/symbols/:childId?status=approved`
  - Cache symbols in UserDefaults
  - Sync on app launch and periodically
  - Handle approval notifications

- ⏳ **Update SymbolStore** - `/aac-ios/FlynnAAC/Services/SymbolStore.swift`
  - Combine ARASAAC symbols with custom symbols
  - Filter by category
  - Support pending symbol display (with transparency)

#### Views
- ⏳ **CustomSymbolImageView** - `/aac-ios/FlynnAAC/Views/SymbolGrid/CustomSymbolImageView.swift`
  - Async image loading from URL
  - Caching
  - Error handling with fallback icon

- ⏳ **Update SymbolCell** - `/aac-ios/FlynnAAC/Views/SymbolGrid/SymbolCell.swift`
  - Pending badge overlay
  - Transparency for pending symbols
  - Disable tap for pending symbols

- ⏳ **Celebration Animations** - `/aac-ios/FlynnAAC/Views/Effects/ConfettiView.swift`
  - Confetti animation when symbol approved
  - Spring animation for symbol appearance
  - Haptic feedback on first use

### Backend Enhancements
- ⏳ **Push Notifications** - `/packages/backend/src/services/notifications.ts`
  - Send notification when symbol approved
  - Trigger iOS sync
  - Integration with Firebase Cloud Messaging or APNs

- ⏳ **Translation API** - `/packages/backend/src/routes/api/v1/translate.ts`
  - English ↔ Bulgarian translation
  - Translation cache
  - Integration with Google Translate or LibreTranslate

### Testing
- ⏳ **Backend Unit Tests** - `/packages/backend/src/tests/unit/tools/write/create_custom_symbol.test.ts`
  - Update existing tests to use real database
  - Test approval workflow
  - Test authorization

- ⏳ **E2E Tests** - `/packages/backend/src/tests/e2e/custom-symbols-flow.test.ts`
  - Complete flow: create → approve → sync to iOS
  - Rejection flow with feedback
  - Image upload flow

---

## 📊 Implementation Summary

### Phase A (MVP with Beauty) - 28 hours estimated
**Status:** 50% complete (Backend done, Frontend pending)

| Component | Status | Time Spent | Remaining |
|-----------|--------|------------|-----------|
| Database Schema | ✅ Complete | 2h | - |
| Backend API | ✅ Complete | 4h | - |
| Liquid Glass CSS | ✅ Complete | 2h | - |
| **Subtotal Backend** | **✅** | **8h** | **-** |
| | | | |
| R2 Storage Setup | ⏳ Pending | - | 2h |
| Image Upload | ⏳ Pending | - | 3h |
| ImageUploadZone | ⏳ Pending | - | 3h |
| CategoryGrid | ⏳ Pending | - | 2h |
| BilingualNameInput | ⏳ Pending | - | 2h |
| CreateSymbolModal | ⏳ Pending | - | 2h |
| Approval Queue | ⏳ Pending | - | 3h |
| iOS Integration | ⏳ Pending | - | 6h |
| **Subtotal Frontend** | **⏳** | **-** | **23h** |
| | | | |
| **TOTAL PHASE A** | **50%** | **8h** | **23h** |

### Phase B (Delight Layer) - 14 hours estimated
**Status:** Not started

- Smart Translation (2h)
- Live Preview in Grid (1.5h)
- Push Notifications (2h)
- Celebration Animations (1h)
- Testing (3h)
- Polish & Bug Fixes (4.5h)

---

## 🎯 Next Steps (Priority Order)

1. **Set up Cloudflare R2** (2h)
   - Create R2 bucket
   - Configure environment variables
   - Implement storage service

2. **Complete Image Upload** (3h)
   - Add `sharp` dependency
   - Implement direct upload endpoint
   - Add image validation/optimization

3. **Build ImageUploadZone Component** (3h)
   - Drag-and-drop UI
   - R2 presigned URL integration
   - Preview with category color

4. **Build CategoryGrid Component** (2h)
   - Fitzgerald color cards
   - Selection state
   - Live preview

5. **Build BilingualNameInput** (2h)
   - Translation suggestions
   - API integration

6. **Build CreateSymbolModal** (2h)
   - Integrate all sub-components
   - Form validation
   - API submission

7. **Build Approval Queue** (3h)
   - Swipeable cards (Framer Motion)
   - Batch approval
   - Child context

8. **iOS Integration** (6h)
   - Extend models
   - Create CustomSymbolService
   - Update views
   - Test end-to-end

9. **Testing & Polish** (3h)
   - Unit tests
   - E2E tests
   - Bug fixes

---

## 🔑 Key Files Modified/Created

### Backend
- `packages/backend/src/db/schema.ts` - Added 3 tables
- `packages/backend/drizzle/0001_vengeful_susan_delgado.sql` - Migration
- `packages/backend/src/routes/api/v1/symbols.ts` - New API routes
- `packages/backend/src/routes/api/v1/index.ts` - Registered symbols routes
- `packages/backend/src/tools/write/create_custom_symbol.ts` - Updated tool

### Frontend
- `packages/shared-ui/src/styles/liquid-glass.css` - New design system
- `packages/shared-ui/src/styles/globals.css` - Imported Liquid Glass

### Documentation
- `CUSTOM_SYMBOLS_UX_ENHANCEMENTS.md` - Detailed UX plan
- `IMPLEMENTATION_PROGRESS.md` - This file

---

## 💡 Implementation Notes

### Database Migration
To run the migration when database is available:
```bash
cd packages/backend
bun run src/db/migrate.ts
```

### Environment Variables Needed
Add to `.env`:
```bash
# Cloudflare R2 Storage
R2_ENDPOINT=https://[account-id].r2.cloudflarestorage.com
R2_ACCESS_KEY_ID=your-access-key
R2_SECRET_ACCESS_KEY=your-secret-key
R2_BUCKET_NAME=flynn-aac-symbols
R2_PUBLIC_URL=https://symbols.flynn-aac.com

# Optional: Translation API
GOOGLE_TRANSLATE_API_KEY=your-key
# or
LIBRETRANSLATE_URL=https://libretranslate.com
```

### Dependencies to Add
```bash
# Backend
cd packages/backend
bun add @aws-sdk/client-s3 @aws-sdk/s3-request-presigner sharp

# Frontend
cd packages/caregiver-web  # and therapist-web
bun add framer-motion
```

### Testing the API
Once database migration is run:
```bash
# Create a category
curl -X POST http://localhost:3000/api/v1/symbols/categories \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT" \
  -d '{
    "name": "People",
    "nameBulgarian": "Хора",
    "colorName": "yellow",
    "colorHex": "#FFD54F",
    "icon": "person.fill",
    "displayOrder": 1
  }'

# Create a custom symbol
curl -X POST http://localhost:3000/api/v1/symbols/custom \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT" \
  -d '{
    "childId": "uuid-here",
    "name": "Pizza",
    "nameBulgarian": "Пица",
    "categoryId": "category-uuid",
    "imageSource": "url",
    "imageUrl": "https://example.com/pizza.png"
  }'
```

---

## 🎨 Design Decisions

### Why Liquid Glass?
Following Apple's iOS 26 design language for modern, accessible UI that feels native on iPad.

### Why Approval Workflow?
Ensures quality control and therapist oversight for custom symbols used in therapy.

### Why R2 over S3?
Cloudflare R2 is S3-compatible but with zero egress fees, perfect for frequently-accessed images.

### Why Fitzgerald Key Colors?
Industry standard AAC color-coding system for symbol categories, familiar to therapists and users.

---

## 📖 References

- [Liquid Glass Design System](/.claude/plans/curious-exploring-crayon.md)
- [UX Enhancement Plan](CUSTOM_SYMBOLS_UX_ENHANCEMENTS.md)
- [Fitzgerald Key Color Coding](https://en.wikipedia.org/wiki/Fitzgerald_Key)
- [ARASAAC Symbol Library](https://arasaac.org/)
