# Bun Workspaces Migration Plan

## Overview

Migrate Flynn AAC from a flat monorepo to a proper Bun workspaces structure with shared packages for types, schemas, UI components, and utilities.

## Current Issues

1. **Type duplication**: `Child`, `Goal`, `TherapySession`, `Insight` defined in 3+ places
2. **Validation duplication**: Zod schemas defined separately in backend and frontends
3. **Utility duplication**: `cn()`, `formatMessageTime()` duplicated across frontends
4. **No shared UI**: Common components (buttons, cards, forms) duplicated
5. **No single source of truth**: Changes require updates in multiple files

## Proposed Structure

```
flynn-app/
├── package.json                    # Workspace root config
├── bun.lockb                       # Unified lockfile
├── docker-compose.yml              # Updated paths
├── packages/
│   ├── backend/                    # Moved from root
│   │   ├── package.json
│   │   ├── src/
│   │   └── Dockerfile
│   ├── therapist-web/              # Moved from root
│   │   ├── package.json
│   │   └── src/
│   ├── caregiver-web/              # Moved from root
│   │   ├── package.json
│   │   └── src/
│   ├── shared-types/               # NEW
│   │   ├── package.json
│   │   └── src/
│   │       ├── api.ts              # API response types
│   │       ├── database.ts         # DB entity types
│   │       ├── domain.ts           # Domain models
│   │       └── index.ts
│   ├── shared-schemas/             # NEW
│   │   ├── package.json
│   │   └── src/
│   │       ├── child.ts            # Child validation schemas
│   │       ├── goal.ts             # Goal validation schemas
│   │       ├── session.ts          # Session validation schemas
│   │       ├── insight.ts          # Insight validation schemas
│   │       └── index.ts
│   ├── shared-ui/                  # NEW
│   │   ├── package.json
│   │   └── src/
│   │       ├── components/
│   │       │   ├── button.tsx
│   │       │   ├── card.tsx
│   │       │   ├── form.tsx
│   │       │   └── index.ts
│   │       └── index.ts
│   └── shared-utils/               # NEW
│       ├── package.json
│       └── src/
│           ├── date.ts             # Date formatting utilities
│           ├── string.ts           # String utilities
│           ├── constants.ts        # Shared constants
│           └── index.ts
└── tsconfig.base.json              # Shared TS config
```

## Shared Packages Breakdown

### 1. @flynn-aac/shared-types

**Purpose**: Single source of truth for TypeScript types

**Exports**:
```typescript
// API types
export interface ApiResponse<T>
export interface ApiErrorResponse
export interface PaginationInfo

// Domain types
export interface Child
export interface Goal
export interface TherapySession
export interface Insight
export interface Family
export interface Caregiver
export interface Therapist
export interface TherapistClient

// Enums
export type TherapyType = "aac" | "aba" | "ot" | "slp" | "pt" | "other"
export type GoalStatus = "active" | "achieved" | "paused" | "discontinued"
export type InsightSeverity = "info" | "warning" | "critical"
export type InsightType = "daily_digest" | "usage_trend" | "regression_alert" | ...
```

**Dependencies**: None (pure types)

### 2. @flynn-aac/shared-schemas

**Purpose**: Shared Zod validation schemas for runtime validation

**Exports**:
```typescript
// Child schemas
export const createChildSchema
export const updateChildSchema
export const childIdSchema

// Goal schemas
export const createGoalSchema
export const updateGoalSchema
export const goalStatusSchema

// Session schemas
export const createSessionSchema
export const updateSessionSchema

// Insight schemas
export const insightFilterSchema
```

**Dependencies**: `zod`, `@flynn-aac/shared-types`

### 3. @flynn-aac/shared-ui

**Purpose**: Reusable React components for both frontends

**Exports**:
```typescript
// Core components
export { Button } from './components/button'
export { Card } from './components/card'
export { Input } from './components/input'
export { Select } from './components/select'
export { Badge } from './components/badge'
export { Avatar } from './components/avatar'

// Complex components
export { GoalCard } from './components/goal-card'
export { SessionCard } from './components/session-card'
export { ClientCard } from './components/client-card'
export { InsightCard } from './components/insight-card'

// Form components
export { Form, FormField } from './components/form'
export { GoalForm } from './components/goal-form'
export { SessionForm } from './components/session-form'
```

