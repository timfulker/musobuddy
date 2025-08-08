import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, Loader2 } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

export default function SuccessPage() {
  const [, setLocation] = useLocation();
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<'checking' | 'success' | 'error'>('checking');
  const [message, setMessage] = useState('Verifying your payment...');
  const { toast } = useToast();

  useEffect(() => {
    handleStripeReturn();
  }, []);

  const handleStripeReturn = async () => {
    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get('session_id');

    if (!sessionId) {
      setStatus('error');
      setMessage('Invalid payment session');
      setLoading(false);
      return;
    }

    try {
      // Verify the Stripe session and complete setup
      const response = await apiRequest('/api/stripe/verify-session', {
        method: 'POST',
        body: { sessionId }
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Payment verification failed');
      }

      // Store auth token if provided
      if (data.token) {
        const hostname = window.location.hostname;
        const tokenKey = hostname.includes('janeway.replit.dev') || hostname.includes('localhost')
          ? 'authToken_dev_fallback'
          : `authToken_${hostname.replace(/[^a-zA-Z0-9]/g, '_')}`;
        localStorage.setItem(tokenKey, data.token);
      }

      setStatus('success');
      setMessage('Payment successful! Setting up your account...');

      // Check if user needs email prefix setup
      const userResponse = await apiRequest('/api/auth/me');
      const userData = await userResponse.json();

      // Short delay to show success message
      setTimeout(() => {
        if (!userData.emailPrefix) {
          // New user - needs email prefix setup
          setLocation('/email-setup');
        } else {
          // Returning user - go straight to dashboard
          setLocation('/dashboard');
        }
      }, 2000);

    } catch (error: any) {
      console.error('Payment verification error:', error);
      setStatus('error');
      setMessage(error.message || 'Something went wrong with your payment');
      setLoading(false);
      
      toast({
        title: "Payment Error",
        description: error.message || 'Please contact support if this persists',
        variant: "destructive"
      });

      // Redirect to pricing after delay
      setTimeout(() => {
        setLocation('/pricing');
      }, 3000);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary/5 to-white flex items-center justify-center p-6">
      <Card className="max-w-md w-full">
        <CardHeader>
          <CardTitle className="text-center text-2xl">
            {status === 'checking' && 'Processing Your Payment'}
            {status === 'success' && 'Welcome to MusoBuddy!'}
            {status === 'error' && 'Payment Issue'}
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          {status === 'checking' && (
            <>
              <Loader2 className="w-16 h-16 text-primary mx-auto animate-spin" />
              <p className="text-gray-600">{message}</p>
              <p className="text-sm text-gray-500">Please don't close this window...</p>
            </>
          )}
          
          {status === 'success' && (
            <>
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto" />
              <p className="text-gray-600">{message}</p>
              <p className="text-sm text-gray-500">Redirecting you to complete setup...</p>
            </>
          )}
          
          {status === 'error' && (
            <>
              <div className="w-16 h-16 rounded-full bg-red-100 mx-auto flex items-center justify-center">
                <span className="text-2xl">❌</span>
              </div>
              <p className="text-gray-600">{message}</p>
              <p className="text-sm text-gray-500">You'll be redirected to the pricing page...</p>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}