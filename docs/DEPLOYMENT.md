# Flynn AAC Deployment Guide

## Prerequisites

- Bun runtime (v1.0+)
- Xcode 15+ (for iOS)
- Clerk account ([clerk.com](https://clerk.com))

---

## Clerk Authentication Setup

### 1. Create Clerk Application

1. Sign up / log in at [clerk.com](https://dashboard.clerk.com)
2. Create a new application
3. Configure sign-in methods (email, Google, Apple recommended)
4. Note your keys from the API Keys section

### 2. Backend Configuration

Add to `backend/.env`:

```env
CLERK_SECRET_KEY=sk_live_xxxxxxxxxxxxx
# or for development:
CLERK_SECRET_KEY=sk_test_xxxxxxxxxxxxx
```

### 3. iOS Configuration

Update `aac-ios/FlynnAAC/Services/API/APIConfiguration.swift`:

```swift
static let clerkPublishableKey = "pk_live_xxxxxxxxxxxxx"
// or for development:
static let clerkPublishableKey = "pk_test_xxxxxxxxxxxxx"
```

### 4. Caregiver Web Configuration

Add to `caregiver-web/.env`:

```env
VITE_CLERK_PUBLISHABLE_KEY=pk_live_xxxxxxxxxxxxx
```

---

## Backend Deployment

### Local Development

```bash
cd backend
bun install
cp .env.example .env  # Add your keys
bun run dev
```

### Production

```bash
bun run build
bun run start
```

Environment variables needed:
- `CLERK_SECRET_KEY` — Clerk secret key
- `DATABASE_URL` — Turso/SQLite connection string
- `TURSO_AUTH_TOKEN` — Turso auth token (if using Turso)

---

## iOS App

### Development

1. Open `aac-ios/FlynnAAC.xcodeproj` in Xcode
2. Set your Clerk publishable key in `APIConfiguration.swift`
3. Set the backend URL in `APIConfiguration.swift`
4. Build and run on simulator or device

### TestFlight / App Store

1. Update version/build numbers
2. Archive in Xcode
3. Upload to App Store Connect
4. Submit for review

---

## Caregiver Web

### Local Development

```bash
cd caregiver-web
bun install
bun run dev
```

### Production Build

```bash
bun run build
```

Deploy the `dist/` folder to your hosting provider.

---

## Environment Summary

| Variable | Backend | iOS | Web |
|----------|---------|-----|-----|
| `CLERK_SECRET_KEY` | ✅ | — | — |
| `clerkPublishableKey` | — | ✅ | — |
| `VITE_CLERK_PUBLISHABLE_KEY` | — | — | ✅ |
| `DATABASE_URL` | ✅ | — | — |
| `TURSO_AUTH_TOKEN` | ✅ | — | — |

---

## Troubleshooting

### "Invalid API key" errors
- Verify keys match your Clerk environment (test vs live)
- Ensure no extra whitespace in env files

### iOS auth not working
- Check `clerkPublishableKey` is set correctly
- Verify backend URL is reachable from device/simulator
- Check Clerk dashboard for blocked sign-in attempts

### CORS errors on web
- Backend should allow your web app's origin
- Check `backend/src/index.ts` CORS configuration
