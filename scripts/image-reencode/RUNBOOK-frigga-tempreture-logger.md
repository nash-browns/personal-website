# Re-encode: frigga-tempreture-logger

Pilot folder for converting Firebase Storage JPEGs to WebP. Nothing in this
runbook has been executed yet.

## Inventory (from the repo, 2026-09-12)

| Object | Used as | Compress? | Notes |
|---|---|---|---|
| `feature-image.JPEG` | `ImageFeature` cover **and** `postMetadata.thumbnail` | yes | full-bleed cover, needs the wide preset |
| `battery-change.gif` | `CenteredImage` at 1000px | no | compressor ignores GIFs; URL unchanged |

Only one file depends on this folder: `app/blog/articles/frigga-tempreture-logger/page.mdx`
(two references, both the same URL). The Nash Browns article's related-card picks
up the new thumbnail automatically through `postMetadata`.

Step 1 below lists the bucket folder in case it holds files the repo does not
reference. Those can be converted too, or ignored.

## Steps

Work directory lives outside the repo so nothing stray gets committed.

```bash
export F=frigga-tempreture-logger
export W=~/backlog/image-reencode/$F
mkdir -p "$W" && cd "$W"
```

**1. List and download the originals.**

```bash
gcloud storage ls "gs://nash-browns.firebasestorage.app/$F/"
gcloud storage cp "gs://nash-browns.firebasestorage.app/$F/*" "$W/"
```

**2. Compress.** This folder's only JPEG is a full-viewport cover, so use the
wide preset. (For body images in later folders, run the defaults instead.)

```bash
cd "$W"
~/Executables/compress_imgs.sh --width 2560 --max-size-kb 400
```

Read the output. Stop if any line starts with `FAILED` or notes
"WebP is not smaller". Outputs land in `$W/compressed/`.

**3. Preview the upload, then upload.**

```bash
cd ~/Projects/personal-website
scripts/image-reencode/upload-webp.sh "$F" "$W/compressed" "$W/mapping.tsv" --dry-run
scripts/image-reencode/upload-webp.sh "$F" "$W/compressed" "$W/mapping.tsv"
cat "$W/mapping.tsv"
```

Expect one line: `feature-image<TAB>https://...feature-image.webp?alt=media&token=...`.
Open that URL in a browser to confirm it serves.

**4. Rewrite the article URLs.** Dry run first, then write.

```bash
node scripts/image-reencode/rewrite-urls.mjs "$F" "$W/mapping.tsv"
node scripts/image-reencode/rewrite-urls.mjs "$F" "$W/mapping.tsv" --write
git diff app/blog/articles/frigga-tempreture-logger/page.mdx
```

Expect 2 replacements in one file (thumbnail + featureImage). Everything else
should be untouched.

**5. Re-sync dimensions and test.**

```bash
npm run images:sync
npm run test:images
```

The feature image is not in the manifest (only `CenteredImage`-family images
are), so the manifest may not change. That is fine.

**6. Visual check.** With no build running:

```bash
npm run dev
```

Open `/blog/articles/frigga-tempreture-logger` and confirm the cover renders,
then `/blog` under the Boring filter and confirm the card thumbnail, then
`/blog/articles/nash-browns` and confirm the related card.

**7. Commit** `page.mdx` (and `data/article-image-dimensions.json` if it changed).
Keep `$W/mapping.tsv`; it is the rollback record.

**8. Do not delete the old JPEG yet.** Cleanup happens once across all folders
after the deploy is verified:

```bash
# later, not now
gcloud storage rm "gs://nash-browns.firebasestorage.app/$F/feature-image.JPEG"
```

## Rollback

`git checkout -- app/blog/articles/frigga-tempreture-logger/page.mdx` restores
the old URLs; the old objects are still in the bucket. Optionally remove the
new WebP object with `gcloud storage rm`.

## Presets for later folders

| Role | Flags |
|---|---|
| body images (`CenteredImage`, `Two/ThreeCenteredImages`, carousel) | defaults |
| `ImageFeature` covers, photo-essay frames | `--width 2560 --max-size-kb 400` |
| `ThreeSixtyImage` panoramas | `--width 8192 --max-size-kb 2000`, or skip |

Run the compressor once per role in separate scratch subfolders so each pass
only sees the files it should resize. Before touching the France or Japan
essays, update the `frameOf` regex in their `page.js` to accept `webp`, or the
blur placeholders silently disappear.
