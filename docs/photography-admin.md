# Photography library

Visit `/admin` and sign in with Google as `nashb1323@gmail.com`. Both the verified email and the existing Firebase UID are required. The page, API, and storage rules enforce this; signing in with another account does not grant access.

## Everyday use

1. Choose “Add photograph” and select or drop your highest-quality TIFF, TIF, JPEG, or JPG. A private draft is created automatically using the filename as a starting title, and upload begins immediately. You do not need to enter or save any details first. Uploads have progress and cancellation; retrying uses the same draft.
2. After upload, the photo slides into the right column and the form fades in. Reduced-motion preferences skip the animation. The screen waits briefly for the optimized preview (including TIFF conversion); if processing takes longer, details remain available while it finishes. Add title, location, camera, film, and alt text. Select collections from the dropdown; each selected collection appears as a removable tag. Alt text is for accessibility and is not displayed as a description.
3. The first uploaded original is the default print master, without compression or duplicate storage. The background worker automatically prepares the smaller web image and thumbnail. No second high-quality upload is needed. “Replace photo” is available only if you later want to change the original. Failed processing can be retried. Previously stored separate print overrides remain supported by the backend, but are no longer offered in this form.
4. The action row is Save Information, Archive, Delete, View Published Photo. Save Information saves the details and publishes the latest ready image together, including for a new or archived photo. An image, alt text, and an active collection are required; failed validation does not partially change the published photo. Archive unpublishes while retaining metadata and files. Save Information publishes it again. View Published Photo is available while published.
5. Manage collections under `/admin/collections`. Drag a row's dotted handle with a mouse or touch, then save the order. Keyboard users can focus a handle and use Up/Down; Escape cancels an active drag. The collection navigation order and each collection's photo order are independent. A photograph can appear in multiple collections. Featured remains the default gallery.
6. A collection's editor offers Delete Collection with confirmation when it is empty. Draft, published, and archived photos all prevent deletion until their memberships are removed. The server checks this transactionally, including concurrent photo additions. Empty archived collections can also be deleted. Deletion removes only the collection record and returns to the collections list; Featured cannot be deleted.

Public downloads use the optimized WebP image. Purchase stays visible as a design placeholder; checkout and print fulfillment are not implemented.

Delete is a permanent action with confirmation. It removes the photo and asset records, collection memberships, and all private/public file versions for that photo, including originals, print overrides, thumbnails, and previous uploads. Collections themselves remain. The photo is locked and removed from public browsing before file cleanup; if storage fails, retry deletion to complete it. The processing worker cleans up uploads or previews that arrive after deletion, and does not recreate deleted records. Cloud-provider retention/backups and copies visitors have already downloaded are outside this application-level deletion.

## Data and files

Three top-level Firestore collections:

| Collection | Purpose |
| --- | --- |
| `photos/{id}` | Title, location, camera, film, alt text, publication status, collection IDs, a per-collection order map, published web image, timestamps, and revision |
| `photoCollections/{id}` | Display title, navigation order, archive state, timestamps, and revision |
| `photoAssets/{photoId}` | Private original/print metadata, upload processing state, and prepared preview paths |

Files live in the existing `nash-browns.firebasestorage.app` bucket. Paths use immutable versions:

`resolvePrintMaster(asset)` selects the explicit `printMaster` when present, otherwise `original`. The admin API exposes this as `effectivePrintMaster`; no duplicate master record or file is required. Future print fulfillment should use the same resolver. Existing original uploads work without a migration, and imported web-only photographs have no print master until an original is uploaded.

```text
photography/private/{photoId}/original/{version}/source.tiff
photography/private/{photoId}/print/{version}/source.tiff
photography/private/{photoId}/previews/{version}/web.webp
photography/private/{photoId}/previews/{version}/thumbnail.webp
photography/public/{photoId}/{version}/web.webp
photography/public/{photoId}/{version}/thumbnail.webp
```

The source extension follows the uploaded format. Store object paths for private files, never permanent public download URLs. Even the `public` storage prefix denies anonymous direct reads; the website media endpoint checks publication and the current version before serving it. Previously downloaded or cached web copies cannot be revoked by unpublishing.

Uploads currently support single-image files up to 250 MiB and 200 megapixels. Web derivatives have a maximum 2,400-pixel long edge; thumbnails have a maximum 1,000-pixel long edge. They are auto-oriented, converted to sRGB, and stripped of EXIF/GPS metadata. Originals are not resized or overwritten. These limits can be adjusted together in the UI/model, storage rules, and worker.

Writes use revision checks to prevent silently overwriting another open editor. Ordering is transactional and currently limited to 400 items per reorder. Files are retained on archive and replacement; there is no automatic retention cleanup.

## Configuration and deployment

