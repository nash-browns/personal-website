'use client';

import { useAuth } from '@/lib/firebase/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { SimpleSpinner } from '@/components/loading';

export function RequireAuth({ children }) {
    const { initialized, loading, isAuthenticated, authError } = useAuth();
    const router = useRouter();
    useEffect(() => {
        if (initialized && !loading && !authError && !isAuthenticated) router.replace('/partners');
    }, [initialized, loading, authError, isAuthenticated, router]);

    if (authError) {
        return (
            <div className="p-8 text-center" role="alert">
                <p>We couldn&apos;t confirm your login session. Please try again.</p>
                <button className="btn mt-4" onClick={() => window.location.reload()}>Try Again</button>
            </div>
        );
    }
    if (loading || !isAuthenticated) return <SimpleSpinner/>;
    return children;
}

export function withAuth(WrappedComponent) {
    function AuthenticatedComponent(props) {
        return <RequireAuth><WrappedComponent {...props}/></RequireAuth>;
    }
    AuthenticatedComponent.displayName = `withAuth(${WrappedComponent.displayName || WrappedComponent.name || 'Component'})`;
    return AuthenticatedComponent;
}
