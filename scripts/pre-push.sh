#!/bin/bash
# Development utility: Full pre-push checks
# Usage: ./scripts/pre-push.sh

set -e

echo "═══════════════════════════════════════════════════════"
echo "Pre-Push Validation"
echo "═══════════════════════════════════════════════════════"
echo ""

echo "Step 1/4: Running linter..."
npm run lint
echo "✅ Linting passed"
echo ""

echo "Step 2/4: Building project..."
npm run build
echo "✅ Build successful"
echo ""

echo "Step 3/4: Running all tests..."
npm run test
echo "✅ All tests passed"
echo ""

echo "Step 4/4: Validating card registry..."
npm run test src/__tests__/cardValidation.test.ts
echo "✅ Card validation passed"
echo ""

echo "═══════════════════════════════════════════════════════"
echo "✅ All pre-push checks passed!"
echo "   Ready to push to remote"
echo "═══════════════════════════════════════════════════════"
