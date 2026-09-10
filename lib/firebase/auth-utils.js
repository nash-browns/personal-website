import { syncServerSession } from './client-session';
import { googleProvider } from '@/firebase';
import { signInWithPopup } from 'firebase/auth';
import { auth } from '@/firebase';

/**
 * Configure Google Auth provider with custom parameters
 * @param {Object} options - Configuration options
 * @param {string} options.prompt - Prompt parameter ('select_account', 'consent', etc.)
 * @param {string} options.hd - Hosted domain restriction
 * @param {string} options.loginHint - Login hint email
 */
export function configureGoogleProvider(options = {}) {
  const { prompt, hd, loginHint } = options;
  
  if (prompt) {
    googleProvider.setCustomParameters({ prompt });
  }
  
  if (hd) {
    googleProvider.setCustomParameters({ hd });
  }
  
  if (loginHint) {
    googleProvider.setCustomParameters({ login_hint: loginHint });
  }
  
  return googleProvider;
}

/**
 * Get Google Auth provider with default configuration
 * Forces account selection for better UX
 */
export function getGoogleProvider() {
  googleProvider.setCustomParameters({
    prompt: 'select_account'
  });
  
  return googleProvider;
}

/**
 * Extract user profile information from Google Auth result
 * @param {Object} result - Google Auth result
 * @returns {Object} User profile information
 */
export function extractGoogleUserProfile(result) {
  const { user } = result;
  
  return {
    uid: user.uid,
    email: user.email,
    displayName: user.displayName,
    photoURL: user.photoURL,
    emailVerified: user.emailVerified,
    providerId: user.providerId,
    // Additional Google-specific data
    googleId: user.providerData.find(provider => provider.providerId === 'google.com')?.uid,
    firstName: user.displayName?.split(' ')[0] || '',
    lastName: user.displayName?.split(' ').slice(1).join(' ') || ''
  };
}

/**
 * Complete Google Auth flow including user creation in Firestore
 * @param {Function} onSuccess - Callback function on successful authentication
 * @param {Function} onError - Callback function on error
 * @returns {Promise<void>}
 */
export async function handleGoogleAuth(onSuccess, onError) {
  try {
    // Sign in with Google
    const googleProvider = getGoogleProvider();
    const result = await signInWithPopup(auth, googleProvider);
    const user = result.user;
    
    if (!user) {
      throw new Error('No user returned from Google Auth');
    }
    
    // Get ID token
    const idToken = await user.getIdToken();
    
    // Extract user profile
    const userProfile = extractGoogleUserProfile(result);
    
    // Create user in Firestore users collection
    const createUserResponse = await fetch('/api/auth/create-google-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken, userProfile }),
    });
    
    if (!createUserResponse.ok) {
      const errorData = await createUserResponse.json();
      throw new Error(errorData.error || 'Failed to create user');
    }
    
    const createUserData = await createUserResponse.json();
    
    const session = await syncServerSession(user);
    if (session.skipped) throw new Error('Your sign-in changed. Please try again.');

    // Call success callback
    if (onSuccess) {
      onSuccess({
        user,
        userProfile,
        firestoreUser: createUserData.user,
        message: createUserData.message
      });
    }
    
  } catch (error) {
    console.error('Google Auth error:', error);
    if (onError) {
      onError(error);
    }
  }
} 