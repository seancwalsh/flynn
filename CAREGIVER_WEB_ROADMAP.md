# Flynn AAC - Caregiver Web Roadmap

**Last Updated:** 2026-01-29
**Current Status:** Chat system complete, child management needed

---

## Current State Summary

### ✅ What's Working
- **Authentication**: Full Clerk integration with login/register
- **Chat System**: Production-ready with SSE streaming, conversation management
- **Insights Feed**: UI complete but not integrated
- **Protected Routing**: File-based routing with auth guards
- **Test Infrastructure**: Strong coverage for chat and auth (151 tests passing)

### ❌ What's Missing
- Child/family management (routes exist, no UI)
- Real dashboard data (currently hardcoded zeros)
- Analytics and progress tracking
- Symbol library management
- Therapist collaboration features
- E2E tests (Clerk config needed)

---

## Priority Roadmap

### Phase 1: Core Child Management 🎯 **HIGH PRIORITY**

**Goal:** Enable caregivers to add and manage children in the system

#### 1.1 Children List Page Implementation
- [ ] Replace empty state with real data from `/children` API
- [ ] Add loading states and error handling
- [ ] Implement child card grid layout
- [ ] Add search/filter by name

**Files to modify:**
- `caregiver-web/src/routes/_app/children/index.tsx`
- `caregiver-web/src/lib/children-api.ts` (if needed)

#### 1.2 Add Child Modal/Form
- [ ] Create `AddChildModal` component
- [ ] Form fields: name, birthDate, avatar (optional)
- [ ] Validation using Zod schema
- [ ] POST to `/children` endpoint
- [ ] Optimistic updates with TanStack Query
- [ ] Success toast notification

**New files:**
- `caregiver-web/src/components/children/AddChildModal.tsx`
- `caregiver-web/src/components/children/ChildForm.tsx`

#### 1.3 Child Detail Page
- [ ] Implement `/_app/children/$childId` route
- [ ] Display child profile information
- [ ] Show recent activity summary
- [ ] Link to chat interface for that child
- [ ] Add edit/delete actions

**Files to create:**
- `caregiver-web/src/routes/_app/children/$childId.tsx`
- `caregiver-web/src/components/children/ChildProfile.tsx`

**Estimated Complexity:** Medium (2-3 days)

---

### Phase 2: Dashboard Data Integration 📊 **MEDIUM PRIORITY**

**Goal:** Display real analytics instead of placeholder zeros

#### 2.1 Connect Real Data Sources
- [ ] Query `/children` endpoint for child count
- [ ] Query usage statistics (if endpoint exists, or build it)
- [ ] Fetch recent insights
- [ ] Implement dashboard data aggregation

**Files to modify:**
- `caregiver-web/src/routes/_app/dashboard.tsx`

#### 2.2 Quick Stats Widget
- [ ] "Symbols learned" - aggregate from usage logs
- [ ] "Sessions this week" - count active session days
- [ ] "Daily average" - calculate average usage time

**Backend Requirements:**
- [ ] GET `/children/:id/stats` endpoint
- [ ] GET `/children/:id/usage-summary` endpoint

#### 2.3 Basic Analytics Charts
- [ ] Add chart library (Recharts or Chart.js)
- [ ] Weekly usage line chart
- [ ] Symbol frequency bar chart
- [ ] Session duration trends

**New dependencies:**
```bash
npm install recharts
npm install --save-dev @types/recharts
```

**Estimated Complexity:** Medium (2-3 days)

---

### Phase 3: Insights Integration 🔔 **MEDIUM PRIORITY**

**Goal:** Surface AI-generated insights to caregivers

#### 3.1 Insights API Integration
- [ ] Create `/insights` API client methods
- [ ] Fetch insights with pagination
- [ ] Mark insights as read
- [ ] Dismiss insights

**Files to create:**
- `caregiver-web/src/lib/insights-api.ts`

#### 3.2 Insights in Dashboard
- [ ] Add "Recent Insights" section to dashboard
- [ ] Show top 3 unread insights
- [ ] Link to full insights page

#### 3.3 Dedicated Insights Page (Optional)
- [ ] Create `/_app/insights` route
- [ ] Full list with filtering by type/severity
- [ ] Pagination
- [ ] Search functionality

**Estimated Complexity:** Low-Medium (1-2 days)

---

### Phase 4: Family & Collaboration Features 👨‍👩‍👧‍👦 **MEDIUM PRIORITY**

**Goal:** Multi-user access and therapist collaboration

#### 4.1 Family Management
- [ ] GET `/families` endpoint integration
- [ ] Create family modal/form
- [ ] Add family members (invite by email)
- [ ] Role assignment (parent, caregiver, therapist)

**Backend Requirements:**
- [ ] POST `/families` - Create family
- [ ] POST `/families/:id/invites` - Send invites
- [ ] GET `/families/:id/members` - List members

