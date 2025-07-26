import { useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Calendar, CreditCard, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function TrialSuccessPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Get URL parameters
  const urlParams = new URLSearchParams(window.location.search);
  const sessionId = urlParams.get('session_id');

  // Session restoration mutation
  const restoreSessionMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/auth/restore-session-by-stripe', {
        method: 'POST',
        credentials: 'include', // CRITICAL: Include cookies
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sessionId }),
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      console.log('✅ Session restore success:', data);
      toast({
        title: "Welcome to MusoBuddy!",
        description: "Your trial account is now active.",
      });
      
      // CRITICAL: Clear React Query cache to force refresh
      queryClient.clear();
      
      // Small delay then redirect
      setTimeout(() => {
        window.location.href = '/dashboard';
      }, 1000);
    },
    onError: (error) => {
      console.error('❌ Session restore failed:', error);
      toast({
        title: "Session restore failed",
        description: "Please try logging in manually.",
        variant: "destructive",
      });
    },
  });

  // Automatic session restoration on component mount
  useEffect(() => {
    if (sessionId && !restoreSessionMutation.isPending) {
      console.log('🔄 Starting session restoration for:', sessionId);
      restoreSessionMutation.mutate();
    }
  }, [sessionId]); // Only depend on sessionId

  if (restoreSessionMutation.isPending) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Setting up your account...</p>
        </div>
      </div>
    );
  }

  const trialEndDate = new Date();
  trialEndDate.setDate(trialEndDate.getDate() + 14);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="mx-auto w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-4">
            <CheckCircle2 className="w-10 h-10 text-green-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Welcome to MusoBuddy!</h1>
          <p className="text-lg text-gray-600">Your 14-day free trial has started successfully. You now have full access to all features.</p>
        </div>

        {/* Trial Status */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Calendar className="w-5 h-5 text-green-600" />
                <span className="font-medium">Trial Active Until</span>
              </div>
              <Badge variant="secondary" className="bg-green-100 text-green-800">
                {trialEndDate.toLocaleDateString('en-GB', { 
                  day: 'numeric', 
                  month: 'long', 
                  year: 'numeric' 
                })}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Success Message */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
              <span>Trial Activated!</span>
            </CardTitle>
            <CardDescription>
              Your payment method has been securely saved. You won't be charged until your trial ends.
            </CardDescription>
          </CardContent>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />
                <span className="text-sm text-gray-600">
                  <strong>What happens next:</strong> Explore all features for 14 days. We'll send you a reminder 5 days before your trial ends. Cancel anytime with no charges.
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Features Overview */}
        <div className="grid md:grid-cols-2 gap-4 mb-6">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center space-x-3">
                <CreditCard className="w-8 h-8 text-purple-600" />
                <div>
                  <h3 className="font-medium">Payment Secured</h3>
                  <p className="text-sm text-gray-600">Your card is saved securely. £9.99/month after trial.</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center space-x-3">
                <Users className="w-8 h-8 text-blue-600" />
                <div>
                  <h3 className="font-medium">Full Access</h3>
                  <p className="text-sm text-gray-600">All features unlocked for 14 days. No limitations.</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Button 
            size="lg" 
            className="flex-1"
            onClick={() => window.location.href = '/dashboard'}
          >
            Get Started
            <CheckCircle2 className="w-4 h-4 ml-2" />
          </Button>
          <Button 
            variant="outline" 
            size="lg"
            onClick={() => window.location.href = '/dashboard'}
          >
            Skip to Dashboard
          </Button>
        </div>
      </div>
    </div>
  );
}