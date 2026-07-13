#!/usr/bin/env bash
# Production deploy: pull latest code, rebuild, restart the prod stack.
# Usage: ./deploy.sh   (run from the repo root on the VPS)
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")"

COMPOSE="docker compose -f docker-compose.prod.yml"

echo "==> Pulling latest code"
git pull origin main

echo "==> Checking .env"
required_vars=(DOMAIN ACME_EMAIL SERVER_IP MYSQL_DATABASE MYSQL_USER MYSQL_PASSWORD MYSQL_ROOT_PASSWORD)
missing=()
for var in "${required_vars[@]}"; do
  if ! grep -qE "^${var}=.+" .env 2>/dev/null; then
    missing+=("$var")
  fi
done
if [ "${#missing[@]}" -gt 0 ]; then
  echo "ERROR: .env is missing or has empty values for: ${missing[*]}"
  echo "Set these in .env before deploying (see .env.production.example)."
  exit 1
fi

echo "==> Building images"
$COMPOSE build

echo "==> Starting containers"
$COMPOSE up -d

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
