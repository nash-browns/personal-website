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
    
    // Get content data from Firestore for this tenant
    const contentRef = adminDb.collection('content');
    const contentQuery = await contentRef
      .where('tenant', 'array-contains', parseInt(tenantId))
      .get();
    
    if (contentQuery.empty) {
      return Response.json({
        success: true,
        tenantId,
        user: userInfo.email,
        content: [],
        totalContent: 0
      });
    }
    
    const contentData = contentQuery.docs.map(doc => {
      const data = doc.data();
      console.log('Document found:', doc.id, 'title:', data.title, 'format:', data.format, 'tenant:', data.tenant);
      return {
        id: doc.id,
        comments: data.comments,
        creation_date: data.creation_date?.toDate?.() || data.creation_date,
        format: data.format,
        last_updated: data.last_updated?.toDate?.() || data.last_updated,
        likes: data.likes,
        platform: data.platform,
        platform_id: data.platform_id,
        published_at: data.published_at,
        sponsored: data.sponsored,
        tenant: data.tenant,
        title: data.title,
        type: data.type,
        views: data.views
      };
    });
    
    console.log('Total documents returned:', contentData.length);
    console.log('Documents by format:', contentData.reduce((acc, doc) => {
      acc[doc.format] = (acc[doc.format] || 0) + 1;
      return acc;
    }, {}));
    
    return Response.json({
      success: true,
      tenantId,
      user: userInfo.email,
      content: contentData,
      totalContent: contentData.length
    });
    
  } catch (error) {
    console.error('Error fetching content data:', error);
    return Response.json({
      error: 'Failed to fetch content data'
    }, { status: 500 });
  }
} 

