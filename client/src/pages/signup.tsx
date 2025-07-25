import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Music, Shield, CheckCircle, Phone, Mail, User, Eye, EyeOff } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

const signupSchema = z.object({
  firstName: z.string().min(2, "First name must be at least 2 characters"),
  lastName: z.string().min(2, "Last name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email address"),
  phoneNumber: z.string().min(10, "Please enter a valid phone number"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

const phoneVerificationSchema = z.object({
  verificationCode: z.string().length(6, "Verification code must be 6 digits"),
});

type SignupForm = z.infer<typeof signupSchema>;
type PhoneVerificationForm = z.infer<typeof phoneVerificationSchema>;

export default function SignupPage() {
  const [, setLocation] = useLocation();
  const [step, setStep] = useState<'signup' | 'verify' | 'trial'>('signup');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [userId, setUserId] = useState<string>('');
  const { toast } = useToast();

  const signupForm = useForm<SignupForm>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      phoneNumber: "",
      password: "",
      confirmPassword: "",
    },
  });

  const verificationForm = useForm<PhoneVerificationForm>({
    resolver: zodResolver(phoneVerificationSchema),
    defaultValues: {
      verificationCode: "",
    },
  });

  const signupMutation = useMutation({
    mutationFn: async (data: SignupForm) => {
      return apiRequest('/api/auth/signup', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    onSuccess: (data: any) => {
      setUserId(data.userId);
      setStep('verify');
      toast({
        title: "Account created successfully!",
        description: "Please check your phone for a verification code.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Signup failed",
        description: error.message || "An error occurred during signup",
        variant: "destructive",
      });
    },
  });

  const verificationMutation = useMutation({
    mutationFn: async (data: PhoneVerificationForm) => {
      return apiRequest('/api/auth/verify-phone', {
        method: 'POST',
        body: JSON.stringify({
          userId,
          verificationCode: data.verificationCode,
        }),
      });
    },
    onSuccess: () => {
      setStep('trial');
      toast({
        title: "Phone verified!",
        description: "Your account is now verified. Starting your free trial...",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Verification failed",
        description: error.message || "Invalid verification code",
        variant: "destructive",
      });
    },
  });

  const resendCodeMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('/api/auth/resend-verification', {
        method: 'POST',
        body: JSON.stringify({ userId }),
      });
    },
    onSuccess: () => {
      toast({
        title: "Code sent!",
        description: "A new verification code has been sent to your phone.",
      });
    },
  });

  const startTrialMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('/api/auth/start-trial', {
        method: 'POST',
        body: JSON.stringify({ userId }),
      });
    },
    onSuccess: (data: any) => {
      // Redirect to Stripe checkout for trial setup
      window.location.href = data.checkoutUrl;
    },
    onError: (error: any) => {
      toast({
        title: "Trial setup failed",
        description: error.message || "Unable to start trial",
        variant: "destructive",
      });
    },
  });

  const onSignupSubmit = (data: SignupForm) => {
    signupMutation.mutate(data);
  };

  const onVerificationSubmit = (data: PhoneVerificationForm) => {
    verificationMutation.mutate(data);
  };

  const onStartTrial = () => {
    startTrialMutation.mutate();
  };

  if (step === 'signup') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          {/* Header */}
          <div className="text-center mb-8">
            <Link href="/" className="inline-flex items-center space-x-2 mb-6">
              <Music className="h-8 w-8 text-purple-600" />
              <span className="text-2xl font-bold text-gray-900 dark:text-white">MusoBuddy</span>
            </Link>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              Start Your Free Trial
            </h1>
            <p className="text-gray-600 dark:text-gray-300">
              Join hundreds of professional musicians using MusoBuddy
            </p>
          </div>

          {/* Trial Badge */}
          <div className="text-center mb-6">
            <Badge className="bg-green-100 text-green-800 border-green-200 px-4 py-2">
              <CheckCircle className="h-4 w-4 mr-2" />
              14-Day Free Trial • No Credit Card Required
            </Badge>
          </div>

          {/* Signup Form */}
          <Card>
            <CardHeader>
              <CardTitle>Create Your Account</CardTitle>
              <CardDescription>
                Enter your details to get started with your free trial
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...signupForm}>
                <form onSubmit={signupForm.handleSubmit(onSignupSubmit)} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={signupForm.control}
                      name="firstName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>First Name</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                              <Input {...field} placeholder="John" className="pl-10" />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={signupForm.control}
                      name="lastName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Last Name</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                              <Input {...field} placeholder="Smith" className="pl-10" />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={signupForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email Address</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                            <Input {...field} type="email" placeholder="john@example.com" className="pl-10" />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={signupForm.control}
                    name="phoneNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone Number</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Phone className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                            <Input {...field} placeholder="+44 7700 900123" className="pl-10" />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={signupForm.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Password</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input
                              {...field}
                              type={showPassword ? "text" : "password"}
                              placeholder="••••••••"
                              className="pr-10"
                            />
                            <button
                              type="button"
                              className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                              onClick={() => setShowPassword(!showPassword)}
                            >
                              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={signupForm.control}
                    name="confirmPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Confirm Password</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input
                              {...field}
                              type={showConfirmPassword ? "text" : "password"}
                              placeholder="••••••••"
                              className="pr-10"
                            />
                            <button
                              type="button"
                              className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            >
                              {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button
                    type="submit"
                    className="w-full bg-purple-600 hover:bg-purple-700"
                    disabled={signupMutation.isPending}
                  >
                    {signupMutation.isPending ? "Creating Account..." : "Create Account"}
                  </Button>
                </form>
              </Form>

              <Separator className="my-6" />

              <div className="text-center text-sm text-gray-600 dark:text-gray-400">
                Already have an account?{" "}
                <Link href="/login" className="text-purple-600 hover:underline">
                  Sign in
                </Link>
              </div>
            </CardContent>
          </Card>

          {/* Security Notice */}
          <div className="mt-6 text-center">
            <div className="flex items-center justify-center space-x-2 text-sm text-gray-500">
              <Shield className="h-4 w-4" />
              <span>Your data is protected with enterprise-grade security</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (step === 'verify') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <Link href="/" className="inline-flex items-center space-x-2 mb-6">
              <Music className="h-8 w-8 text-purple-600" />
              <span className="text-2xl font-bold text-gray-900 dark:text-white">MusoBuddy</span>
            </Link>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              Verify Your Phone
            </h1>
            <p className="text-gray-600 dark:text-gray-300">
              We've sent a 6-digit code to your phone number
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Phone className="h-5 w-5 text-purple-600" />
                <span>Phone Verification</span>
              </CardTitle>
              <CardDescription>
                Enter the verification code sent to your phone
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...verificationForm}>
                <form onSubmit={verificationForm.handleSubmit(onVerificationSubmit)} className="space-y-4">
                  <FormField
                    control={verificationForm.control}
                    name="verificationCode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Verification Code</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="123456"
                            className="text-center text-2xl tracking-widest"
                            maxLength={6}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button
                    type="submit"
                    className="w-full bg-purple-600 hover:bg-purple-700"
                    disabled={verificationMutation.isPending}
                  >
                    {verificationMutation.isPending ? "Verifying..." : "Verify Phone Number"}
                  </Button>
                </form>
              </Form>

              <div className="mt-4 text-center">
                <Button
                  variant="ghost"
                  onClick={() => resendCodeMutation.mutate()}
                  disabled={resendCodeMutation.isPending}
                  className="text-sm"
                >
                  {resendCodeMutation.isPending ? "Sending..." : "Resend Code"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (step === 'trial') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <Link href="/" className="inline-flex items-center space-x-2 mb-6">
              <Music className="h-8 w-8 text-purple-600" />
              <span className="text-2xl font-bold text-gray-900 dark:text-white">MusoBuddy</span>
            </Link>
            <div className="mb-4">
              <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              Account Verified!
            </h1>
            <p className="text-gray-600 dark:text-gray-300">
              Start your 14-day free trial and experience the full power of MusoBuddy
            </p>
          </div>

          <Card>
            <CardHeader className="text-center">
              <CardTitle>Start Your Free Trial</CardTitle>
              <div className="text-4xl font-bold text-purple-600 my-4">
                14 Days Free
              </div>
              <CardDescription>
                Then £9.99/month for unlimited access to all features
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Alert className="mb-6">
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  No payment required now. You'll only be charged after your 14-day trial ends.
                </AlertDescription>
              </Alert>

              <Button
                onClick={onStartTrial}
                className="w-full bg-purple-600 hover:bg-purple-700 text-lg py-3"
                disabled={startTrialMutation.isPending}
              >
                {startTrialMutation.isPending ? "Setting up trial..." : "Start My Free Trial"}
              </Button>

              <div className="mt-4 text-center text-sm text-gray-500">
                Cancel anytime during your trial with no charges
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return null;
}