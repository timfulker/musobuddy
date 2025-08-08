import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { Shield, Phone, Check } from 'lucide-react';

export default function SignupPage() {
  const [step, setStep] = useState<'email' | 'sms' | 'verifying'>('email');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [userId, setUserId] = useState('');
  const { toast } = useToast();

  // Step 1: Create account
  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    setError('');

    try {
      console.log('🔄 Starting account creation...', { email, firstName, lastName, phoneNumber });
      
      const response = await apiRequest('/api/auth/register', {
        method: 'POST',
        body: {
          email,
          password,
          firstName,
          lastName,
          phoneNumber
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create account');
      }

      const data = await response.json();
      console.log('✅ Account created, userId:', data.userId);
      setUserId(data.userId);
      
      console.log('📱 Sending SMS verification code...');
      // Send SMS verification code
      const smsResponse = await apiRequest('/api/auth/send-sms', {
        method: 'POST',
        body: {
          phoneNumber,
          userId: data.userId
        }
      });

      if (!smsResponse.ok) {
        const smsError = await smsResponse.json();
        throw new Error(smsError.error || 'Failed to send verification code');
      }

      console.log('✅ SMS sent, transitioning to verification step');
      setStep('sms');
      toast({
        title: "Account created",
        description: "We've sent a verification code to your phone"
      });
    } catch (err: any) {
      console.error('❌ Account creation failed:', err);
      setError(err.message || 'Failed to create account');
      setStep('email'); // Reset to email step on error
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Verify SMS
  const handleVerifySMS = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setStep('verifying');

    try {
      console.log('🔍 Verifying SMS code...', { userId, verificationCode });
      
      const verifyResponse = await apiRequest('/api/auth/verify-sms', {
        method: 'POST',
        body: {
          userId,
          verificationCode
        }
      });

      if (!verifyResponse.ok) {
        const verifyError = await verifyResponse.json();
        throw new Error(verifyError.error || 'Verification failed');
      }

      console.log('✅ SMS verified, creating Stripe checkout...');
      
      // After SMS verification, redirect to Stripe checkout
      const stripeResponse = await apiRequest('/api/stripe/create-checkout', {
        method: 'POST',
        body: {
          email,
          userId,
          returnUrl: window.location.origin + '/success'
        }
      });

      if (!stripeResponse.ok) {
        const stripeError = await stripeResponse.json();
        throw new Error(stripeError.error || 'Failed to create payment session');
      }

      const stripeData = await stripeResponse.json();
      console.log('✅ Stripe checkout created:', stripeData);
      
      if (stripeData.url || stripeData.checkoutUrl) {
        window.location.href = stripeData.url || stripeData.checkoutUrl;
      } else {
        throw new Error('No checkout URL received');
      }
    } catch (err: any) {
      console.error('❌ SMS verification or Stripe setup failed:', err);
      setError(err.message || 'Verification failed');
      setStep('sms');
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    setLoading(true);
    try {
      await apiRequest('/api/auth/send-sms', {
        method: 'POST',
        body: {
          phoneNumber,
          userId
        }
      });
      toast({
        title: "Code resent",
        description: "Check your phone for the new verification code"
      });
    } catch (err: any) {
      toast({
        title: "Failed to resend",
        description: err.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary/5 to-white flex items-center justify-center p-6">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-4">Create Your Account</h1>
          <p className="text-gray-600">
            Start your 30-day free trial with MusoBuddy
          </p>
        </div>

        <Card className="border-2">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              {step === 'email' ? 'Account Details' : 'Phone Verification'}
              <div className="flex space-x-2">
                <div className={`w-2 h-2 rounded-full ${step === 'email' ? 'bg-primary' : 'bg-green-500'}`} />
                <div className={`w-2 h-2 rounded-full ${step !== 'email' ? 'bg-primary' : 'bg-gray-300'}`} />
                <div className="w-2 h-2 rounded-full bg-gray-300" />
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {step === 'email' ? (
              <form onSubmit={handleCreateAccount} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="firstName">First Name</Label>
                    <Input
                      id="firstName"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      required
                      disabled={loading}
                    />
                  </div>
                  <div>
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input
                      id="lastName"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      required
                      disabled={loading}
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={loading}
                  />
                </div>

                <div>
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="+1234567890"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    required
                    disabled={loading}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Include country code (e.g., +1 for USA)
                  </p>
                </div>

                <div>
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={loading}
                    minLength={6}
                  />
                </div>

                <div>
                  <Label htmlFor="confirmPassword">Confirm Password</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    disabled={loading}
                    minLength={6}
                  />
                </div>

                {error && (
                  <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <Button 
                  type="submit" 
                  className="w-full" 
                  size="lg"
                  disabled={loading}
                >
                  {loading ? 'Creating Account...' : 'Continue to Verification →'}
                </Button>
              </form>
            ) : step === 'sms' ? (
              <form onSubmit={handleVerifySMS} className="space-y-4">
                <div className="text-center py-4">
                  <Phone className="w-12 h-12 text-primary mx-auto mb-3" />
                  <p className="text-sm text-gray-600 mb-4">
                    We've sent a verification code to<br />
                    <strong>{phoneNumber}</strong>
                  </p>
                </div>

                <div>
                  <Label htmlFor="code">Verification Code</Label>
                  <Input
                    id="code"
                    type="text"
                    placeholder="Enter 6-digit code"
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value)}
                    required
                    disabled={loading}
                    maxLength={6}
                    className="text-center text-2xl tracking-widest"
                  />
                </div>

                {error && (
                  <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <Button 
                  type="submit" 
                  className="w-full" 
                  size="lg"
                  disabled={loading || verificationCode.length !== 6}
                >
                  {loading ? 'Verifying...' : 'Verify & Continue to Payment →'}
                </Button>

                <Button
                  type="button"
                  variant="ghost"
                  className="w-full"
                  onClick={handleResendCode}
                  disabled={loading}
                >
                  Resend Code
                </Button>
              </form>
            ) : (
              <div className="text-center py-8">
                <Shield className="w-16 h-16 text-green-500 mx-auto mb-4 animate-pulse" />
                <h3 className="text-lg font-semibold mb-2">Verifying your account...</h3>
                <p className="text-sm text-gray-600">
                  Please wait while we verify your phone number and prepare your payment setup
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {step === 'email' && (
          <div className="mt-6 space-y-4">
            <Card className="border-green-200 bg-green-50">
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center space-x-3">
                  <Check className="w-5 h-5 text-green-600" />
                  <p className="text-sm">30-day free trial included</p>
                </div>
              </CardContent>
            </Card>
            
            <p className="text-center text-sm text-gray-500">
              Already have an account? <a href="/login" className="text-primary hover:underline">Log in</a>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}