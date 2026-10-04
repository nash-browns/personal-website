'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { sendEmailVerification } from 'firebase/auth';
import { auth } from '@/firebase';
import { syncServerSession, signOutSession } from '@/lib/firebase/client-session';

export function VerifyEmail({ user, sent = false }) {
    const router = useRouter();
    const [busy, setBusy] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');

    async function perform(action) {
        setBusy(true);
        setError('');
        setMessage('');
        try { await action(); }
        catch (err) { setError(err.message || 'Please try again.'); }
        finally { setBusy(false); }
    }

    async function continueAfterVerification() {
        await user.reload();
        if (auth.currentUser !== user) throw new Error('Your sign-in changed. Please sign in again.');
        if (!user.emailVerified) throw new Error('Open the verification link in your email, then try again.');
        await user.getIdToken(true);
        const session = await syncServerSession(user);
        if (session.skipped) throw new Error('Your sign-in changed. Please sign in again.');
        router.replace('/partners/dashboard');
        router.refresh();
    }

    return (
        <div className="mx-auto max-w-lg p-8 text-center">
            <h1 className="text-2xl font-didot">Verify your email</h1>
            <p className="mt-4">Confirm that you own {user.email} before accessing your partner account.</p>
            <div className="mt-6 flex flex-col gap-3">
                <button className="btn" disabled={busy} onClick={() => perform(async () => {
                    await sendEmailVerification(user, { url: `${window.location.origin}/partners` });
                    setMessage('Verification email sent. Check your inbox and spam folder.');
                })}>{sent ? 'Resend verification email' : 'Send verification email'}</button>
                <button className="btn btn-primary" disabled={busy} onClick={() => perform(continueAfterVerification)}>
                    I&apos;ve verified my email
                </button>
                <button className="btn btn-ghost" disabled={busy} onClick={() => perform(async () => {
                    await signOutSession();
                    router.replace('/partners');
                    router.refresh();
                })}>Sign out</button>
            </div>
            {(message || (sent && !error)) && <p className="mt-4" role="status">{message || 'Verification email sent. Check your inbox and spam folder.'}</p>}
            {error && <p className="mt-4 text-error" role="alert">{error}</p>}
        </div>
    );
}
