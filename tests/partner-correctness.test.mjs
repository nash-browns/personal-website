import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { createContext, SourceTextModule, SyntheticModule } from 'node:vm';
import { NextRequest, NextResponse } from 'next/server.js';
import { createSessionClient } from '../lib/firebase/session-client.mjs';

const tick = () => new Promise(resolve => setImmediate(resolve));
function deferred() {
    let resolve, reject;
    const promise = new Promise((a, b) => { resolve = a; reject = b; });
    return { promise, resolve, reject };
}
// Exercise the real modules, replacing only Firebase/browser boundaries.
async function load(file, mocks = {}, globals = {}) {
    const context = createContext({ Response, URL, Date, console: { error() {} }, process: { env: { NODE_ENV: 'production' } }, ...globals });
    const modules = new Map();
    async function moduleFor(url) {
        if (modules.has(url.href)) return modules.get(url.href);
        const module = new SourceTextModule(await readFile(url, 'utf8'), { context, identifier: url.href });
        modules.set(url.href, module);
        await module.link(async (specifier, parent) => {
            if (specifier in mocks) {
                const exports = mocks[specifier];
                return new SyntheticModule(Object.keys(exports), function () {
                    for (const [key, value] of Object.entries(exports)) this.setExport(key, value);
                }, { context });
            }
            if (specifier.startsWith('.')) {
                const target = new URL(specifier, parent.identifier);
                if (!/\.(m?js)$/.test(target.pathname)) target.pathname += '.js';
                return moduleFor(target);
            }
            if (specifier === '@/lib/firebase/session-constants.mjs') return moduleFor(new URL('../lib/firebase/session-constants.mjs', import.meta.url));
            throw new Error(`Unexpected import: ${specifier}`);
        });
        return module;
    }
    const module = await moduleFor(new URL(`../${file}`, import.meta.url));
    await module.evaluate();
    return module.namespace;
}

async function sessionRoute({ current, tokenFails = false, sessionFails = false } = {}) {
    const calls = [];
    const adminAuth = {
        async verifyIdToken(token, revoked) {
            calls.push(['token', token, revoked]);
            if (tokenFails || token !== 'valid-token') throw new Error('Invalid token');
            return { uid: 'user-a', email: 'a@example.test' };
        },
        async verifySessionCookie(token, revoked) {
            calls.push(['session', token, revoked]);
            if (sessionFails || !current) throw new Error('Invalid session');
            return current;
        },
        async createSessionCookie(token, options) {
            calls.push(['create', token, options.expiresIn]);
            return 'signed-session';
        },
    };
    const route = await load('app/api/auth/set-token-cookie/route.js', {
        'next/server': { NextResponse }, '@/lib/firebase/admin': { adminAuth },
    });
    function request({ method = 'POST', origin = 'https://www.nashbrowns.com', token = 'valid-token', cookie, contentType = 'application/json', rawBody } = {}) {
        const headers = { 'Content-Type': contentType };
        if (origin !== null) headers.Origin = origin;
        if (cookie) headers.Cookie = cookie;
        return new NextRequest('https://www.nashbrowns.com/api/auth/set-token-cookie', {
            method, headers, ...(method === 'POST' ? { body: rawBody ?? JSON.stringify({ idToken: token }) } : {}),
        });
    }
    return { route, calls, request };
}

test('session endpoint rejects cross-origin, missing-origin, malformed and invalid-token requests without setting a login cookie', async () => {
    const s = await sessionRoute();
    for (const [options, status] of [
        [{ origin: 'https://example.test' }, 403], [{ origin: null }, 403],
        [{ contentType: 'text/plain' }, 415], [{ rawBody: '{' }, 400],
        [{ token: null }, 400], [{ token: {} }, 400], [{ token: '' }, 400], [{ token: 'x'.repeat(10001) }, 400],
        [{ token: 'forged-token' }, 401],
    ]) {
        const response = await s.route.POST(s.request(options));
        assert.equal(response.status, status);
        assert.equal(response.cookies.get('partnerSession'), undefined);
        assert.equal(response.headers.get('Cache-Control'), 'private, no-store');
    }
    assert.equal(s.calls.filter(call => call[0] === 'create').length, 0);
});

