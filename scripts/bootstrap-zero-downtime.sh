#!/usr/bin/env bash
set -Eeuo pipefail

if [[ "$EUID" -ne 0 ]]; then
  echo "Run this one-time bootstrap as root." >&2
  exit 2
fi

DEPLOY_ROOT="${DEPLOY_ROOT:-/opt/icp-website}"
DEPLOY_USER="${DEPLOY_USER:-deploy}"
REPO_URL="${REPO_URL:-git@github.com:henryjre/icp-website.git}"
REPO_DIR="$DEPLOY_ROOT/repo"
SHARED_DIR="$DEPLOY_ROOT/shared"
NGINX_SITE="/etc/nginx/sites-available/icp-website"
TIMESTAMP="$(date -u +%Y%m%dT%H%M%SZ)"

id "$DEPLOY_USER" >/dev/null 2>&1 || { echo "Missing Linux user: $DEPLOY_USER" >&2; exit 2; }
[[ -f "$DEPLOY_ROOT/.env" || -f "$SHARED_DIR/.env" ]] || {
  echo "Expected production environment at $DEPLOY_ROOT/.env or $SHARED_DIR/.env" >&2
  exit 2
}

echo "--- Ensuring 2 GiB swap is available ---"
if ! swapon --show=NAME --noheadings | grep -qx '/swapfile'; then
  if [[ ! -f /swapfile ]]; then
    fallocate -l 2G /swapfile
    chmod 600 /swapfile
    mkswap /swapfile
  fi
  swapon /swapfile
fi
grep -qE '^/swapfile\s' /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab

echo "--- Preparing release directories ---"
install -d -o "$DEPLOY_USER" -g "$DEPLOY_USER" -m 775 \
  "$REPO_DIR" "$DEPLOY_ROOT/releases" "$SHARED_DIR" "$SHARED_DIR/web-assets"
if [[ ! -f "$SHARED_DIR/.env" ]]; then
  install -o "$DEPLOY_USER" -g "$DEPLOY_USER" -m 600 "$DEPLOY_ROOT/.env" "$SHARED_DIR/.env"
else
  chown "$DEPLOY_USER:$DEPLOY_USER" "$SHARED_DIR/.env"
  chmod 600 "$SHARED_DIR/.env"
fi
if [[ ! -L "$DEPLOY_ROOT/.env" ]]; then
  if [[ -f "$DEPLOY_ROOT/.env" ]]; then
    mv "$DEPLOY_ROOT/.env" "$DEPLOY_ROOT/.env.pre-zero-downtime-$TIMESTAMP"
    chmod 600 "$DEPLOY_ROOT/.env.pre-zero-downtime-$TIMESTAMP"
  fi
  ln -s "$SHARED_DIR/.env" "$DEPLOY_ROOT/.env"
  chown -h "$DEPLOY_USER:$DEPLOY_USER" "$DEPLOY_ROOT/.env"
fi

echo "--- Preparing non-live Git checkout ---"
if [[ ! -d "$REPO_DIR/.git" ]]; then
  rm -rf "$REPO_DIR"
  sudo -u "$DEPLOY_USER" -H git clone "$REPO_URL" "$REPO_DIR"
fi
chown -R "$DEPLOY_USER:$DEPLOY_USER" "$REPO_DIR" "$DEPLOY_ROOT/releases" "$SHARED_DIR"
sudo -u "$DEPLOY_USER" -H git -C "$REPO_DIR" remote set-url origin "$REPO_URL"
sudo -u "$DEPLOY_USER" -H git -C "$REPO_DIR" fetch --prune origin main
COMMIT_SHA="$(sudo -u "$DEPLOY_USER" -H git -C "$REPO_DIR" rev-parse origin/main)"
sudo -u "$DEPLOY_USER" -H git -C "$REPO_DIR" checkout --detach --force "$COMMIT_SHA"

echo "--- Building and activating the first immutable release ---"
sudo -u "$DEPLOY_USER" -H env INITIAL_BOOTSTRAP=1 DEPLOY_ROOT="$DEPLOY_ROOT" \
  bash "$REPO_DIR/scripts/deploy-production.sh" "$COMMIT_SHA" "bootstrap-$TIMESTAMP"

echo "--- Installing atomic Nginx configuration ---"
if [[ -f "$NGINX_SITE" ]]; then
  cp -a "$NGINX_SITE" "$NGINX_SITE.pre-zero-downtime-$TIMESTAMP"
fi
install -o root -g root -m 644 "$DEPLOY_ROOT/current/deploy/nginx/icp-website.conf" "$NGINX_SITE"
if ! nginx -t; then
  if [[ -f "$NGINX_SITE.pre-zero-downtime-$TIMESTAMP" ]]; then
    cp -a "$NGINX_SITE.pre-zero-downtime-$TIMESTAMP" "$NGINX_SITE"
  fi
  echo "Nginx validation failed; the previous configuration was restored." >&2
  exit 1
fi
systemctl reload nginx

echo "--- Persisting the deploy user's PM2 processes ---"
pm2 startup systemd -u "$DEPLOY_USER" --hp "/home/$DEPLOY_USER"
sudo -u "$DEPLOY_USER" -H pm2 save

echo "Bootstrap complete. The legacy checkout remains at $DEPLOY_ROOT until manually removed."
