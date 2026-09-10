import { adminAuth } from './admin';
import { SESSION_COOKIE, LEGACY_TOKEN_COOKIE } from './session-constants.mjs';

export async function readServerUser(cookieStore) {
    const session = cookieStore.get(SESSION_COOKIE)?.value;
    const legacyToken = cookieStore.get(LEGACY_TOKEN_COOKIE)?.value;
    if (!session && !legacyToken) return null;
    try {
        // Support an existing, still-valid login during the cookie migration.
        const claims = session
            ? await adminAuth.verifySessionCookie(session, true)
            : await adminAuth.verifyIdToken(legacyToken, true);
        if (!claims.uid || !claims.email) return null;
        return { uid: claims.uid, email: claims.email, emailVerified: claims.email_verified };
    } catch {
        return null;
    }
}
