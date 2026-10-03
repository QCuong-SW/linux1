#!/usr/bin/env bash
# Bootstrap HTTP; supplying an email also obtains TLS and enables HTTPS.
set -euo pipefail
[[ $EUID -eq 0 && $# -ge 1 && $# -le 2 ]] || { echo 'Usage (root): setup-nginx.sh app.your-domain.com [certbot-email]' >&2; exit 1; }
ROOT=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/../.." && pwd)
domain=$1
[[ $domain =~ ^[a-zA-Z0-9]([a-zA-Z0-9.-]*[a-zA-Z0-9])?$ && $domain == *.* ]] || { echo 'Invalid domain' >&2; exit 1; }
install -d -m 0755 /var/www/letsencrypt
install_config() {
  local template=$1
  local backup had_config=0
  backup=$(mktemp)
  if [[ -f /etc/nginx/sites-available/miniflow ]]; then
    cp /etc/nginx/sites-available/miniflow "$backup"
    had_config=1
  fi
  sed "s/miniflow.example.com/$domain/g" "$ROOT/infra/nginx/$template" > /etc/nginx/sites-available/miniflow
  ln -sfn /etc/nginx/sites-available/miniflow /etc/nginx/sites-enabled/miniflow
  if ! nginx -t; then
    if [[ $had_config == 1 ]]; then
      cp "$backup" /etc/nginx/sites-available/miniflow
    else
      rm -f /etc/nginx/sites-enabled/miniflow /etc/nginx/sites-available/miniflow
    fi
    rm -f "$backup"
    return 1
  fi
  rm -f "$backup"
  systemctl reload nginx
}
if [[ -f /etc/letsencrypt/live/$domain/fullchain.pem ]]; then
  install_config miniflow.https.conf
else
  install_config miniflow.http.conf
fi
if [[ $# -eq 2 ]]; then
  certbot certonly --webroot --webroot-path /var/www/letsencrypt --domain "$domain" --email "$2" --agree-tos --non-interactive
  install_config miniflow.https.conf
  install -d -m 0755 /etc/letsencrypt/renewal-hooks/deploy
  cat > /etc/letsencrypt/renewal-hooks/deploy/miniflow-reload <<'EOF'
#!/usr/bin/env bash
set -euo pipefail
nginx -t
systemctl reload nginx
EOF
  chmod 0755 /etc/letsencrypt/renewal-hooks/deploy/miniflow-reload
  certbot renew --dry-run
fi
