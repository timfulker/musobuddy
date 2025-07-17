import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { queryClient } from "@/lib/queryClient";
import logoImage from "/musobuddy-logo-purple.png";

export default function LandingPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const loginMutation = useMutation({
    mutationFn: async (credentials: { email: string; password: string }) => {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
        credentials: 'include',
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Login failed');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      toast({
        title: "Welcome to MusoBuddy!",
        description: "Login successful",
      });
      setTimeout(() => setLocation("/"), 100);
    },
    onError: (error: Error) => {
      setError(error.message);
      toast({
        title: "Login failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const signUpMutation = useMutation({
    mutationFn: async (credentials: { email: string; password: string }) => {
      const response = await fetch('/api/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
        credentials: 'include',
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Registration failed');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      toast({
        title: "Welcome to MusoBuddy!",
        description: "Account created successfully",
      });
      setTimeout(() => setLocation("/"), 100);
    },
    onError: (error: Error) => {
      setError(error.message);
      toast({
        title: "Registration failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    
    if (!email || !password) {
      setError("Please enter both email and password");
      return;
    }

    if (isSignUp) {
      signUpMutation.mutate({ email, password });
    } else {
      loginMutation.mutate({ email, password });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <img src={logoImage} alt="MusoBuddy" className="h-16 w-auto" />
          </div>
          <CardTitle className="text-2xl font-bold text-purple-800 dark:text-purple-200">
            {isSignUp ? "Join MusoBuddy" : "Welcome to MusoBuddy"}
          </CardTitle>
          <CardDescription className="text-gray-600 dark:text-gray-400">
            Your complete music business management platform
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {!isSignUp && (
            <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
              <p>✓ Manage bookings and contracts</p>
              <p>✓ Generate professional invoices</p>
              <p>✓ Track compliance documents</p>
              <p>✓ AI-powered workflow optimization</p>
            </div>
          )}
          
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="Enter your email"
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
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            
            <Button 
              type="submit"
              className="w-full bg-purple-600 hover:bg-purple-700 text-white"
              size="lg"
              disabled={loginMutation.isPending || signUpMutation.isPending}
            >
              {loginMutation.isPending || signUpMutation.isPending 
                ? "Please wait..." 
                : isSignUp ? "Create Account" : "Login to MusoBuddy"
              }
            </Button>
          </form>
          
          <div className="text-center">
            <Button
              variant="ghost"
              onClick={() => {
                setIsSignUp(!isSignUp);
                setError("");
              }}
              className="text-purple-600 hover:text-purple-700"
            >
              {isSignUp ? "Already have an account? Login" : "Need an account? Sign up"}
            </Button>
          </div>
          
          <p className="text-xs text-center text-gray-500 dark:text-gray-400">
            Secure authentication for your music business
          </p>
        </CardContent>
      </Card>
    </div>
  );
}