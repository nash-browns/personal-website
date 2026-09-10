import { validateToken, validateTenantAccess } from '@/lib/firebase/tenant-auth';
import { adminAuth, adminDb } from '@/lib/firebase/admin';

export async function DELETE(request, { params }) {
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
    
    // Get the user ID from the request body
    const { userId } = await request.json();
    
    if (!userId) {
      return Response.json({ error: 'User ID is required' }, { status: 400 });
    }
    
    // Verify the user belongs to the specified tenant
    const userDocRef = adminDb.collection('users').doc(userId);
    const userDoc = await userDocRef.get();
    
    if (!userDoc.exists) {
      return Response.json({ error: 'User not found' }, { status: 404 });
    }
    
    const userData = userDoc.data();
    
    // Check if the user belongs to the specified tenant
    if (userData.tenant !== parseInt(tenantId)) {
      return Response.json({ error: 'User does not belong to this tenant' }, { status: 403 });
    }
    
    // Prevent deleting yourself
    if (userData.email === userInfo.email) {
      return Response.json({ error: 'Cannot delete your own account' }, { status: 400 });
    }
    
    // Delete the user from Firestore
    await userDocRef.delete();
    
    // Optionally, delete the user from Firebase Auth as well
    try {
      // First, get the Firebase Auth UID for this user
      const userRecord = await adminAuth.getUserByEmail(userData.email);
      if (userRecord) {
        await adminAuth.deleteUser(userRecord.uid);
      }
    } catch (authError) {
      console.warn('Could not delete user from Firebase Auth:', authError);
      // Continue even if Firebase Auth deletion fails
    }
    
    return Response.json({
      success: true,
      message: 'User deleted successfully',
      deletedUserId: userId,
      deletedUserEmail: userData.email,
      tenantId,
      deletedBy: userInfo.email
    });
    
  } catch (error) {
    console.error('Error deleting user:', error);
    return Response.json(
      { error: 'Failed to delete user' },
      { status: 500 }
    );
  }
} 

