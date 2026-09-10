import assert from 'node:assert/strict';
import { test } from 'node:test';

const base = new URL(process.env.SMOKE_TEST_URL || 'http://127.0.0.1:3216');
assert.ok(['127.0.0.1', 'localhost', '[::1]'].includes(base.hostname), 'Use a local Next.js server for smoke tests');

async function request(path, options = {}) {
    return fetch(new URL(path, base), { redirect: 'manual', signal: AbortSignal.timeout(30000), ...options });
}

for (const path of ['/', '/blog', '/writing', '/partners', '/signup', '/partners/dashboard', '/partners/users']) {
    test(`${path} renders without a server error`, async () => {
        const response = await request(path);
        assert.equal(response.status, 200);
        const html = await response.text();
        assert.match(html, /<html/);
        assert.doesNotMatch(html, /Application error: a server-side exception/);
    });
}

for (const [path, title] of [
    ['/blog/articles/big-sioux-river-kayak', 'Big Sioux River Kayak'],
    ['/blog/articles/tune-insulation-pack-install', 'Tune M1 Insulation Pack Install'],
    ['/writing/hungry', 'Hungry'],
]) {
    test(`${path} retains server-rendered content and page metadata`, async () => {
        const response = await request(path);
        assert.equal(response.status, 200);
        const html = await response.text();
        assert.match(html, new RegExp(`<title>[^<]*${title}`));
        if (path.startsWith('/blog/')) assert.match(html, /application\/ld\+json/);
        assert.match(html, /<meta name="description" content="[^"]+"/);
    });
}

test('password-reset pages resolve asynchronous search parameters', async () => {
    const response = await request('/forgot-password?mode=resetPassword');
    assert.equal(response.status, 200);
    assert.match(await response.text(), /Set New Password/);
});

test('account management pages send noindex and their own canonical URL to crawlers', async () => {
    for (const [path, title] of [
        ['/signup', 'Sign Up'], ['/forgot-password', 'Reset Password'],
        ['/partners/dashboard', 'Dashboard'], ['/partners/users', 'Users'],
    ]) {
        const response = await request(path, { headers: { 'User-Agent': 'Twitterbot/1.0' } });
        assert.equal(response.status, 200, path);
        const html = await response.text();
        assert.match(html, new RegExp(`<title>${title}</title>`), path);
        assert.match(html, /<meta name="robots" content="noindex, follow"/, path);
        assert.ok(html.includes(`<link rel="canonical" href="https://www.nashbrowns.com${path}"`), path);
    }
});

test('article sharing metadata is in the crawler response and ignores tracking parameters', async () => {
    const response = await request('/blog/articles/pepper-peak?utm_source=seo-check', { headers: { 'User-Agent': 'Twitterbot/1.0' } });
    assert.equal(response.status, 200);
    const head = (await response.text()).split('</head>')[0];
    assert.match(head, /<link rel="canonical" href="https:\/\/www.nashbrowns.com\/blog\/articles\/pepper-peak"/);
    assert.match(head, /<meta property="article:published_time" content="2025-06-27T00:00:00.000Z"/);
    assert.match(head, /<meta name="twitter:card" content="summary_large_image"/);
    assert.match(head, /<meta property="og:image" content="https:\/\/firebasestorage.googleapis.com\//);
    assert.equal([...head.matchAll(/<meta name="viewport"/g)].length, 1);
});

test('QR redirects resolve asynchronous route parameters', async () => {
    const response = await request('/api/qr-code-redirect/wbb');
    assert.equal(response.status, 307);
    assert.equal(response.headers.get('location'), 'https://www.worldclassbikes.com/');
});

test('existing article URL redirects remain intact', async () => {
    const response = await request('/blog/articals/big-sioux-river-kayak');
    assert.equal(response.status, 308);
    assert.equal(new URL(response.headers.get('location'), base).pathname, '/blog/articles/big-sioux-river-kayak');
});

test('protected API routes reject unauthenticated requests', async () => {
    for (const path of [
        '/api/admin/0/all-users', '/api/admin/0/all-tenants',
        '/api/1/content/get-all-content', '/api/1/tenant/get-tenant', '/api/1/users/get-tenant-users',
    ]) {
        const response = await request(path);
        assert.equal(response.status, 401, path);
        const body = await response.json();
        assert.ok(body.error);
        assert.equal(body.users, undefined);
        assert.equal(body.tenants, undefined);
        assert.equal(body.content, undefined);
    }
});

test('admin routes reject invalid credentials with 401', async () => {
    for (const endpoint of ['all-users', 'all-tenants']) {
        const response = await request(`/api/admin/0/${endpoint}`, { headers: { Authorization: 'Bearer invalid-smoke-test-token' } });
        assert.equal(response.status, 401);
        assert.equal((await response.json()).error, 'Invalid or expired token');
    }
});

test('session endpoint checks origin and clears both cookie formats on logout', async () => {
    const path = '/api/auth/set-token-cookie';
    const rejected = await request(path, { method: 'DELETE', headers: { Origin: 'https://unrelated.example' } });
    assert.equal(rejected.status, 403);
    const logout = await request(path, { method: 'DELETE', headers: { Origin: base.origin } });
    assert.equal(logout.status, 200);
    assert.equal(logout.headers.get('cache-control'), 'private, no-store');
    const cookies = logout.headers.getSetCookie();
    for (const name of ['partnerSession', 'idToken']) {
        assert.ok(cookies.some(cookie => cookie.startsWith(`${name}=`) && cookie.includes('Max-Age=0')));
    }
    const invalid = await request(path, {
        method: 'POST', headers: { Origin: base.origin, 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken: 'invalid-smoke-test-token' }),
    });
    assert.equal(invalid.status, 401);
    assert.equal(invalid.headers.get('set-cookie'), null);
});

for (const format of ['image/webp', 'image/avif']) {
    test(`patched image optimization serves ${format} for existing JPEG files`, async () => {
        const response = await request('/_next/image?url=%2Fblog%2Ftune-insulation-pack-install%2Ffeature-image.JPEG&w=640&q=75', { headers: { Accept: format } });
        assert.equal(response.status, 200);
        assert.equal(response.headers.get('content-type'), format);
        assert.ok((await response.arrayBuffer()).byteLength > 100);
    });
}
