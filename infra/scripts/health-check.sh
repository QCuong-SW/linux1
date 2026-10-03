#!/usr/bin/env bash
# A systemd timer runs this every five minutes; nonzero status is visible in journalctl.
set -euo pipefail
# shellcheck source=infra/scripts/common.sh
source "$(dirname -- "${BASH_SOURCE[0]}")/common.sh"
check_config
if [[ -f $STATE_DIR/current-release ]]; then
  export IMAGE_TAG
  IMAGE_TAG=$(read_release)
  validate_tag "$IMAGE_TAG"
fi
failures=()
for threshold in "${MINIFLOW_DISK_LIMIT:-85}" "${MINIFLOW_MEMORY_LIMIT:-90}"; do
  [[ $threshold =~ ^[1-9][0-9]?$|^100$ ]] || fail 'Disk/memory limits must be percentages from 1 to 100.'
done
if ! smoke_test; then failures+=('App or HTTPS health check failed'); fi
for service in postgres backend frontend; do
  container=$(dc ps -q "$service")
  status=missing
  if [[ -n $container ]]; then
    status=$(docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' "$container")
  fi
  [[ $status == healthy ]] || failures+=("$service is $status")
done
disk_used=$(df -P "$STATE_DIR" | awk 'NR==2 {gsub(/%/, "", $5); print $5}')
[[ $disk_used -lt ${MINIFLOW_DISK_LIMIT:-85} ]] || failures+=("Disk usage: $disk_used%")
memory_used=$(awk '/MemTotal:/ {total=$2} /MemAvailable:/ {available=$2} END {printf "%.0f", (total-available)*100/total}' /proc/meminfo)
[[ $memory_used -lt ${MINIFLOW_MEMORY_LIMIT:-90} ]] || failures+=("Memory usage: $memory_used%")
recent_backup=$(find "$BACKUP_DIR" -maxdepth 1 -name '*.dump' -mmin -1800 -print -quit 2>/dev/null || true)
[[ -n $recent_backup ]] || failures+=('No local DB backup in the last 30 hours')
if [[ -n ${MINIFLOW_BACKUP_REMOTE:-} ]]; then
  recent_copy=$(find "$BACKUP_DIR" -maxdepth 1 -name last-remote-copy -mmin -1800 -print -quit 2>/dev/null || true)
  [[ -n $recent_copy ]] || failures+=('No off-host backup copy in the last 30 hours')
fi
if [[ ${#failures[@]} -gt 0 ]]; then
  printf '[miniflow] %s\n' "${failures[@]}" >&2
  exit 1
fi
log "Healthy; disk $disk_used%, memory $memory_used%; recent backup present."
