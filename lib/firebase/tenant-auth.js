import { adminAuth, adminDb } from './admin';
import { getFirestore } from 'firebase-admin/firestore';

/**
 * Validates Firebase ID token and returns user info
 * @param {string} idToken - Firebase ID token from client
 * @returns {Promise<Object>} User info with uid and email
 */
export async function validateToken(idToken) {
  try {
    const decodedToken = await adminAuth.verifyIdToken(idToken, true);
    return {
      uid: decodedToken.uid,
      email: decodedToken.email,
      emailVerified: decodedToken.email_verified,
    };
  } catch (error) {
    console.error('Token validation error:', error);
    throw new Error('Invalid or expired token');
  }
}

/**
 * Gets user's tenant information from Firestore
 * @param {string} email - User's email address
 * @returns {Promise<Object|null>} Tenant information or null
 */
export async function getUserTenant(email) {
  try {
    const userDocRef = adminDb.collection('users').doc(email);
    const userDoc = await userDocRef.get();
    
    if (!userDoc.exists) {
      return null;
    }
    
    const userData = userDoc.data();
    return userData.tenant !== undefined && userData.tenant !== null ? userData.tenant : null;
  } catch (error) {
    console.error('Error getting user tenant:', error);
    throw new Error('Failed to get user tenant information');
  }
}

/**
 * Gets tenant information by tenant ID
 * @param {number} tenantId - Tenant ID number
 * @returns {Promise<Object|null>} Tenant information or null
 */
export async function getTenantInfo(tenantId) {
  try {
    const tenantDocRef = adminDb.collection('tenants').doc(String(tenantId));
    const tenantDoc = await tenantDocRef.get();
    
    if (!tenantDoc.exists) {
      return null;
    }
    
    const tenantData = tenantDoc.data();
    
    return {
      ...tenantData,
      id: String(tenantId), // The document path is authoritative.
      name: tenantData.display_name || tenantData.name, // Handle both field names
      status: tenantData.status || 'active',
      tenant: tenantData.tenant, // Include the tenant field
    };
  } catch (error) {
    console.error('Error getting tenant info:', error);
    throw new Error('Failed to get tenant information');
  }
}

/**
 * Validates that user has access to a specific tenant
 * @param {string} userEmail - User's email address
 * @param {string} requestedTenantId - Tenant ID being accessed
 * @returns {Promise<boolean>} Whether user has access to tenant
 */
export async function validateTenantAccess(userEmail, requestedTenantId) {
  try {
    const userTenant = await getUserTenant(userEmail);
    
    if (userTenant === null || userTenant === undefined) {
      return false;
    }
    
    // Convert both to strings for comparison to handle number/string mismatches
    const userTenantStr = String(userTenant);
    const requestedTenantStr = String(requestedTenantId);
    
    // For now, simple string comparison
    // You can extend this for more complex tenant hierarchies
    return userTenantStr === requestedTenantStr;
  } catch (error) {
    console.error('Error validating tenant access:', error);
    return false;
  }
}

/**
 * Middleware function for API routes that require tenant authentication
 * @param {Function} handler - API route handler
 * @returns {Function} Wrapped handler with tenant validation
 */
export function withTenantAuth(handler) {
  return async (req, res) => {
    try {
      // Get the authorization header
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'No valid authorization header' });
      }

      const idToken = authHeader.split('Bearer ')[1];
      
      // Validate the token
      const userInfo = await validateToken(idToken);
      
      // Get tenant ID from request (could be in URL params, body, or headers)
      const tenantId = req.query.tenantId || req.body.tenantId || req.headers['x-tenant-id'];
      
      if (!tenantId) {
        return res.status(400).json({ error: 'Tenant ID is required' });
      }
      
      // Validate tenant access
      const hasAccess = await validateTenantAccess(userInfo.email, tenantId);
      
      if (!hasAccess) {
        return res.status(403).json({ error: 'Access denied to this tenant' });
      }
      
      // Add user and tenant info to request
      req.user = userInfo;
      req.tenantId = tenantId;
      
      // Call the original handler
      return handler(req, res);
      
    } catch (error) {
      console.error('Tenant auth error:', error);
      return res.status(401).json({ error: 'Authentication failed' });
    }
  };
} 