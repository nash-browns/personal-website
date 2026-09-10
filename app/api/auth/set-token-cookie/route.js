import { NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebase/admin';
import { SESSION_COOKIE, LEGACY_TOKEN_COOKIE, SESSION_SECONDS } from '@/lib/firebase/session-constants.mjs';

const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    sameSite: 'lax',
};
const json = (body, status = 200) => NextResponse.json(body, {
    status, headers: { 'Cache-Control': 'private, no-store' },
});
function sameOrigin(request) {
    try {
        const value = request.headers.get('origin');
        const origin = new URL(value);
        const url = new URL(request.url);
        // Next normalizes loopback URLs to localhost and may construct its URL
        // using an internal hostname. Host retains the browser's destination.
        const host = request.headers.get('host') || url.host;
        return value === origin.origin && origin.host === host && origin.protocol === url.protocol;
    } catch {
        return false;
    }
}
function clearCookie(response, name) {
    response.cookies.set(name, '', { ...cookieOptions, maxAge: 0, expires: new Date(0) });
}

export async function POST(request) {
    if (!sameOrigin(request)) return json({ error: 'Invalid request origin' }, 403);
    if (!request.headers.get('content-type')?.startsWith('application/json')) {
        return json({ error: 'JSON body required' }, 415);
    }
    let idToken;
    try {
        ({ idToken } = await request.json());
    } catch {
        return json({ error: 'Invalid request body' }, 400);
    }
    if (typeof idToken !== 'string' || !idToken.trim() || idToken.length > 10000) {
        return json({ error: 'ID token required' }, 400);
    }

    try {
        const claims = await adminAuth.verifyIdToken(idToken, true);
        if (!claims.uid || !claims.email) return json({ error: 'Invalid account' }, 401);
        const existing = request.cookies.get(SESSION_COOKIE)?.value;
        if (existing) {
            try {
                const current = await adminAuth.verifySessionCookie(existing, true);
                if (current.uid === claims.uid && current.exp > Date.now() / 1000 + 300) {
                    const response = json({ success: true, changed: false });
                    clearCookie(response, LEGACY_TOKEN_COOKIE);
                    return response;
                }
            } catch {
                // Replace an expired or invalid session using the verified ID token.
            }
        }
        // The cookie and the credential it contains now have the same one-day lifetime.
        const session = await adminAuth.createSessionCookie(idToken, { expiresIn: SESSION_SECONDS * 1000 });
        const response = json({ success: true, changed: true });
        response.cookies.set(SESSION_COOKIE, session, { ...cookieOptions, maxAge: SESSION_SECONDS });
        clearCookie(response, LEGACY_TOKEN_COOKIE);
        return response;
    } catch {
        return json({ error: 'Unable to establish session. Please sign in again.' }, 401);
    }
}

export async function DELETE(request) {
    if (!sameOrigin(request)) return json({ error: 'Invalid request origin' }, 403);
    const changed = !!(request.cookies.get(SESSION_COOKIE) || request.cookies.get(LEGACY_TOKEN_COOKIE));
    const response = json({ success: true, changed });
    clearCookie(response, SESSION_COOKIE);
    clearCookie(response, LEGACY_TOKEN_COOKIE);
    return response;
}
