'use client';

import Link from 'next/link';
import { useAuth } from '@/lib/firebase/auth-context';
import { SignOut } from '@/components/general/sign-out';

export function PartnerAccountLinks({ mobile = false }) {
    const { user } = useAuth();

    if (!user) {
        return <li><Link href="/partners" prefetch={false}>Partners</Link></li>;
    }

    return (
        <>
            <li><Link href="/partners/dashboard">Dashboard</Link></li>
            <li><SignOut className={mobile ? 'text-base' : 'text-2xl'}/></li>
        </>
    );
}
