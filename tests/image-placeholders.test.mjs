import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { test } from 'node:test';
import sharp from 'sharp';
import { createImagePlaceholder } from '../lib/images/placeholder.mjs';
import { withPhotoPlaceholder } from '../lib/photography/placeholder.mjs';
import { publicPhoto } from '../lib/photography/model.mjs';

test('tiny placeholders respect orientation, strip metadata, and stay under budget', async () => {
    const original = await sharp({ create: { width: 1200, height: 800, channels: 3, background: '#784329' } }).withMetadata({ orientation: 6 }).jpeg().toBuffer();
    const copy = Buffer.from(original);
    const data = await createImagePlaceholder(original);
    assert.ok(data.length <= 512);
    const metadata = await sharp(Buffer.from(data.split(',')[1], 'base64')).metadata();
    assert.equal(metadata.format, 'webp');
    assert.equal(metadata.height, 8);
    assert.ok(metadata.width < metadata.height);
    assert.equal(metadata.exif, undefined);
    assert.deepEqual(original, copy);
});

test('publishing prepares a public preview once; replacement versions get fresh placeholders', async () => {
    const bytes = await sharp({ create: { width: 40, height: 60, channels: 3, background: '#567834' } }).webp().toBuffer();
    const calls = [];
    const bucket = { file(path) { return { async download(options) { calls.push({ path, options }); return [bytes]; } }; } };
    const image = { path: 'photography/public/photo/v1/web.webp', url: '/web-v1', version: 'v1' };
    const prepared = await withPhotoPlaceholder(image, bucket);
    assert.match(prepared.blurDataURL, /^data:image\/webp;base64,/);
    assert.equal(image.blurDataURL, undefined);
    assert.equal(await withPhotoPlaceholder(prepared, bucket), prepared);
    assert.equal(calls.length, 1);
    assert.deepEqual(calls[0].options, { start: 0, end: 10 * 1024 * 1024 });
    const replacement = await withPhotoPlaceholder({ ...image, path: 'photography/public/photo/v2/web.webp', version: 'v2' }, bucket);
    assert.equal(replacement.version, 'v2');
    assert.equal(calls.length, 2);
    const publicRecord = publicPhoto('photo', { title: 'Test', webImage: prepared });
    assert.equal(publicRecord.webImage.blurDataURL, prepared.blurDataURL);
    assert.equal(publicRecord.webImage.path, undefined);
});

test('old photos and failures retain a fallback without accessing originals or blocking publishing', async () => {
    const badImage = { path: 'photography/private/photo/original/v1/source.jpg' };
    const deniedBucket = { file() { throw new Error('Must not read private files'); } };
    assert.equal(await withPhotoPlaceholder(badImage, deniedBucket), badImage);
    const image = { path: 'photography/public/photo/v1/web.webp' };
    for (const bucket of [deniedBucket, { file() { return { download: async () => [Buffer.from('broken')] }; } }, { file() { return { download: async () => [Buffer.alloc(10 * 1024 * 1024 + 1)] }; } }]) {
        assert.equal(await withPhotoPlaceholder(image, bucket), image);
    }
    assert.equal(publicPhoto('photo', { title: 'Old', webImage: image }).webImage.blurDataURL, undefined);
});

test('France previews cover every declared photograph with a small total payload', async () => {
    const page = await fs.readFile(new URL('../app/blog/articles/france-may-2026/page.js', import.meta.url), 'utf8');
    const data = JSON.parse(await fs.readFile(new URL('../data/france-may-2026-placeholders.json', import.meta.url), 'utf8'));
    const sources = [...new Set(page.match(/https:\/\/firebasestorage\.googleapis\.com\/[^'"\s]+/g))];
    let total = 0;
    for (const src of sources) {
        assert.match(data[src], /^data:image\/webp;base64,/);
        assert.ok(data[src].length <= 512);
        total += data[src].length;
    }
    assert.ok(sources.length >= 50);
    assert.ok(total < 16000);
});
