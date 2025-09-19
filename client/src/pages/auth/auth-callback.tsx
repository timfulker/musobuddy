import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuthContext } from '@/contexts/AuthContext';
import { CheckCircle, RefreshCw, AlertCircle, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export function AuthCallback() {
  const [, setLocation] = useLocation();
  const { refreshUserData } = useAuthContext();
  const [status, setStatus] = useState<'processing' | 'success' | 'error' | 'already_verified'>('processing');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        console.log('🔗 [AUTH-CALLBACK] Processing email verification callback...');
        
        // Check if there are URL parameters or hash fragments for tokens
        const urlParams = new URLSearchParams(window.location.search);
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        
        // Look for verification tokens in URL or hash
        const accessToken = urlParams.get('access_token') || hashParams.get('access_token');
        const refreshToken = urlParams.get('refresh_token') || hashParams.get('refresh_token');
        const tokenType = urlParams.get('token_type') || hashParams.get('token_type');
        const type = urlParams.get('type') || hashParams.get('type');
        
        console.log('🔍 [AUTH-CALLBACK] URL contains:', { 
          hasAccessToken: !!accessToken, 
          hasRefreshToken: !!refreshToken, 
          type,
          tokenType 
        });

        // If we have tokens in the URL, Supabase should handle this automatically
        // But we can also manually trigger the session exchange
        if (accessToken && refreshToken) {
          console.log('✅ [AUTH-CALLBACK] Tokens found, exchanging for session...');
          
          const { data, error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken
          });

          if (error) {
            console.error('❌ [AUTH-CALLBACK] Session exchange failed:', error);
            setStatus('error');
            setMessage(`Verification failed: ${error.message}`);
            return;
          }

          if (data.session) {
            console.log('✅ [AUTH-CALLBACK] Session established successfully');
            
            // CRITICAL FIX: Update database email_verified field
            try {
              console.log('📧 [AUTH-CALLBACK] Updating database email_verified field...');
              const response = await fetch('/api/auth/verify-email', {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${data.session.access_token}`,
                  'Content-Type': 'application/json'
                }
              });

              if (response.ok) {
                console.log('✅ [AUTH-CALLBACK] Database email_verified field updated successfully');
              } else {
                console.warn('⚠️ [AUTH-CALLBACK] Failed to update database email_verified field:', await response.text());
              }
            } catch (dbError) {
              console.error('❌ [AUTH-CALLBACK] Error updating database email_verified field:', dbError);
              // Don't fail the verification process for database update errors
            }
            
            // Refresh user data to get latest verification status
            await refreshUserData();
            
            setStatus('success');
            setMessage('Email verified successfully! Redirecting to dashboard...');
            
            // Redirect to dashboard after a short delay
            setTimeout(() => {
              setLocation('/dashboard');
            }, 2000);
          } else {
            throw new Error('No session received after token exchange');
          }
        } else {
          // No tokens in URL, try fallback with exchangeCodeForSession for OAuth and other link variants
          console.log('🔄 [AUTH-CALLBACK] No tokens found, attempting fallback with exchangeCodeForSession...');
          
          try {
            const { data, error } = await supabase.auth.exchangeCodeForSession(window.location.href);
            
            if (error) {
              console.log('⚠️ [AUTH-CALLBACK] exchangeCodeForSession failed:', error.message);
              
              // If exchangeCodeForSession fails, check if user is already signed in and verified
              const { data: { session } } = await supabase.auth.getSession();
              
              if (session?.user) {
                if (session.user.email_confirmed_at) {
                  console.log('✅ [AUTH-CALLBACK] User already verified');
                  setStatus('already_verified');
                  setMessage('Email already verified! Redirecting to dashboard...');
                  
                  setTimeout(() => {
                    setLocation('/dashboard');
                  }, 2000);
                } else {
                  console.log('⚠️ [AUTH-CALLBACK] User signed in but not verified');
                  setStatus('error');
                  setMessage('Email verification link appears to be invalid or expired. Please try requesting a new verification email.');
                }
              } else {
                console.log('⚠️ [AUTH-CALLBACK] No session found after fallback attempt');
                setStatus('error');
                setMessage('No verification tokens found. Please check your email and click the verification link again.');
              }
            } else if (data.session) {
              console.log('✅ [AUTH-CALLBACK] Fallback exchangeCodeForSession successful');
              
              // CRITICAL FIX: Update database email_verified field
              try {
                console.log('📧 [AUTH-CALLBACK] Updating database email_verified field...');
                const response = await fetch('/api/auth/verify-email', {
                  method: 'POST',
                  headers: {
                    'Authorization': `Bearer ${data.session.access_token}`,
                    'Content-Type': 'application/json'
                  }
                });

                if (response.ok) {
                  console.log('✅ [AUTH-CALLBACK] Database email_verified field updated successfully');
                } else {
                  console.warn('⚠️ [AUTH-CALLBACK] Failed to update database email_verified field:', await response.text());
                }
              } catch (dbError) {
                console.error('❌ [AUTH-CALLBACK] Error updating database email_verified field:', dbError);
                // Don't fail the verification process for database update errors
              }
              
              // Refresh user data to get latest verification status
              await refreshUserData();
              
              setStatus('success');
              setMessage('Email verified successfully! Redirecting to dashboard...');
              
              // Redirect to dashboard after a short delay
              setTimeout(() => {
                setLocation('/dashboard');
              }, 2000);
            } else {
              console.log('⚠️ [AUTH-CALLBACK] exchangeCodeForSession returned no session');
              setStatus('error');
              setMessage('Verification link appears to be invalid or expired. Please try requesting a new verification email.');
            }
          } catch (fallbackError: any) {
            console.error('❌ [AUTH-CALLBACK] Fallback exchangeCodeForSession error:', fallbackError);
            setStatus('error');
            setMessage('Verification failed. Please try requesting a new verification email.');
          }
        }
      } catch (error: any) {
        console.error('❌ [AUTH-CALLBACK] Callback processing failed:', error);
        setStatus('error');
        setMessage(`Verification failed: ${error.message || 'Unknown error occurred'}`);
      }
    };

    // Process the callback immediately
    handleAuthCallback();
  }, [refreshUserData, setLocation]);

  const handleRetryVerification = () => {
    setLocation('/auth/verify-email');
  };

  const handleGoToLogin = () => {
    setLocation('/login');
  };

  if (status === 'processing') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900">
              <Loader2 className="h-6 w-6 text-blue-600 dark:text-blue-400 animate-spin" />
            </div>
            <CardTitle>Verifying Email</CardTitle>
            <CardDescription>
              Please wait while we verify your email address...
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (status === 'success' || status === 'already_verified') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-900">
              <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <CardTitle className="text-green-600 dark:text-green-400">
              {status === 'success' ? 'Email Verified!' : 'Already Verified!'}
            </CardTitle>
            <CardDescription>
              {message}
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <div className="flex items-center justify-center mb-4">
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              <span className="text-sm text-gray-600 dark:text-gray-400">Redirecting to dashboard...</span>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Error state
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-900">
            <AlertCircle className="h-6 w-6 text-red-600 dark:text-red-400" />
          </div>
          <CardTitle className="text-red-600 dark:text-red-400">Verification Failed</CardTitle>
          <CardDescription>
            There was a problem verifying your email address.
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <Alert className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-red-800 dark:text-red-200">
              {message}
            </AlertDescription>
          </Alert>

          <div className="space-y-3">
            <Button 
              onClick={handleRetryVerification}
              className="w-full"
              variant="default"
            >
              Request New Verification Email
            </Button>

            <Button 
              onClick={handleGoToLogin}
              variant="outline"
              className="w-full"
            >
              Back to Login
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}