import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { test } from 'node:test';
import sharp from 'sharp';
import { proxyImage, MAX_IMAGE_BYTES } from '../lib/images/proxy-image.mjs';

const source = 'https://firebasestorage.googleapis.com/v0/b/nash-browns.firebasestorage.app/o/example%2Fpanorama.jpg?alt=media&token=test-token';
const request = (url = source, options) => new Request(`https://www.nashbrowns.com/api/proxy-image?${new URLSearchParams({ url })}`, options);
const jpeg = await sharp({ create: { width: 2, height: 1, channels: 3, background: 'red' } }).jpeg().toBuffer();
const image = (body = jpeg, headers = {}) => new Response(body, { headers: { 'Content-Type': 'image/jpeg', ...headers } });
const settle = () => new Promise(resolve => setImmediate(resolve));

test('rejects untrusted URLs before making any upstream request', async () => {
    const invalid = [
        '', 'not a URL', 'file:///etc/passwd', 'http://127.0.0.1/image.jpg',
        'https://169.254.169.254/latest/meta-data',
        source.replace('https:', 'http:'),
        source.replace('googleapis.com', 'googleapis.com.attacker.test'),
        source.replace('googleapis.com', 'googleapis.com:444'),
        source.replace('https://', 'https://user:password@'),
        source.replace('nash-browns.firebasestorage.app', 'another-bucket'),
        source.replace('/o/example%2Fpanorama.jpg', '/o/'),
        source.replace('example%2Fpanorama.jpg', '..%2Fsecret.jpg'),
        source.replace('example%2Fpanorama.jpg', 'bad%00.jpg'),
        source.replace('example%2Fpanorama.jpg', '%ZZ'),
        source.replace('alt=media', 'alt=json'),
        `${source}&alt=media`, `${source}&token=second`, `${source}&redirect=https://attacker.test`,
        `${source}#fragment`, `${source}${'x'.repeat(4096)}`,
    ];
    for (const url of invalid) {
        const result = await proxyImage(request(url), { fetchImpl: () => assert.fail(`Fetched rejected URL: ${url}`) });
        assert.equal(result.status, 400, url);
        assert.equal(result.headers.get('Cache-Control'), 'no-store');
    }
    for (const query of ['', '?url=a&url=b']) {
        const result = await proxyImage(new Request(`https://www.nashbrowns.com/api/proxy-image${query}`), {
            fetchImpl: () => assert.fail('Invalid query must not fetch'),
        });
        assert.equal(result.status, 400);
    }
});

