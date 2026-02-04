#!/bin/sh
set -e

# Run migrations (safe no-op if none to apply)
if [ -n "$DATABASE_URL" ]; then
  echo "[lexipro] Applying database migrations..."
  npx prisma migrate deploy

  # Seeding is DEV-only by default.
  # To seed intentionally, set AUTO_SEED=true and ensure NODE_ENV is not "production".
  if [ "${AUTO_SEED:-}" = "1" ] || [ "${AUTO_SEED:-}" = "true" ]; then
    if [ "${NODE_ENV:-}" = "production" ]; then
      echo "[lexipro] AUTO_SEED requested, but NODE_ENV=production; skipping seed."
    else
      echo "[lexipro] Running opt-in seed (AUTO_SEED enabled)..."
      npx prisma db seed
    fi
  fi
fi

exec "$@"
