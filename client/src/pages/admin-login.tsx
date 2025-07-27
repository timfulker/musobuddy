import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { Shield } from "lucide-react";

export default function AdminLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      const response = await fetch('/api/auth/admin-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        toast({
          variant: "destructive",
          title: "Admin Login Failed",
          description: data.error || 'Invalid admin credentials'
        });
        return;
      }

      // Admin login successful
      console.log('✅ Admin login successful:', data);
      
      // Check immediately if auth is working
      const authCheck = await fetch('/api/auth/user', {
        credentials: 'include'
      });
      const authData = await authCheck.json();
      console.log('🔍 Immediate auth check after admin login:', authData);
      
      toast({
        title: "Admin Access Granted",
        description: "Welcome back, administrator!"
      });
      
      // Invalidate auth queries to trigger refetch
      queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
      
      // Small delay to ensure session is set before redirect
      setTimeout(() => {
        window.location.href = '/dashboard';
      }, 500);

    } catch (error) {
      console.error('Admin login error:', error);
      toast({
        title: "Admin login failed",
        description: "Unable to connect to server",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-orange-100">
      <Card className="w-full max-w-md border-red-200">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <Shield className="h-12 w-12 text-red-600" />
          </div>
          <CardTitle className="text-2xl font-bold text-red-800">
            Administrator Login
          </CardTitle>
          <p className="text-red-600 mt-2">
            Bypass all verification requirements
          </p>
          <div className="text-sm text-red-700 bg-red-50 p-3 rounded mt-3 border border-red-200">
            <strong>Admin Access:</strong> This login bypasses phone verification and grants immediate dashboard access regardless of account states.
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAdminLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-red-700">Admin Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="admin@musobuddy.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="border-red-200 focus:border-red-400"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-red-700">Admin Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Your admin password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="border-red-200 focus:border-red-400"
                required
              />
            </div>
            <Button 
              type="submit" 
              className="w-full bg-red-600 hover:bg-red-700 text-white"
              disabled={isLoading}
            >
              {isLoading ? "Authenticating..." : "Admin Login"}
            </Button>
            
            <div className="text-center mt-4">
              <a
                href="/login"
                className="text-sm text-gray-500 hover:text-gray-700 underline"
              >
                Regular User Login
              </a>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}