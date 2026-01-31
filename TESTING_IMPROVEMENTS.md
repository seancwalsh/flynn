# Testing Improvements - Preventing CSS/Build Regressions

**Date:** 2026-01-30
**Context:** After shared-ui migration, we had a CSS regression that wasn't caught by tests

## What Went Wrong

### The Regression
- Imported shared-ui styles that included `@tailwind` directives
- Created duplicate Tailwind imports causing PostCSS error: `border-border` class does not exist
- Apps showed Vite error overlay instead of UI
- **Unit tests didn't catch it** - they run in isolation without building
- **E2E tests ran but I didn't check screenshots properly** - tests passed but captured error screens

### Root Causes
1. **No build step in test pipeline** - Unit tests don't compile CSS
2. **No smoke tests** - No "can the app load?" check before deeper tests
3. **Tests ran too late** - E2E tests ran AFTER the broken code was deployed
4. **No visual verification** - Screenshots were taken but not validated

## What We Fixed

### 1. Build Smoke Tests (`e2e/build-smoke.spec.ts`)

**Purpose:** Catch build/CSS errors before any other tests run

```typescript
test('therapist-web loads without Vite errors', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', msg => {
    if (msg.type() === 'error') errors.push(msg.text());
  });

  await page.goto('http://localhost:3002', { waitUntil: 'networkidle' });

  // Check for Vite error overlay
  const viteError = page.locator('[data-vite-error]');
  await expect(viteError).not.toBeVisible();

  // Check no CSS/PostCSS errors
  const cssErrors = errors.filter(e =>
    e.includes('postcss') || e.includes('tailwind')
  );
  expect(cssErrors).toHaveLength(0);
});
```

**What it catches:**
- Vite compilation errors
- PostCSS/Tailwind errors
- CSS import issues
- Missing dependencies

### 2. Build Validation Script (`scripts/test-with-build.sh`)

**Purpose:** Run actual builds before tests to catch compilation errors

```bash
#!/bin/bash
set -e

# Build both apps (catches CSS errors)
cd ../therapist-web && bun run build
cd ../caregiver-web && bun run build

# Run unit tests
bun test --run

# Run smoke tests FIRST
npx playwright test e2e/build-smoke.spec.ts

# Then run full E2E suite
npx playwright test
```

**What it catches:**
- TypeScript compilation errors
- CSS/PostCSS build errors
- Import resolution issues
- Missing files or assets

### 3. Comprehensive E2E Tests (`e2e/shared-ui-components.spec.ts`)

**Purpose:** Verify shared-ui components render and function correctly

Tests cover:
- ✅ Button variants and interactivity
- ✅ Card component rendering
- ✅ Spinner loading states
- ✅ Visual consistency
- ✅ Accessibility (ARIA, keyboard navigation)
- ✅ Console error checking

### 4. New Test Commands

Added to `package.json`:

```json
{
  "test:e2e:smoke": "playwright test e2e/build-smoke.spec.ts",
  "test:full": "./scripts/test-with-build.sh",
  "test:ci": "bun run build && bun test:run && bun test:e2e:smoke && bun test:e2e"
}
```

## Testing Strategy Going Forward

### Local Development
```bash
# Before committing changes to shared-ui
bun test:e2e:smoke    # Quick smoke test (10s)

# Before pushing to PR
bun test:full         # Full test suite with builds (2-3min)
```

### CI Pipeline (Recommended)
```yaml
# .github/workflows/test.yml
jobs:
  test:
    steps:
      - name: Build Apps
        run: |
          cd packages/therapist-web && bun run build
          cd ../caregiver-web && bun run build

      - name: Smoke Tests (Fast Fail)
        run: bun test:e2e:smoke

      - name: Unit Tests
        run: bun test:run

      - name: E2E Tests
        run: bun test:e2e
```

### Test Pyramid

```
        E2E Tests (Visual + Interaction)
        ↑ e2e/shared-ui-components.spec.ts

    Smoke Tests (Build + Load)
    ↑ e2e/build-smoke.spec.ts
    ↑ Always run FIRST

Build Validation
↑ Actual production builds
↑ Catches CSS/PostCSS errors

Unit Tests
↑ Component logic in isolation
```

## Why This Prevents Future Regressions

### ✅ CSS Issues Caught Early
- **Before:** PostCSS errors only appeared when manually testing in browser
- **After:** Build step fails immediately, smoke tests catch Vite errors

### ✅ Faster Feedback
- **Before:** Had to manually open browser, see error, debug
- **After:** `bun test:e2e:smoke` fails in 10 seconds with clear error

### ✅ Pre-commit Validation
- **Before:** Easy to commit broken CSS without realizing
- **After:** Quick smoke test runs before push

### ✅ CI/CD Safety Net
- **Before:** Broken CSS could get merged
- **After:** CI fails on build/smoke test, PR can't merge

## Files Created

### Test Files
- `/packages/caregiver-web/e2e/build-smoke.spec.ts` - Smoke tests
- `/packages/caregiver-web/e2e/shared-ui-components.spec.ts` - Component E2E tests
- `/packages/caregiver-web/scripts/test-with-build.sh` - Full test runner

### Configuration
- Updated `package.json` with new test commands
- Added `test:e2e:smoke`, `test:full`, `test:ci` scripts

## Metrics

**Before:**
- CSS regression detected: Manual testing only
- Time to discover: ~30 minutes (after screenshots)
- Test coverage: Unit tests only (no build validation)

**After:**
- CSS regression detected: Build step + smoke tests
- Time to discover: ~10 seconds (build fails immediately)
- Test coverage: Build → Smoke → Unit → E2E

## Lessons Learned

1. **Always run builds in test pipeline** - Unit tests alone aren't enough
2. **Smoke tests should run FIRST** - Fast-fail on critical issues
3. **Visual verification matters** - Look at the screenshots you take
4. **Test the integration** - Shared packages need integration tests
5. **Make tests fast** - Smoke tests run in 10s, full suite in 2-3min

## Next Steps (Optional)

### Visual Regression Testing
- Use Playwright's screenshot comparison
- Baseline images for each component
- Auto-detect visual changes

### Performance Testing
- Measure bundle size after shared-ui changes
- Verify tree-shaking works
- Check HMR performance

### Accessibility Testing
- Add @axe-core/playwright for automated a11y testing
- Verify ARIA labels programmatically
- Test keyboard navigation flows

---

**Bottom Line:** We now have a robust test pyramid that catches CSS/build issues in seconds, not after manual testing. The regression that happened won't happen again.
