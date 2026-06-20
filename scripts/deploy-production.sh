#!/usr/bin/env bash
set -Eeuo pipefail

umask 027

DEPLOY_ROOT="${DEPLOY_ROOT:-/opt/icp-website}"
REPO_DIR="$DEPLOY_ROOT/repo"
RELEASES_DIR="$DEPLOY_ROOT/releases"
SHARED_DIR="$DEPLOY_ROOT/shared"
ASSETS_DIR="$SHARED_DIR/web-assets"
CURRENT_LINK="$DEPLOY_ROOT/current"
CURRENT_ASSETS_LINK="$DEPLOY_ROOT/web-assets-current"
COMMIT_SHA="${1:?Usage: deploy-production.sh COMMIT_SHA RELEASE_ID}"
RELEASE_ID="${2:?Usage: deploy-production.sh COMMIT_SHA RELEASE_ID}"
INITIAL_BOOTSTRAP="${INITIAL_BOOTSTRAP:-0}"
CANDIDATE_DIR="$RELEASES_DIR/$RELEASE_ID"
ASSET_GENERATION="$ASSETS_DIR/$RELEASE_ID"

if [[ ! "$COMMIT_SHA" =~ ^[0-9a-f]{40}$ ]]; then
  echo "COMMIT_SHA must be a full 40-character Git SHA" >&2
  exit 2
fi
if [[ ! "$RELEASE_ID" =~ ^[A-Za-z0-9._-]+$ ]]; then
  echo "RELEASE_ID contains unsupported characters" >&2
  exit 2
fi

for command in git pnpm node curl pm2 tar find sort awk; do
  command -v "$command" >/dev/null || { echo "Missing required command: $command" >&2; exit 2; }
done

[[ -d "$REPO_DIR/.git" ]] || { echo "Missing deployment checkout: $REPO_DIR" >&2; exit 2; }
[[ -f "$SHARED_DIR/.env" ]] || { echo "Missing production environment: $SHARED_DIR/.env" >&2; exit 2; }
git -C "$REPO_DIR" cat-file -e "$COMMIT_SHA^{commit}"

mkdir -p "$RELEASES_DIR" "$ASSETS_DIR"
[[ ! -e "$CANDIDATE_DIR" ]] || { echo "Release already exists: $CANDIDATE_DIR" >&2; exit 2; }
[[ ! -e "$ASSET_GENERATION" ]] || { echo "Asset generation already exists: $ASSET_GENERATION" >&2; exit 2; }

PREVIOUS_RELEASE="$(readlink -f "$CURRENT_LINK" 2>/dev/null || true)"
PREVIOUS_ASSETS="$(readlink -f "$CURRENT_ASSETS_LINK" 2>/dev/null || true)"
ACTIVATED=0
SUCCESS=0
CANDIDATE_PID=""

atomic_link() {
  local target="$1"
  local link="$2"
  local temporary="${link}.new.$$"
  ln -s "$target" "$temporary"
  mv -Tf "$temporary" "$link"
}

wait_for_ready() {
  local url="$1"
  local attempts="${2:-30}"
  local delay="${3:-1}"
  local attempt
  for ((attempt = 1; attempt <= attempts; attempt += 1)); do
    if curl --fail --silent --show-error --max-time 2 "$url" >/dev/null; then
      return 0
    fi
    sleep "$delay"
  done
  return 1
}

stop_candidate() {
  if [[ -n "$CANDIDATE_PID" ]] && kill -0 "$CANDIDATE_PID" 2>/dev/null; then
    kill -TERM "$CANDIDATE_PID" 2>/dev/null || true
    wait "$CANDIDATE_PID" 2>/dev/null || true
  fi
  CANDIDATE_PID=""
}

rollback() {
  echo "Activation failed; restoring the previous release" >&2
  set +e

  if [[ -n "$PREVIOUS_ASSETS" && -d "$PREVIOUS_ASSETS" ]]; then
    atomic_link "$PREVIOUS_ASSETS" "$CURRENT_ASSETS_LINK"
  fi
  if [[ -n "$PREVIOUS_RELEASE" && -d "$PREVIOUS_RELEASE" ]]; then
    atomic_link "$PREVIOUS_RELEASE" "$CURRENT_LINK"
    pm2 startOrReload "$CURRENT_LINK/ecosystem.config.cjs" --only icp-server --update-env
    if ! wait_for_ready "http://127.0.0.1:4000/health/ready" 30 1; then
      echo "CRITICAL: the previous API release did not recover after rollback" >&2
      set -e
      return 1
    fi
  elif [[ "$INITIAL_BOOTSTRAP" == "1" && -f "$DEPLOY_ROOT/apps/server/dist/index.js" ]]; then
    pm2 delete icp-server >/dev/null 2>&1 || true
    pm2 start "$DEPLOY_ROOT/apps/server/dist/index.js" \
      --name icp-server --cwd "$DEPLOY_ROOT/apps/server" --time
  fi

  set -e
}