test('verified sign-in creates a one-day HttpOnly session and expires the old ID-token cookie', async () => {
    const s = await sessionRoute();
    const response = await s.route.POST(s.request());
    assert.equal(response.status, 200);
    assert.equal((await response.json()).changed, true);
    const cookie = response.cookies.get('partnerSession');
    assert.equal(cookie.value, 'signed-session');
    assert.equal(cookie.maxAge, 86400);
    assert.equal(cookie.httpOnly, true);
    assert.equal(cookie.secure, true);
    assert.equal(cookie.sameSite, 'lax');
    assert.equal(cookie.path, '/');
    assert.equal(response.cookies.get('idToken').maxAge, 0);
    assert.deepEqual(s.calls, [['token', 'valid-token', true], ['create', 'valid-token', 86400000]]);
});

test('session origin checks use the requested host when Next normalizes its internal URL', async () => {
    const { route } = await sessionRoute();
    const response = await route.DELETE(new NextRequest('http://localhost:3216/api/auth/set-token-cookie', {
        method: 'DELETE', headers: { Origin: 'http://127.0.0.1:3216', Host: '127.0.0.1:3216' },
    }));
    assert.equal(response.status, 200);
    for (const origin of ['http://attacker.example', 'https://127.0.0.1:3216', 'http://127.0.0.1:3216/unexpected-path']) {
        const rejected = await route.DELETE(new NextRequest('http://localhost:3216/api/auth/set-token-cookie', {
            method: 'DELETE', headers: { Origin: origin, Host: '127.0.0.1:3216' },
        }));
        assert.equal(rejected.status, 403);
    }
});

test('valid sessions are reused; expiring, revoked and different-account sessions are replaced', async () => {
    for (const [current, sessionFails, changed] of [
        [{ uid: 'user-a', exp: Date.now() / 1000 + 3600 }, false, false],
        [{ uid: 'user-a', exp: Date.now() / 1000 + 60 }, false, true],
        [{ uid: 'user-b', exp: Date.now() / 1000 + 3600 }, false, true],
        [{ uid: 'user-a', exp: Date.now() / 1000 + 3600 }, true, true],
    ]) {
        const s = await sessionRoute({ current, sessionFails });
        const response = await s.route.POST(s.request({ cookie: 'partnerSession=old-session' }));
        assert.equal((await response.json()).changed, changed);
        assert.equal(!!response.cookies.get('partnerSession'), changed);
        assert.ok(s.calls.some(call => call[0] === 'session' && call[2] === true));
    }
});

test('logout clears both cookies with matching attributes and rejects cross-origin logout', async () => {
    const s = await sessionRoute();
    const response = await s.route.DELETE(s.request({ method: 'DELETE', cookie: 'partnerSession=old; idToken=old-id' }));
    assert.equal((await response.json()).changed, true);
    for (const name of ['partnerSession', 'idToken']) {
        assert.equal(response.cookies.get(name).maxAge, 0);
        assert.equal(response.cookies.get(name).path, '/');
        assert.equal(response.cookies.get(name).httpOnly, true);
    }
    assert.equal((await s.route.DELETE(s.request({ method: 'DELETE', origin: 'https://example.test' }))).status, 403);
    assert.deepEqual(s.calls, []);
});

