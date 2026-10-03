#!/usr/bin/env bash
# Container environment variables deliberately expand inside sh -c.
# shellcheck disable=SC2016
set -euo pipefail
# shellcheck source=infra/scripts/common.sh
source "$(dirname -- "${BASH_SOURCE[0]}")/common.sh"
[[ $# -eq 0 ]] || fail 'Usage: backup.sh'
check_config
mkdir -p "$BACKUP_DIR"
exec 8>"$BACKUP_DIR/backup.lock"
flock -n 8 || fail 'Another backup is running.'
filename="$BACKUP_DIR/$(date -u +%Y%m%dT%H%M%SZ)-$$.dump"
trap 'rm -f -- "$filename.partial"' EXIT
# pg_dump takes a consistent snapshot; the archive never goes into app images.
dc exec -T postgres sh -c 'exec pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" --format=custom --no-owner --no-privileges' > "$filename.partial"
[[ -s $filename.partial ]] || fail 'Backup is empty.'
mv "$filename.partial" "$filename"
sha256sum "$filename" > "$filename.sha256"
log "Backup saved: $filename"
if [[ -n ${MINIFLOW_BACKUP_REMOTE:-} ]]; then
  # SSH host key must already be trusted. Use a separate backup host or NAS.
  rsync -a -e 'ssh -o BatchMode=yes -o StrictHostKeyChecking=yes' "$filename" "$filename.sha256" "$MINIFLOW_BACKUP_REMOTE"
  touch "$BACKUP_DIR/last-remote-copy"
  log 'Backup copied off this host.'
fi
printf '%s\n' "$filename"
