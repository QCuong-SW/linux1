#!/usr/bin/env bash
# Roll back retained APP images; never run old migrations or erase DB volumes.
set -euo pipefail
# shellcheck source=infra/scripts/common.sh
source "$(dirname -- "${BASH_SOURCE[0]}")/common.sh"
[[ $# -ge 1 && $# -le 2 && $1 == --schema-compatible ]] || fail 'Usage: rollback.sh --schema-compatible [image-tag]; review compatibility with current DB first.'
check_config
lock_operations
tag=${2:-$(cat "$STATE_DIR/previous-release" 2>/dev/null || true)}
[[ -n $tag ]] || fail 'No previous release recorded; supply an existing image tag.'
validate_tag "$tag"
export IMAGE_TAG=$tag
for service in frontend backend; do
  docker image inspect "miniflow-$service:$IMAGE_TAG" > /dev/null
done
log "Rolling back app images to $IMAGE_TAG; DB schema stays as currently migrated."
dc up -d --wait --wait-timeout 180 postgres
dc up -d --no-deps --wait --wait-timeout 180 backend frontend
smoke_test
record_release
log "Rollback complete: $IMAGE_TAG"