test('server pages accept verified sessions or valid legacy tokens, and fail closed for revoked/malformed cookies', async () => {
    const calls = [];
    const adminAuth = {
        async verifySessionCookie(value, revoked) { calls.push(['session', revoked]); if (value !== 'good') throw new Error(); return { uid: 'u', email: 'u@example.test' }; },
        async verifyIdToken(value, revoked) { calls.push(['legacy', revoked]); if (value !== 'good') throw new Error(); return { uid: 'u', email: 'u@example.test' }; },
    };
    const { readServerUser } = await load('lib/firebase/server-session.js', { './admin': { adminAuth } });
    const cookies = values => ({ get: key => values[key] ? { value: values[key] } : undefined });
    assert.equal(await readServerUser(cookies({})), null);
    assert.equal((await readServerUser(cookies({ partnerSession: 'good' }))).uid, 'u');
    assert.equal((await readServerUser(cookies({ idToken: 'good' }))).uid, 'u');
    assert.equal(await readServerUser(cookies({ partnerSession: 'bad', idToken: 'good' })), null, 'do not fall back around an invalid current session');
    assert.deepEqual(calls, [['session', true], ['legacy', true], ['session', true]]);
});

test('cookie synchronization serializes sign-in and logout so logout wins a late response', async () => {
    const pending = deferred();
    const calls = [];
    const user = { getIdToken: async () => 'token' };
    let current = user;
    const session = createSessionClient({ getCurrentUser: () => current, request: async (url, options) => {
        calls.push(options.method);
        if (options.method === 'POST') await pending.promise;
        return Response.json({ success: true });
    } });
    const login = session.sync(user);
    await tick();
    current = null;
    const logout = session.sync(null);
    assert.deepEqual(calls, ['POST']);
    pending.resolve();
    await Promise.all([login, logout]);
    assert.deepEqual(calls, ['POST', 'DELETE']);
});

test('a token resolved after switching accounts cannot restore the previous login', async () => {
    const token = deferred();
    const oldUser = { getIdToken: () => token.promise };
    let current = oldUser;
    let requests = 0;
    const session = createSessionClient({ getCurrentUser: () => current, request: async () => { requests++; return Response.json({}); } });
    const pending = session.sync(oldUser);
    await tick();
    current = { getIdToken: async () => 'new' };
    token.resolve('old');
    assert.equal((await pending).skipped, true);
    assert.equal(requests, 0);
});

test('failed cookie writes reject sign-in, remain retryable, and prevent a falsely completed logout', async () => {
    const user = { getIdToken: async () => 'token' };
    let fail = true;
    const session = createSessionClient({ getCurrentUser: () => user, request: async () => Response.json({}, { status: fail ? 500 : 200 }) });
    await assert.rejects(session.sync(user), /Unable to update/);
    let signedOut = false;
    await assert.rejects(session.signOut(async () => { signedOut = true; }), /Unable to update/);
    assert.equal(signedOut, false);
    fail = false;
    assert.equal((await session.sync(user)).idToken, 'token');
    await session.signOut(async () => { signedOut = true; });
    assert.equal(signedOut, true);
});

async function observer() {
    const document = new EventTarget(); document.hidden = false;
    const window = new EventTarget();
    const timers = new Map();
    const states = [], requests = [];
    let listener, refreshes = 0, unsubscribed = false;
    const auth = { currentUser: null };
    const { observeAuthSession } = await load('lib/firebase/observe-auth-session.mjs', {}, {
        document, window,
        setInterval(fn) { timers.set(1, fn); return 1; },
        clearInterval(id) { timers.delete(id); },
    });
    const stop = observeAuthSession({
        auth,
        onIdTokenChanged(a, callback) { listener = callback; return () => { unsubscribed = true; }; },
        syncSession(user) { const pending = deferred(); requests.push({ user, ...pending }); return pending.promise; },
        onState: value => states.push(value), onRefresh: () => { refreshes++; },
    });
    return { auth, states, requests, document, window, timers, stop,
        change(user) { auth.currentUser = user; return listener(user); },
        get refreshes() { return refreshes; }, get unsubscribed() { return unsubscribed; },
    };
}

test('auth observer waits for server synchronization and replaces tokens even when the Firebase User object is unchanged', async () => {
    const o = await observer(); const user = { uid: 'a' };
    const first = o.change(user);
    assert.equal(o.states.at(-1).loading, true);
    assert.equal(o.states.at(-1).idToken, null);
    o.requests[0].resolve({ idToken: 'first', changed: false }); await first;
    assert.equal(o.states.at(-1).idToken, 'first');
    assert.equal(o.states.at(-1).loading, false);
    assert.equal(o.refreshes, 1);
    const next = o.change(user);
    o.requests[1].resolve({ idToken: 'refreshed', changed: false }); await next;
    assert.equal(o.states.at(-1).idToken, 'refreshed');
    assert.equal(o.refreshes, 1, 'token renewal alone should not reload dashboard data');
    o.stop();
});

