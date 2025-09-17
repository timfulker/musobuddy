import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuthContext } from '@/contexts/AuthContext';
import { Mail, CheckCircle, RefreshCw, AlertCircle } from 'lucide-react';
import { Link } from 'wouter';

export function EmailVerification() {
  const { user, resendVerificationEmail, refreshUserData } = useAuthContext();
  const [isResending, setIsResending] = useState(false);
  const [resendMessage, setResendMessage] = useState('');
  const [isCheckingVerification, setIsCheckingVerification] = useState(false);

  useEffect(() => {
    // Auto-refresh user data every 5 seconds to check for verification
    const interval = setInterval(() => {
      if (user && !user.emailVerified) {
        refreshUserData();
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [user, refreshUserData]);

  const handleResendEmail = async () => {
    try {
      setIsResending(true);
      setResendMessage('');
      await resendVerificationEmail();
      setResendMessage('Verification email sent! Please check your inbox.');
    } catch (error: any) {
      setResendMessage(`Failed to send email: ${error.message}`);
    } finally {
      setIsResending(false);
    }
  };

  const handleCheckVerification = async () => {
    try {
      setIsCheckingVerification(true);
      await refreshUserData();
      if (user?.emailVerified) {
        setResendMessage('Email verified successfully!');
      } else {
        setResendMessage('Email not yet verified. Please check your inbox and click the verification link.');
      }
    } catch (error) {
      setResendMessage('Failed to check verification status.');
    } finally {
      setIsCheckingVerification(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-6">
            <p className="text-center text-gray-600 dark:text-gray-400">
              Please <Link href="/auth/login" className="text-blue-600 hover:underline">log in</Link> to verify your email.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (user.emailVerified) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-900">
              <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <CardTitle className="text-green-600 dark:text-green-400">Email Verified!</CardTitle>
            <CardDescription>
              Your email has been successfully verified. You can now access all features.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Link href="/dashboard">
              <Button className="w-full">Continue to Dashboard</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900">
            <Mail className="h-6 w-6 text-blue-600 dark:text-blue-400" />
          </div>
          <CardTitle>Verify Your Email</CardTitle>
          <CardDescription>
            We've sent a verification email to <strong>{user.email}</strong>
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Please check your email and click the verification link to activate your account.
              You cannot access payment or subscription features until your email is verified.
            </AlertDescription>
          </Alert>

          <div className="space-y-3">
            <Button 
              onClick={handleCheckVerification}
              disabled={isCheckingVerification}
              className="w-full"
              variant="default"
            >
              {isCheckingVerification ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Checking...
                </>
              ) : (
                "I've Verified My Email"
              )}
            </Button>

            <Button 
              onClick={handleResendEmail}
              disabled={isResending}
              variant="outline"
              className="w-full"
            >
              {isResending ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                'Resend Verification Email'
              )}
            </Button>
          </div>

          {resendMessage && (
            <Alert className={resendMessage.includes('Failed') ? 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950' : 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950'}>
              <AlertDescription className={resendMessage.includes('Failed') ? 'text-red-800 dark:text-red-200' : 'text-green-800 dark:text-green-200'}>
                {resendMessage}
              </AlertDescription>
            </Alert>
          )}

          <div className="text-center text-sm text-gray-600 dark:text-gray-400">
            <p>Having trouble? Check your spam folder or </p>
            <Link href="/auth/login" className="text-blue-600 hover:underline">
              use a different email address
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}