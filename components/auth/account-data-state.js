'use client';

import { useAuth } from '@/lib/firebase/auth-context';
import { NoTenantAccess } from './no-tenant-access';

// Prevent a cached server response for another identity from appearing during
// account changes, and give unavailable/unassigned accounts a usable next step.
export function AccountDataState({ data, children }) {
    const { user } = useAuth();
    if (data.userId !== user?.uid || data.status === 'signed-out' || data.status === 'error') {
        return (
            <div className="p-8 text-center" role="status">
                <p>Your account data isn&apos;t available yet. Please reload to try again.</p>
                <button className="btn mt-4" onClick={() => window.location.reload()}>Reload</button>
            </div>
        );
    }
    if (data.status === 'unassigned') return <NoTenantAccess/>;
    return children;
}
