import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { before, after, test } from 'node:test';
import { SourceTextModule, SyntheticModule } from 'node:vm';
import { initializeApp, deleteApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { NextRequest, NextResponse } from 'next/server.js';
import * as constants from '../lib/firebase/session-constants.mjs';
import { getSingleBlogPostMetadata } from '../lib/next-path.js';

const projectId = 'demo-nashbrowns-security';
const origin = 'https://partners.example.test';
let app, adminAuth, adminDb, route, readServerUser, recordArticleView;

// Run the application modules with the real Firebase Admin SDK connected only
// to emulators. Resolve Next's aliases without launching a production server.
async function load(file, dependencies) {
    // Keep the host realm: Firestore checks transaction callback results with
    // instanceof Promise, which intentionally excludes VM-context Promises.
    const module = new SourceTextModule(await readFile(new URL(`../${file}`, import.meta.url), 'utf8'));
    await module.link(specifier => {
        assert.ok(specifier in dependencies, `Unexpected dependency: ${specifier}`);
        const exports = dependencies[specifier];
        return new SyntheticModule(Object.keys(exports), function () {
            for (const [key, value] of Object.entries(exports)) this.setExport(key, value);
        });
    });
    await module.evaluate();
    return module.namespace;
}

function request(idToken, cookie, method = 'POST') {
    return new NextRequest(`${origin}/api/auth/set-token-cookie`, {
        method,
        headers: { Origin: origin, 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}) },
        ...(method === 'POST' ? { body: JSON.stringify({ idToken }) } : {}),
    });
}

before(async () => {
    // Never use ambient credentials or live Firebase services for these tests.
    assert.equal(process.env.GCLOUD_PROJECT, projectId);
    assert.equal(process.env.FIREBASE_AUTH_EMULATOR_HOST, '127.0.0.1:9099');
    assert.equal(process.env.FIRESTORE_EMULATOR_HOST, '127.0.0.1:8080');
    app = initializeApp({ projectId }, 'partner-correctness-emulator');
    adminAuth = getAuth(app);
    adminDb = getFirestore(app);
    route = await load('app/api/auth/set-token-cookie/route.js', {
        'next/server': { NextResponse }, '@/lib/firebase/admin': { adminAuth },
        '@/lib/firebase/session-constants.mjs': constants,
    });
    ({ readServerUser } = await load('lib/firebase/server-session.js', {
        './admin': { adminAuth }, './session-constants.mjs': constants,
    }));
    ({ recordArticleView } = await load('lib/server-actions/record-article-view.js', {
        '@/lib/firebase/admin': { adminDb }, 'firebase-admin/firestore': { FieldValue },
        '@/lib/next-path': { getSingleBlogPostMetadata },
    }));
});

after(async () => { if (app) await deleteApp(app); });

test('real Firebase sessions support sign-in, reuse, logout and revocation', async () => {
    const signup = await fetch('http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signUp?key=emulator-only', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: `session-${Date.now()}@example.test`, password: 'local-emulator-password', returnSecureToken: true }),
    });
    assert.equal(signup.status, 200);
    const { idToken, localId, email } = await signup.json();
    const response = await route.POST(request(idToken));
    assert.equal(response.status, 200);
    const cookie = response.cookies.get(constants.SESSION_COOKIE);
    assert.equal(cookie.maxAge, constants.SESSION_SECONDS);
    assert.equal(cookie.httpOnly, true);
    assert.equal(cookie.secure, process.env.NODE_ENV === 'production');
    const claims = await adminAuth.verifySessionCookie(cookie.value, true);
    assert.equal(claims.uid, localId);
    assert.equal(claims.exp - claims.iat, constants.SESSION_SECONDS);
    const cookieHeader = `${constants.SESSION_COOKIE}=${cookie.value}`;
    const serverUser = await readServerUser(request(undefined, cookieHeader).cookies);
    assert.equal(serverUser.uid, localId);
    assert.equal(serverUser.email, email);

    const reused = await route.POST(request(idToken, cookieHeader));
    assert.equal(reused.status, 200);
    assert.equal((await reused.json()).changed, false);
    const logout = await route.DELETE(request(undefined, `${cookieHeader}; idToken=${idToken}`, 'DELETE'));
    assert.equal(logout.cookies.get(constants.SESSION_COOKIE).maxAge, 0);
    assert.equal(logout.cookies.get(constants.LEGACY_TOKEN_COOKIE).maxAge, 0);
    assert.equal(await readServerUser(request(undefined, undefined, 'DELETE').cookies), null);

    // Firebase revocation compares whole seconds with the original auth time.
    await new Promise(resolve => setTimeout(resolve, Math.max(0, (claims.auth_time + 1) * 1000 - Date.now() + 50)));
    await adminAuth.revokeRefreshTokens(localId);
    const revoked = await route.POST(request(idToken));
    assert.equal(revoked.status, 401);
    assert.equal(revoked.cookies.get(constants.SESSION_COOKIE), undefined);
    assert.equal(await readServerUser(request(undefined, cookieHeader).cookies), null);
});

test('concurrent partner views increment atomically and preserve other content fields', async () => {
    const slug = 'tune-cold-weather-performance';
    const reference = adminDb.collection('content').doc(slug);
    const fixture = { type: 'blog', tenant: [1], views: 10, title: 'Preserved title', likes: 7 };
    await reference.set(fixture);
    const results = await Promise.all(Array.from({ length: 5 }, () => recordArticleView(slug)));
    assert.deepEqual(results, [true, true, true, true, true]);
    assert.deepEqual((await reference.get()).data(), { ...fixture, views: 15 });
});

test('tracking cannot create documents or increment an unrelated tenant or non-partner article', async () => {
    const reference = adminDb.collection('content').doc('tune-cold-weather-performance');
    await reference.delete();
    assert.equal(await recordArticleView(reference.id), false);
    assert.equal((await reference.get()).exists, false);
    await reference.set({ type: 'blog', tenant: [2], views: 12 });
    assert.equal(await recordArticleView(reference.id), false);
    assert.equal((await reference.get()).data().views, 12);
    const nonPartner = adminDb.collection('content').doc('mchugh-peak');
    await nonPartner.set({ type: 'blog', tenant: [1], views: 9 });
    assert.equal(await recordArticleView(nonPartner.id), false);
    assert.equal((await nonPartner.get()).data().views, 9);
});
