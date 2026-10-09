import fs from 'node:fs/promises';
import { createImagePlaceholder } from '../lib/images/placeholder.mjs';
import { validateSource } from '../lib/mdx/image-dimensions.mjs';

// Explicit content-preparation step. Builds use the checked-in result offline.
const slug = process.argv[2];
if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug || '')) throw new Error('Provide an article slug.');
const page = new URL(`../app/blog/articles/${slug}/page.js`, import.meta.url);
const destination = new URL(`../data/${slug}-placeholders.json`, import.meta.url);
const source = await fs.readFile(page, 'utf8');
const urls = [...new Set(source.match(/https:\/\/firebasestorage\.googleapis\.com\/[^'"\s]+/g))];
let saved = {};
try { saved = JSON.parse(await fs.readFile(destination, 'utf8')); }
catch (error) { if (error.code !== 'ENOENT') throw error; }
const entries = [];
let index = 0;
await Promise.all(Array.from({ length: 3 }, async () => {
    while (index < urls.length) {
        const url = urls[index++];
        validateSource(url);
        if (saved[url] && !process.argv.includes('--refresh')) { entries.push([url, saved[url]]); continue; }
        let response;
        for (let attempt = 0; attempt < 3; attempt++) {
            response = await fetch(url, { redirect: 'error', signal: AbortSignal.timeout(30000) });
            if (response.status < 500) break;
            await response.body.cancel();
            if (attempt < 2) await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
        }
        if (!response.ok) throw new Error(`Image host returned HTTP ${response.status} for ${new URL(url).pathname}.`);
        const chunks = [];
        let size = 0;
        for await (const chunk of response.body) {
            size += chunk.length;
            if (size > 20 * 1024 * 1024) throw new Error('Image exceeds preparation limit.');
            chunks.push(chunk);
        }
        entries.push([url, await createImagePlaceholder(Buffer.concat(chunks))]);
    }
}));
const result = JSON.stringify(Object.fromEntries(entries.sort(([a], [b]) => a.localeCompare(b))), null, 2) + '\n';
await fs.writeFile(destination, result);
console.log(`Prepared ${entries.length} placeholders; ${entries.reduce((sum, [, data]) => sum + data.length, 0)} bytes of image data.`);
