import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isAdminMode, setIsAdminMode] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient(); // Proper way to access query client

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      const endpoint = isAdminMode ? '/api/auth/admin-login' : '/api/auth/login';
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        toast({
          variant: "destructive",
          title: "Login Failed",
          description: data.error || 'Invalid email or password'
        });
        return;
      }

      if (data.requiresVerification) {
        // User needs SMS verification
        toast({
          title: "Verification Required",
          description: `Please verify your phone number. SMS sent to ${data.phoneNumber}`
        });
        // Redirect to verification page
        window.location.href = '/verify-phone';
        return;
      }

      // Login successful
      toast({
        title: "Welcome back!",
        description: "Login successful"
      });
      
      // Invalidate auth queries to trigger refetch
      queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
      
      // Redirect to dashboard
      window.location.href = '/dashboard';

    } catch (error) {
      console.error('Login error:', error);
      toast({
        title: "Login failed",
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
            {isAdminMode ? 'Admin Login' : 'Login to MusoBuddy'}
          </CardTitle>
          <p className="text-gray-600 mt-2">
            {isAdminMode ? 'Administrator access - bypasses verification' : 'Professional music business management'}
          </p>
          {isAdminMode && (
            <div className="text-sm text-orange-600 bg-orange-50 p-2 rounded mt-2">
              Admin mode: Always grants access regardless of verification status
            </div>
          )}
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <Button 
              type="submit" 
              className={`w-full ${isAdminMode ? 'bg-red-600 hover:bg-red-700' : 'bg-purple-600 hover:bg-purple-700'}`}
              disabled={isLoading}
            >
              {isLoading ? "Signing In..." : (isAdminMode ? "Admin Login" : "Sign In")}
            </Button>
            
            <div className="text-center mt-4">
              <button
                type="button"
                onClick={() => setIsAdminMode(!isAdminMode)}
                className="text-sm text-gray-500 hover:text-gray-700 underline"
              >
                {isAdminMode ? 'Switch to Regular Login' : 'Admin Login'}
              </button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}