import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Crown, Star, Zap } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

export default function PricingPage() {
  const [loading, setLoading] = useState(false);

  // Get subscription status
  const { data: subscriptionStatus } = useQuery({
    queryKey: ['/api/subscription/status'],
    queryFn: () => apiRequest('/api/subscription/status'),
  });

  // Create checkout session mutation
  const createCheckoutMutation = useMutation({
    mutationFn: (priceId: string) => 
      apiRequest('/api/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priceId }),
      }),
    onSuccess: (data) => {
      if (data.url) {
        window.location.href = data.url;
      }
    },
    onError: (error) => {
      console.error('Checkout error:', error);
      setLoading(false);
    },
  });

  const handleSubscribe = (priceId: string) => {
    setLoading(true);
    createCheckoutMutation.mutate(priceId);
  };

  const currentPlan = subscriptionStatus?.plan || 'free';
  const hasAccess = subscriptionStatus?.hasAccess || false;

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-50 to-white p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">
            Choose Your MusoBuddy Plan
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Professional tools for serious musicians. Streamline your business with smart contracts, invoices, and client management.
          </p>
        </div>

        {/* Current Plan Badge */}
        {hasAccess && (
          <div className="text-center mb-8">
            <Badge variant="outline" className="text-lg px-4 py-2">
              <Crown className="w-4 h-4 mr-2" />
              Current Plan: {currentPlan === 'core' ? 'Core' : currentPlan === 'premium' ? 'Premium' : 'Lifetime'} 
            </Badge>
          </div>
        )}

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-3 gap-8 mb-12">
          {/* Free Plan */}
          <Card className="border-2">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl">Free</CardTitle>
              <div className="text-3xl font-bold">£0</div>
              <p className="text-gray-500">Limited features</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <ul className="space-y-2">
                <li className="flex items-center">
                  <Check className="w-4 h-4 text-green-500 mr-2" />
                  5 bookings per month
                </li>
                <li className="flex items-center">
                  <Check className="w-4 h-4 text-green-500 mr-2" />
                  Basic contract templates
                </li>
                <li className="flex items-center">
                  <Check className="w-4 h-4 text-green-500 mr-2" />
                  Email notifications
                </li>
              </ul>
              <Button 
                variant="outline" 
                className="w-full"
                disabled={currentPlan === 'free'}
              >
                {currentPlan === 'free' ? 'Current Plan' : 'Downgrade'}
              </Button>
            </CardContent>
          </Card>

          {/* Core Plan */}
          <Card className="border-2 border-purple-500 relative">
            <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
              <Badge className="bg-purple-500">
                <Star className="w-3 h-3 mr-1" />
                Most Popular
              </Badge>
            </div>
            <CardHeader className="text-center">
              <CardTitle className="text-2xl">Core</CardTitle>
              <div className="text-3xl font-bold">£9.99</div>
              <p className="text-gray-500">per month</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <ul className="space-y-2">
                <li className="flex items-center">
                  <Check className="w-4 h-4 text-green-500 mr-2" />
                  Unlimited bookings
                </li>
                <li className="flex items-center">
                  <Check className="w-4 h-4 text-green-500 mr-2" />
                  Professional contracts
                </li>
                <li className="flex items-center">
                  <Check className="w-4 h-4 text-green-500 mr-2" />
                  Invoice management
                </li>
                <li className="flex items-center">
                  <Check className="w-4 h-4 text-green-500 mr-2" />
                  Client management
                </li>
                <li className="flex items-center">
                  <Check className="w-4 h-4 text-green-500 mr-2" />
                  Email automation
                </li>
                <li className="flex items-center">
                  <Check className="w-4 h-4 text-green-500 mr-2" />
                  Cloud storage
                </li>
              </ul>
              <Button 
                className="w-full bg-purple-600 hover:bg-purple-700"
                onClick={() => handleSubscribe('core_monthly')}
                disabled={loading || currentPlan === 'core' || hasAccess}
              >
                {loading ? 'Processing...' : 
                 currentPlan === 'core' ? 'Current Plan' :
                 hasAccess ? 'Already Subscribed' : 'Subscribe Now'}
              </Button>
            </CardContent>
          </Card>

          {/* Premium Plan */}
          <Card className="border-2">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl">Premium</CardTitle>
              <div className="text-3xl font-bold">£13.99</div>
              <p className="text-gray-500">per month</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <ul className="space-y-2">
                <li className="flex items-center">
                  <Check className="w-4 h-4 text-green-500 mr-2" />
                  Everything in Core
                </li>
                <li className="flex items-center">
                  <Check className="w-4 h-4 text-green-500 mr-2" />
                  Advanced analytics
                </li>
                <li className="flex items-center">
                  <Check className="w-4 h-4 text-green-500 mr-2" />
                  Custom branding
                </li>
                <li className="flex items-center">
                  <Check className="w-4 h-4 text-green-500 mr-2" />
                  Priority support
                </li>
                <li className="flex items-center">
                  <Check className="w-4 h-4 text-green-500 mr-2" />
                  API access
                </li>
              </ul>
              <Button 
                variant="outline" 
                className="w-full"
                disabled
              >
                <Zap className="w-4 h-4 mr-2" />
                Coming Soon
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Features Comparison */}
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h2 className="text-2xl font-bold text-center mb-8">Feature Comparison</h2>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-4">Feature</th>
                  <th className="text-center py-4">Free</th>
                  <th className="text-center py-4">Core</th>
                  <th className="text-center py-4">Premium</th>
                </tr>
              </thead>
              <tbody className="space-y-4">
                <tr className="border-b">
                  <td className="py-4">Monthly Bookings</td>
                  <td className="text-center py-4">5</td>
                  <td className="text-center py-4">Unlimited</td>
                  <td className="text-center py-4">Unlimited</td>
                </tr>
                <tr className="border-b">
                  <td className="py-4">Contract Templates</td>
                  <td className="text-center py-4">Basic</td>
                  <td className="text-center py-4">Professional</td>
                  <td className="text-center py-4">Custom</td>
                </tr>
                <tr className="border-b">
                  <td className="py-4">Invoice Management</td>
                  <td className="text-center py-4">✗</td>
                  <td className="text-center py-4">✓</td>
                  <td className="text-center py-4">✓</td>
                </tr>
                <tr className="border-b">
                  <td className="py-4">Client Portal</td>
                  <td className="text-center py-4">✗</td>
                  <td className="text-center py-4">✓</td>
                  <td className="text-center py-4">✓</td>
                </tr>
                <tr className="border-b">
                  <td className="py-4">Email Automation</td>
                  <td className="text-center py-4">✗</td>
                  <td className="text-center py-4">✓</td>
                  <td className="text-center py-4">✓</td>
                </tr>
                <tr className="border-b">
                  <td className="py-4">Analytics</td>
                  <td className="text-center py-4">✗</td>
                  <td className="text-center py-4">Basic</td>
                  <td className="text-center py-4">Advanced</td>
                </tr>
                <tr className="border-b">
                  <td className="py-4">Support</td>
                  <td className="text-center py-4">Community</td>
                  <td className="text-center py-4">Email</td>
                  <td className="text-center py-4">Priority</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* FAQ */}
        <div className="mt-12 text-center">
          <h2 className="text-2xl font-bold mb-4">Frequently Asked Questions</h2>
          <div className="max-w-2xl mx-auto space-y-4">
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="font-semibold mb-2">Can I cancel anytime?</h3>
              <p className="text-gray-600">Yes, you can cancel your subscription at any time. Your access will continue until the end of your billing period.</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="font-semibold mb-2">What payment methods do you accept?</h3>
              <p className="text-gray-600">We accept all major credit cards, debit cards, and PayPal through Stripe's secure payment processing.</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="font-semibold mb-2">Is there a setup fee?</h3>
              <p className="text-gray-600">No setup fees, no hidden costs. Just the monthly subscription fee.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}