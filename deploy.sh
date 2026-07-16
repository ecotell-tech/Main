#!/usr/bin/env bash
# Production deploy: pull latest code, rebuild, migrate the DB, restart the
# prod stack. One command does everything needed for a deploy.
# Usage: ./deploy.sh   (run from the repo root on the VPS)
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")"

# --env-file makes Compose read ${DOMAIN}/${MYSQL_*} substitutions from
# .env.production instead of auto-loading a plain .env (Compose's default,
# and easy to confuse with the filename the example template actually
# produces — see .env.production.example).
COMPOSE="docker compose -f docker-compose.prod.yml --env-file .env.production"

echo "==> Pulling latest code"
git pull origin main

echo "==> Checking .env.production"
required_vars=(DOMAIN ACME_EMAIL SERVER_IP MYSQL_DATABASE MYSQL_USER MYSQL_PASSWORD MYSQL_ROOT_PASSWORD)
missing=()
for var in "${required_vars[@]}"; do
  if ! grep -qE "^${var}=.+" .env.production 2>/dev/null; then
    missing+=("$var")
  fi
done
if [ "${#missing[@]}" -gt 0 ]; then
  echo "ERROR: .env.production is missing or has empty values for: ${missing[*]}"
  echo "Set these in .env.production before deploying (see .env.production.example)."
  exit 1
fi

echo "==> Checking backend/.env.production"
backend_required_vars=(DATABASE_URL REDIS_URL JWT_SECRET PII_ENCRYPTION_KEY CORS_ORIGINS)
backend_missing=()
for var in "${backend_required_vars[@]}"; do
  if ! grep -qE "^${var}=.+" backend/.env.production 2>/dev/null; then
    backend_missing+=("$var")
  fi
done
if [ "${#backend_missing[@]}" -gt 0 ]; then
  echo "ERROR: backend/.env.production is missing or has empty values for: ${backend_missing[*]}"
  echo "Set these before deploying (see backend/.env.production.example)."
  echo "PII_ENCRYPTION_KEY: python3 -c \"from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())\""
  echo "JWT_SECRET:         openssl rand -hex 32"
  exit 1
fi

echo "==> Building images"
$COMPOSE build

echo "==> Starting database + redis first"
$COMPOSE up -d db redis

echo "==> Waiting for database to be healthy"
for i in $(seq 1 30); do
  status=$($COMPOSE ps db --format '{{.Health}}' 2>/dev/null || true)
  [ "$status" = "healthy" ] && break
  sleep 2
done
if [ "$status" != "healthy" ]; then
  echo "ERROR: database did not become healthy in time — check '$COMPOSE logs db'"
  exit 1
fi

echo "==> Starting backend + caddy"
$COMPOSE up -d

echo "==> Waiting for backend container to be running"
for i in $(seq 1 30); do
  running=$($COMPOSE ps backend --format '{{.State}}' 2>/dev/null || true)
  [ "$running" = "running" ] && break
  sleep 2
done

echo "==> Running database migrations"
# The DB is originally created by database/schema.sql (via docker-entrypoint-
# initdb.d on first boot), which is kept in sync with the latest migration —
# not just migration 001. So a database that has never been touched by
# Alembic already has the head-state schema; baseline it at head, not 001,
# or "upgrade head" will try to re-add columns schema.sql already created.
if $COMPOSE exec -T backend alembic current 2>/dev/null | grep -q '.'; then
  echo "    Alembic already initialized on this database."
else
  echo "    No Alembic revision stamped yet — baselining at head (schema.sql already created this state)."
  $COMPOSE exec -T backend alembic stamp head || echo "WARNING: could not stamp baseline revision — check '$COMPOSE logs backend'"
fi

if $COMPOSE exec -T backend alembic upgrade head; then
  echo "    Migrations applied successfully."
else
  echo "WARNING: 'alembic upgrade head' failed. The backend's built-in startup"
  echo "         fallback (app/main.py) will still attempt to self-heal missing"
  echo "         columns/tables on every restart, but check 'alembic history'"
  echo "         and '$COMPOSE logs backend' to fix the underlying migration."
fi

echo "==> Restarting backend (picks up any schema the migration step just applied)"
$COMPOSE restart backend

echo "==> Container status"
$COMPOSE ps

echo "==> Recent caddy logs"
$COMPOSE logs --tail 20 caddy

echo "==> Recent backend logs"
$COMPOSE logs --tail 20 backend

echo "==> Local HTTP check"
if curl -sf -o /dev/null http://localhost; then
  echo "OK: localhost:80 responded"
else
  echo "WARNING: localhost:80 did not respond — check the logs above"
fi

echo "==> Done"
