'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { observeAuthSession } from './observe-auth-session.mjs';

const AuthContext = createContext();
const initialState = { user: null, idToken: null, loading: true, initialized: false, authError: null };

export function AuthProvider({ children }) {
    const [state, setState] = useState(initialState);
    const router = useRouter();

    useEffect(() => {
        let disposed = false;
        let unsubscribe;
        // Firebase already persists real users. The old plain-object cache was not
        // proof of authentication and did not have getIdToken() or other User methods.
        try { localStorage.removeItem('firebase:authUser'); } catch {}
        Promise.all([
            import('firebase/auth'), import('@/firebase'), import('./client-session'),
        ]).then(([{ onIdTokenChanged }, { auth }, { syncServerSession }]) => {
            if (disposed) return;
            unsubscribe = observeAuthSession({
                auth, onIdTokenChanged, syncSession: syncServerSession,
                onState: setState, onRefresh: () => router.refresh(),
            });
        }).catch(authError => {
            if (!disposed) setState({ ...initialState, loading: false, initialized: true, authError });
        });
        return () => {
            disposed = true;
            unsubscribe?.();
        };
    }, [router]);

    return (
        <AuthContext.Provider value={{
            ...state,
            isInitializing: !state.initialized && state.loading,
            isAuthenticating: state.initialized && state.loading,
            isAuthenticated: !!state.user && !!state.idToken && !state.authError && !state.loading,
        }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) throw new Error('useAuth must be used within an AuthProvider');
    return context;
}
