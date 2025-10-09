import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { Check, Loader2, Eye, EyeOff } from 'lucide-react';
import { useAuthContext } from '@/contexts/AuthContext';

export default function SignupPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [inviteCode, setInviteCode] = useState(''); // Optional beta invite code
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const { toast } = useToast();
  const { signUpWithEmail, isLoading: firebaseLoading, error: firebaseError } = useAuthContext();

  // Create Firebase account
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

    // Mark signup as in progress to prevent onboarding wizard interference
    localStorage.setItem('signup-in-progress', 'true');

    try {
      // STEP 1: Validate beta code if provided (store in localStorage for after verification)
      if (inviteCode && inviteCode.trim()) {
        console.log('🔍 Validating beta code before signup:', inviteCode);

        try {
          const betaResponse = await fetch('/api/auth/test-beta-code', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code: inviteCode.trim() })
          });

          const betaResult = await betaResponse.json();

          if (!betaResult.valid) {
            setError(`Invalid beta code: ${betaResult.error || 'Code not recognized'}`);
            setLoading(false);
            return;
          }

          console.log('✅ Beta code validated successfully');
          // Store validated beta code for use after email verification
          localStorage.setItem('validated-beta-code', inviteCode.trim());
          console.log('💾 Stored validated beta code in localStorage');

        } catch (betaError) {
          console.error('❌ Beta code validation failed:', betaError);
          setError('Unable to validate beta code. Please try again.');
          setLoading(false);
          return;
        }
      }

      console.log('🔥 Creating account...', { email, firstName, lastName, hasBetaCode: !!inviteCode });

      // STEP 2: Proceed with signup (beta code will be applied after email verification)
      const result = await signUpWithEmail(email, password, firstName, lastName);
      
      console.log('🔍 Signup result:', result);
      
      // Check if email verification is needed
      const needsVerification = result?.needsVerification || false;
      
      if (needsVerification) {
        // Redirect to email verification for security
        const welcomeMessage = result?.user?.isBeta 
          ? "Welcome, Beta Tester! Please verify your email to continue."
          : "Account created! Please verify your email to start your trial.";
        
        toast({
          title: "Account created successfully!",
          description: welcomeMessage
        });
        
        // Redirect to email verification page
        setTimeout(() => {
          localStorage.removeItem('signup-in-progress'); // Clear signup flag before redirect
          window.location.href = '/auth/verify-email';
        }, 1500);
        
      } else {
        // Admin/assigned accounts can skip verification and go to payment
        const welcomeMessage = result?.user?.isBeta 
          ? "Welcome, Beta Tester! Complete checkout for your 12-month free trial."
          : "Account created! Complete checkout to start your 30-day free trial.";
        
        toast({
          title: "Account created successfully!",
          description: welcomeMessage
        });
        
        // Create Stripe checkout session for admin/assigned users only
        setTimeout(async () => {
          try {
            const checkoutResponse = await fetch('/api/create-checkout-session', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ 
                userEmail: email,
                userId: result.user.userId,
                isBeta: result?.user?.isBeta || false // Pass beta status to backend
              })
            });
            
            const checkoutData = await checkoutResponse.json();
            if (checkoutData.url) {
              localStorage.removeItem('signup-in-progress'); // Clear signup flag before redirect
              window.location.href = checkoutData.url;
            } else {
              console.error('No checkout URL received:', checkoutData);
              localStorage.removeItem('signup-in-progress'); // Clear on error
              toast({
                title: "Error",
                description: "Failed to create checkout session. Please try again.",
                variant: "destructive"
              });
            }
          } catch (error) {
            console.error('❌ Checkout creation failed:', error);
            localStorage.removeItem('signup-in-progress'); // Clear on error
            toast({
              title: "Error",
              description: "Failed to create checkout session. Please try again.",
              variant: "destructive"
            });
          }
        }, 1500);
      }
      
    } catch (err: any) {
      console.error('❌ Account creation failed:', err);
      let errorMessage = 'Failed to create account';
      
      // Handle specific Firebase auth errors
      if (err.code === 'auth/email-already-in-use') {
        errorMessage = 'An account with this email already exists';
      } else if (err.code === 'auth/invalid-email') {
        errorMessage = 'Please enter a valid email address';
      } else if (err.code === 'auth/weak-password') {
        errorMessage = 'Password is too weak. Please choose a stronger password';
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
      localStorage.removeItem('signup-in-progress'); // Clear on error
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
            <CardTitle>Account Details</CardTitle>
          </CardHeader>
          <CardContent>
              {/* Beta Invite Code - Validated before signup, applied after email verification */}
              <div className="mb-6">
                <Label htmlFor="inviteCode">
                  Beta Invite Code <span className="text-gray-500">(optional)</span>
                </Label>
                <Input
                  id="inviteCode"
                  type="text"
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value)}
                  placeholder="Enter your beta invite code if you have one"
                  disabled={loading || firebaseLoading}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Beta testers receive 90 days free instead of 30 days
                </p>
              </div>

              <Separator className="my-6" />

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
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      disabled={loading}
                      minLength={6}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>

                <div>
                  <Label htmlFor="confirmPassword">Confirm Password</Label>
                  <div className="relative">
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      disabled={loading}
                      minLength={6}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
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
                  {loading ? 'Creating Account...' : 'Create Account & Verify Email'}
                </Button>
              </form>
              
          </CardContent>
        </Card>

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
      </div>
    </div>
  );
}