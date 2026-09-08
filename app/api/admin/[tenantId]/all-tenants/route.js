import { validateToken, validateTenantAccess } from '@/lib/firebase/tenant-auth';
import { adminDb } from '@/lib/firebase/admin';

export const dynamic = 'force-dynamic';

export async function GET(request, { params }) {
    try {
        const { tenantId } = params;

        // Get the authorization header
        const authHeader = request.headers.get('authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return Response.json({ error: 'No valid authorization header' }, { status: 401 });
        }

        const idToken = authHeader.slice('Bearer '.length).trim();

        let userInfo;
        try {
            userInfo = await validateToken(idToken);
        } catch {
            return Response.json({ error: 'Invalid or expired token' }, { status: 401 });
        }

        if (!tenantId) {
            return Response.json({ error: 'Tenant ID is required' }, { status: 400 });
        }

        // The URL does not grant admin access; the caller must belong to tenant 0.
        if (tenantId !== '0' || !userInfo.email ||
            !await validateTenantAccess(userInfo.email, '0')) {
            return Response.json({ error: 'Administrator access required' }, { status: 403 });
        }

        // Get all tenants data from Firestore
        const tenantRef = adminDb.collection('tenants');
        const tenantQuery = await tenantRef.get();

        if (tenantQuery.empty) {
            return Response.json({
                success: true,
                tenantId,
                user: userInfo.email,
                tenants: [],
                totalTenants: 0
            }, { headers: { 'Cache-Control': 'private, no-store' } });
        }

        const tenants = tenantQuery.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        return Response.json({
            success: true,
            tenantId,
            user: userInfo.email,
            tenants,
            totalTenants: tenants.length
        }, { headers: { 'Cache-Control': 'private, no-store' } });

    } catch (error) {
        console.error('Error fetching all tenants:', error);
        return Response.json(
            { error: 'Failed to fetch all tenant' },
            { status: 500 }
        );
    }
} 


