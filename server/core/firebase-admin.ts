import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

// Initialize Firebase Admin (only if not already initialized)
if (!getApps().length) {
  try {
    console.log('🔥 Initializing Firebase Admin with service account...');
    
    // Use service account credentials from secret
    const serviceAccount = {
      type: "service_account",
      project_id: "musobuddy-601a7",
      private_key_id: "757af95cb340a13d68853ff621f179c1b7ad78c4",
      private_key: "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQCQ05xFIS+xHzxd\n7tXlkREXR28PJhiMfN1KoNouZeYVAjtlBrwxAFE7BNGGBrQUVYpOkUIbmA0Hrsrf\n0hYAtbvClxQJpeAsdRNQJIeO8IaPST4JhLO0J7pamm/69mIlhh0E8ArtDQs8v66h\nCgboNCH52GcdXa8cR86sAFXQPCp5st/tDocPsPXrRSYsYUP29psPZzXYV4RDMXV+\nANgJ32QKEZZ2ArzPmeBujevbZk7BvApA6NWv3MuBnX0b8fQ6lWF+u28hy6VH3iPy\nAA7SVFtpvFOdrAIEJy7SyPtzQ/3M1TXObdPmhGpLCT48SNu4sn+QeDRSwNW7/JOR\nMHfnwgt9AgMBAAECggEAFlj84mLwUcfE4CbATUwBA+NTNRZ3D8idugwPlrzFD+VY\nBmsPY41Nu4pvDVwf8gpQDPcXqRvhmNelOPvZRtNELY7z+dglex62s/VrEIi3bslJ\nwBzAwRInTJ9Lm8FknC8xb6ddvD34x685UmKydabDvmKg6LRh1r6S2tIza645DK2s\npXhKpnuepQzlUAODAYwUquiIraeT1ejMnJJ3XdJW4a6EbummfyCrSrd7uEOuQehm\nwNEFzVaX6OdqyX8B+zu/gXldiFXAdg0w4SlIMz0jTkrrXIJXPHedc6lx/3GYu05c\n99lLuUIN+R1JDnobM3J8ZMHynnuHRdN37woFPWiB4QKBgQDKi+kUcAY9oSIC+ZUU\noVov7YbsBKwGj+W7VZV5rVU/4IpVkZcU93WcNSvOc1q6vfnK09W+zODgKzNYMs7I\neOg4p1Or7tUNCh4V+DmSnfOD5U/8IUdqwgm2pQ+6UBo5pLaMhFhtIxWUmD8gYU40\n77JzkJubsa5Nx2u/XTWT/fCanQKBgQC3DCD7pqC8g0itGHZUe2jpGRL/ZBBoZ6Ip\nzGYhSgKthMIgPpuhClE6K7tTNm5hY73GkZpUXDy5gx/ipugwQ0TBk+AokPSWXDmh\nLWgacG22lBS2IFM0yHg8ppP7I5dSwzUGrqH77Z51Uk8iUraDR7UjhFFjXN1m543k\nZdnVxUhuYQKBgQCGAQDI+8C1P4kADN38EzBW60BLoF+ry8JDKcFGCk6Pf2AmcrdR\nMNNH8Mm1wg3x5MSB05rjrCrPROWoYZz7dzq0WMf7xXyBLwNup5Z3kTbOOYWsmtvk\nHtJMW3JHYr2nC3mXB+x08DRT5lJFevtB/J/E45R/8pMOdHSt294ZtnVb5QKBgB0M\nL6+/oYJI0x+k4iJF80AKWplsp63pxDId3Zcqx4IBr0yuosPLf1hb2D48RQfvbA42\nzObWPEy0Ijs1gWMnSaHudYP6fNXfjMWnDv4jGUX/+cltF8coiOwXAyS3YSwhDikh\nTVNNQfgcN7KarZvnpTcdqEy8T+YkmL/F6euigvwBAoGAarquwoukzdLYukm8IEuA\ncFucRj5OtGul/CQtk/KokXcTNeG3+KsceOo3TES4D+aACL+Gti41Q9D135zj1FX9\nMMBJdOqA/6gTxL6qcqMdqrC3Ju79v3AQ78pGrILloej0RLHx3jhGjBIzldQq+F+R\nMb4VO8Z7XDt4gfW1H+NJ9bs=\n-----END PRIVATE KEY-----\n",
      client_email: "firebase-adminsdk-fbsvc@musobuddy-601a7.iam.gserviceaccount.com",
      client_id: "102279174122960504369",
      auth_uri: "https://accounts.google.com/o/oauth2/auth",
      token_uri: "https://oauth2.googleapis.com/token",
      auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
      client_x509_cert_url: "https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-fbsvc%40musobuddy-601a7.iam.gserviceaccount.com",
      universe_domain: "googleapis.com"
    };
    
    initializeApp({
      credential: cert(serviceAccount),
      projectId: "musobuddy-601a7",
    });
    
    console.log('✅ Firebase Admin initialized successfully with service account');
  } catch (error) {
    console.error('❌ Firebase Admin initialization failed:', error);
  }
}

export const adminAuth = getAuth();

export async function verifyFirebaseToken(idToken: string) {
  try {
    if (!idToken || typeof idToken !== 'string') {
      console.error('❌ Invalid token provided:', typeof idToken, idToken?.length);
      return null;
    }
    
    console.log('🔍 Attempting to verify Firebase token of length:', idToken.length);
    console.log('🔍 Token starts with:', idToken.substring(0, 30));
    
    const decodedToken = await adminAuth.verifyIdToken(idToken, true); // Check revoked status
    console.log('✅ Firebase token verified successfully for:', decodedToken.email);
    
    return {
      uid: decodedToken.uid,
      email: decodedToken.email,
      emailVerified: decodedToken.email_verified,
      name: decodedToken.name,
    };
  } catch (error: any) {
    console.error('❌ Firebase token verification failed:');
    console.error('- Error message:', error.message);
    console.error('- Error code:', error.code);
    console.error('- Error info:', error.errorInfo);
    
    if (error.code === 'auth/argument-error') {
      console.error('🚨 Token format issue - received token:', {
        type: typeof idToken,
        length: idToken?.length,
        preview: idToken?.substring(0, 50)
      });
    }
    
    return null;
  }
}