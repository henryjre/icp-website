#!/usr/bin/env bash
set -Eeuo pipefail

REQUESTED_BASE="${1:-}"
REQUESTED_HEAD="${2:-HEAD}"
HEAD_SHA="$(git rev-parse "$REQUESTED_HEAD")"
EMPTY_TREE="$(git hash-object -t tree /dev/null)"

if [[ -n "$REQUESTED_BASE" && ! "$REQUESTED_BASE" =~ ^0+$ ]] \
  && git cat-file -e "$REQUESTED_BASE^{commit}" 2>/dev/null; then
  BASE_SHA="$REQUESTED_BASE"
elif git cat-file -e "$HEAD_SHA^" 2>/dev/null; then
  BASE_SHA="$HEAD_SHA^"
else
  BASE_SHA="$EMPTY_TREE"
fi

mapfile -t migration_files < <(
  git diff --name-only --diff-filter=AM "$BASE_SHA" "$HEAD_SHA" -- \
    'apps/server/prisma/migrations/*/migration.sql'
)

node scripts/check-zero-downtime-migrations.mjs "${migration_files[@]}"
