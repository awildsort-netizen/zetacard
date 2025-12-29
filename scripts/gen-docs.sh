#!/bin/bash
# Development utility: Generate documentation from code
# Usage: ./scripts/gen-docs.sh

set -e

echo "═══════════════════════════════════════════════════════"
echo "Documentation Generation"
echo "═══════════════════════════════════════════════════════"
echo ""

# Count cards in registry
echo "Analyzing card registry..."
CARD_COUNT=$(grep -c '"ζ.card' src/cardRegistry.ts || echo "0")
echo "Found $CARD_COUNT cards in registry"
echo ""

# List all cards
echo "Registered cards:"
grep '"ζ.card' src/cardRegistry.ts | sed 's/.*"\(ζ\.card[^"]*\)".*/  - \1/' || echo "  (none)"
echo ""

# Check for undocumented cards (exist in src/cards/ but not in registry)
echo "Checking for undocumented cards..."
CARD_FILES=$(find src/cards -name "*.ts" | wc -l)
echo "Card implementation files: $CARD_FILES"
echo "Registered cards: $CARD_COUNT"

if [ "$CARD_FILES" -gt "$CARD_COUNT" ]; then
  echo "⚠️  Warning: Some card files may not be registered"
fi

echo ""
echo "═══════════════════════════════════════════════════════"
echo "✅ Documentation check complete"
echo "═══════════════════════════════════════════════════════"
