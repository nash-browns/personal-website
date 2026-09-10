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

        // Get users data from Firestore for this tenant
        const usersRef = adminDb.collection('users');
        const usersQuery = await usersRef
            .where('tenant', '==', parseInt(tenantId))
            .get();

        if (usersQuery.empty) {
            return Response.json({
                success: true,
                tenantId,
                user: userInfo.email,
                users: [],
                totalUsers: 0
            });
        }

        const users = usersQuery.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        return Response.json({
            success: true,
            tenantId,
            user: userInfo.email,
            users,
            totalUsers: users.length
        });


    } catch (error) {
        console.error('Error fetching tenant users:', error);
        return Response.json(
            { error: 'Failed to fetch tenant users' },
            { status: 500 }
        );
    }
} 
