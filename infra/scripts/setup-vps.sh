#!/usr/bin/env bash
# Run only on a fresh Ubuntu VPS as root. Existing SSH access is preserved.
set -euo pipefail
[[ $EUID -eq 0 && $# -eq 2 && $1 == --fresh-vps ]] || { echo 'Usage (root): setup-vps.sh --fresh-vps /path/deploy.pub' >&2; exit 1; }
key_file=$2
[[ -f $key_file ]] || { echo 'Missing SSH public key' >&2; exit 1; }
ssh-keygen -lf "$key_file" > /dev/null
IFS= read -r public_key < "$key_file" || [[ -n ${public_key:-} ]]
[[ $public_key == ssh-* || $public_key == ecdsa-* ]] || { echo 'Expected SSH public key' >&2; exit 1; }
# shellcheck disable=SC1091
source /etc/os-release
[[ $ID == ubuntu && ($VERSION_ID == 24.04 || $VERSION_ID == 26.04) ]] || { echo 'Use Ubuntu 24.04/26.04 LTS' >&2; exit 1; }
export DEBIAN_FRONTEND=noninteractive
apt-get update
apt-get install -y ca-certificates curl git sudo adduser nginx ufw fail2ban unattended-upgrades rsync certbot python3-certbot-nginx openssl
if ! command -v docker > /dev/null; then
  install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
  chmod 0644 /etc/apt/keyrings/docker.asc
  cat > /etc/apt/sources.list.d/docker.sources <<EOF
Types: deb
URIs: https://download.docker.com/linux/ubuntu
Suites: ${UBUNTU_CODENAME:-$VERSION_CODENAME}
Components: stable
Architectures: $(dpkg --print-architecture)
Signed-By: /etc/apt/keyrings/docker.asc
EOF
  apt-get update
  apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
fi
docker compose version
if ! id deploy > /dev/null 2>&1; then adduser --disabled-password --gecos '' deploy; fi
[[ $(id -u deploy) -ge 1000 ]] || { echo 'deploy must be a regular user' >&2; exit 1; }
usermod -aG docker,sudo deploy
# Docker access already provides host administration; use a dedicated trusted SSH key.
printf 'deploy ALL=(ALL) NOPASSWD:ALL\n' > /etc/sudoers.d/miniflow-deploy
chmod 0440 /etc/sudoers.d/miniflow-deploy
visudo -cf /etc/sudoers.d/miniflow-deploy
deploy_home=$(getent passwd deploy | cut -d: -f6)
install -d -m 0700 -o deploy -g deploy "$deploy_home/.ssh"
touch "$deploy_home/.ssh/authorized_keys"
if ! grep -Fxq -- "$public_key" "$deploy_home/.ssh/authorized_keys"; then
  printf '%s\n' "$public_key" >> "$deploy_home/.ssh/authorized_keys"
fi
chown deploy:deploy "$deploy_home/.ssh/authorized_keys"
chmod 0600 "$deploy_home/.ssh/authorized_keys"
install -d -m 0750 -o deploy -g deploy /opt/miniflow
install -d -m 0755 /var/www/letsencrypt
# Allow every configured SSH port BEFORE enabling the host firewall.
while IFS= read -r port; do ufw allow "$port/tcp"; done < <(/usr/sbin/sshd -T | awk '$1=="port" {print $2}')
ufw allow 'Nginx Full'
ufw --force enable
cat > /etc/apt/apt.conf.d/20auto-upgrades <<'EOF'
APT::Periodic::Update-Package-Lists "1";
APT::Periodic::Unattended-Upgrade "1";
EOF
systemctl enable --now docker nginx fail2ban
systemctl enable --now certbot.timer
install -d -m 0755 /etc/systemd/journald.conf.d
cat > /etc/systemd/journald.conf.d/miniflow.conf <<'EOF'
[Journal]
SystemMaxUse=200M
EOF
systemctl restart systemd-journald
echo 'VPS ready. Open a SECOND SSH session as deploy and verify sudo/docker before running harden-ssh.sh.'
