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
import { Calendar, FileText, CreditCard, Shield, Zap, Users, Star, CheckCircle, Music, TrendingUp, Clock, Target, Play, ArrowRight } from "lucide-react";

export default function LandingPage() {
  const [showLogin, setShowLogin] = useState(false);
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

  if (showLogin) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <img src={logoImage} alt="MusoBuddy" className="h-16 w-auto" />
            </div>
            <CardTitle className="text-2xl font-bold text-purple-800 dark:text-purple-200">
              {isSignUp ? "Join MusoBuddy" : "Welcome Back"}
            </CardTitle>
            <CardDescription className="text-gray-600 dark:text-gray-400">
              Access your music business dashboard
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
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
            
            <div className="text-center space-y-2">
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
              
              <Button
                variant="ghost"
                onClick={() => setShowLogin(false)}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                ← Back to homepage
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {/* Header */}
      <header className="bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-2">
              <img src={logoImage} alt="MusoBuddy" className="h-10 w-auto" />
              <h1 className="text-2xl font-bold text-purple-800 dark:text-purple-200">MusoBuddy</h1>
            </div>
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                onClick={() => setShowLogin(true)}
                className="text-purple-600 hover:text-purple-700"
              >
                Login
              </Button>
              <Button
                onClick={() => {
                  setIsSignUp(true);
                  setShowLogin(true);
                }}
                className="bg-purple-600 hover:bg-purple-700 text-white"
              >
                Get Started
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center">
          <div className="mb-8">
            <h2 className="text-5xl md:text-6xl font-bold text-gray-900 dark:text-white mb-6">
              Your Complete
              <span className="text-purple-600 block">Music Business</span>
              Management Platform
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto mb-12">
              Streamline your music career with intelligent booking management, professional contracts, 
              automated invoicing, and compliance tracking - all in one powerful platform designed for musicians.
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
            <Button
              onClick={() => {
                setIsSignUp(true);
                setShowLogin(true);
              }}
              size="lg"
              className="bg-purple-600 hover:bg-purple-700 text-white px-8 py-4 text-lg"
            >
              Start Your Free Trial
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            <Button
              onClick={() => setShowLogin(true)}
              variant="outline"
              size="lg"
              className="border-purple-600 text-purple-600 hover:bg-purple-50 px-8 py-4 text-lg"
            >
              <Play className="mr-2 h-5 w-5" />
              See Demo
            </Button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-20">
            <div className="text-center">
              <div className="text-3xl font-bold text-purple-600 mb-2">10,000+</div>
              <div className="text-sm text-gray-600 dark:text-gray-300">Musicians</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-purple-600 mb-2">50K+</div>
              <div className="text-sm text-gray-600 dark:text-gray-300">Bookings</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-purple-600 mb-2">£2M+</div>
              <div className="text-sm text-gray-600 dark:text-gray-300">Revenue</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-purple-600 mb-2">98%</div>
              <div className="text-sm text-gray-600 dark:text-gray-300">Satisfaction</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 bg-white dark:bg-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h3 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
              Everything You Need to Succeed
            </h3>
            <p className="text-xl text-gray-600 dark:text-gray-300">
              Professional tools built specifically for musicians and music industry professionals
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="p-6 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
              <Calendar className="h-12 w-12 text-purple-600 mb-4" />
              <h4 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Smart Booking Management</h4>
              <p className="text-gray-600 dark:text-gray-300">
                Intelligent enquiry tracking, availability checking, and conflict detection to never miss a gig opportunity.
              </p>
            </div>
            
            <div className="p-6 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <FileText className="h-12 w-12 text-blue-600 mb-4" />
              <h4 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Professional Contracts</h4>
              <p className="text-gray-600 dark:text-gray-300">
                Musicians' Union compliant contracts with digital signatures, automated reminders, and secure storage.
              </p>
            </div>
            
            <div className="p-6 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <CreditCard className="h-12 w-12 text-green-600 mb-4" />
              <h4 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Automated Invoicing</h4>
              <p className="text-gray-600 dark:text-gray-300">
                Professional invoices with payment tracking, automated reminders, and integrated financial management.
              </p>
            </div>
            
            <div className="p-6 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
              <Shield className="h-12 w-12 text-yellow-600 mb-4" />
              <h4 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Compliance Tracking</h4>
              <p className="text-gray-600 dark:text-gray-300">
                Monitor insurance, licenses, PAT testing, and other requirements with automated alerts.
              </p>
            </div>
            
            <div className="p-6 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg">
              <Zap className="h-12 w-12 text-indigo-600 mb-4" />
              <h4 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">AI-Powered Insights</h4>
              <p className="text-gray-600 dark:text-gray-300">
                Intelligent email parsing, workflow optimization, and automated suggestions to boost productivity.
              </p>
            </div>
            
            <div className="p-6 bg-pink-50 dark:bg-pink-900/20 rounded-lg">
              <Users className="h-12 w-12 text-pink-600 mb-4" />
              <h4 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Client Management</h4>
              <p className="text-gray-600 dark:text-gray-300">
                Comprehensive contact management with communication history and relationship tracking.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-purple-600 text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h3 className="text-3xl md:text-4xl font-bold mb-6">
            Ready to Transform Your Music Business?
          </h3>
          <p className="text-xl mb-8 opacity-90">
            Join thousands of musicians who have streamlined their careers with MusoBuddy
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              onClick={() => {
                setIsSignUp(true);
                setShowLogin(true);
              }}
              size="lg"
              className="bg-white text-purple-600 hover:bg-gray-100 px-8 py-4 text-lg"
            >
              Start Your Free Trial
            </Button>
            <Button
              onClick={() => setShowLogin(true)}
              variant="outline"
              size="lg"
              className="border-white text-white hover:bg-white hover:text-purple-600 px-8 py-4 text-lg"
            >
              Login to Dashboard
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center mb-4">
                <img src={logoImage} alt="MusoBuddy" className="h-8 w-auto" />
                <span className="ml-2 text-xl font-bold text-purple-400">MusoBuddy</span>
              </div>
              <p className="text-gray-400">
                Professional music business management platform for musicians.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Features</h4>
              <ul className="space-y-2 text-gray-400">
                <li>Booking Management</li>
                <li>Contract Generation</li>
                <li>Invoice Processing</li>
                <li>Compliance Tracking</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Support</h4>
              <ul className="space-y-2 text-gray-400">
                <li>Help Center</li>
                <li>Documentation</li>
                <li>Contact Us</li>
                <li>Community</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-gray-400">
                <li>About</li>
                <li>Privacy Policy</li>
                <li>Terms of Service</li>
                <li>Status</li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
            <p>&copy; 2024 MusoBuddy. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}