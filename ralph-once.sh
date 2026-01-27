#!/bin/bash
# ralph-once.sh - Run Claude Code to implement features iteratively
# Usage: ./ralph-once.sh <iterations>

set -e

if [ -z "$1" ]; then
  echo "Usage: $0 <iterations>"
  exit 1
fi

for ((i = 1; i <= $1; i++)); do
  echo "=== Ralph iteration $i ==="

  result=$(claude --dangerously-skip-permissions -p \
    "@docs/prd.json @progress.txt \
1. Read prd.json - find requirements where passes=false. \
2. Pick highest priority incomplete requirement. \
3. Implement in SwiftUI + MV architecture. \
4. Run: xcodebuild build -project FlynnAAC/FlynnAAC.xcodeproj -scheme FlynnAAC -destination 'platform=iOS Simulator,name=iPad Pro 13-inch (M4),OS=18.2' \
5. Run: xcodebuild test -project FlynnAAC/FlynnAAC.xcodeproj -scheme FlynnAAC -destination 'platform=iOS Simulator,name=iPad Pro 13-inch (M4),OS=18.2' \
6. If tests pass, run: bun run linear:complete FLY-X (replacing X with the issue number) \
7. Append progress to progress.txt with timestamp. \
8. Git commit: 'feat(FLY-X): description'. \
ONLY WORK ON ONE FEATURE. Output <promise>COMPLETE</promise> when all passes=true.")

  echo "$result"

  # Auto-check tests and update Linear + PRD passes field
  bun run linear:check-tests || true

  if [[ "$result" == *"<promise>COMPLETE</promise>"* ]]; then
    echo "M1 complete!"
    exit 0
  fi
done
