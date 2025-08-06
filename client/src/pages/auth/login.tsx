import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Eye, EyeOff } from "lucide-react";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";

// Simple auth token key - development uses admin-only access  
const getAuthTokenKey = () => {
  const hostname = window.location.hostname;
  
  // Development: Admin-only access for simplified testing
  if (hostname.includes('janeway.replit.dev') || hostname.includes('localhost')) {
    return 'authToken_dev_admin';
  }
  
  // Production: Environment-specific to prevent conflicts  
  return `authToken_${hostname.replace(/[^a-zA-Z0-9]/g, '_')}`;
};

// Check if we're in development mode
const isDevelopment = () => {
  const hostname = window.location.hostname;
  return hostname.includes('janeway.replit.dev') || hostname.includes('localhost');
};

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { toast } = useToast();

  const form = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      // Development: Default to admin credentials for simplified access
      email: isDevelopment() ? "timfulker@gmail.com" : "",
      password: isDevelopment() ? "admin123" : "",
    },
  });

  const onSubmit = async (data: LoginForm) => {
    setIsLoading(true);
    
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();
      console.log('🔐 Login response:', result);

      if (!response.ok) {
        throw new Error(result.error || 'Login failed');
      }

      // Clear tokens from other environments for forced separation
      const hostname = window.location.hostname;
      if (hostname.includes('janeway.replit.dev') || hostname.includes('localhost')) {
        // Development login - clear production token
        localStorage.removeItem('authToken_prod');
        console.log('🔄 Cleared production token for development login');
      } else {
        // Production login - clear development token  
        localStorage.removeItem('authToken_dev_admin');
        console.log('🔄 Cleared development token for production login');
      }
      
      // Store JWT token with environment-specific key
      const authTokenKey = getAuthTokenKey();
      console.log('🔑 Storing token with key:', authTokenKey);
      localStorage.setItem(authTokenKey, result.authToken);
      
      // Verify token was stored
      const storedToken = localStorage.getItem(authTokenKey);
      console.log('✅ Token stored successfully:', !!storedToken);
      
      toast({
        title: "Login successful",
        description: "Welcome back!",
      });

      // Redirect to dashboard
      window.location.href = '/dashboard';
      
    } catch (error: any) {
      toast({
        title: "Login failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">
            Welcome back
          </CardTitle>
          <CardDescription className="text-center">
            Sign in to your MusoBuddy account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="Enter your email"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          type={showPassword ? "text" : "password"}
                          placeholder="Enter your password"
                          {...field}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                          onClick={() => setShowPassword(!showPassword)}
                        >
                          {showPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                className="w-full"
                disabled={isLoading}
              >
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isLoading ? "Signing in..." : "Sign in"}
              </Button>
            </form>
          </Form>

          <div className="mt-6 text-center text-sm">
            <span className="text-muted-foreground">Don't have an account? </span>
            <Link href="/signup">
              <span className="text-primary font-medium hover:underline cursor-pointer">
                Sign up
              </span>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}