import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

// Initialize Firebase Admin (only if not already initialized)
if (!getApps().length) {
  // For simplicity in development, we'll use project ID-based initialization
  // In production, you would use service account key file
  initializeApp({
    projectId: process.env.VITE_FIREBASE_PROJECT_ID,
    // Note: For production, use service account credentials:
    // credential: cert({
    //   projectId: process.env.VITE_FIREBASE_PROJECT_ID,
    //   privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    //   clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    // }),
  });
}

export const adminAuth = getAuth();

export async function verifyFirebaseToken(idToken: string) {
  try {
    const decodedToken = await adminAuth.verifyIdToken(idToken);
    return {
      uid: decodedToken.uid,
      email: decodedToken.email,
      emailVerified: decodedToken.email_verified,
      name: decodedToken.name,
    };
  } catch (error) {
    console.error('Firebase token verification failed:', error);
    return null;
  }
}