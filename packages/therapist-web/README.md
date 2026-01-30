# Flynn AAC Therapist Dashboard

Web application for therapists to manage their clients, track therapy goals, and log sessions.

## Features

- **Client Management**: View all assigned clients with quick access to profiles
- **Goal Tracking**: Create and manage therapy goals with progress tracking
- **Session Logging**: Document therapy sessions with notes and duration
- **Progress Visualization**: View goal progress with visual indicators
- **Therapy Type Support**: AAC, SLP, OT, ABA, PT, and Other

## Tech Stack

- **Framework**: React 18 with TypeScript
- **Routing**: TanStack Router (type-safe routing)
- **Styling**: Tailwind CSS
- **Auth**: Clerk (with dev mode bypass for local development)
- **Build Tool**: Vite

## Getting Started

### Prerequisites

- Node.js 18+ or Bun
- Backend API running on `http://localhost:3000`

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

The app will start on `http://localhost:3002`

### Environment Variables

Create a `.env` file based on `.env.example`:

```env
VITE_API_URL=http://localhost:3000/api/v1
```

For production with Clerk authentication:

```env
VITE_API_URL=https://your-api.com/api/v1
VITE_CLERK_PUBLISHABLE_KEY=pk_live_...
```

## Development Mode

In development, the app uses a dev auth bypass that automatically authenticates you as a therapist. This allows you to test the full application without setting up Clerk.

## API Integration

The app connects to the following backend endpoints:

- `GET /therapists/:id/clients` - List assigned clients
- `GET /children/:id` - Get child details
- `GET /children/:id/goals` - List goals for a child
- `POST /children/:id/goals` - Create a new goal
- `PATCH /goals/:id` - Update goal progress
- `GET /children/:id/sessions` - List therapy sessions
- `POST /children/:id/sessions` - Log a new session
- `PATCH /sessions/:id` - Update session
- `DELETE /sessions/:id` - Delete session

## Project Structure

```
therapist-web/
├── src/
│   ├── lib/
│   │   ├── api.ts          # API client and types
│   │   ├── auth.tsx        # Authentication context
│   │   └── utils.ts        # Utility functions
│   ├── routes/
│   │   ├── __root.tsx      # Root layout
│   │   ├── index.tsx       # Home page
│   │   ├── login.tsx       # Login page
│   │   ├── _app.tsx        # Authenticated layout
│   │   └── _app/
│   │       ├── dashboard.tsx              # Client list
│   │       └── clients/$childId.tsx       # Client detail
│   └── main.tsx            # App entry point
├── package.json
└── vite.config.ts
```

## Building for Production

```bash
npm run build
```

The build output will be in the `dist/` directory.

## Testing with Backend

1. Start the backend server:
   ```bash
   cd backend
   bun run src/index.ts
   ```

2. Ensure you have test data:
   ```bash
   cd backend
   bun run src/scripts/seed-database.ts
   ```

3. Start the therapist dashboard:
   ```bash
   cd therapist-web
   npm run dev
   ```

4. Visit `http://localhost:3002` and sign in (dev mode auto-authenticates)

## Known Limitations

- Currently uses dev auth bypass (Clerk integration pending)
- Therapist ID is hardcoded in dev mode
- No real-time updates (requires manual refresh)

## Future Enhancements

- [ ] Clerk authentication integration
- [ ] Real-time updates with WebSockets
- [ ] Export session reports
- [ ] Calendar view for sessions
- [ ] Goal templates
- [ ] Multi-child session logging
- [ ] Analytics dashboard
