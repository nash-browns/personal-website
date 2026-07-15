#!/usr/bin/env bash
# Stamp long-lived cache headers on images in a Firebase Storage folder so
# Vercel's image optimizer can cache them at the edge.
#
# Usage:
#   ./scripts/set-image-cache.sh the-wedge          # one folder
#   ./scripts/set-image-cache.sh '**'               # entire bucket
#
# Safe to re-run on already-stamped folders. Requires `gcloud auth login`.
# Note: with `immutable`, never overwrite an image in place — upload changed
# images under a new filename instead.

set -euo pipefail

BUCKET="gs://nash-browns.firebasestorage.app"
CACHE_CONTROL="public, max-age=31536000, immutable"

if [[ $# -ne 1 ]]; then
  echo "Usage: $0 <folder-name | '**'>" >&2
  exit 1
fi

FOLDER="$1"
if [[ "$FOLDER" == "**" ]]; then
  TARGET="$BUCKET/**"
else
  TARGET="$BUCKET/${FOLDER%/}/**"
fi

echo "Setting Cache-Control on $TARGET"
gcloud storage objects update "$TARGET" --cache-control="$CACHE_CONTROL"

echo
echo "Done. Spot-check one object:"
gcloud storage objects describe \
  "$(gcloud storage ls "$TARGET" | grep -v '/$' | head -1)" \
  --format="value(cache_control)"
