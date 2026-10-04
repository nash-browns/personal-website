'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export function AdminSignIn({ denied = false }) {
    const router = useRouter();
    const [busy, setBusy] = useState(false), [error, setError] = useState('');
    async function signIn() {
        setBusy(true); setError('');
        try {
            const [{ auth }, { GoogleAuthProvider, signInWithPopup }, { syncServerSession, signOutSession }] = await Promise.all([import('@/firebase'), import('firebase/auth'), import('@/lib/firebase/client-session')]);
            await signOutSession();
            const provider = new GoogleAuthProvider(); provider.setCustomParameters({ prompt: 'select_account' });
            const { user } = await signInWithPopup(auth, provider);
            const { isOwner } = await import('@/lib/photography/model.mjs');
            if (!isOwner(user)) { await signOutSession(); throw new Error('This account does not have admin access.'); }
            await syncServerSession(user);
            router.refresh();
        } catch (error) { setError(error.code === 'auth/popup-closed-by-user' ? 'Sign-in cancelled.' : error.message || 'Could not sign in.'); }
        finally { setBusy(false); }
    }
    return <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-[#080808] px-6 text-center text-white">
        <p className="text-xs uppercase tracking-[.2em] text-stone-400">Nash Browns / Photography</p>
        <h1 className="text-3xl font-medium">Photography admin</h1>
        <p className="max-w-sm text-sm text-stone-400">{denied ? 'This account does not have access. Sign in with the owner account.' : 'Sign in with your owner account to manage photographs and collections.'}</p>
        <button onClick={signIn} disabled={busy} className="min-h-12 rounded bg-white px-6 text-sm text-black disabled:opacity-50">{busy ? 'Signing in…' : 'Sign in with Google'}</button>
        {error && <p role="alert" className="max-w-md text-sm text-red-300">{error}</p>}
        <Link href="/photography" className="text-sm text-stone-400 underline underline-offset-4">Back to photography</Link>
    </main>;
}