**Dependencies**:
- `react`, `react-dom`
- `@radix-ui/react-*` (shared UI primitives)
- `tailwindcss` (shared styles)
- `class-variance-authority`
- `lucide-react` (icons)
- `@flynn-aac/shared-types`

### 4. @flynn-aac/shared-utils

**Purpose**: Shared utility functions

**Exports**:
```typescript
// Date utilities
export function formatMessageTime(date: Date | string): string
export function formatDate(date: Date | string, format: string): string
export function getRelativeTime(date: Date | string): string

// String utilities
export function cn(...inputs: ClassValue[]): string  // Tailwind merge
export function generateTempId(): string
export function truncate(str: string, length: number): string

// Constants
export const THERAPY_TYPES: TherapyType[]
export const GOAL_STATUSES: GoalStatus[]
export const API_BASE_URL: string

// Validation helpers
export function isValidUUID(id: string): boolean
```

**Dependencies**:
- `clsx`, `tailwind-merge`
- `@flynn-aac/shared-types`

## Migration Steps

### Phase 1: Setup Workspace (1 hour)

1. Create root `package.json` with workspace config
2. Create `packages/` directory structure
3. Create shared package skeletons with `package.json` files
4. Set up TypeScript project references with `tsconfig.base.json`

### Phase 2: Extract Shared Code (2 hours)

1. Extract types from backend and frontends → `shared-types`
2. Extract Zod schemas from backend → `shared-schemas`
3. Extract utility functions → `shared-utils`
4. Extract reusable components → `shared-ui`

### Phase 3: Move Existing Packages (1 hour)

1. Move `backend/` to `packages/backend/`
2. Move `therapist-web/` to `packages/therapist-web/`
3. Move `caregiver-web/` to `packages/caregiver-web/`
4. Update all `package.json` files with workspace references

### Phase 4: Update Imports (2 hours)

1. Replace local type imports with `@flynn-aac/shared-types`
2. Replace Zod schemas with `@flynn-aac/shared-schemas`
3. Replace utilities with `@flynn-aac/shared-utils`
4. Replace components with `@flynn-aac/shared-ui`
5. Run TypeScript compiler to catch missing imports

### Phase 5: Update Docker & Infrastructure (1 hour)

1. Update `docker-compose.yml` with new paths
2. Update Dockerfiles with new build context
3. Update volume mounts for hot reload
4. Test Docker build and run

### Phase 6: Testing & Validation (1 hour)

1. Run `bun install` at root to link workspaces
2. Test backend builds: `cd packages/backend && bun run build`
3. Test frontend builds: `cd packages/therapist-web && bun run build`
4. Run all tests: `bun test`
5. Start all services and verify they work

## Benefits

1. **Type Safety**: Single source of truth prevents drift
2. **DRY Principle**: No code duplication
3. **Faster Development**: Change once, affect all packages
4. **Better Testing**: Shared code can be tested independently
5. **Clearer Dependencies**: Explicit package boundaries
6. **Easier Onboarding**: Clear package structure
7. **Incremental Builds**: TypeScript project references enable faster rebuilds

## Risks & Mitigation

| Risk | Mitigation |
|------|------------|
| Breaking existing imports | Use TypeScript compiler to find all errors |
| Docker build fails | Test Docker builds incrementally |
| Tests fail after migration | Run tests frequently during migration |
| Development workflow broken | Test hot reload after each step |
| Git history lost | Use `git mv` to preserve history |

## Rollback Plan

If migration fails, we can:
1. Revert all commits
2. Keep only `shared-types` package with path aliases
3. Complete migration incrementally over multiple PRs

## Estimated Effort

- **Total**: 8-10 hours
- **Critical path**: Phase 1-4 (6 hours)
- **Nice to have**: Phase 5-6 (2 hours for polish)

## Success Criteria

- ✅ All packages build successfully
- ✅ All tests pass
- ✅ Docker containers start and function
- ✅ Hot reload works in development
- ✅ No TypeScript errors
- ✅ No duplicate code across packages

## Next Steps

1. Review and approve this plan
2. Create feature branch: `feat/workspace-migration`
3. Execute phases 1-6
4. Create PR with comprehensive testing notes
5. Merge and update documentation
