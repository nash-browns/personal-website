// Replace Firebase Storage JPEG URLs in the repo with the WebP URLs recorded
// by upload-webp.sh.
//
// Usage:
//   node scripts/image-reencode/rewrite-urls.mjs <folder> <mapping.tsv> [--write]
//
// Without --write it only reports what would change. Matching is by storage
// folder and filename stem, so the old download token does not need to be
// known. Only .jpg/.jpeg (any case) URLs are rewritten; PNG, GIF, and AVIF
// references are left alone.
//
// Files scanned: app/, components/, lib/ (.js, .mjs, .mdx). The dimension
// manifest is not touched here; run `npm run images:sync` afterwards.

import fs from 'node:fs/promises';
import path from 'node:path';

const [folder, mappingFile, flag] = process.argv.slice(2);
if (!folder || !mappingFile) {
    console.error('Usage: node scripts/image-reencode/rewrite-urls.mjs <folder> <mapping.tsv> [--write]');
    process.exit(2);
}
const write = flag === '--write';
const BUCKET = 'nash-browns.firebasestorage.app';

const mapping = new Map();
for (const line of (await fs.readFile(mappingFile, 'utf8')).split('\n')) {
    if (!line.trim()) continue;
    const [stem, url] = line.split('\t');
    if (!stem || !url) { console.error(`Bad mapping line: ${line}`); process.exit(1); }
    mapping.set(stem, url);
}

const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const prefix = `https://firebasestorage.googleapis.com/v0/b/${BUCKET}/o/${folder}%2F`;
// Matches the full old URL, capturing the stem, for JPEG objects in this folder.
const pattern = new RegExp(`${escape(prefix)}([^%?"'\\s]+)\\.(?:jpe?g)\\?alt=media(?:&token=[0-9a-fA-F-]+)?`, 'gi');

async function* walk(dir) {
    for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            if (entry.name === 'node_modules' || entry.name === '.next') continue;
            yield* walk(full);
        } else if (/\.(js|mjs|mdx)$/.test(entry.name)) {
            yield full;
        }
    }
}

let totalReplaced = 0;
const unmatched = new Set();
for (const root of ['app', 'components', 'lib']) {
    for await (const file of walk(root)) {
        const before = await fs.readFile(file, 'utf8');
        let count = 0;
        const after = before.replace(pattern, (match, stem) => {
            const next = mapping.get(stem);
            if (!next) { unmatched.add(stem); return match; }
            count++;
            return next;
        });
        if (count === 0) continue;
        totalReplaced += count;
        console.log(`${write ? 'WROTE' : 'WOULD WRITE'} ${file}: ${count} replacement(s)`);
        if (write) await fs.writeFile(file, after);
    }
}

if (unmatched.size) {
    console.log(`\nJPEG references in "${folder}" with no mapping entry (left unchanged):`);
    for (const stem of unmatched) console.log(`  ${stem}`);
}
console.log(`\n${totalReplaced} replacement(s) ${write ? 'written' : 'pending (re-run with --write)'}.`);
