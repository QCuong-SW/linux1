#!/usr/bin/env bash
# Optional webhook receiving JSON {"text": "..."}; no messages sent unless configured.
set -euo pipefail
[[ -n ${MINIFLOW_ALERT_WEBHOOK:-} ]] || { echo 'No alert webhook configured; inspect journalctl for the failed unit.' >&2; exit 0; }
[[ $MINIFLOW_ALERT_WEBHOOK == https://* ]] || { echo 'Alert webhook must use HTTPS' >&2; exit 1; }
message="MiniFlow: ${1:-operation} failed on $(hostname). Check journalctl for details."
payload=$(python3 -c 'import json,sys; print(json.dumps({"text": sys.argv[1]}))' "$message")
curl --fail --silent --show-error --connect-timeout 10 --max-time 20 -H 'Content-Type: application/json' --data "$payload" "$MINIFLOW_ALERT_WEBHOOK" -o /dev/null