test('auth observer ignores stale account results, clears state on logout and cannot update after cleanup', async () => {
    const o = await observer();
    const old = o.change({ uid: 'a' });
    const next = o.change({ uid: 'b' });
    o.requests[1].resolve({ idToken: 'b' }); await next;
    o.requests[0].resolve({ idToken: 'a' }); await old;
    assert.equal(o.states.at(-1).user.uid, 'b');
    const logout = o.change(null);
    assert.equal(o.states.at(-1).idToken, null);
    o.requests[2].resolve({ idToken: null, changed: true }); await logout;
    assert.equal(o.states.at(-1).user, null);
    const last = o.change({ uid: 'c' });
    o.stop(); const length = o.states.length;
    o.requests[3].resolve({ idToken: 'c' }); await last;
    assert.equal(o.states.length, length);
    assert.equal(o.unsubscribed, true);
    assert.equal(o.timers.size, 0);
    o.window.dispatchEvent(new Event('focus'));
    assert.equal(o.requests.length, 4);
});

test('auth observer recovers from synchronization failure on returning to the tab', async () => {
    const o = await observer();
    const pending = o.change({ uid: 'a' });
    o.requests[0].reject(new Error('offline')); await pending;
    assert.equal(o.states.at(-1).authError.message, 'offline');
    assert.equal(o.states.at(-1).idToken, null);
    o.document.hidden = true;
    o.window.dispatchEvent(new Event('focus'));
    assert.equal(o.requests.length, 1);
    o.document.hidden = false;
    o.document.dispatchEvent(new Event('visibilitychange'));
    o.requests[1].resolve({ idToken: 'renewed' }); await tick();
    assert.equal(o.states.at(-1).authError, null);
    assert.equal(o.states.at(-1).idToken, 'renewed');
    o.stop();
});

async function pageData(tenantId, fail = false) {
    const queries = [];
    const module = await load('lib/firebase/partner-page-data.js', {
        './tenant-auth': { getUserTenant: async () => { if (fail) throw new Error('offline'); return tenantId; } },
        './firestore/tenants': { getTenantServer: async id => { queries.push(['tenant', id]); return { name: 'Partner' }; } },
        './firestore/content': { getTenantContent: async id => { queries.push(['content', id]); return [{ type: 'blog', published_at: '2026-02-01' }, { type: 'video', published_at: '2026-01-01' }]; } },
        './firestore/users': { getAllUsersForTenant: async id => { queries.push(['users', id]); return [{ email: 'member@example.test' }]; } },
    });
    return { ...module, queries };
}

test('dashboard and user data handle tenant zero, missing assignments and signed-out requests explicitly', async () => {
    const user = { uid: 'u', email: 'u@example.test' };
    for (const id of [0, '0']) {
        const data = await pageData(id);
        assert.equal((await data.getPartnerDashboardData(user)).tenantId, '0');
        assert.equal((await data.getPartnerUsersData(user)).users.length, 1);
        assert.deepEqual(data.queries, [['users', id]]);
    }
    for (const id of [null, undefined, '']) {
        const data = await pageData(id);
        assert.equal((await data.getPartnerDashboardData(user)).status, 'unassigned');
        assert.equal((await data.getPartnerUsersData(user)).status, 'unassigned');
        assert.deepEqual(data.queries, []);
    }
    const data = await pageData(1);
    assert.equal((await data.getPartnerDashboardData(null)).status, 'signed-out');
    assert.equal((await data.getPartnerUsersData(null)).status, 'signed-out');
    assert.deepEqual(data.queries, []);
});

