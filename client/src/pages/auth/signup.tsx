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
  const { signInWithGoogle, signUpWithEmail, isLoading: firebaseLoading, error: firebaseError } = useAuthContext();

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
      console.log('🔥 Creating account...', { email, firstName, lastName, inviteCode });
      
      // Use the auth hook to create account (pass invite code if provided)
      const result = await signUpWithEmail(email, password, firstName, lastName, inviteCode);
      
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
              {/* Beta Invite Code - Available for both email and Google signup */}
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
              
              <div className="mt-6">
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <Separator className="w-full" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">
                      Or continue with
                    </span>
                  </div>
                </div>
                
                <Button
                  variant="outline"
                  type="button"
                  className="w-full mt-4"
                  onClick={async () => {
                    try {
                      // Pass invite code to Google signup if provided
                      await signInWithGoogle(inviteCode);
                      console.log('✅ Google signup successful, redirecting to payment setup...');
                      window.location.href = '/subscription/update-payment';
                    } catch (error) {
                      console.error('❌ Google signup failed:', error);
                    }
                  }}
                  disabled={firebaseLoading || loading}
                >
                  {firebaseLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                    <path
                      fill="currentColor"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="currentColor"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                  Continue with Google{inviteCode ? ' (Beta Access)' : ''}
                </Button>
                
                {firebaseError && (
                  <p className="text-sm text-red-600 mt-2 text-center">{firebaseError}</p>
                )}
              </div>
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