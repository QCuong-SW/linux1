#!/usr/bin/env bash
# Restore into a NEW rehearsal database. Production DB is never overwritten.
# Container environment variables deliberately expand inside sh -c.
# shellcheck disable=SC2016
set -euo pipefail
# shellcheck source=infra/scripts/common.sh
source "$(dirname -- "${BASH_SOURCE[0]}")/common.sh"
[[ $# -eq 2 ]] || fail 'Usage: restore.sh /path/backup.dump rehearsal_restore_test'
archive=$1
target=$2
[[ -f $archive ]] || fail 'Backup file does not exist.'
[[ $target =~ ^[a-z][a-z0-9_]*_restore_test$ && ${#target} -le 63 ]] || fail 'Use a database name ending in _restore_test (max 63 chars).'
check_config
lock_operations
if [[ -f $archive.sha256 ]]; then
  expected=$(cut -d ' ' -f 1 "$archive.sha256")
  actual=$(sha256sum "$archive")
  [[ $expected =~ ^[a-f0-9]{64}$ && $expected == "${actual%% *}" ]] || fail 'Backup checksum failed.'
fi
dc exec -T -e RESTORE_DB="$target" postgres sh -c '
  test "$RESTORE_DB" != "$POSTGRES_DB" || exit 1
  createdb -U "$POSTGRES_USER" --maintenance-db=postgres --template=template0 "$RESTORE_DB"
'
dc exec -T -e RESTORE_DB="$target" postgres sh -c 'exec pg_restore -U "$POSTGRES_USER" -d "$RESTORE_DB" --no-owner --no-privileges --exit-on-error --single-transaction' < "$archive"
dc exec -T -e RESTORE_DB="$target" postgres sh -c 'exec psql -U "$POSTGRES_USER" -d "$RESTORE_DB" -v ON_ERROR_STOP=1 -c "SELECT count(*) AS projects FROM \"Project\"; SELECT count(*) AS tasks FROM \"Task\";"'
log "Restore verified in $target. Database retained for inspection."
