'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/firebase/auth-context';
import { signOutSession } from '@/lib/firebase/client-session';

export const SignOut = ({ className = 'text-2xl' }) => {
    const { user } = useAuth();
    const [pending, setPending] = useState(false);
    const [error, setError] = useState(null);
    const router = useRouter();

    const handleSignOut = async () => {
        setPending(true);
        setError(null);
        try {
            await signOutSession();
            router.replace('/');
            router.refresh();
        } catch {
            setError('Sign out failed. Please try again.');
            setPending(false);
        }
    };
    if (!user) return null;
    return (
        <>
            <button onClick={handleSignOut} disabled={pending} className={className}>
                {pending ? 'Signing Out…' : 'Sign Out'}
            </button>
            {error && <span role="alert" className="text-sm">{error}</span>}
        </>
    );
};
