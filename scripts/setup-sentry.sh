#!/bin/bash
# Sentry DSN setup for AdminMate AI
# Usage: ./setup-sentry.sh <your-sentry-dsn>

set -euo pipefail

if [ $# -eq 0 ]; then
    echo "Usage: $0 <SENTRY_DSN>"
    echo ""
    echo "To get your DSN:"
    echo "1. Go to https://sentry.io"
    echo "2. Select your project"
    echo "3. Go to Settings → Client Keys (DSN)"
    echo "4. Copy the DSN"
    exit 1
fi

SENTRY_DSN="$1"

echo "Setting SENTRY_DSN in Supabase..."
npx supabase secrets set SENTRY_DSN="$SENTRY_DSN"

echo "Setting VITE_SENTRY_DSN in Vercel..."
npx vercel env add VITE_SENTRY_DSN production --value "$SENTRY_DSN" --yes 2>/dev/null || \
    echo "Note: VITE_SENTRY_DSN may already exist. Update manually in Vercel dashboard."

echo "Sentry DSN configured!"
echo "Verify: https://sentry.io → your project → Issues"