test('all current article panorama URLs remain allowed', async () => {
    const directory = new URL('../app/blog/articles/', import.meta.url);
    let checked = 0;
    for (const entry of await readdir(directory, { withFileTypes: true })) {
        if (!entry.isDirectory()) continue;
        let text;
        try { text = await readFile(new URL(`${entry.name}/page.mdx`, directory), 'utf8'); }
        catch (error) { if (error.code === 'ENOENT') continue; throw error; }
        for (const [, , url] of text.matchAll(/export const threeSixtyImage\s*=\s*(["'])(.*?)\1/g)) {
            const result = await proxyImage(request(url), { fetchImpl: async fetched => {
                assert.equal(fetched, new URL(url).href);
                return image();
            } });
            assert.equal(result.status, 200, entry.name);
            checked++;
        }
    }
    assert.ok(checked >= 10, `Expected current panoramas, found ${checked}`);
});

test('returns JPEG, PNG and WebP bytes unchanged with safe headers and no forwarded credentials', async () => {
    for (const [format, type] of [['jpeg', 'image/jpeg'], ['png', 'image/png'], ['webp', 'image/webp']]) {
        const bytes = await sharp(jpeg).toFormat(format).toBuffer();
        const result = await proxyImage(request(source, { headers: { Cookie: 'private=session', Authorization: 'Bearer private' } }), {
            fetchImpl: async (_url, options) => {
                assert.equal(options.redirect, 'error');
                assert.equal(options.cache, 'no-store');
                assert.deepEqual(Object.keys(options.headers), ['Accept']);
                return image(bytes, { 'Content-Type': type, 'Set-Cookie': 'upstream=private' });
            },
        });
        assert.equal(result.status, 200);
        assert.deepEqual(Buffer.from(await result.arrayBuffer()), bytes);
        assert.equal(result.headers.get('Content-Type'), type);
        assert.equal(result.headers.get('X-Content-Type-Options'), 'nosniff');
        assert.equal(result.headers.get('Cross-Origin-Resource-Policy'), 'same-origin');
        assert.equal(result.headers.get('Set-Cookie'), null);
        assert.equal(result.headers.get('Access-Control-Allow-Origin'), null);
    }
});

test('rejects redirects, upstream errors, missing types, SVG/HTML and forged image types', async () => {
    const responses = [
        new Response(null, { status: 302, headers: { Location: 'http://127.0.0.1/private' } }),
        new Response(null, { status: 404 }), new Response(null, { status: 204 }),
        new Response(jpeg), image(jpeg, { 'Content-Type': 'image/svg+xml' }),
        image('<script>alert(1)</script>', { 'Content-Type': 'text/html' }),
        image('<script>alert(1)</script>'), image('<svg onload="alert(1)"/>'),
        image(jpeg, { 'Content-Type': 'image/png' }), image(new Uint8Array()),
    ];
    for (const upstream of responses) {
        const result = await proxyImage(request(), { fetchImpl: async () => upstream });
        assert.equal(result.status, 502);
        assert.equal(result.headers.get('Cache-Control'), 'no-store');
    }
    const result = await proxyImage(request(), { fetchImpl: async () => { throw new Error(`Network failure: ${source}`); } });
    assert.equal(result.status, 502);
    assert.ok(!(await result.text()).includes('test-token'));
});

test('cancels oversized responses based on headers or actual bytes, even with a false/missing length', async () => {
    for (const length of [String(MAX_IMAGE_BYTES + 1), '1', null]) {
        let cancelled = false;
        let signal;
        const body = new ReadableStream({
            start(controller) {
                controller.enqueue(new Uint8Array(MAX_IMAGE_BYTES));
                controller.enqueue(new Uint8Array(1));
            },
            cancel() { cancelled = true; },
        });
        const headers = length === null ? {} : { 'Content-Length': length };
        const result = await proxyImage(request(), { fetchImpl: async (_url, options) => {
            signal = options.signal;
            return image(body, headers);
        } });
        assert.equal(result.status, 413);
        assert.ok(cancelled);
        assert.ok(signal.aborted);
    }
});

test('the deadline cancels stalled response headers and stalled bodies', async t => {
    t.mock.timers.enable({ apis: ['setTimeout'] });
    for (const stallAt of ['headers', 'body']) {
        let signal;
        const pending = proxyImage(request(), { fetchImpl: (_url, options) => {
            signal = options.signal;
            if (stallAt === 'headers') return new Promise((_resolve, reject) => {
                signal.addEventListener('abort', () => reject(signal.reason), { once: true });
            });
            return image(new ReadableStream({ start(controller) {
                controller.enqueue(jpeg);
                signal.addEventListener('abort', () => controller.error(signal.reason), { once: true });
            } }));
        } });
        await settle();
        t.mock.timers.tick(10_000);
        const result = await pending;
        assert.equal(result.status, 504, stallAt);
        assert.ok(signal.aborted);
    }
});

test('client cancellation aborts upstream work and an already cancelled request never fetches', async () => {
    const client = new AbortController();
    let upstreamSignal;
    const pending = proxyImage(request(source, { signal: client.signal }), { fetchImpl: (_url, options) => {
        upstreamSignal = options.signal;
        return new Promise((_resolve, reject) => upstreamSignal.addEventListener('abort', () => reject(upstreamSignal.reason), { once: true }));
    } });
    client.abort();
    assert.equal((await pending).status, 499);
    assert.ok(upstreamSignal.aborted);
    assert.equal((await proxyImage(request(source, { signal: client.signal }), {
        fetchImpl: () => assert.fail('Already cancelled'),
    })).status, 499);
});
