#!/usr/bin/env bash
set -euo pipefail
# Build on VPS, back up DB, migrate synchronously, then replace app containers.
# shellcheck source=infra/scripts/common.sh
source "$(dirname -- "${BASH_SOURCE[0]}")/common.sh"
[[ $# -eq 0 || ($# -eq 1 && $1 == --reuse-images) ]] || fail 'Usage: deploy.sh [--reuse-images]'
cd "$REPO_ROOT"
if [[ ${MINIFLOW_ALLOW_DIRTY:-0} != 1 && -n $(git status --porcelain) ]]; then
  fail 'Commit changes first; production deploy requires a clean working tree.'
fi
export IMAGE_TAG=${MINIFLOW_IMAGE_TAG:-$(git rev-parse HEAD)}
validate_tag "$IMAGE_TAG"
check_config
lock_operations
previous=$(read_release)
trap 'log "Deploy failed; current-release was not advanced. Previous release: ${previous:-none}. Check logs before retrying."' ERR
if [[ ${1:-} != --reuse-images ]]; then
  log "Building release $IMAGE_TAG"
  dc build
else
  for service in frontend backend migration; do
    docker image inspect "miniflow-$service:$IMAGE_TAG" > /dev/null
  done
fi
dc up -d --wait --wait-timeout 180 postgres
log 'Backing up DB before migration (including the first, empty DB).'
bash "$REPO_ROOT/infra/scripts/backup.sh"
log 'Applying migrations; a nonzero exit stops deployment before replacing the app.'
dc run --rm --no-deps --interactive=false -T migrate
dc up -d --no-deps --wait --wait-timeout 180 backend frontend
smoke_test
record_release
log "Deployed $IMAGE_TAG; previous release: ${previous:-none}"
