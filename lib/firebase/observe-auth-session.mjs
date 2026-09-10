export function observeAuthSession({ auth, onIdTokenChanged, syncSession, onState, onRefresh }) {
    let disposed = false;
    let revision = 0;
    let settledUid;

    async function changed(user) {
        const currentRevision = ++revision;
        const isCurrent = () => !disposed && currentRevision === revision && auth.currentUser === user;
        if (!isCurrent()) return;
        // Hide data from the previous account while a new identity is being confirmed.
        if (settledUid !== (user?.uid ?? null)) {
            onState({ user, idToken: null, loading: true, initialized: false, authError: null });
        }
        try {
            const result = await syncSession(user);
            if (!isCurrent() || result.skipped) return;
            const uid = user?.uid ?? null;
            const refresh = result.changed || (settledUid === undefined ? !!uid : settledUid !== uid);
            settledUid = uid;
            onState({ user, idToken: result.idToken, loading: false, initialized: true, authError: null });
            if (refresh) onRefresh();
        } catch (authError) {
            if (!isCurrent()) return;
            onState({ user, idToken: null, loading: false, initialized: true, authError });
        }
    }

    const unsubscribe = onIdTokenChanged(auth, changed);
    const refresh = () => {
        if (!document.hidden) changed(auth.currentUser);
    };
    // getIdToken() inside syncSession refreshes expiring ID tokens for client API calls.
    const timer = setInterval(() => { if (auth.currentUser) refresh(); }, 5 * 60 * 1000);
    document.addEventListener('visibilitychange', refresh);
    window.addEventListener('focus', refresh);
    window.addEventListener('online', refresh);
    return () => {
        disposed = true;
        revision++;
        unsubscribe();
        clearInterval(timer);
        document.removeEventListener('visibilitychange', refresh);
        window.removeEventListener('focus', refresh);
        window.removeEventListener('online', refresh);
    };
}
