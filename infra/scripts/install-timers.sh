#!/usr/bin/env bash
set -euo pipefail
[[ $EUID -eq 0 ]] || { echo 'Run as root on the VPS' >&2; exit 1; }
ROOT=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/../.." && pwd)
[[ -f /opt/miniflow/.miniflow/operations.env ]] || { echo 'Configure .miniflow/operations.env first' >&2; exit 1; }
install -m 0644 "$ROOT"/infra/systemd/miniflow-* /etc/systemd/system/
systemctl daemon-reload
systemctl enable --now miniflow-backup.timer miniflow-health.timer
systemctl list-timers 'miniflow-*' --no-pager
