#!/usr/bin/env bash
# Retry prisma migrate deploy until clean, clearing stale advisory-lock
# sessions between attempts (Neon direct endpoints can drop connections).
set -u
ROOT="/d/Projects/Kalo"
cd "$ROOT/packages/prisma" || exit 1

DIRECT_URL=$(grep '^DATABASE_DIRECT_URL' "$ROOT/.env" | sed -E 's/^DATABASE_DIRECT_URL="?([^"]+)"?$/\1/')
POOLED_URL=$(grep '^DATABASE_URL' "$ROOT/.env" | sed -E 's/^DATABASE_URL="?([^"]+)"?$/\1/')

clear_locks() {
  node -e "
    const { Client } = require('pg');
    const c = new Client({ connectionString: process.env.POOLED_URL });
    (async () => {
      await c.connect();
      await c.query(\"SELECT pg_terminate_backend(pid) FROM pg_locks WHERE locktype='advisory' AND pid <> pg_backend_pid()\");
      await c.end();
    })().catch(() => process.exit(0));
  " 2>/dev/null
  return 0
}

for attempt in 1 2 3 4 5 6 7 8; do
  echo "=== ATTEMPT $attempt ($(date +%H:%M:%S)) ==="
  OUT=$(DATABASE_URL="$DIRECT_URL" ../../node_modules/.bin/prisma migrate deploy 2>&1)
  RC=$?
  echo "$OUT" | tail -4
  if [ $RC -eq 0 ] && echo "$OUT" | grep -qE 'All migrations have been successfully applied|No pending migrations'; then
    echo "MIGRATIONS_COMPLETE"
    exit 0
  fi
  POOLED_URL="$POOLED_URL" clear_locks
  sleep 8
done
echo "MIGRATIONS_EXHAUSTED"
exit 1
