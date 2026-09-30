#!/usr/bin/env bash
set -euo pipefail
# Run from repo root on the VPS after checking out the intended commit.
if [[ ! -f .env.production ]]; then
  echo "Missing .env.production" >&2
  exit 1
fi
docker compose --env-file .env.production -f compose.production.yaml config --quiet
docker compose --env-file .env.production -f compose.production.yaml build
docker compose --env-file .env.production -f compose.production.yaml up -d postgres
docker compose --env-file .env.production -f compose.production.yaml up -d --force-recreate migrate
docker compose --env-file .env.production -f compose.production.yaml up -d --wait --wait-timeout 180 backend frontend
curl --fail --silent --show-error http://127.0.0.1:3001/api/health
