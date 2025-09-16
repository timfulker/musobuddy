import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import Sidebar from "@/components/sidebar";
import MobileNav from "@/components/mobile-nav";
import { useResponsive } from "@/hooks/useResponsive";
import { Lock, Eye, EyeOff, Loader2, Menu, User, Shield, CheckCircle } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

// Password change form validation schema
const passwordChangeSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string()
    .min(6, "New password must be at least 6 characters")
    .max(100, "Password is too long"),
  confirmPassword: z.string().min(1, "Please confirm your new password"),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "New passwords don't match",
  path: ["confirmPassword"],
});

type PasswordChangeForm = z.infer<typeof passwordChangeSchema>;

export default function AccountSettings() {
  const { user, isLoading: authLoading } = useAuth();
  const { isDesktop } = useResponsive();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const { toast } = useToast();

  const passwordForm = useForm<PasswordChangeForm>({
    resolver: zodResolver(passwordChangeSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  const updatePassword = async (data: PasswordChangeForm) => {
    try {
      console.log('🔐 [PASSWORD-UPDATE] Starting password update process via backend API');

      // Call backend API endpoint for password change
      const response = await apiRequest('/api/auth/change-password', {
        method: 'POST',
        body: {
          currentPassword: data.currentPassword,
          newPassword: data.newPassword
        }
      });

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Password update failed');
      }

      console.log('✅ [PASSWORD-UPDATE] Password updated successfully via backend');
      return true;
    } catch (error: any) {
      console.error("❌ [PASSWORD-UPDATE] Error:", error);
      
      // Extract meaningful error message from backend response
      if (error.message.includes('Current password is incorrect')) {
        throw new Error("Current password is incorrect. Please check your password and try again.");
      }
      
      if (error.message.includes('Password must be at least')) {
        throw new Error("New password doesn't meet requirements. Please ensure it's at least 6 characters long.");
      }
      
      if (error.message.includes('session has expired')) {
        throw new Error("Your session has expired. Please sign in again.");
      }
      
      // Return the backend error message or a generic fallback
      throw new Error(error.message || "Unable to update password. Please try again or contact support.");
    }
  };

  const onPasswordSubmit = async (data: PasswordChangeForm) => {
    try {
      // Guard clause: Prevent submission if no user or email
      if (!user) {
        toast({
          variant: "destructive",
          title: "Authentication Error",
          description: "Please refresh the page and sign in again.",
        });
        return;
      }

      if (!user.email) {
        toast({
          variant: "destructive",
          title: "Account Error",
          description: "No email address found on your account. Please contact support.",
        });
        return;
      }

      console.log('🔐 [PASSWORD-FORM] Starting password update via backend API');
      await updatePassword(data);
      
      toast({
        title: "Password Updated",
        description: "Your password has been successfully updated. You'll remain signed in.",
      });

      // Reset form after successful update
      passwordForm.reset({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
      
      // Clear password visibility states
      setShowCurrentPassword(false);
      setShowNewPassword(false);
      setShowConfirmPassword(false);
      
    } catch (error: any) {
      console.error("❌ [PASSWORD-FORM] Failed:", error);
      
      toast({
        variant: "destructive",
        title: "Failed to Update Password",
        description: error.message || "An unexpected error occurred. Please try again.",
      });
    }
  };

  // Show loading screen while auth is initializing
  if (authLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-50 dark:bg-slate-900">
        <div className="text-center space-y-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
          <p className="text-sm text-gray-600 dark:text-gray-400">Loading account settings...</p>
        </div>
      </div>
    );
  }

  // Guard clause: Redirect if no user after loading
  if (!user) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-50 dark:bg-slate-900">
        <div className="text-center space-y-4">
          <Shield className="w-12 h-12 text-amber-600 mx-auto" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Authentication Required</h2>
          <p className="text-gray-600 dark:text-gray-400">Please sign in to access account settings.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-slate-900">
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      
      {/* Mobile Navigation */}
      {!isDesktop && (
        <MobileNav>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsSidebarOpen(true)}
            className="mr-2"
            data-testid="button-mobile-menu"
          >
            <Menu className="w-5 h-5" />
          </Button>
        </MobileNav>
      )}

      {/* Main Content */}
      <div className={`flex-1 flex flex-col ${isDesktop ? 'ml-64' : ''} ${!isDesktop ? 'pt-16' : ''}`}>
        <div className="flex-1 overflow-y-auto">
          <div className="p-4 md:p-8">
            <div className="max-w-4xl mx-auto space-y-8">
              {/* Header */}
              <div className="space-y-2">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Account Settings</h1>
                <p className="text-gray-600 dark:text-gray-300">
                  Manage your account security and personal information.
                </p>
              </div>

              {/* Account Information */}
              <Card data-testid="card-account-info">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="w-5 h-5 text-primary" />
                    Account Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Name
                      </label>
                      <p className="text-sm text-gray-900 dark:text-white" data-testid="text-user-name">
                        {user?.displayName || `${user?.firstName} ${user?.lastName}` || 'Not provided'}
                      </p>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Email
                      </label>
                      <p className="text-sm text-gray-900 dark:text-white" data-testid="text-user-email">
                        {user?.email || 'Not available'}
                      </p>
                      {!user?.email && (
                        <p className="text-xs text-amber-600 dark:text-amber-400">
                          ⚠️ No email address found. Please contact support.
                        </p>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 pt-2">
                    {user?.emailVerified === true ? (
                      <>
                        <CheckCircle className="w-4 h-4 text-green-600" />
                        <span className="text-sm text-green-600 font-medium" data-testid="status-email-verified">
                          Email verified
                        </span>
                      </>
                    ) : user?.emailVerified === false ? (
                      <>
                        <Shield className="w-4 h-4 text-amber-600" />
                        <span className="text-sm text-amber-600 font-medium" data-testid="status-email-unverified">
                          Email not verified
                        </span>
                      </>
                    ) : (
                      <>
                        <Shield className="w-4 h-4 text-gray-500" />
                        <span className="text-sm text-gray-500" data-testid="status-email-unknown">
                          Email verification status unknown
                        </span>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Password Change */}
              <Card data-testid="card-password-change">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Lock className="w-5 h-5 text-primary" />
                    Change Password
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {!user?.email ? (
                    <div className="text-center py-8 space-y-4">
                      <Shield className="w-12 h-12 text-amber-600 mx-auto" />
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white">Email Required</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        An email address is required to change your password. Please contact support for assistance.
                      </p>
                    </div>
                  ) : (
                    <Form {...passwordForm}>
                      <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-6">
                      {/* Current Password */}
                      <FormField
                        control={passwordForm.control}
                        name="currentPassword"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Current Password</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <Input
                                  {...field}
                                  type={showCurrentPassword ? "text" : "password"}
                                  placeholder="Enter your current password"
                                  className="pr-10"
                                  data-testid="input-current-password"
                                />
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                                  data-testid="button-toggle-current-password"
                                >
                                  {showCurrentPassword ? (
                                    <EyeOff className="w-4 h-4 text-gray-500" />
                                  ) : (
                                    <Eye className="w-4 h-4 text-gray-500" />
                                  )}
                                </Button>
                              </div>
                            </FormControl>
                            <FormDescription>
                              Enter your current password to verify your identity
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {/* New Password */}
                      <FormField
                        control={passwordForm.control}
                        name="newPassword"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>New Password</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <Input
                                  {...field}
                                  type={showNewPassword ? "text" : "password"}
                                  placeholder="Enter your new password"
                                  className="pr-10"
                                  data-testid="input-new-password"
                                />
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                                  onClick={() => setShowNewPassword(!showNewPassword)}
                                  data-testid="button-toggle-new-password"
                                >
                                  {showNewPassword ? (
                                    <EyeOff className="w-4 h-4 text-gray-500" />
                                  ) : (
                                    <Eye className="w-4 h-4 text-gray-500" />
                                  )}
                                </Button>
                              </div>
                            </FormControl>
                            <FormDescription>
                              Must be at least 6 characters long
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {/* Confirm New Password */}
                      <FormField
                        control={passwordForm.control}
                        name="confirmPassword"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Confirm New Password</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <Input
                                  {...field}
                                  type={showConfirmPassword ? "text" : "password"}
                                  placeholder="Confirm your new password"
                                  className="pr-10"
                                  data-testid="input-confirm-password"
                                />
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                  data-testid="button-toggle-confirm-password"
                                >
                                  {showConfirmPassword ? (
                                    <EyeOff className="w-4 h-4 text-gray-500" />
                                  ) : (
                                    <Eye className="w-4 h-4 text-gray-500" />
                                  )}
                                </Button>
                              </div>
                            </FormControl>
                            <FormDescription>
                              Re-enter your new password to confirm
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                        {/* Submit Button */}
                        <div className="flex justify-start">
                          <Button
                            type="submit"
                            disabled={passwordForm.formState.isSubmitting || !user?.email}
                            className="min-w-[140px]"
                            data-testid="button-update-password"
                          >
                            {passwordForm.formState.isSubmitting ? (
                              <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Updating...
                              </>
                            ) : (
                              <>
                                <Lock className="w-4 h-4 mr-2" />
                                Update Password
                              </>
                            )}
                          </Button>
                        </div>
                      </form>
                    </Form>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}