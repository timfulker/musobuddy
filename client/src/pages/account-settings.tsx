import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { useAuthContext } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import Sidebar from "@/components/sidebar";
import MobileNav from "@/components/mobile-nav";
import { useResponsive } from "@/hooks/useResponsive";
import { Lock, Eye, EyeOff, Loader2, Menu, User, Shield, CheckCircle, CreditCard, X, AlertTriangle, Clock } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

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
  const { user, isLoading: authLoading } = useAuthContext();
  const { isDesktop } = useResponsive();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Subscription management state
  const [showCancelWarning, setShowCancelWarning] = useState(false);
  const [cancelFeedback, setCancelFeedback] = useState('');
  const [isOpeningPortal, setIsOpeningPortal] = useState(false);

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

  // Cancel Subscription Mutation
  const cancelSubscription = useMutation({
    mutationFn: async (feedback?: string) => {
      const response = await apiRequest('/api/subscription/cancel', {
        method: 'POST',
        body: JSON.stringify({ feedback }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to cancel subscription');
      }

      return await response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Subscription Cancelled",
        description: `Your subscription has been cancelled. You'll keep access until ${new Date(data.accessUntil).toLocaleDateString()}.`,
      });

      setShowCancelWarning(false);
      setCancelFeedback('');

      // Refresh user data to update subscription status
      queryClient.invalidateQueries({ queryKey: ['/api/user'] });
    },
    onError: (error: any) => {
      console.error('Cancel subscription error:', error);
      toast({
        variant: "destructive",
        title: "Cancellation Failed",
        description: error.message || "Failed to cancel subscription. Please try again.",
      });
    }
  });

  // Open Stripe Customer Portal
  const openBillingPortal = async () => {
    try {
      setIsOpeningPortal(true);

      const response = await apiRequest('/api/stripe/create-portal-session', {
        method: 'POST',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to open billing portal');
      }

      const data = await response.json();

      // Open Stripe portal in new tab
      window.open(data.url, '_blank');

    } catch (error: any) {
      console.error('Billing portal error:', error);
      toast({
        variant: "destructive",
        title: "Unable to Open Billing Portal",
        description: error.message || "Failed to open billing management. Please try again.",
      });
    } finally {
      setIsOpeningPortal(false);
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

              {/* Subscription Management */}
              <Card data-testid="card-subscription-management">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CreditCard className="w-5 h-5 text-primary" />
                    Subscription & Billing
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Current Plan Status */}
                  <div className="space-y-4">
                    <h3 className="text-md font-medium text-gray-800 dark:text-gray-200">Current Plan</h3>
                    <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-gray-900 dark:text-gray-100">
                            {user?.isBetaTester ? 'Beta Tester (90-day trial)' : 'Pro Plan (30-day trial)'}
                          </p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {user?.trialEndsAt
                              ? `Trial ends ${new Date(user.trialEndsAt).toLocaleDateString()}`
                              : user?.hasPaid
                                ? 'Active subscription'
                                : 'Status unknown'
                            }
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                            {user?.hasPaid ? 'Active' : 'Trial'}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Subscription Management Buttons */}
                  <div className="space-y-4">
                    <h3 className="text-md font-medium text-gray-800 dark:text-gray-200">Manage Subscription</h3>
                    <div className="flex flex-col space-y-3">
                      <Button
                        variant="outline"
                        className="w-full justify-center"
                        onClick={openBillingPortal}
                        disabled={!user?.stripeCustomerId || isOpeningPortal}
                      >
                        {isOpeningPortal ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Opening...
                          </>
                        ) : (
                          <>
                            <CreditCard className="w-4 h-4 mr-2" />
                            Manage Billing & Payment Methods
                          </>
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        className="w-full justify-center text-red-600 hover:text-red-700 border-red-200 hover:border-red-300"
                        onClick={() => setShowCancelWarning(true)}
                        disabled={!user?.stripeSubscriptionId}
                      >
                        <X className="w-4 h-4 mr-2" />
                        Cancel Subscription
                      </Button>
                    </div>
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

      {/* Cancel Subscription Dialog */}
      <Dialog open={showCancelWarning} onOpenChange={setShowCancelWarning}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center text-orange-600 dark:text-orange-400">
              <AlertTriangle className="w-5 h-5 mr-2" />
              Cancel Your Subscription?
            </DialogTitle>
            <DialogDescription className="text-left space-y-3">
              <p>You're about to cancel your MusoBuddy subscription.</p>
              <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-3">
                <p className="text-sm font-medium text-orange-800 dark:text-orange-200 mb-2">What happens next:</p>
                <ul className="text-sm text-orange-700 dark:text-orange-300 space-y-1 list-disc list-inside">
                  <li>You'll keep full access until your billing period ends</li>
                  <li>No more charges after the current period</li>
                  <li>Your account stays active (not deleted)</li>
                  <li>You can reactivate anytime by subscribing again</li>
                </ul>
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Why are you canceling? (optional)
                </Label>
                <Select value={cancelFeedback} onValueChange={setCancelFeedback}>
                  <SelectTrigger className="w-full mt-1">
                    <SelectValue placeholder="Help us improve..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="too-expensive">Too expensive</SelectItem>
                    <SelectItem value="not-using">Not using it enough</SelectItem>
                    <SelectItem value="missing-features">Missing features I need</SelectItem>
                    <SelectItem value="found-alternative">Found a better alternative</SelectItem>
                    <SelectItem value="temporary">Temporary break</SelectItem>
                    <SelectItem value="other">Other reason</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </DialogDescription>
          </DialogHeader>

          <div className="flex justify-end space-x-2">
            <Button
              variant="outline"
              onClick={() => {
                setShowCancelWarning(false);
                setCancelFeedback('');
              }}
            >
              Keep Subscription
            </Button>
            <Button
              variant="destructive"
              onClick={() => cancelSubscription.mutate(cancelFeedback)}
              disabled={cancelSubscription.isPending}
            >
              {cancelSubscription.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Canceling...
                </>
              ) : (
                'Yes, Cancel Subscription'
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}