test('partner data stays scoped to the verified membership and errors cannot become an endless loading state', async () => {
    const user = { uid: 'u', email: 'u@example.test' };
    const data = await pageData(2);
    const dashboard = await data.getPartnerDashboardData(user);
    assert.equal(dashboard.userId, 'u');
    assert.equal(dashboard.tenantId, '2');
    assert.equal(JSON.parse(dashboard.tenantArticles).length, 1);
    assert.equal(JSON.parse(dashboard.tenantVideos).length, 1);
    assert.deepEqual(data.queries, [['tenant', 2], ['content', 2]]);
    const failed = await pageData(2, true);
    assert.equal((await failed.getPartnerDashboardData(user)).status, 'error');
    assert.equal((await failed.getPartnerUsersData(user)).status, 'error');
});

async function tracking({ post = { isActive: true, partners: [1] }, content = { type: 'blog', tenant: [1], views: 10 }, fail = false } = {}) {
    const reads = [], writes = [];
    let metadataReads = 0;
    const module = await load('lib/server-actions/record-article-view.js', {
        '@/lib/firebase/admin': { adminDb: {
            collection(name) { assert.equal(name, 'content'); return { doc(id) { return { id }; } }; },
            async runTransaction(callback) {
                if (fail) throw new Error('offline');
                return callback({
                    async get(reference) { reads.push(reference.id); return { exists: content !== null, data: () => content }; },
                    update(reference, value) { writes.push({ reference, value }); },
                });
            },
        } },
        'firebase-admin/firestore': { FieldValue: { increment: amount => ({ atomicIncrement: amount }) } },
        '@/lib/next-path': { async getSingleBlogPostMetadata() { metadataReads++; return post; } },
    });
    return { ...module, reads, writes, get metadataReads() { return metadataReads; } };
}

test('public tracking rejects invalid paths, drafts and nonpartner articles before database access', async () => {
    const t = await tracking();
    for (const id of ['', null, {}, '../users/admin', 'a/b', 'a'.repeat(129), 'A', '%2f']) assert.equal(await t.recordArticleView(id), false);
    assert.equal(t.metadataReads, 0);
    for (const post of [null, { isActive: false, partners: [1] }, { isActive: true }, { isActive: true, partners: [] }]) {
        const t = await tracking({ post });
        assert.equal(await t.recordArticleView('example-article'), false);
        assert.equal(t.reads.length, 0);
    }
});

test('tracking skips missing, video and unrelated-tenant records without creating content', async () => {
    for (const content of [null, { type: 'video', tenant: [1] }, { type: 'blog', tenant: [2] }, { type: 'blog' }]) {
        const t = await tracking({ content });
        assert.equal(await t.recordArticleView('example-article'), false);
        assert.equal(t.writes.length, 0);
    }
});

test('tracking changes only views by an atomic +1 and reports failed writes accurately', async () => {
    const t = await tracking({ content: { type: 'blog', tenant: ['1'] } });
    assert.equal(await t.recordArticleView('example-article', { amount: 999, fields: ['tenant'] }), true);
    assert.equal(t.writes.length, 1);
    assert.equal(t.writes[0].reference.id, 'example-article');
    assert.deepEqual(Object.keys(t.writes[0].value), ['views']);
    assert.equal(t.writes[0].value.views.atomicIncrement, 1);
    assert.equal(await (await tracking({ fail: true })).recordArticleView('example-article'), false);
});

test('view tracker counts one navigation despite an effect replay, and counts a later return as a new view', async () => {
    const sent = [];
    const ref = { current: null };
    let effect;
    const { PageViewTracker } = await load('components/seo/page-view-tracker.js', {
        react: { useRef: () => ref, useEffect: callback => { effect = callback; } },
        '@/lib/server-actions/record-article-view': { recordArticleView: async id => { sent.push(id); return true; } },
    });
    PageViewTracker({ contentId: 'article-a' }); effect(); effect();
    PageViewTracker({ contentId: 'article-b' }); effect();
    PageViewTracker({ contentId: 'article-a' }); effect();
    assert.deepEqual(sent, ['article-a', 'article-b', 'article-a']);
});
