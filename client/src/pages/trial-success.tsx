import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Link, useLocation } from "wouter";
import { CheckCircle, ArrowRight, Mail, LayoutDashboard, FileText, Receipt, Users, Calendar, Sparkles, Crown } from "lucide-react";

export default function TrialSuccessPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { user, isLoading } = useAuth();
  const [isRestoringSession, setIsRestoringSession] = useState(false);
  
  // Debug logging
  useEffect(() => {
    console.log('🎉 TRIAL SUCCESS PAGE LOADED');
    console.log('🔍 URL:', window.location.href);
    console.log('🔍 Search params:', window.location.search);
    console.log('🔍 User authenticated:', !!user);
    console.log('🔍 Loading state:', isLoading);
  }, []);

  // Session restoration effect
  useEffect(() => {
    const restoreSession = async () => {
      if (!user && !isLoading) {
        setIsRestoringSession(true);
        
        try {
          
          
          const response = await fetch('/api/auth/restore-session', {
            method: 'POST',
            credentials: 'include',
            headers: {
              'Content-Type': 'application/json',
            },
          });

          if (response.ok) {
            const result = await response.json();
            
            
            toast({
              title: "Welcome back!",
              description: "Your session has been restored successfully.",
            });

            // Trigger auth refresh
            window.location.reload();
          } else {
            console.error('❌ Session restoration failed:', response.status);
            
            toast({
              title: "Session restoration failed",
              description: "Please try logging in again.",
              variant: "destructive",
            });
            
            setLocation('/');
          }
        } catch (error) {
          console.error('❌ Session restoration error:', error);
          
          toast({
            title: "Connection error",
            description: "Please check your connection and try again.",
            variant: "destructive",
          });
          
          setLocation('/');
        } finally {
          setIsRestoringSession(false);
        }
      }
    };

    // Only attempt restoration if we don't have a user
    if (!isLoading && !user) {
      restoreSession();
    }
  }, [user, isLoading, toast, setLocation]);



  const handleSetupEmail = () => {
    
    
    toast({
      title: "Let's set up your email",
      description: "We'll help you create your booking email address.",
    });
    
    setLocation('/email-setup');
  };

  // Show loading while restoring session
  if (isLoading || isRestoringSession) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-green-50 to-white dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <Card className="border-0 shadow-lg">
            <CardContent className="p-8 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                {isRestoringSession ? 'Restoring your session...' : 'Loading...'}
              </h2>
              <p className="text-gray-600 dark:text-gray-300">
                Please wait while we set everything up.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Redirect if not authenticated
  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-red-50 to-white dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <Card className="border-0 shadow-lg">
            <CardContent className="p-8 text-center">
              <div className="text-red-600 mb-4">
                <CheckCircle className="h-12 w-12 mx-auto" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                Authentication Required
              </h2>
              <p className="text-gray-600 dark:text-gray-300 mb-6">
                Please log in to continue setting up your account.
              </p>
              <Link href="/">
                <Button className="w-full">
                  Go to Login
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-white dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center space-x-2 mb-6">
            <CheckCircle className="h-8 w-8 text-green-600" />
            <span className="text-2xl font-bold text-gray-900 dark:text-white">MusoBuddy</span>
          </Link>
        </div>

        {/* Success Card */}
        <Card className="border-0 shadow-lg">
          <CardHeader className="text-center pb-4">
            <div className="mx-auto w-16 h-16 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mb-4">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <CardTitle className="text-2xl text-gray-900 dark:text-white">
              Trial Activated!
            </CardTitle>
          </CardHeader>
          
          <CardContent className="space-y-6">
            <div className="text-center">
              <p className="text-gray-600 dark:text-gray-300 mb-2">
                Welcome to MusoBuddy, <span className="font-semibold">{user.firstName}</span>!
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Your 14-day free trial is now active. Let's set up your professional email address to start receiving client inquiries:
              </p>
            </div>

            {/* Single Action: Set up Email */}
            <Button
              onClick={handleSetupEmail}
              className="w-full h-12 bg-purple-600 hover:bg-purple-700 text-white"
              size="lg"
            >
              <Mail className="h-5 w-5 mr-2" />
              Select Email Prefix
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>

            {/* Info text */}
            <div className="text-center pt-4 border-t border-gray-200 dark:border-gray-700">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                This will be your permanent professional email address for client inquiries.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center mt-6">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Questions? Check our{" "}
            <Link href="/help" className="text-purple-600 hover:text-purple-700 dark:text-purple-400">
              help center
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}