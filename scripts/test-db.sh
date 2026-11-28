#!/usr/bin/env bash
# Runs backend/tests against the local Supabase stack (must be started:
#   npx supabase start --workdir backend).
# Loads the local, non-secret development keys from `supabase status`.
set -euo pipefail
cd "$(dirname "$0")/.."
eval "$(npx supabase status -o env --workdir backend 2>/dev/null | grep -E '^(API_URL|DB_URL|PUBLISHABLE_KEY|SECRET_KEY|JWT_SECRET|MAILPIT_URL)=' | sed 's/^/export /')"
exec npx jest -c jest.integration.config.js "$@"
