# Flynn AAC Backend - Architecture Review #2
**Date:** 2026-01-28
**Reviewer:** Cody (AI)

## Executive Summary

The backend is well-structured with proper separation of concerns. Authentication is solid. However, there are several security gaps, missing indexes, and some anti-patterns that should be addressed before production.

---

## 🔴 CRITICAL ISSUES

### 1. Missing Clerk Environment Variables in Schema
**Location:** `src/config/env.ts`

```typescript
// CLERK_SECRET_KEY and CLERK_WEBHOOK_SECRET are used but not defined in schema
const clerk = createClerkClient({ secretKey: env.CLERK_SECRET_KEY }); // Will be undefined!
```

**Impact:** App will crash or have undefined behavior when Clerk functions are called.

**Fix:**
```typescript
const envSchema = z.object({
  // ... existing
  CLERK_SECRET_KEY: z.string().optional(), // Required in production
  CLERK_WEBHOOK_SECRET: z.string().optional(), // Required in production
});
```

### 2. Webhook Signature Bypass in Non-Production
**Location:** `src/routes/api/v1/auth.ts:64-79`

```typescript
if (env.CLERK_WEBHOOK_SECRET && env.NODE_ENV !== "test") {
  // Signature verified
} else {
  // Parsed directly - NO VERIFICATION!
  event = JSON.parse(body) as ClerkWebhookEvent;
}
```

**Impact:** If `CLERK_WEBHOOK_SECRET` is not set (misconfiguration), anyone can forge webhook events and create admin users.

**Fix:**
```typescript
if (env.NODE_ENV === "production" && !env.CLERK_WEBHOOK_SECRET) {
  throw new Error("CLERK_WEBHOOK_SECRET is required in production");
}
```

### 3. Missing Index on usage_logs.timestamp
**Location:** `src/db/schema.ts:79-87`

The `usage_logs` table has no indexes. This table will grow to millions of rows and is queried by `timestamp` and `childId` constantly.

**Impact:** Metrics aggregation and usage queries will become extremely slow.

**Fix:** Add migration:
```sql
CREATE INDEX usage_logs_child_timestamp_idx ON usage_logs(child_id, timestamp);
CREATE INDEX usage_logs_timestamp_idx ON usage_logs(timestamp);
CREATE INDEX usage_logs_session_idx ON usage_logs(session_id) WHERE session_id IS NOT NULL;
```

---

## 🟠 HIGH PRIORITY

### 4. No Global Rate Limiting
**Location:** `src/app.ts`

Rate limiting only applies to `/device` endpoints. All other API routes are unprotected.

**Impact:** Vulnerable to DoS, brute force, and API abuse.

**Fix:**
```typescript
import { rateLimiter } from "./middleware/rate-limiter";

// After auth, before routes
app.use("/api/*", rateLimiter({ 
  windowMs: 60000, 
  max: 100 
}));
```

### 5. Inconsistent Logging (console.log vs logger)
**Locations:** 47 `console.log/error` calls across codebase

**Impact:** Logs aren't structured, can't be filtered by level, no correlation IDs.

**Fix:** Replace all `console.log` with the existing logger:
```typescript
import { logger } from "../middleware/logger";
logger.info("message", { context });
```

### 6. N+1 Query Pattern in Batch Jobs
**Location:** `src/services/anomaly-detector.ts:313-330`

```typescript
for (const child of allChildren) {
  const count = await detectAndSaveAnomalies(child.id, ...);
}
```

**Impact:** For 1000 children, this makes thousands of DB queries.

**Mitigation:** Acceptable for daily jobs, but should batch if scaling beyond ~1000 children.

### 7. Missing Transaction Handling
**Locations:** Multi-step operations in routes

Example: Creating a child + linking to family should be atomic.

**Fix:** Use Drizzle transactions:
```typescript
await db.transaction(async (tx) => {
  const [child] = await tx.insert(children).values(...).returning();
  await tx.insert(familyMembers).values(...);
});
```

---

## 🟡 MEDIUM PRIORITY

### 8. Test Duplication
7 tests with identical name "throws UNAUTHORIZED for user without access" across files. While they test different endpoints, consider consolidating authorization test patterns.

### 9. Missing conversation_messages Index
**Location:** `src/db/schema.ts:120-130`

No index on `conversation_id` for message queries.

**Fix:**
```sql
CREATE INDEX conversation_messages_conversation_idx ON conversation_messages(conversation_id);
```

### 10. User vs Caregiver Confusion
Two tables store user identity:
- `users` - for authentication (Clerk)
- `caregivers` - for family membership

**Issue:** No explicit link between them. Authorization uses email matching.

**Recommendation:** Add `userId` FK to caregivers table, or consolidate.

### 11. Missing Data Retention Policy
No cleanup jobs for old data:
- `usage_logs` - will grow indefinitely
- `notification_logs` - keeps all history
- `conversation_messages` - no archival

**Recommendation:** Add cleanup job or partitioning strategy.

---

### 15. CORS Allows All Origins
**Location:** `src/app.ts:11`

```typescript
app.use("*", cors()); // No origin restriction!
```

**Impact:** Any website can make API requests on behalf of authenticated users (CSRF-like attacks).

**Fix:**
```typescript
app.use("*", cors({
  origin: env.NODE_ENV === "production" 
    ? ["https://flynnapp.com", "capacitor://localhost"] 
    : "*",
  credentials: true,
}));
```

---

## 🟢 LOW PRIORITY / NICE TO HAVE

### 12. Error Messages Could Leak Info
Some error messages include internal details:
```typescript
throw new AppError(`Route ${c.req.method} ${c.req.path} not found`, 404);
```

**Recommendation:** Generic errors in production, detailed in development.

### 13. Missing Request ID Correlation
No request ID passed through for log correlation.

**Fix:** Add middleware to generate and propagate request IDs.

### 14. TypeScript Errors in Codebase
Running `tsc --noEmit` shows ~20 errors (unused imports, type mismatches).

**Fix:** Clean up before production.

---

## ✅ WHAT'S GOOD

1. **Authentication** - Properly implemented with Clerk, global middleware
2. **Authorization** - Per-resource access checks, family-scoped
3. **Input Validation** - Zod schemas on all routes
4. **SQL Injection** - Using Drizzle ORM with parameterized queries
5. **Error Handling** - Centralized error handler, proper status codes
6. **Test Coverage** - 531 tests, good unit test patterns
7. **API Structure** - Clean RESTful design, versioned
8. **Separation of Concerns** - Services, routes, middleware clearly separated

---

## Recommended Priority Order

1. **Add Clerk env vars to schema** (5 min)
2. **Add webhook secret validation in production** (10 min)
3. **Add usage_logs indexes** (migration)
4. **Add global rate limiting** (15 min)
5. **Fix TypeScript errors** (30 min)
6. **Replace console.log with logger** (1 hour)
7. **Add missing indexes** (migration)
8. **Add transaction handling** (as you touch routes)

---

## Files Changed Since Last Review

New additions since architecture review #1:
- `src/jobs/scheduler.ts` - Cron job scheduler ✅
- `src/tests/integration/api-flows.test.ts` - Integration tests ✅
- `docs/openapi.yaml` - API documentation ✅
- `docs/API.md` - Quick reference ✅
- All TODO resolutions ✅
