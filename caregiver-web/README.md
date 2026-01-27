# Flynn AAC - Caregiver Web Portal

Web application for caregivers and therapists to manage children's AAC progress.

## Tech Stack

- **Framework:** TanStack Start (React + file-based routing)
- **Data Fetching:** TanStack Query
- **Styling:** Tailwind CSS
- **Language:** TypeScript

## Getting Started

### Prerequisites

- Node.js 20+
- pnpm or npm

### Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Copy environment variables:
   ```bash
   cp .env.example .env
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

4. Open [http://localhost:3000](http://localhost:3000)

### Backend

Make sure the Flynn backend is running at the URL specified in `VITE_API_URL`.

See `/flynn/backend/README.md` for backend setup instructions.

## Project Structure

```
app/
├── lib/              # Shared utilities
│   ├── api.ts        # API client
│   └── auth.tsx      # Auth context
├── routes/           # File-based routes
│   ├── __root.tsx    # Root layout
│   ├── _app.tsx      # Authenticated layout
│   ├── _app/
│   │   ├── dashboard.tsx
│   │   └── children/
│   │       ├── index.tsx
│   │       └── $childId.tsx
│   ├── index.tsx     # Landing page
│   ├── login.tsx     # Login page
│   └── register.tsx  # Register page
├── client.tsx        # Client entry
├── router.tsx        # Router config
├── ssr.tsx           # SSR entry
└── styles.css        # Global styles
```

## Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run typecheck` - Run TypeScript checks
- `npm run test` - Run unit tests (Vitest)
- `npm run test:e2e` - Run E2E tests (Playwright)
- `npm run test:e2e:ui` - Open Playwright UI mode
- `npm run test:e2e:headed` - Run E2E tests with browser visible
- `npm run test:e2e:debug` - Debug E2E tests
- `npm run test:e2e:report` - View last E2E test report

## Testing

### Unit Tests (Vitest)

Unit tests are located alongside components with `.test.tsx` extension.

```bash
# Run unit tests in watch mode
npm run test

# Run once
npm run test:run

# With coverage
npm run test:coverage
```

### E2E Tests (Playwright)

End-to-end tests are in the `e2e/` directory and test the full chat flow.

```bash
# Install browsers (first time only)
npx playwright install chromium

# Run all E2E tests
npm run test:e2e

# Open interactive UI mode
npm run test:e2e:ui

# Run with browser visible
npm run test:e2e:headed

# Run specific test file
npx playwright test chat.spec.ts

# Debug tests
npm run test:e2e:debug

# View test report
npm run test:e2e:report
```

#### E2E Test Structure

```
e2e/
├── auth.setup.ts           # Authentication setup
├── chat.spec.ts            # Chat flow tests
└── fixtures/
    ├── chat-page.ts        # Page Object Model
    └── test-data.ts        # Mock data
```

#### Test Coverage

The E2E tests cover:
- **Navigation:** Login → Dashboard → Chat
- **Conversations:** Create, select, switch, delete
- **Messaging:** Send messages, streaming responses, keyboard shortcuts
- **Tool Calls:** Loading states, result display
- **Error States:** Network errors, API errors, dismissal
- **Mobile:** Responsive layout, mobile sidebar

#### Running in CI

The tests are configured to run in CI with:
- Single worker for stability
- Retries on failure
- Trace/video capture on retry
- HTML report generation

```bash
# CI mode
CI=true npm run test:e2e
```

## Features

### Implemented
- [x] Authentication (Login/Register)
- [x] Protected routes with auth guard
- [x] Responsive sidebar navigation
- [x] Dashboard with stats
- [x] Children list
- [x] Child detail view

### Planned
- [ ] Add/edit child profiles
- [ ] Symbol management
- [ ] Progress analytics
- [ ] Family management
- [ ] Therapist assignment
