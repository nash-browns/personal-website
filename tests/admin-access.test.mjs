import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { createContext, SourceTextModule, SyntheticModule } from 'node:vm';

// Run the real route and tenant-auth code, substituting only Firebase's network boundary.
async function loadRoute(collection, {
    profile = { tenant: 2 },
    email = 'member@example.test',
    tokenError = false,
    profileError = false,
    queryError = false,
    rows = [{ id: 'example', name: 'Example' }],
} = {}) {
    const calls = { token: [], profile: [], queries: [] };
    const adminAuth = {
        async verifyIdToken(token) {
            calls.token.push(token);
            if (tokenError || token !== 'valid-token') throw new Error('Invalid token');
            return { uid: 'test-user', email, email_verified: true };
        },
    };
    const adminDb = {
        collection(name) {
            return {
                doc(id) {
                    return {
                        async get() {
                            calls.profile.push({ collection: name, id });
                            if (profileError) throw new Error('Database unavailable');
                            return { exists: profile !== null, data: () => profile };
                        },
                    };
                },
                async get() {
                    calls.queries.push(name);
                    if (queryError) throw new Error('Database unavailable');
                    return {
                        empty: rows.length === 0,
                        docs: rows.map(({ id, ...data }) => ({ id, data: () => data })),
                    };
                },
            };
        },
    };
    const context = createContext({ Response, console: { error() {} } });
    const firebase = new SyntheticModule(['adminAuth', 'adminDb'], function () {
        this.setExport('adminAuth', adminAuth);
        this.setExport('adminDb', adminDb);
    }, { context });
    const unusedFirestoreImport = new SyntheticModule(['getFirestore'], function () {
        this.setExport('getFirestore', () => { throw new Error('Unexpected Firebase access'); });
    }, { context });
    const auth = new SourceTextModule(await readFile(new URL('../lib/firebase/tenant-auth.js', import.meta.url), 'utf8'), { context });
    const route = new SourceTextModule(await readFile(new URL(`../app/api/admin/[tenantId]/all-${collection}/route.js`, import.meta.url), 'utf8'), { context });
    await auth.link((specifier) => {
        if (specifier === './admin') return firebase;
        if (specifier === 'firebase-admin/firestore') return unusedFirestoreImport;
        throw new Error(`Unexpected import: ${specifier}`);
    });
    await route.link((specifier) => {
        if (specifier === '@/lib/firebase/tenant-auth') return auth;
        if (specifier === '@/lib/firebase/admin') return firebase;
        throw new Error(`Unexpected import: ${specifier}`);
    });
    await route.evaluate();
    return {
        calls,
        async request({ authorization = 'Bearer valid-token', tenantId = '0' } = {}) {
            const headers = authorization === null ? {} : { authorization };
            return route.namespace.GET(new Request('http://localhost/api/admin/0', { headers }), { params: Promise.resolve({ tenantId }) });
        },
        dynamic: route.namespace.dynamic,
    };
}

for (const collection of ['users', 'tenants']) {
    test(`${collection}: missing, malformed, empty, and invalid credentials are rejected before database access`, async () => {
        for (const authorization of [null, 'Basic abc', 'Bearer ', 'Bearer invalid-token']) {
            const route = await loadRoute(collection);
            assert.equal((await route.request({ authorization })).status, 401);
            assert.deepEqual(route.calls.profile, []);
            assert.deepEqual(route.calls.queries, []);
        }
        const expired = await loadRoute(collection, { tokenError: true });
        assert.equal((await expired.request()).status, 401);
        assert.deepEqual(expired.calls.queries, []);
    });

    test(`${collection}: changing the URL to tenant 0 cannot grant a member admin access`, async () => {
        const route = await loadRoute(collection);
        assert.equal((await route.request()).status, 403);
        assert.deepEqual(route.calls.profile, [{ collection: 'users', id: 'member@example.test' }]);
        assert.deepEqual(route.calls.queries, []);
    });

    test(`${collection}: missing profiles, unassigned users, and missing email cannot read admin data`, async () => {
        for (const profile of [null, {}, { tenant: null }, { tenant: '' }]) {
            const route = await loadRoute(collection, { profile });
            assert.equal((await route.request()).status, 403);
            assert.deepEqual(route.calls.queries, []);
        }
        const noEmail = await loadRoute(collection, { email: null, profile: { tenant: 0 } });
        assert.equal((await noEmail.request()).status, 403);
        assert.deepEqual(noEmail.calls.profile, []);
        assert.deepEqual(noEmail.calls.queries, []);
    });

    test(`${collection}: admins must use the canonical admin path`, async () => {
        for (const tenantId of ['1', '00', '0.0', ' 0']) {
            const route = await loadRoute(collection, { profile: { tenant: 0 } });
            assert.equal((await route.request({ tenantId })).status, 403);
            assert.deepEqual(route.calls.queries, []);
        }
    });

    test(`${collection}: numeric and string admin membership allow uncached access`, async () => {
        for (const tenant of [0, '0']) {
            const route = await loadRoute(collection, { profile: { tenant } });
            const response = await route.request();
            assert.equal(response.status, 200);
            assert.equal(response.headers.get('Cache-Control'), 'private, no-store');
            assert.equal(route.dynamic, 'force-dynamic');
            assert.deepEqual(route.calls.queries, [collection]);
            const body = await response.json();
            assert.equal(body.success, true);
            assert.equal(body[collection].length, 1);
            assert.equal(body[collection === 'users' ? 'totalUsers' : 'totalTenants'], 1);
        }
    });

    test(`${collection}: empty admin results preserve the response shape`, async () => {
        const route = await loadRoute(collection, { profile: { tenant: 0 }, rows: [] });
        const response = await route.request();
        const body = await response.json();
        assert.equal(response.status, 200);
        assert.equal(response.headers.get('Cache-Control'), 'private, no-store');
        assert.deepEqual(body[collection], []);
        assert.equal(body[collection === 'users' ? 'totalUsers' : 'totalTenants'], 0);
    });

    test(`${collection}: database failures fail closed`, async () => {
        const route = await loadRoute(collection, { profileError: true });
        assert.equal((await route.request()).status, 403);
        assert.deepEqual(route.calls.queries, []);
        const failedQuery = await loadRoute(collection, { profile: { tenant: 0 }, queryError: true });
        assert.equal((await failedQuery.request()).status, 500);
    });
}
