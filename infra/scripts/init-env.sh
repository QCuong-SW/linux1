#!/usr/bin/env bash
# Generate secrets once; never overwrite an existing production env.
set -euo pipefail
umask 077
ROOT=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/../.." && pwd)
domain=${1:?Usage: bash infra/scripts/init-env.sh app.your-domain.com}
[[ $domain =~ ^[a-zA-Z0-9]([a-zA-Z0-9.-]*[a-zA-Z0-9])?$ && $domain == *.* ]] || { echo 'Invalid domain' >&2; exit 1; }
target=${MINIFLOW_ENV_FILE:-$ROOT/.env.production}
password=$(openssl rand -hex 24)
secret=$(openssl rand -hex 32)
# noclobber refuses an existing file, including when two invocations race.
set -o noclobber
cat > "$target" <<EOF
POSTGRES_USER=miniflow
POSTGRES_PASSWORD=$password
POSTGRES_DB=miniflow
DATABASE_URL=postgresql://miniflow:$password@postgres:5432/miniflow?schema=public
JWT_SECRET=$secret
JWT_EXPIRES_IN=1d
FRONTEND_ORIGIN=https://$domain
NEXT_PUBLIC_API_URL=/api
EOF
echo "Created $target (mode 600). Secrets were not printed."
