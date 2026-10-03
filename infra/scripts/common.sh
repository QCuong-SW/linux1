#!/usr/bin/env bash
# Shared paths and Compose wrapper. Do not source a secrets file as shell code.
set -euo pipefail
umask 077
REPO_ROOT=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/../.." && pwd)
ENV_FILE=${MINIFLOW_ENV_FILE:-$REPO_ROOT/.env.production}
STATE_DIR=${MINIFLOW_STATE_DIR:-$REPO_ROOT/.miniflow}
# Used by scripts sourcing this file.
# shellcheck disable=SC2034
BACKUP_DIR=${MINIFLOW_BACKUP_DIR:-$STATE_DIR/backups}
# Read only known literal KEY=value settings; never execute the config as shell code.
# Explicit environment variables (including empty values for local review) take precedence.
if [[ -f $STATE_DIR/operations.env ]]; then
  while IFS= read -r line || [[ -n $line ]]; do
    [[ -z $line || $line == \#* ]] && continue
    key=${line%%=*}
    value=${line#*=}
    case "$key" in
      MINIFLOW_PUBLIC_URL|MINIFLOW_BACKUP_REMOTE|MINIFLOW_ALERT_WEBHOOK|MINIFLOW_DISK_LIMIT|MINIFLOW_MEMORY_LIMIT)
        if [[ ! -v $key ]]; then export "$key=$value"; fi
        ;;
      *) echo 'Invalid operations.env setting; use literal KEY=value without quotes.' >&2; exit 1 ;;
    esac
  done < "$STATE_DIR/operations.env"
fi
COMPOSE_ARGS=(--project-name "${MINIFLOW_PROJECT_NAME:-miniflow}" --env-file "$ENV_FILE" -f "$REPO_ROOT/compose.production.yaml")
if [[ -n ${MINIFLOW_COMPOSE_OVERRIDE:-} ]]; then
  COMPOSE_ARGS+=(-f "$MINIFLOW_COMPOSE_OVERRIDE")
fi

fail() { echo "Error: $*" >&2; exit 1; }
log() { echo "[miniflow] $*" >&2; }
dc() { docker compose "${COMPOSE_ARGS[@]}" "$@"; }

check_config() {
  [[ -f $ENV_FILE ]] || fail "Missing $ENV_FILE; run init-env.sh first."
  if grep -Eq 'REPLACE_WITH_|miniflow\.example\.com' "$ENV_FILE"; then
    fail 'Replace production env placeholders before running this command.'
  fi
  dc config --quiet
}

lock_operations() {
  mkdir -p "$STATE_DIR"
  exec 9>"$STATE_DIR/operations.lock"
  flock -n 9 || fail 'Another deploy, rollback or restore is running.'
}

validate_tag() {
  [[ $1 =~ ^[a-zA-Z0-9][a-zA-Z0-9_.-]{0,127}$ ]] || fail 'Invalid image tag.'
}

read_release() {
  [[ ! -f $STATE_DIR/current-release ]] || cat "$STATE_DIR/current-release"
}

record_release() {
  local previous
  previous=$(read_release)
  if [[ -n $previous && $previous != "$IMAGE_TAG" ]]; then
    printf '%s\n' "$previous" > "$STATE_DIR/previous-release.tmp"
    mv "$STATE_DIR/previous-release.tmp" "$STATE_DIR/previous-release"
  fi
  printf '%s\n' "$IMAGE_TAG" > "$STATE_DIR/current-release.tmp"
  mv "$STATE_DIR/current-release.tmp" "$STATE_DIR/current-release"
}

smoke_test() {
  # Probe through the frontend proxy too: an HTML-only check misses broken /api rewrites.
  dc exec -T frontend node -e "Promise.all(['/login','/api/health'].map(p=>fetch('http://127.0.0.1:3000'+p,{signal:AbortSignal.timeout(10000)}).then(r=>{if(!r.ok)throw Error(p+' '+r.status)}))).catch(e=>{console.error(e.message);process.exit(1)})" || return 1
  if [[ -n ${MINIFLOW_PUBLIC_URL:-} ]]; then
    [[ $MINIFLOW_PUBLIC_URL == https://* ]] || fail 'MINIFLOW_PUBLIC_URL must use HTTPS.'
    curl --fail --silent --show-error --connect-timeout 10 --max-time 30 "${MINIFLOW_PUBLIC_URL%/}/login" -o /dev/null || return 1
    curl --fail --silent --show-error --connect-timeout 10 --max-time 30 "${MINIFLOW_PUBLIC_URL%/}/api/health" -o /dev/null || return 1
  fi
}
