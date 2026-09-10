import { validateToken, validateTenantAccess } from '@/lib/firebase/tenant-auth';
import { adminDb } from '@/lib/firebase/admin';

export async function GET(request, { params }) {
    try {
        const { tenantId } = await params;

        // Get the authorization header
        const authHeader = request.headers.get('authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return Response.json({ error: 'No valid authorization header' }, { status: 401 });
        }

        const idToken = authHeader.split('Bearer ')[1];

        // Validate the token
        const userInfo = await validateToken(idToken);

        if (!tenantId) {
            return Response.json({ error: 'Tenant ID is required' }, { status: 400 });
        }

        // Validate tenant access
        const hasAccess = await validateTenantAccess(userInfo.email, tenantId);

        if (!hasAccess) {
            return Response.json({ error: 'Access denied to this tenant' }, { status: 403 });
        }

        // Get tenant data from Firestore for this tenant
        const tenantRef = adminDb.collection('tenants');
        const tenantDoc = await tenantRef.doc(tenantId).get();

        if (!tenantDoc.exists) {
            return Response.json({
                success: true,
                tenantId,
                user: userInfo.email,
                tenant: 'does not exist'
            });
        }

        const tenantData = {
            id: tenantDoc.id,
            ...tenantDoc.data()
        };

        return Response.json({
            success: true,
            tenantId,
            user: userInfo.email,
            tenant: tenantData
        });


    } catch (error) {
        console.error('Error fetching tenant data:', error);
        return Response.json(
            { error: 'Failed to fetch tenant data' },
            { status: 500 }
        );
    }
} 
