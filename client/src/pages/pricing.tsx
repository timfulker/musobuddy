import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Crown, Star, Zap } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import Sidebar from "@/components/sidebar";
import DashboardHeader from "@/components/dashboard-header";
import MobileNav from "@/components/mobile-nav";
import { useResponsive } from "@/hooks/useResponsive";

export default function PricingPage() {
  const [loading, setLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { isDesktop } = useResponsive();

  // Get subscription status
  const { data: subscriptionStatus } = useQuery({
    queryKey: ['/api/subscription/status'],
    queryFn: () => apiRequest('/api/subscription/status'),
  });

  // Create checkout session mutation
  const createCheckoutMutation = useMutation({
    mutationFn: async (priceId: string) => {
      try {
        
        const response = await apiRequest('/api/create-checkout-session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ priceId }),
        });
        const data = await response.json();
        
        return data;
      } catch (error) {
        console.error('Checkout session creation failed:', error);
        throw error;
      }
    },
    onSuccess: (data) => {
      
      if (data.url) {
        window.location.href = data.url;
      } else if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      } else {
        console.error('No checkout URL received:', data);
        setLoading(false);
      }
    },
    onError: (error) => {
      console.error('Checkout error:', error);
      alert('Unable to start subscription. Please try logging out and back in.');
      setLoading(false);
    },
  });

  const handleSubscribe = (priceId: string) => {
    // Check if user is authenticated
    const isAuthenticated = subscriptionStatus !== undefined && subscriptionStatus !== null;
    
    if (!isAuthenticated) {
      // Redirect to unified signup flow for new users
      window.location.href = '/start-trial';
      return;
    }
    
    // Existing users can upgrade directly
    setLoading(true);
    createCheckoutMutation.mutate(priceId);
  };

  const currentPlan = (subscriptionStatus as any)?.plan || 'free';
  const hasAccess = (subscriptionStatus as any)?.hasAccess || false;

  const pricingContent = (
    <div className="min-h-screen bg-gradient-to-b from-primary/5 to-white p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">
            Choose Your MusoBuddy Plan
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Professional tools for serious musicians. Start with a 30-day trial (credit card required) to streamline your business with smart contracts, invoices, and client management.
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
          {/* 30-Day Trial Plan */}
          <Card className="border-2 border-green-400">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl">Free Trial</CardTitle>
              <div className="text-3xl font-bold">£0</div>
              <p className="text-gray-500">30 days free</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <ul className="space-y-2">
                <li className="flex items-center">
                  <Check className="w-4 h-4 text-green-500 mr-2" />
                  Full platform access
                </li>
                <li className="flex items-center">
                  <Check className="w-4 h-4 text-green-500 mr-2" />
                  Create & send contracts
                </li>
                <li className="flex items-center">
                  <Check className="w-4 h-4 text-green-500 mr-2" />
                  Generate invoices
                </li>
                <li className="flex items-center">
                  <Check className="w-4 h-4 text-green-500 mr-2" />
                  Email templates & sending
                </li>
                <li className="flex items-center">
                  <Check className="w-4 h-4 text-green-500 mr-2" />
                  Credit card required for setup
                </li>
              </ul>
              <Button 
                variant="outline" 
                className="w-full bg-green-50 border-green-300 hover:bg-green-100"
                disabled={currentPlan === 'trial' || loading}
                onClick={() => handleSubscribe('price_1RouBwD9Bo26CG1DAF1rkSZI')}
              >
                {loading ? 'Processing...' : 
                 currentPlan === 'trial' ? 'Current Trial' : 'Start 30-Day Free Trial'}
              </Button>
            </CardContent>
          </Card>

          {/* Core Plan */}
          <Card className="border-2 border-primary/50 relative">
            <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
              <Badge className="bg-primary/50">
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
                  Unlimited bookings & contracts
                </li>
                <li className="flex items-center">
                  <Check className="w-4 h-4 text-green-500 mr-2" />
                  Professional invoicing
                </li>
                <li className="flex items-center">
                  <Check className="w-4 h-4 text-green-500 mr-2" />
                  Client address book
                </li>
                <li className="flex items-center">
                  <Check className="w-4 h-4 text-green-500 mr-2" />
                  Email sending & templates
                </li>
                <li className="flex items-center">
                  <Check className="w-4 h-4 text-green-500 mr-2" />
                  Compliance documents
                </li>
                <li className="flex items-center">
                  <Check className="w-4 h-4 text-green-500 mr-2" />
                  Cloud document storage
                </li>
                <li className="flex items-center">
                  <Check className="w-4 h-4 text-green-500 mr-2" />
                  Up to 75 bookings/month
                </li>
              </ul>
              <Button 
                className="w-full bg-primary hover:bg-primary/90"
                onClick={() => handleSubscribe('price_1RouBwD9Bo26CG1DAF1rkSZI')}
                disabled={loading || currentPlan === 'core' || hasAccess}
              >
                {loading ? 'Processing...' : 
                 currentPlan === 'core' ? 'Current Plan' :
                 hasAccess ? 'Already Subscribed' : 'Subscribe Now'}
              </Button>
            </CardContent>
          </Card>

          {/* Premium Plan */}
          <Card className="border-2 border-amber-400">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl">Premium</CardTitle>
              <div className="text-3xl font-bold">£12.99</div>
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
                  Up to 125 bookings/month (vs 75)
                </li>
                <li className="flex items-center">
                  <Check className="w-4 h-4 text-green-500 mr-2" />
                  Enhanced AI assistance
                </li>
                <li className="flex items-center">
                  <Check className="w-4 h-4 text-green-500 mr-2" />
                  Priority email processing
                </li>
                <li className="flex items-center">
                  <Check className="w-4 h-4 text-green-500 mr-2" />
                  Advanced booking analytics
                </li>
                <li className="flex items-center">
                  <Check className="w-4 h-4 text-green-500 mr-2" />
                  Priority support
                </li>
              </ul>
              <Button 
                className="w-full bg-amber-600 hover:bg-amber-700"
                onClick={() => handleSubscribe('PREMIUM_PRICE_ID_PLACEHOLDER')}
                disabled={loading || currentPlan === 'premium'}
              >
                {loading ? 'Processing...' : 
                 currentPlan === 'premium' ? 'Current Plan' : 'Upgrade to Premium'}
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
                  <th className="text-center py-4">Demo</th>
                  <th className="text-center py-4">Core</th>
                  <th className="text-center py-4">Premium</th>
                </tr>
              </thead>
              <tbody className="space-y-4">
                <tr className="border-b">
                  <td className="py-4">Bookings Created</td>
                  <td className="text-center py-4">Testing only</td>
                  <td className="text-center py-4">Unlimited</td>
                  <td className="text-center py-4">Unlimited</td>
                </tr>
                <tr className="border-b">
                  <td className="py-4">Contract Creation</td>
                  <td className="text-center py-4">Testing only</td>
                  <td className="text-center py-4">Unlimited</td>
                  <td className="text-center py-4">Unlimited</td>
                </tr>
                <tr className="border-b">
                  <td className="py-4">Contract Sending</td>
                  <td className="text-center py-4">✗</td>
                  <td className="text-center py-4">✓</td>
                  <td className="text-center py-4">✓</td>
                </tr>
                <tr className="border-b">
                  <td className="py-4">Invoice Creation</td>
                  <td className="text-center py-4">3 test items</td>
                  <td className="text-center py-4">Unlimited</td>
                  <td className="text-center py-4">Unlimited</td>
                </tr>
                <tr className="border-b">
                  <td className="py-4">Invoice Sending</td>
                  <td className="text-center py-4">✗</td>
                  <td className="text-center py-4">✓</td>
                  <td className="text-center py-4">✓</td>
                </tr>
                <tr className="border-b">
                  <td className="py-4">PDF Downloads</td>
                  <td className="text-center py-4">✗</td>
                  <td className="text-center py-4">✓</td>
                  <td className="text-center py-4">✓</td>
                </tr>
                <tr className="border-b">
                  <td className="py-4">Cloud Storage</td>
                  <td className="text-center py-4">✗</td>
                  <td className="text-center py-4">✓</td>
                  <td className="text-center py-4">✓</td>
                </tr>
                <tr className="border-b">
                  <td className="py-4">Address Book</td>
                  <td className="text-center py-4">3 test items</td>
                  <td className="text-center py-4">Unlimited</td>
                  <td className="text-center py-4">Unlimited</td>
                </tr>
                <tr className="border-b">
                  <td className="py-4">Email Automation</td>
                  <td className="text-center py-4">✗</td>
                  <td className="text-center py-4">✓</td>
                  <td className="text-center py-4">✓</td>
                </tr>
                <tr className="border-b">
                  <td className="py-4">Support</td>
                  <td className="text-center py-4">Demo only</td>
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
              <h3 className="font-semibold mb-2">What can I do in the demo?</h3>
              <p className="text-gray-600">The demo lets you explore all interfaces and create up to 3 test items in each category (bookings, contracts, invoices). You can't send emails or download PDFs, but you can see how everything works.</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="font-semibold mb-2">Can I cancel anytime?</h3>
              <p className="text-gray-600">Yes, you can cancel your subscription at any time. Your access will continue until the end of your billing period.</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="font-semibold mb-2">What payment methods do you accept?</h3>
              <p className="text-gray-600">We accept all major credit cards, debit cards, and PayPal through Stripe's secure payment processing.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  if (isDesktop) {
    return (
      <div className="min-h-screen bg-background flex">
        {/* Desktop Sidebar - Always visible */}
        <div className="w-64 bg-white dark:bg-slate-900 shadow-xl border-r border-gray-200 dark:border-slate-700 fixed left-0 top-0 h-full z-30">
          <Sidebar isOpen={true} onClose={() => {}} />
        </div>

        {/* Main Content */}
        <div className="flex-1 ml-64 min-h-screen">
          <DashboardHeader />
          <main className="overflow-auto">
            {pricingContent}
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile menu toggle */}
      {!isDesktop && (
        <div className="fixed top-4 left-4 z-50">
          <button
            onClick={() => setSidebarOpen(true)}
            className="bg-card p-2 rounded-lg shadow-lg"
          >
            <svg className="w-6 h-6 text-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>
      )}

      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main Content */}
      <div className="min-h-screen">
        <DashboardHeader />
        <main className="overflow-auto">
          {pricingContent}
        </main>
      </div>

      <MobileNav />
    </div>
  );
}