#!/bin/sh
set -e

echo "Waiting for Postgres..."
until pg_isready -h "$DB_HOST" -p "${DB_PORT:-5432}" -U "$DB_USER" 2>/dev/null; do
  sleep 1
done
echo "Postgres is ready."

# Run migrations (idempotent) — exit if it fails
echo "Running migrations..."
if ! pnpm db:migrate; then
  echo "ERROR: Migration failed. Aborting startup."
  exit 1
fi

# Seed default admin (idempotent) — only if migrations succeeded
echo "Running seed..."
pnpm db:seed

# Start the API
echo "Starting API..."
exec node apps/api/dist/index.js
