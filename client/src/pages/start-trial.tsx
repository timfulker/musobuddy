import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Check, CreditCard, Shield, Clock } from 'lucide-react';

export default function StartTrial() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleStartTrial = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/start-trial', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to start trial');
      }

      // Redirect to Stripe Checkout
      if (data.url || data.checkoutUrl) {
        window.location.href = data.url || data.checkoutUrl;
      } else {
        throw new Error('No checkout URL received');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary/5 to-white flex items-center justify-center p-6">
      <div className="max-w-4xl w-full">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-4">Start Your 30-Day Free Trial</h1>
          <p className="text-xl text-gray-600">
            Join thousands of musicians streamlining their business with MusoBuddy
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Left: Trial signup form */}
          <Card className="border-2">
            <CardHeader>
              <CardTitle className="text-2xl">Get Started</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleStartTrial} className="space-y-4">
                <div>
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="your@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={loading}
                  />
                </div>

                {error && (
                  <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <div className="space-y-3">
                  <Button
                    type="submit"
                    className="w-full"
                    size="lg"
                    disabled={loading || !email}
                  >
                    {loading ? 'Processing...' : 'Continue to Payment Setup →'}
                  </Button>

                  <Button
                    type="button"
                    onClick={() => window.location.href = '/'}
                    variant="outline"
                    className="w-full"
                    size="lg"
                  >
                    Cancel
                  </Button>
                </div>

                <p className="text-sm text-gray-500 text-center">
                  You'll be redirected to our secure payment partner Stripe to complete setup
                </p>
              </form>
            </CardContent>
          </Card>

          {/* Right: Benefits */}
          <div className="space-y-6">
            <Card className="border-green-200 bg-green-50">
              <CardContent className="pt-6">
                <div className="flex items-start space-x-3">
                  <Clock className="w-6 h-6 text-green-600 mt-1" />
                  <div>
                    <h3 className="font-semibold text-lg">30 Days Free</h3>
                    <p className="text-gray-600">
                      Full access to all features. Cancel anytime during your trial.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-blue-200 bg-blue-50">
              <CardContent className="pt-6">
                <div className="flex items-start space-x-3">
                  <CreditCard className="w-6 h-6 text-blue-600 mt-1" />
                  <div>
                    <h3 className="font-semibold text-lg">Secure Payment Setup</h3>
                    <p className="text-gray-600">
                      Card required for verification. You won't be charged until after your trial ends.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-purple-200 bg-purple-50">
              <CardContent className="pt-6">
                <div className="flex items-start space-x-3">
                  <Shield className="w-6 h-6 text-purple-600 mt-1" />
                  <div>
                    <h3 className="font-semibold text-lg">Trusted by Musicians</h3>
                    <p className="text-gray-600">
                      Industry-standard security with Stripe. Your data is always protected.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="space-y-2 pl-4">
              <h3 className="font-semibold mb-3">What's included:</h3>
              <div className="flex items-center space-x-2">
                <Check className="w-4 h-4 text-green-500" />
                <span className="text-gray-700">Unlimited contracts & invoices</span>
              </div>
              <div className="flex items-center space-x-2">
                <Check className="w-4 h-4 text-green-500" />
                <span className="text-gray-700">Digital signatures & payments</span>
              </div>
              <div className="flex items-center space-x-2">
                <Check className="w-4 h-4 text-green-500" />
                <span className="text-gray-700">Client management system</span>
              </div>
              <div className="flex items-center space-x-2">
                <Check className="w-4 h-4 text-green-500" />
                <span className="text-gray-700">Email templates & automation</span>
              </div>
              <div className="flex items-center space-x-2">
                <Check className="w-4 h-4 text-green-500" />
                <span className="text-gray-700">Cloud document storage</span>
              </div>
            </div>
          </div>
        </div>

        <p className="text-center text-sm text-gray-500 mt-8">
          Already have an account? <a href="/login" className="text-primary hover:underline">Log in</a>
        </p>
      </div>
    </div>
  );
}