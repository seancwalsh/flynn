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