#### 4.2 Therapist Assignment
- [ ] Link therapists to children via API
- [ ] Show assigned therapist on child profile
- [ ] Therapist messaging/notes feature

**Estimated Complexity:** High (4-5 days)

---

### Phase 5: Testing & Polish ✅ **ONGOING**

#### 5.1 E2E Test Configuration
- [ ] Set up Clerk test environment
  - Create test organization
  - Configure test user credentials
  - Set environment variables
- [ ] Remove `.skip()` from Playwright tests
- [ ] Run full E2E suite in CI
- [ ] Add E2E tests for new features

**Files to modify:**
- `caregiver-web/e2e/chat.spec.ts`
- `caregiver-web/e2e/auth.setup.ts`
- `.github/workflows/test.yml` (if exists)

#### 5.2 Mobile Device Testing
- [ ] Test on actual iOS devices (network access configured)
- [ ] Test on Android devices
- [ ] Fix mobile navigation edge cases
- [ ] Test tablet layouts (iPad)
- [ ] Verify touch interactions

**Testing URLs:**
- Local network: `http://192.168.68.104:3001`
- Tailscale: `http://100.x.x.x:3001`

#### 5.3 Accessibility Audit
- [ ] Run axe DevTools audit
- [ ] Fix keyboard navigation issues
- [ ] Add ARIA labels where missing
- [ ] Test with screen reader (VoiceOver)

**Estimated Complexity:** Medium (ongoing)

---

### Phase 6: Performance & Optimization ⚡ **LOW PRIORITY**

#### 6.1 Query Optimization
- [ ] Implement pagination for children list
- [ ] Add search/filter query params
- [ ] Configure React Query cache strategies
- [ ] Add infinite scroll for chat history

#### 6.2 Code Splitting
- [ ] Lazy load routes
- [ ] Dynamic imports for heavy components (charts)
- [ ] Analyze bundle size with `npm run build`
- [ ] Split vendor chunks

#### 6.3 Performance Monitoring
- [ ] Add Web Vitals tracking
- [ ] Monitor Time to Interactive (TTI)
- [ ] Measure chat streaming latency

**Estimated Complexity:** Low-Medium (2-3 days)

---

## Technical Debt & Refactoring

### Current Architecture Observations

**Strengths:**
- Clean separation of concerns
- Type-safe throughout
- Well-tested core features
- Good use of React patterns

**Areas for Improvement:**
- [ ] Consider global state management (Zustand) if complexity grows
- [ ] Add form validation library (Zod with react-hook-form)
- [ ] Implement offline support (service worker)
- [ ] Add error boundary components
- [ ] Create design system documentation

---

## Backend API Requirements

To complete caregiver-web features, these backend endpoints are needed:

### Children Stats Endpoints
```typescript
GET /children/:id/stats
// Returns: { symbolsLearned, sessionsThisWeek, dailyAverage }

GET /children/:id/usage-summary?startDate=&endDate=
// Returns: Array of daily usage data for charts
```

### Insights Endpoints
```typescript
GET /insights?childId=&status=unread&limit=10
// Returns paginated insights

PATCH /insights/:id/read
// Mark insight as read

DELETE /insights/:id
// Dismiss insight
```

### Family Endpoints
```typescript
POST /families
// Create family

POST /families/:id/invites
// Invite member

GET /families/:id/members
// List family members
```

---

## Quick Wins (Can Be Done Today)

1. **Fix Test Issues** (30 min)
   - ClaudeService API key validation test
   - Clerk `verifyToken` import errors

2. **Enable Insights Feed** (1 hour)
   - Add insights bell to dashboard
   - Wire up existing `InsightsFeed` component
   - Use mock data initially

3. **Improve Dashboard UX** (1 hour)
   - Add child selector dropdown (if multiple children)
   - Replace "Getting Started" with dynamic tips
   - Add "Quick Actions" buttons

4. **Mobile Testing Setup** (30 min)
   - Confirm network access works: `http://192.168.68.104:3001`
   - Test chat on phone
   - Document any UI issues

---

## Next Steps Discussion

**Questions to consider:**

1. **What's the MVP?**
   - Do we need child management before testing chat with users?
   - Can we launch with just chat for single-child families?

2. **Backend priority?**
   - Which endpoints should be built first?
   - Can we use mock data for analytics initially?

3. **Design system?**
   - Should we document component patterns?
   - Need Figma designs for child management?

4. **Timeline?**
   - What's the target launch date?
   - Which phase needs to ship first?

---

## Resources

- **Codebase:** `/Users/seanwalsh/code/projects/flynn-app/caregiver-web`
- **API Docs:** `backend/README.md`
- **Test Suite:** `npm test` (151 tests passing)
- **Design System:** Using shadcn/ui components

**Contact:** Review with Sean before starting Phase 1
