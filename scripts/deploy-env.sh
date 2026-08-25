#!/usr/bin/env bash
# Usage: ./scripts/deploy-env.sh <production|staging>
#
# TanStack Start's Vite plugin bakes wrangler.jsonc into the built
# server bundle and doesn't tolerate Wrangler `env:` blocks. So we
# keep two flat configs — wrangler.jsonc (production) and
# wrangler.staging.jsonc — and swap them into place for the build
# only when deploying to staging. wrangler.jsonc is restored via
# an EXIT trap even if the build/deploy fails, so a Ctrl-C never
# leaves prod config missing.
set -euo pipefail

ENV="${1:?usage: deploy-env.sh <production|staging>}"
case "$ENV" in
  production) ;;
  staging)    ;;
  *) echo "unknown env: $ENV" >&2; exit 2 ;;
esac

if [ "$ENV" = "production" ]; then
  # Nothing to swap — wrangler.jsonc already holds production config.
  vite build --mode production
  wrangler deploy
  exit $?
fi

# staging: swap in wrangler.staging.jsonc, always restore on exit.
BACKUP=".wrangler.jsonc.prod.bak"
cp wrangler.jsonc "$BACKUP"
trap 'mv "$BACKUP" wrangler.jsonc' EXIT

cp wrangler.staging.jsonc wrangler.jsonc
vite build --mode staging
wrangler deploy
