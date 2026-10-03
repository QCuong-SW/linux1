#!/usr/bin/env bash
set -euo pipefail
[[ $EUID -eq 0 && $# -eq 1 && $1 == --deploy-login-verified ]] || { echo 'Usage (root, after testing deploy key and sudo): harden-ssh.sh --deploy-login-verified' >&2; exit 1; }
# OpenSSH uses the first obtained setting; 00 sorts before cloud image drop-ins.
backup=$(mktemp)
had_config=0
if [[ -f /etc/ssh/sshd_config.d/00-miniflow.conf ]]; then
  cp /etc/ssh/sshd_config.d/00-miniflow.conf "$backup"
  had_config=1
fi
cat > /etc/ssh/sshd_config.d/00-miniflow.conf <<'EOF'
PubkeyAuthentication yes
PasswordAuthentication no
KbdInteractiveAuthentication no
PermitRootLogin no
EOF
if ! /usr/sbin/sshd -t; then
  if [[ $had_config == 1 ]]; then
    cp "$backup" /etc/ssh/sshd_config.d/00-miniflow.conf
  else
    rm -f /etc/ssh/sshd_config.d/00-miniflow.conf
  fi
  rm -f "$backup"
  exit 1
fi
rm -f "$backup"
systemctl reload ssh
echo 'SSH key-only login enabled. Keep this session open until a new deploy login succeeds.'
