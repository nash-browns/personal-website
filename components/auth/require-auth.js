'use client';

import { useAuth } from '@/lib/firebase/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { SimpleSpinner } from '@/components/loading';
import { VerifyEmail } from './verify-email';

export function RequireAuth({ children }) {
    const { user, initialized, loading, isAuthenticated, authError } = useAuth();
    const router = useRouter();
    useEffect(() => {
        if (initialized && !loading && !authError && !isAuthenticated && !user) router.replace('/partners');
    }, [user, initialized, loading, authError, isAuthenticated, router]);

    if (user && !user.emailVerified) return <VerifyEmail user={user}/>;

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
