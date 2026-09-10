// Serialize cookie writes so an older sign-in request cannot finish after logout
// and restore its cookie. Failed requests must not block the next attempt.
export function createSessionClient({ getCurrentUser, request = fetch }) {
    let queue = Promise.resolve();
    function sync(user) {
        const operation = queue.catch(() => {}).then(async () => {
            if (user && getCurrentUser() !== user) return { skipped: true };
            const idToken = user ? await user.getIdToken() : null;
            if (user && getCurrentUser() !== user) return { skipped: true };
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 15000);
            try {
                const response = await request('/api/auth/set-token-cookie', {
                    method: user ? 'POST' : 'DELETE',
                    credentials: 'same-origin',
                    headers: { 'Content-Type': 'application/json' },
                    ...(user ? { body: JSON.stringify({ idToken }) } : {}),
                    signal: controller.signal,
                });
                if (!response.ok) throw new Error('Unable to update your login session. Please try again.');
                return { ...await response.json(), idToken };
            } finally {
                clearTimeout(timeout);
            }
        });
        queue = operation;
        return operation;
    }
    async function signOut(signOutFirebase) {
        // Keep the user signed in if the server could not clear its cookie.
        await sync(null);
        await signOutFirebase();
        // Finish after any observer/refresh work already queued during sign-out.
        await sync(null);
    }
    return { sync, signOut };
}
