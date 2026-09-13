#!/usr/bin/env bash
# Upload compressed WebP files into a Firebase Storage folder and record the
# public URL for each one.
#
# Usage:
#   upload-webp.sh <folder> <compressed-dir> <mapping.tsv> [--dry-run]
#
#   folder          Storage folder name, e.g. frigga-tempreture-logger
#   compressed-dir  Directory holding *.webp output from compress_imgs.sh
#   mapping.tsv     Appended with "<stem>\t<new-url>" per uploaded file
#   --dry-run       Print the gcloud commands without running them
#
# Each object gets a download token generated here (so the public URL is known
# without a metadata round-trip) and the same immutable Cache-Control header
# that scripts/set-image-cache.sh applies. Existing objects are never
# overwritten (--no-clobber); a collision is reported and skipped.

set -euo pipefail

BUCKET="nash-browns.firebasestorage.app"
CACHE_CONTROL="public, max-age=31536000, immutable"

if [[ $# -lt 3 || $# -gt 4 ]]; then
  sed -n '2,15p' "$0" >&2
  exit 2
fi

folder=${1%/}
src_dir=$2
mapping=$3
dry_run=0
[[ ${4:-} == "--dry-run" ]] && dry_run=1

shopt -s nullglob
files=("$src_dir"/*.webp)
if [[ ${#files[@]} -eq 0 ]]; then
  echo "No .webp files in $src_dir" >&2
  exit 1
fi

uploaded=0
skipped=0
for file in "${files[@]}"; do
  name=$(basename "$file")
  stem=${name%.webp}
  token=$(uuidgen | tr '[:upper:]' '[:lower:]')
  object="gs://$BUCKET/$folder/$name"
  encoded_path="${folder}%2F${name}"
  url="https://firebasestorage.googleapis.com/v0/b/$BUCKET/o/$encoded_path?alt=media&token=$token"

  if [[ $dry_run -eq 1 ]]; then
    echo "gcloud storage cp --no-clobber --content-type=image/webp \\"
    echo "  --cache-control=\"$CACHE_CONTROL\" \\"
    echo "  --custom-metadata=firebaseStorageDownloadTokens=$token \\"
    echo "  \"$file\" \"$object\""
    echo "  -> $stem"$'\t'"$url"
    continue
  fi

  if gcloud storage objects describe "$object" >/dev/null 2>&1; then
    echo "SKIP (exists): $object" >&2
    skipped=$((skipped + 1))
    continue
  fi

  gcloud storage cp --no-clobber \
    --content-type=image/webp \
    --cache-control="$CACHE_CONTROL" \
    --custom-metadata="firebaseStorageDownloadTokens=$token" \
    "$file" "$object"

  printf '%s\t%s\n' "$stem" "$url" >> "$mapping"
  echo "OK: $name"
  uploaded=$((uploaded + 1))
done

echo "Uploaded $uploaded, skipped $skipped. Mapping: $mapping"