All `/admin` pages inherit `noindex, nofollow` metadata for search crawlers, including Googlebot. `/admin` and its descendants (plus admin API routes) also send `X-Robots-Tag: noindex, nofollow`, including error responses. Admin URLs are excluded from sitemap generation. Crawling remains allowed in `robots.txt` so search engines can discover the noindex instructions; [Google advises against blocking noindex pages in robots.txt](https://developers.google.com/search/docs/crawling-indexing/block-indexing). Owner authentication continues to protect the actual admin data. Changes take effect on deployment; removing an already indexed URL requires the search engine to recrawl it.

### Download abuse protection

`/api/photography/download/[id]` reserves an attempt before reading a photo or fetching Storage bytes. Defaults in `lib/photography/download-limits.mjs` are 5 attempts per minute and 25 per UTC day per visitor, and 250 attempts per UTC day across the website. Failed and nonexistent-photo requests also consume attempts. The daily site limit deliberately pauses all downloads until the next UTC day if exhausted; viewing the gallery is unaffected.

Firestore transactions share quotas across instances/restarts in one private `photographyDownloadLimits/current` document. It contains daily IP hashes and counters, never raw IPs, and is overwritten on the next day's first admitted request. Existing default-deny Firestore rules protect it; no client access or indexes are needed. Local limits reject repeated requests before Firebase (including a 30-attempt/minute burst cap per running instance); shared denials are cached locally. Database failures stop downloads instead of bypassing limits.

Reaching the site-wide daily limit atomically queues one email to `nashb1323@gmail.com` in `email_queue/photography-download-limit-YYYY-MM-DD` (UTC date), using the existing `to`, `from`, and `message.subject`/`message.text` schema. It reports the limit and reset time. Per-visitor limits do not send email. A stable document ID and `alertQueued` marker prevent duplicate notifications across concurrent instances, transaction retries, and restarts; existing delivery fields are never overwritten. An already-exhausted counter without a marker queues on the next request. A queue-write failure rejects the threshold request without advancing the counter, allowing a later request to retry. Actual delivery remains the responsibility of the existing email queue processor; tests use emulators and do not send real mail.

On Vercel, only the platform's `x-vercel-forwarded-for` header identifies a visitor; IPv6 addresses share a /64 bucket. See [Vercel request headers](https://vercel.com/docs/headers/request-headers). Local development and other hosts use a single conservative shared visitor bucket, ignoring untrusted forwarding headers. A different hosting provider needs an explicit trusted-proxy adapter before enabling separate visitor buckets. Visitors sharing a public IP share limits.

Only published, optimized `web.webp` files can be downloaded. Each fetch is range-limited to 10 MiB plus one size-check byte; oversized files are rejected. No original/print-master paths are accepted. Responses use `private, no-store`, and limited requests return `429` with `Retry-After`; the button explains when to retry. `PHOTOGRAPHY_DOWNLOADS_ENABLED=false` is an emergency server-side pause (requires updating the website environment/redeployment).

These changes take effect when the website is deployed; no Firebase function deployment is required. This is download-endpoint protection, **not a Firebase spending cap**: quota checks still have small database costs on uncached denials, application requests still invoke hosting, and public gallery/media routes remain accessible and can be targeted independently. Edge firewall rate limits/bot protection on the hosting project are an additional layer against distributed attacks; no live firewall settings were changed. [Firebase budget alerts](https://firebase.google.com/docs/projects/billing/firebase-pricing-plans) do not cap usage or charges.

The website reuses the existing Firebase Admin and browser configuration. `PHOTOGRAPHY_STORAGE_BUCKET` is an optional server-side override; otherwise the website uses `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`. The function's trigger bucket is configured in `functions/index.js` and must match.

Firebase is the only photography source. The gallery, collection pages, photo details, and downloads all use the Firebase-backed library.

The backend has its own Firebase configuration so photography deployment does not accidentally deploy unrelated functions:

```sh
npm --prefix functions ci
firebase deploy --project nash-browns --config firebase.photography.json --only storage,functions:photography
```

The original live storage policy denied all client access. The deployed photography rules retain that default and add owner-only photography reads and immutable source uploads. Before deploying to another project, compare its existing storage policy rather than replacing unrelated permissions.

The website accesses Firestore through its authenticated server API; browser clients do not need direct Firestore access. Photography rules are included in `firestore.rules` for development, but a full Firestore rules deployment should be reviewed together with the site's partner/auth rules. The photography rollout deployed storage and the processing function, not the full Firestore rules file. Deploy the website separately through its existing hosting workflow.

## Migration and verification

The initial migration imported five web images into Arizona and Kansas City, preserving their photo IDs and collection memberships. Featured stayed empty. The retired migration tooling has been removed. Imported web images are **not print masters**. Upload your original TIFF/JPEG files for those photographs before offering prints. Camera and film remain blank unless explicitly supplied.

```sh
npm run check
npm run test:photography
npm run test:photography:emulator
```

Emulator tests require Java 21 or newer. They cover owner restrictions, immutable/private storage, multi-collection membership, independent ordering, stale edits, publication, archive, and image processing events. Use a demo project for tests, never production data.

An isolated production build can run alongside the development server:

```sh
NEXT_BUILD_DIR=.next-photography-build npm run build
```
