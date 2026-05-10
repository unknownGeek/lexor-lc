#!/usr/bin/env bash
# Small helper to find and optionally delete common backup files in this repo.
# Usage:
#   ./scripts/cleanup_backups.sh      # lists matches
#   ./scripts/cleanup_backups.sh --delete   # deletes matches after prompting

set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

PATTERNS=("**/backup_*" "**/*~" "**/*.bak" "**/*.orig" "**/*.tmp")

echo "Searching for backup files in $ROOT"
FOUND=()
for p in "${PATTERNS[@]}"; do
  while IFS= read -r -d $'\0' file; do
    FOUND+=("$file")
  done < <(find . -type f -name "$(basename "$p")" -print0 2>/dev/null || true)
done

if [ ${#FOUND[@]} -eq 0 ]; then
  echo "No backup files found."
  exit 0
fi

echo "Found ${#FOUND[@]} backup files:"
for f in "${FOUND[@]}"; do
  echo "  $f"
done

if [ "${1:-}" = "--delete" ]; then
  read -p "Delete these files? (y/N) " yn
  if [[ "$yn" =~ ^[Yy]$ ]]; then
    for f in "${FOUND[@]}"; do
      rm -v -- "$f"
    done
    echo "Deleted."
  else
    echo "Aborted."
  fi
fi
