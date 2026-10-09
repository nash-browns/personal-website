import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { SourceTextModule, SyntheticModule } from 'node:vm';
import sharp from 'sharp';
import { validId } from '../lib/photography/model.mjs';
import { PHOTO_WIDTHS, isPhotographyMedia, photographyImageLoader } from '../lib/photography/image-loader.mjs';
import { createPreviewCache, getPreviewBytes, resizePreview } from '../lib/photography/preview-cache.mjs';

const mediaUrl = 'https://example.test/api/photography/media/photo/version/web';
async function route() {
    let photo = { status: 'published', webImage: { version: 'version', path: 'photography/public/photo/version/web.webp', thumbnailPath: 'photography/public/photo/version/thumbnail.webp' } };
    let reads = 0, downloads = 0, failure;
    const dependencies = {
        '@/lib/photography/model.mjs': { validId },
        '@/lib/photography/image-loader.mjs': { PHOTO_WIDTHS },
        '@/lib/photography/preview-cache.mjs': { getPreviewBytes: async () => { downloads++; if (failure) throw failure; return Buffer.from('preview'); } },
        '@/lib/photography/server': {
            photoDb: { collection: () => ({ doc: () => ({ get: async () => { reads++; return { data: () => photo }; } }) }) },
            photoBucket: () => ({}),
        },
    };
    const module = new SourceTextModule(await readFile(new URL('../app/api/photography/media/[id]/[version]/[size]/route.js', import.meta.url), 'utf8'));
    await module.link(name => {
        const exports = dependencies[name];
        assert.ok(exports, name);
        return new SyntheticModule(Object.keys(exports), function () {
            for (const [key, value] of Object.entries(exports)) this.setExport(key, value);
        });
    });
    await module.evaluate();
    return {
        get: (query = '', headers = {}, params = {}) => module.namespace.GET(new Request(mediaUrl + query, { headers }), { params: Promise.resolve({ id: 'photo', version: 'version', size: 'web', ...params }) }),
        setPhoto: value => { photo = value; },
        fail: value => { failure = value; },
        counts: () => ({ reads, downloads }),
    };
}

test('responsive photography URLs bypass the optimizer and use only bounded widths', () => {
    assert.ok(isPhotographyMedia('/api/photography/media/photo/version/thumbnail'));
    assert.equal(isPhotographyMedia('https://example.test/photo.jpg'), false);
    for (const width of [16, 300, 384, 828, 1200, 3840]) {
        const url = new URL(photographyImageLoader({ src: '/api/photography/media/photo/version/thumbnail', width }), 'https://example.test');
        assert.equal(url.pathname, '/api/photography/media/photo/version/web');
        assert.ok(PHOTO_WIDTHS.includes(Number(url.searchParams.get('w'))));
    }
});

test('repeat requests revalidate without fetching bytes, but archive/replacement cannot return 304', async () => {
    const r = await route();
    const first = await r.get('?w=384');
    assert.equal(first.status, 200);
    assert.equal(first.headers.get('cache-control'), 'public, max-age=2678400, s-maxage=2678400, immutable, must-revalidate');
    const etag = first.headers.get('etag');
    for (const value of [etag, `"other", ${etag}`, etag.replace(/^W\//, ''), '*']) {
        const response = await r.get('?w=384', { 'if-none-match': value });
        assert.equal(response.status, 304);
        assert.equal(await response.text(), '');
    }
    assert.equal(r.counts().downloads, 1);
    assert.equal((await r.get('?w=640', { 'if-none-match': etag })).status, 200);
    for (const photo of [undefined, { status: 'archived', webImage: { version: 'version' } }, { status: 'published', webImage: { version: 'replacement' } }]) {
        r.setPhoto(photo);
        const response = await r.get('?w=384', { 'if-none-match': etag });
        assert.equal(response.status, 404);
        assert.equal(response.headers.get('cache-control'), 'no-store');
    }
    assert.equal(r.counts().downloads, 2);
});

test('invalid variants never reach Firebase; private paths and failures are not cacheable', async () => {
    const r = await route();
    for (const query of ['?w=999', '?w=0384', '?w=', '?w=384&w=640', '?w=384&q=80']) {
        assert.equal((await r.get(query)).status, 404);
    }
    assert.equal((await r.get('', {}, { id: '..' })).status, 404);
    assert.equal((await r.get('', {}, { size: 'original' })).status, 404);
    assert.equal(r.counts().reads, 0);
    r.setPhoto({ status: 'published', webImage: { version: 'version', path: 'photography/private/photo/original/version/source.tif' } });
    assert.equal((await r.get()).status, 404);
    assert.equal(r.counts().downloads, 0);
    r.setPhoto({ status: 'published', webImage: { version: 'version', path: 'photography/public/photo/version/web.webp' } });
    for (const [failure, status] of [[new Error('unavailable'), 503], [{ code: 404 }, 404]]) {
        r.fail(failure);
        const response = await r.get();
        assert.equal(response.status, status);
        assert.equal(response.headers.get('cache-control'), 'no-store');
    }
});

test('preview cache deduplicates concurrent work, evicts by byte budget, and retries failures', async () => {
    const cached = createPreviewCache({ maxBytes: 6, maxEntries: 2 });
    let loads = 0;
    const load = async () => { loads++; return Buffer.from('abc'); };
    await Promise.all(Array.from({ length: 20 }, () => cached('a', load)));
    assert.equal(loads, 1);
    await cached('b', load);
    await cached('a', load);
    await cached('c', load);
    await cached('b', load); // b was least recently used
    assert.equal(loads, 4);
    await assert.rejects(cached('fail', async () => { throw new Error('retry'); }), /retry/);
    assert.equal((await cached('fail', load)).toString(), 'abc');
    let large = 0;
    for (let i = 0; i < 2; i++) await cached('large', async () => { large++; return Buffer.alloc(7); });
    assert.equal(large, 2, 'oversized entries are never retained');
});

test('responsive previews shrink real WebP bytes and share one bounded source download', async () => {
    const pixels = Buffer.alloc(1200 * 800 * 3);
    for (let i = 0; i < pixels.length; i++) pixels[i] = (i * 31 + Math.floor(i / 3600)) % 256;
    const source = await sharp(pixels, { raw: { width: 1200, height: 800, channels: 3 } }).webp({ quality: 85 }).toBuffer();
    let downloads = 0;
    const bucket = { file: () => ({ download: async options => {
        downloads++;
        assert.deepEqual(options, { start: 0, end: 10 * 1024 * 1024 });
        return [source];
    } }) };
    const [small, medium] = await Promise.all([384, 640].map(width => getPreviewBytes(bucket, 'test/photo/version/web.webp', width)));
    assert.equal(downloads, 1);
    assert.equal((await sharp(small).metadata()).width, 384);
    assert.equal((await sharp(medium).metadata()).width, 640);
    assert.ok(small.length < source.length);
    assert.equal(await resizePreview(source, 2400), source, 'never enlarge or re-encode an already small source');
    const oversized = { file: () => ({ download: async () => [Buffer.alloc(10 * 1024 * 1024 + 1)] }) };
    await assert.rejects(getPreviewBytes(oversized, 'test/oversized/web.webp', 384), /size limit/);
});
