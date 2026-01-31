#!/bin/bash
set -e

echo "🔨 Running pre-test build validation..."

# Build therapist-web to catch CSS/compilation errors
echo "Building therapist-web..."
cd ../therapist-web
bun run build 2>&1 | tee /tmp/therapist-build.log

if grep -q "error" /tmp/therapist-build.log; then
  echo "❌ Therapist-web build failed!"
  exit 1
fi

# Build caregiver-web
echo "Building caregiver-web..."
cd ../caregiver-web
bun run build 2>&1 | tee /tmp/caregiver-build.log

if grep -q "error" /tmp/caregiver-build.log; then
  echo "❌ Caregiver-web build failed!"
  exit 1
fi

echo "✅ Both apps build successfully"

# Now run the actual tests
echo "🧪 Running unit tests..."
bun test --run

echo "🎭 Running E2E smoke tests first..."
npx playwright test e2e/build-smoke.spec.ts

echo "🎭 Running full E2E suite..."
npx playwright test

echo "✅ All tests passed!"
