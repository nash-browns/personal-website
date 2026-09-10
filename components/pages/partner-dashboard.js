'use client';

import { AdminDashboard } from '@/components/general/admin-dashboard';
import { ClientDashboard } from '@/components/general/client-dashboard';
import { RequireAuth } from '@/components/auth/require-auth';
import { AccountDataState } from '@/components/auth/account-data-state';

export function PartnerDashboard({ data }) {
    return (
        <RequireAuth>
            <AccountDataState data={data}>
                <div className="min-h-screen">
                    {data.tenantId === '0' ? <AdminDashboard/> : <ClientDashboard {...data}/>}
                </div>
            </AccountDataState>
        </RequireAuth>
    );
}
