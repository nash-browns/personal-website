'use client';

import { useAuth } from './auth-context';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

export function useProtectedRoute(redirectTo = '/partners') {
    const state = useAuth();
    const router = useRouter();
    useEffect(() => {
        if (state.initialized && !state.loading && !state.authError && !state.isAuthenticated) router.replace(redirectTo);
    }, [state.initialized, state.loading, state.authError, state.isAuthenticated, router, redirectTo]);
    return state;
}

export function useAuthCondition(condition) {
    const state = useAuth();
    return { ...state, shouldRender: state.isAuthenticated && condition(state.user) };
}

// Keep the existing hook interfaces, but only expose a real Firebase user.
export function useOptimisticAuth() {
    return { ...useAuth(), isOptimistic: false };
}
export function useAggressiveAuth() {
    const state = useAuth();
    return { ...state, isAssumed: false, hasError: !!state.authError };
}
export function useIdToken() {
    return useAuth().idToken;
}

const emptyValidation = { isValidated: false, serverUser: null, serverTenant: null, error: null };
export function useServerAuth() {
    const { user, idToken } = useAuth();
    const [validation, setValidation] = useState(null);
    const [attempt, setAttempt] = useState(0);
    const validateWithServer = useCallback(() => setAttempt(value => value + 1), []);
    const uid = user?.uid;

    useEffect(() => {
        if (!uid || !idToken) return;
        let active = true;
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 15000);
        async function validate() {
            try {
                const response = await fetch('/api/auth/validate', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ idToken }),
                    signal: controller.signal,
                });
                const data = await response.json();
                if (!response.ok) throw new Error(data.error || 'Unable to verify account access.');
                if (active) setValidation({ uid, idToken, attempt, isValidated: true, serverUser: data.user, serverTenant: data.tenant, error: null });
            } catch (error) {
                if (active) setValidation({ ...emptyValidation, uid, idToken, attempt, error: 'Unable to verify account access. Please try again.' });
            } finally {
                clearTimeout(timeout);
            }
        }
        validate();
        return () => { active = false; controller.abort(); clearTimeout(timeout); };
    }, [uid, idToken, attempt]);

    // A previous account or token's validation must never stand in for the current one.
    const current = validation?.uid === uid && validation?.idToken === idToken && validation?.attempt === attempt;
    const result = current ? validation : emptyValidation;
    return {
        ...result,
        isValidating: !!idToken && !current,
        hasValidTenant: result.isValidated && result.serverTenant !== null,
        validateWithServer,
    };
}

export function useAuthenticatedApi() {
    const { user, isAuthenticated } = useAuth();
    return useCallback(async (url, options = {}) => {
        if (!isAuthenticated || !user) throw new Error('Please sign in to continue.');
        // Obtain a fresh token at request time instead of closing over an expired one.
        const idToken = await user.getIdToken();
        const headers = new Headers(options.headers);
        headers.set('Content-Type', 'application/json');
        headers.set('Authorization', `Bearer ${idToken}`);
        const response = await fetch(url, { ...options, headers });
        if (!response.ok) {
            const data = await response.json().catch(() => ({}));
            throw new Error(data.error || `Request failed (${response.status})`);
        }
        return response.json();
    }, [user, isAuthenticated]);
}
