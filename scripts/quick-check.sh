#!/bin/bash
# Development utility: Quick check (fast feedback loop)
# Usage: ./scripts/quick-check.sh

set -e

echo "Running quick checks..."

# Only lint and test changed files
CHANGED_FILES=$(git diff --name-only HEAD | grep -E '\.(ts|tsx)$' || true)

if [ -z "$CHANGED_FILES" ]; then
  echo "No TypeScript files changed"
  exit 0
fi

echo "Changed files:"
echo "$CHANGED_FILES"
echo ""

echo "Running lint..."
npm run lint -- $CHANGED_FILES 2>/dev/null || npm run lint
echo "✅ Lint passed"

echo ""
echo "✅ Quick check complete!"
