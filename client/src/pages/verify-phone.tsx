import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

export default function VerifyPhonePage() {
  const [verificationCode, setVerificationCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const handleVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      const response = await fetch('/api/auth/verify-phone', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ verificationCode }),
      });

      const data = await response.json();

      if (!response.ok) {
        toast({
          variant: "destructive",
          title: "Verification Failed",
          description: data.error || 'Invalid verification code'
        });
        return;
      }

      // Verification successful
      toast({
        title: "Phone Verified!",
        description: "Your account has been verified successfully"
      });
      
      // Invalidate auth queries to trigger refetch
      queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
      
      // Redirect to dashboard
      window.location.href = '/dashboard';

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