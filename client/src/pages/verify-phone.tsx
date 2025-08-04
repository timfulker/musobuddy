import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

export default function VerifyPhonePage() {
  const [verificationCode, setVerificationCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [displayCode, setDisplayCode] = useState<string | null>(null);
  const [phoneNumber, setPhoneNumber] = useState<string>("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Load stored data on page load
  useEffect(() => {
    const loginCode = localStorage.getItem('loginVerificationCode');
    const loginPhone = localStorage.getItem('loginPhoneNumber');
    const signupPhone = localStorage.getItem('signupPhone');
    
    if (loginCode) {
      setDisplayCode(loginCode);
    }
    
    setPhoneNumber(loginPhone || signupPhone || '');
  }, []);

  const handleVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      // Get stored phone number and email from localStorage for fallback
      const storedPhone = localStorage.getItem('signupPhone');
      const storedEmail = localStorage.getItem('signupEmail');
      
      const response = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ 
          verificationCode,
          phoneNumber: storedPhone, // Include for fallback lookup
          email: storedEmail // Include for fallback lookup
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        // Check if we need to restart signup process
        if (data.requiresRestart) {
          toast({
            variant: "destructive",
            title: "Session Expired",
            description: "Please complete signup again"
          });
          // Clear stored data and redirect to signup
          localStorage.removeItem('signupPhone');
          localStorage.removeItem('signupEmail');
          window.location.href = '/signup';
          return;
        }
        
        toast({
          variant: "destructive",
          title: "Verification Failed",
          description: data.error || 'Invalid verification code'
        });
        return;
      }

      // Verification successful - clear temporary storage
      localStorage.removeItem('signupPhone');
      localStorage.removeItem('signupEmail');
      localStorage.removeItem('loginPhoneNumber');
      localStorage.removeItem('loginVerificationCode');
      
      toast({
        title: "Phone Verified!",
        description: "Your account has been verified successfully"
      });
      
      // Wait for session to be properly established before redirect
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Invalidate auth queries to trigger refetch
      await queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
      
      // Check if this was login verification or signup verification
      const isLoginVerification = localStorage.getItem('loginPhoneNumber');
      
      if (isLoginVerification) {
        // Login verification - go to dashboard
        window.location.href = '/dashboard';
      } else {
        // Signup verification - go to trial setup
        window.location.href = '/signup?step=trial';
      }

    } catch (error) {
      console.error('Verification error:', error);
      toast({
        title: "Verification failed",
        description: "Unable to connect to server",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const resendCode = async () => {
    setIsLoading(true);
    
    try {
      const response = await fetch('/api/auth/resend-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({}),
      });

      const data = await response.json();

      if (!response.ok) {
        toast({
          variant: "destructive",
          title: "Resend Failed",
          description: data.error || 'Unable to resend code'
        });
        return;
      }

      toast({
        title: "Code Resent",
        description: "A new verification code has been sent to your phone"
      });

    } catch (error) {
      console.error('Resend error:', error);
      toast({
        title: "Resend failed",
        description: "Unable to connect to server",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-gray-900">
            Verify Your Phone
          </CardTitle>
          <p className="text-gray-600 mt-2">
            Enter the verification code sent to your phone
          </p>
        </CardHeader>
        <CardContent>
          {/* Show verification code if available (development mode or SMS failure) */}
          {displayCode && (
            <div className="mb-4 p-4 bg-orange-50 border border-orange-200 rounded-lg text-center">
              <div className="text-sm text-orange-800 mb-2">Use this verification code:</div>
              <div className="text-3xl font-bold text-orange-900 tracking-widest">{displayCode}</div>
            </div>
          )}
          
          <form onSubmit={handleVerification} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="code">Verification Code</Label>
              <Input
                id="code"
                type="text"
                placeholder="Enter 6-digit code"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value)}
                maxLength={6}
                required
              />
            </div>
            <Button 
              type="submit" 
              className="w-full bg-purple-600 hover:bg-purple-700"
              disabled={isLoading}
            >
              {isLoading ? "Verifying..." : "Verify Phone"}
            </Button>
            <Button 
              type="button"
              variant="outline"
              className="w-full"
              onClick={resendCode}
              disabled={isLoading}
            >
              Resend Code
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}