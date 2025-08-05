import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Link, useLocation } from 'wouter';

interface LoginData {
  email: string;
  password: string;
}

export default function NewLogin() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [loginData, setLoginData] = useState<LoginData>({
    email: '',
    password: ''
  });

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(loginData)
      });

      const result = await response.json();

      if (response.ok) {
        // Store auth token for future requests
        localStorage.setItem('authToken', result.authToken);
        
        toast({
          title: "Welcome back!",
          description: "You have been logged in successfully.",
        });
        setLocation('/dashboard');
      } else {
        toast({
          title: "Login Failed",
          description: result.error || "Invalid email or password.",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Network error. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAdminLogin = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/auth/admin-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          email: 'timfulker@gmail.com',
          password: 'admin123'
        })
      });

      const result = await response.json();

      if (response.ok) {
        localStorage.setItem('authToken', result.authToken);
        toast({
          title: "Admin Access",
          description: "Welcome back, Tim!",
        });
        setLocation('/dashboard');
      } else {
        toast({
          title: "Admin Login Failed",
          description: result.error,
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Network error. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-center">Welcome to MusoBuddy</CardTitle>
          <CardDescription className="text-center">
            Sign in to manage your music business
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                placeholder="your@email.com"
                value={loginData.email}
                onChange={(e) => setLoginData({
                  ...loginData,
                  email: e.target.value
                })}
                required
              />
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={loginData.password}
                onChange={(e) => setLoginData({
                  ...loginData,
                  password: e.target.value
                })}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Signing in..." : "Sign In"}
            </Button>
            
            <div className="text-center text-sm text-gray-600">
              Don't have an account?{' '}
              <Link href="/new-signup" className="text-blue-600 hover:underline font-medium">
                Create one here
              </Link>
            </div>
            
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-2 text-muted-foreground">Development</span>
              </div>
            </div>
            
            <Button 
              type="button" 
              variant="outline" 
              className="w-full" 
              onClick={handleAdminLogin}
              disabled={loading}
            >
              Quick Admin Login (Development)
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}