on_exit() {
  local status=$?
  trap - EXIT
  stop_candidate

  if [[ "$status" -ne 0 && "$ACTIVATED" == "1" ]]; then
    rollback || true
  fi
  if [[ "$SUCCESS" != "1" ]]; then
    rm -rf "$CANDIDATE_DIR" "$ASSET_GENERATION"
  fi
  exit "$status"
}
trap on_exit EXIT

echo "--- Creating immutable release $RELEASE_ID ---"
mkdir "$CANDIDATE_DIR"
git -C "$REPO_DIR" archive --format=tar "$COMMIT_SHA" | tar -xf - -C "$CANDIDATE_DIR"
ln -s "$SHARED_DIR/.env" "$CANDIDATE_DIR/.env"
ln -s "$SHARED_DIR/.env" "$CANDIDATE_DIR/apps/web/.env"

echo "--- Installing candidate dependencies ---"
pnpm --dir "$CANDIDATE_DIR" install --frozen-lockfile

echo "--- Generating Prisma Client and building candidate ---"
pnpm --dir "$CANDIDATE_DIR" --filter @icp/server run prisma:generate
pnpm --dir "$CANDIDATE_DIR" --filter @icp/server run build
pnpm --dir "$CANDIDATE_DIR" --filter @icp/web run build

echo "--- Applying backward-compatible migrations ---"
pnpm --dir "$CANDIDATE_DIR" --filter @icp/server run prisma:setup:prod

echo "--- Checking candidate readiness on port 4001 ---"
(
  cd "$CANDIDATE_DIR/apps/server"
  PORT=4001 NODE_ENV=production node dist/index.js >"$CANDIDATE_DIR/candidate-health.log" 2>&1 &
  echo $! >"$CANDIDATE_DIR/.candidate-pid"
)
CANDIDATE_PID="$(cat "$CANDIDATE_DIR/.candidate-pid")"
if ! wait_for_ready "http://127.0.0.1:4001/health/ready" 30 1; then
  cat "$CANDIDATE_DIR/candidate-health.log" >&2 || true
  echo "Candidate failed readiness checks" >&2
  exit 1
fi
stop_candidate
rm -f "$CANDIDATE_DIR/.candidate-pid" "$CANDIDATE_DIR/candidate-health.log"

echo "--- Preparing shared hashed assets ---"
mkdir "$ASSET_GENERATION"
mapfile -t prior_releases < <(
  find "$RELEASES_DIR" -mindepth 2 -maxdepth 2 -name .release-success \
    -printf '%T@ %h\n' | sort -nr | awk 'NR <= 2 { $1=""; sub(/^ /, ""); print }'
)
for release in "${prior_releases[@]}"; do
  if [[ -d "$release/apps/web/dist/assets" ]]; then
    cp -a "$release/apps/web/dist/assets/." "$ASSET_GENERATION/"
  fi
done
cp -a "$CANDIDATE_DIR/apps/web/dist/assets/." "$ASSET_GENERATION/"

if [[ "$INITIAL_BOOTSTRAP" != "1" ]]; then
  if [[ -z "$PREVIOUS_RELEASE" || ! -d "$PREVIOUS_RELEASE" ]]; then
    echo "No active release exists. Run the one-time bootstrap first." >&2
    exit 2
  fi
  if [[ -z "$PREVIOUS_ASSETS" || ! -d "$PREVIOUS_ASSETS" ]]; then
    echo "No active web asset generation exists. Run the one-time bootstrap first." >&2
    exit 2
  fi
fi

echo "--- Atomically activating release ---"
atomic_link "$ASSET_GENERATION" "$CURRENT_ASSETS_LINK"
atomic_link "$CANDIDATE_DIR" "$CURRENT_LINK"
ACTIVATED=1

if [[ "$INITIAL_BOOTSTRAP" == "1" ]]; then
  pm2 delete icp-server >/dev/null 2>&1 || true
  pm2 start "$CURRENT_LINK/ecosystem.config.cjs" --only icp-server
else
  pm2 startOrReload "$CURRENT_LINK/ecosystem.config.cjs" --only icp-server --update-env
fi

if ! wait_for_ready "http://127.0.0.1:4000/health/ready" 45 1; then
  pm2 logs icp-server --lines 100 --nostream >&2 || true
  echo "Activated release failed readiness checks" >&2
  exit 1
fi

touch "$CANDIDATE_DIR/.release-success"
pm2 save
SUCCESS=1

echo "--- Retaining the three newest successful releases ---"
mapfile -t kept_releases < <(
  find "$RELEASES_DIR" -mindepth 2 -maxdepth 2 -name .release-success \
    -printf '%T@ %h\n' | sort -nr | awk 'NR <= 3 { $1=""; sub(/^ /, ""); print }'
)

declare -A keep=()
for release in "${kept_releases[@]}"; do keep["$release"]=1; done
for release in "$RELEASES_DIR"/*; do
  [[ -d "$release" ]] || continue
  [[ -n "${keep[$release]:-}" ]] || rm -rf "$release"
done
for generation in "$ASSETS_DIR"/*; do
  [[ -d "$generation" ]] || continue
  release="$RELEASES_DIR/$(basename "$generation")"
  [[ -n "${keep[$release]:-}" ]] || rm -rf "$generation"
done

echo "Release $RELEASE_ID is healthy and active."
