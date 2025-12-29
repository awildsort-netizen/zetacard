#!/bin/bash
# Development utility: Validate all cards in the registry
# Usage: ./scripts/validate-cards.sh

set -e

echo "═══════════════════════════════════════════════════════"
echo "Card Registry Validation"
echo "═══════════════════════════════════════════════════════"
echo ""

# Run the card validation test
npm run test src/__tests__/cardValidation.test.ts

echo ""
echo "═══════════════════════════════════════════════════════"
echo "✅ Card validation complete"
echo "═══════════════════════════════════════════════════════"
