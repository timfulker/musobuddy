import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Eye, EyeOff, CheckCircle } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import type { AuthError } from "@supabase/supabase-js";

const resetPasswordSchema = z.object({
  newPassword: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string().min(6, "Password must be at least 6 characters"),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type ResetPasswordForm = z.infer<typeof resetPasswordSchema>;

export default function ResetPasswordPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [hasRecoverySession, setHasRecoverySession] = useState(false);
  const [isValidatingSession, setIsValidatingSession] = useState(true);
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const form = useForm<ResetPasswordForm>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      newPassword: "",
      confirmPassword: "",
    },
  });

  useEffect(() => {
    const checkRecoverySession = async () => {
      try {
        console.log('🔐 [RESET-PASSWORD] Checking for recovery session...');
        
        // Check if we have a valid session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error('❌ [RESET-PASSWORD] Session error:', sessionError);
          throw sessionError;
        }
        
        console.log('🔍 [RESET-PASSWORD] Session check result:', {
          hasSession: !!session,
          accessToken: session?.access_token ? 'present' : 'missing'
        });
        
        // Check URL for recovery parameters (access_token, type=recovery)
        const urlParams = new URLSearchParams(window.location.search);
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        
        const accessToken = urlParams.get('access_token') || hashParams.get('access_token');
        const tokenType = urlParams.get('type') || hashParams.get('type');
        const refreshToken = urlParams.get('refresh_token') || hashParams.get('refresh_token');
        
        console.log('🔍 [RESET-PASSWORD] URL parameters:', {
          hasAccessToken: !!accessToken,
          tokenType,
          hasRefreshToken: !!refreshToken
        });
        
        // If we have recovery tokens in URL, verify and establish session
        if (accessToken && tokenType === 'recovery') {
          console.log('✅ [RESET-PASSWORD] Recovery tokens found, establishing session...');
          
          const { data, error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken || ''
          });
          
          if (error) {
            console.error('❌ [RESET-PASSWORD] Failed to set recovery session:', error);
            throw error;
          }
          
          console.log('✅ [RESET-PASSWORD] Recovery session established');
          setHasRecoverySession(true);
          
          // Clean URL to remove tokens from browser address bar
          window.history.replaceState({}, document.title, window.location.pathname);
          
        } else if (session) {
          // We have an existing session, check if it's valid for password reset
          console.log('✅ [RESET-PASSWORD] Existing session found');
          setHasRecoverySession(true);
        } else {
          // No valid recovery session
          console.log('❌ [RESET-PASSWORD] No valid recovery session found');
          toast({
            title: "Invalid reset link",
            description: "This password reset link is invalid or has expired.",
            variant: "destructive",
          });
          setTimeout(() => setLocation('/auth/forgot-password'), 3000);
        }
        
      } catch (error: any) {
        console.error('❌ [RESET-PASSWORD] Recovery session validation failed:', error);
        toast({
          title: "Session error",
          description: "Unable to validate password reset session. Please try again.",
          variant: "destructive",
        });
        setTimeout(() => setLocation('/auth/forgot-password'), 3000);
      } finally {
        setIsValidatingSession(false);
      }
    };
    
    checkRecoverySession();
  }, [toast, setLocation]);

  const onSubmit = async (data: ResetPasswordForm) => {
    if (!hasRecoverySession) {
      toast({
        title: "Error",
        description: "No valid recovery session found.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    
    try {
      console.log('🔐 [RESET-PASSWORD] Attempting password update...');
      
      // Use Supabase's updateUser method to change password
      const { data, error } = await supabase.auth.updateUser({
        password: data.newPassword
      });

      if (error) {
        console.error('❌ [RESET-PASSWORD] Password update failed:', error);
        throw error;
      }

      console.log('✅ [RESET-PASSWORD] Password updated successfully');
      
      setIsSuccess(true);
      toast({
        title: "Password reset successfully",
        description: "Your password has been updated. You can now login with your new password.",
      });

      // Clear the session to force re-login with new password
      await supabase.auth.signOut();
      
      // Redirect to login after showing success message
      setTimeout(() => setLocation('/login'), 3000);
      
    } catch (error: any) {
      console.error('❌ [RESET-PASSWORD] Password update error:', error);
      
      // Handle specific Supabase auth errors
      let errorMessage = "Failed to reset password";
      
      if (error.message?.includes('session_not_found')) {
        errorMessage = "Your reset session has expired. Please request a new password reset link.";
      } else if (error.message?.includes('weak_password')) {
        errorMessage = "Password is too weak. Please choose a stronger password.";
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-1 text-center">
            <div className="mx-auto w-12 h-12 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mb-4">
              <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
            <CardTitle className="text-2xl font-bold">
              Password reset successful
            </CardTitle>
            <CardDescription>
              Your password has been updated successfully. You have been logged out for security.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-4">
                Please log in with your new password.
              </p>
              <Link href="/login">
                <Button className="w-full">
                  Continue to login
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show loading state while validating session
  if (isValidatingSession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-1 text-center">
            <CardTitle className="text-2xl font-bold">
              Validating reset link
            </CardTitle>
            <CardDescription>
              Please wait while we verify your password reset link...
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center">
              <Loader2 className="mx-auto h-8 w-8 animate-spin text-blue-600" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  if (!hasRecoverySession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-1 text-center">
            <CardTitle className="text-2xl font-bold">
              Invalid reset link
            </CardTitle>
            <CardDescription>
              This password reset link is invalid or has expired.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center">
              <Link href="/auth/forgot-password">
                <Button className="w-full" data-testid="button-request-reset-link">
                  Request new reset link
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">
            Reset password
          </CardTitle>
          <CardDescription className="text-center">
            Enter your new password below.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="newPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>New Password</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          type={showPassword ? "text" : "password"}
                          placeholder="Enter new password"
                          data-testid="input-new-password"
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

              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirm Password</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          type={showConfirmPassword ? "text" : "password"}
                          placeholder="Confirm new password"
                          data-testid="input-confirm-password"
                          {...field}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        >
                          {showConfirmPassword ? (
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
                data-testid="button-reset-password"
              >
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isLoading ? "Resetting..." : "Reset password"}
              </Button>
            </form>
          </Form>

          <div className="mt-6 text-center">
            <Link href="/login">
              <Button variant="ghost" className="text-sm" data-testid="button-back-to-login">
                Back to login
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}