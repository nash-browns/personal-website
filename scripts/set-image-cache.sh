#!/usr/bin/env bash
# Preview long-lived cache headers for a known article's public images.
# Usage: ./scripts/set-image-cache.sh the-wedge [--apply]
# Never overwrite these images in place: changed images need a new filename.
set -euo pipefail

BUCKET="gs://nash-browns.firebasestorage.app"
CACHE_CONTROL="public, max-age=2678400, immutable"
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

if [[ $# -lt 1 || $# -gt 2 ]]; then
    echo "Usage: $0 <article-folder> [--apply]" >&2
    exit 1
fi
FOLDER="$1"
MODE="${2:---dry-run}"
if [[ ! "$FOLDER" =~ ^[a-z0-9]+(-[a-z0-9]+)*$ ]] || [[ "$FOLDER" == photography ]] ||
   [[ ! -f "$PROJECT_ROOT/app/blog/articles/$FOLDER/page.mdx" && ! -f "$PROJECT_ROOT/app/blog/articles/$FOLDER/page.js" ]]; then
    echo "Choose one known article folder; bucket-wide, wildcard, and photography paths are not allowed." >&2
    exit 1
fi
if [[ "$MODE" != --apply && "$MODE" != --dry-run ]]; then
    echo "Use --apply to change metadata, or omit it for a dry run." >&2
    exit 1
fi

# Keep the listing step separate so a failed listing fails the whole command.
OBJECTS="$(gcloud storage ls "$BUCKET/$FOLDER/**")"
while IFS= read -r object; do
    # Only image objects in the exact article prefix, never unrelated files.
    [[ "$object" == "$BUCKET/$FOLDER/"* ]] || continue
    case "$object" in
        *.[jJ][pP][gG]|*.[jJ][pP][eE][gG]|*.[pP][nN][gG]|*.[wW][eE][bB][pP]|*.[aA][vV][iI][fF]|*.[gG][iI][fF])
            if [[ "$MODE" == --apply ]]; then
                gcloud storage objects update "$object" --cache-control="$CACHE_CONTROL"
            else
                printf 'Would update: %s\n' "$object"
            fi
            ;;
    esac
done <<< "$OBJECTS"
