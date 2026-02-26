#!/bin/sh
set -e

echo "Waiting for Postgres..."
until pg_isready -h "$DB_HOST" -p "${DB_PORT:-5432}" -U "$DB_USER" 2>/dev/null; do
  sleep 1
done
echo "Postgres is ready."

# Run migrations (idempotent)
echo "Running migrations..."
pnpm db:migrate

# Seed default admin (idempotent)
echo "Running seed..."
pnpm db:seed

# Start the API
echo "Starting API..."
exec node apps/api/dist/index.js
