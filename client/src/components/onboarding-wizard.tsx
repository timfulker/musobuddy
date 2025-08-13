import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { 
  User, 
  Mail, 
  CreditCard, 
  PoundSterling, 
  Palette, 
  CheckCircle, 
  ArrowRight, 
  ArrowLeft,
  Music,
  MapPin,
  Phone,
  Briefcase
} from "lucide-react";

interface OnboardingWizardProps {
  isOpen: boolean;
  onComplete: () => void;
  onDismiss?: () => void;
  user: any;
}

const STEPS = [
  { id: 'address', title: 'Business Address', icon: MapPin },
  { id: 'email', title: 'Email Setup', icon: Mail },
  { id: 'bank', title: 'Bank Details', icon: CreditCard },
  { id: 'widget', title: 'Booking Widget', icon: Music },
  { id: 'complete', title: 'All Set!', icon: CheckCircle }
];

const THEME_OPTIONS = [
  { value: 'purple', label: 'Purple', color: '#8B5CF6' },
  { value: 'ocean-blue', label: 'Ocean Blue', color: '#0EA5E9' },
  { value: 'forest-green', label: 'Forest Green', color: '#059669' },
  { value: 'clean-pro-audio', label: 'Clean Pro Audio', color: '#6B7280' },
  { value: 'midnight-blue', label: 'Midnight Blue', color: '#191970' }
];

export default function OnboardingWizard({ isOpen, onComplete, onDismiss, user }: OnboardingWizardProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    // Business Address
    addressLine1: '',
    addressLine2: '',
    city: '',
    postcode: '',
    country: 'United Kingdom',
    
    // Email Setup
    businessEmail: user?.email || '',
    emailPrefix: '', // CRITICAL: For receiving booking emails
    
    // Bank Details
    bankName: '',
    accountName: '',
    accountNumber: '',
    sortCode: '',
    
    // Widget Setup
    widgetToken: '',
    qrCodeGenerated: false
  });

  const updateFormData = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const completeOnboardingMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest('/api/onboarding/complete', {
        method: 'POST',
        body: data
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Welcome to MusoBuddy!",
        description: "Your account is now fully set up and ready to use.",
      });
      queryClient.invalidateQueries();
      onComplete();
    },
    onError: async (error: any) => {
      console.error('❌ Onboarding failed:', error);
      
      // Try to get more specific error from response
      let errorMessage = "Failed to complete setup. Please try again.";
      if (error?.response) {
        try {
          const errorData = await error.response.json();
          errorMessage = errorData.error || errorMessage;
        } catch (e) {
          // If can't parse response, use default message
        }
      }
      
      toast({
        title: "Setup Error", 
        description: errorMessage,
        variant: "destructive",
      });
    }
  });

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = () => {
    // Validate required fields
    if (!formData.firstName || !formData.lastName || !formData.emailPrefix || !formData.phoneNumber) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields marked with *",
        variant: "destructive",
      });
      return;
    }

    console.log('🚀 Submitting onboarding data:', formData);
    completeOnboardingMutation.mutate(formData);
  };

  const renderStepContent = () => {
    const step = STEPS[currentStep];
    
    switch (step.id) {
      case 'business':
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <Music className="w-16 h-16 mx-auto text-primary mb-4" />
              <h3 className="text-xl font-semibold">Tell us about your music business</h3>
              <p className="text-gray-600 mt-2">This helps us customize MusoBuddy for your specific needs</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name *</Label>
                <Input
                  id="firstName"
                  value={formData.firstName}
                  onChange={(e) => updateFormData('firstName', e.target.value)}
                  placeholder="Your first name"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name *</Label>
                <Input
                  id="lastName"
                  value={formData.lastName}
                  onChange={(e) => updateFormData('lastName', e.target.value)}
                  placeholder="Your last name"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="businessName">Business Name (optional)</Label>
              <Input
                id="businessName"
                value={formData.businessName}
                onChange={(e) => updateFormData('businessName', e.target.value)}
                placeholder="e.g., Smith Music Services (leave blank to use your name)"
              />
              <p className="text-xs text-gray-500">Most musicians trade under their own name as sole traders</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="instrumentsServices">Instruments & Services</Label>
              <Textarea
                id="instrumentsServices"
                value={formData.instrumentsServices}
                onChange={(e) => updateFormData('instrumentsServices', e.target.value)}
                placeholder="e.g., Saxophone, DJ, Piano, Vocals, Sound System, Lighting..."
                rows={3}
              />
              <p className="text-xs text-gray-500">These will appear on your settings page for contract templates</p>
            </div>
          </div>
        );

      case 'contact':
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <Mail className="w-16 h-16 mx-auto text-primary mb-4" />
              <h3 className="text-xl font-semibold">Contact & Email Setup</h3>
              <p className="text-gray-600 mt-2">Set up your professional booking email address</p>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="emailPrefix">Email Prefix for Bookings *</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="emailPrefix"
                    value={formData.emailPrefix}
                    onChange={(e) => updateFormData('emailPrefix', e.target.value.toLowerCase().replace(/[^a-z0-9]/g, ''))}
                    placeholder="e.g., tim, saxweddings, musicservices"
                    className="flex-1"
                  />
                  <span className="text-gray-500">@enquiries.musobuddy.com</span>
                </div>
                <p className="text-xs text-gray-500">
                  Your personalized email for receiving booking requests (e.g., {formData.emailPrefix || 'youremail'}@enquiries.musobuddy.com)
                </p>
                <p className="text-xs text-amber-600">
                  ⚠️ This email prefix must be unique and cannot be changed later
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="phoneNumber">Phone Number *</Label>
                <Input
                  id="phoneNumber"
                  value={formData.phoneNumber}
                  onChange={(e) => updateFormData('phoneNumber', e.target.value)}
                  placeholder="e.g., 07123 456789"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="addressLine1">Address Line 1</Label>
                <Input
                  id="addressLine1"
                  value={formData.addressLine1}
                  onChange={(e) => updateFormData('addressLine1', e.target.value)}
                  placeholder="Street address"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="addressLine2">Address Line 2</Label>
                <Input
                  id="addressLine2"
                  value={formData.addressLine2}
                  onChange={(e) => updateFormData('addressLine2', e.target.value)}
                  placeholder="Apartment, suite, unit, building, floor, etc."
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    value={formData.city}
                    onChange={(e) => updateFormData('city', e.target.value)}
                    placeholder="e.g., Manchester"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="postcode">Postcode</Label>
                  <Input
                    id="postcode"
                    value={formData.postcode}
                    onChange={(e) => updateFormData('postcode', e.target.value)}
                    placeholder="e.g., M1 2AB"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="country">Country</Label>
                <Input
                  id="country"
                  value={formData.country}
                  onChange={(e) => updateFormData('country', e.target.value)}
                  placeholder="United Kingdom"
                />
              </div>
            </div>
          </div>
        );

      case 'rates':
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <PoundSterling className="w-16 h-16 mx-auto text-primary mb-4" />
              <h3 className="text-xl font-semibold">Set Your Rates & Pricing</h3>
              <p className="text-gray-600 mt-2">Configure your standard rates for different types of bookings</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Event Rates (per hour)</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="standardRate">Standard Rate</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">£</span>
                      <Input
                        id="standardRate"
                        type="number"
                        value={formData.standardRate}
                        onChange={(e) => updateFormData('standardRate', e.target.value)}
                        placeholder="0.00"
                        className="pl-8"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="weddingRate">Wedding Rate</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">£</span>
                      <Input
                        id="weddingRate"
                        type="number"
                        value={formData.weddingRate}
                        onChange={(e) => updateFormData('weddingRate', e.target.value)}
                        placeholder="0.00"
                        className="pl-8"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="corporateRate">Corporate Rate</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">£</span>
                      <Input
                        id="corporateRate"
                        type="number"
                        value={formData.corporateRate}
                        onChange={(e) => updateFormData('corporateRate', e.target.value)}
                        placeholder="0.00"
                        className="pl-8"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Booking Policies</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="minimumBookingFee">Minimum Booking Fee</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">£</span>
                      <Input
                        id="minimumBookingFee"
                        type="number"
                        value={formData.minimumBookingFee}
                        onChange={(e) => updateFormData('minimumBookingFee', e.target.value)}
                        placeholder="0.00"
                        className="pl-8"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="depositPercentage">Deposit Percentage</Label>
                    <div className="relative">
                      <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500">%</span>
                      <Input
                        id="depositPercentage"
                        type="number"
                        value={formData.depositPercentage}
                        onChange={(e) => updateFormData('depositPercentage', e.target.value)}
                        placeholder="25"
                        className="pr-8"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="travelRate">Travel Rate (per mile)</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">£</span>
                      <Input
                        id="travelRate"
                        type="number"
                        step="0.01"
                        value={formData.travelRate}
                        onChange={(e) => updateFormData('travelRate', e.target.value)}
                        className="pl-8"
                      />
                    </div>
                    <p className="text-xs text-gray-500">HMRC rate: £0.25/mile</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        );

      case 'branding':
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <Palette className="w-16 h-16 mx-auto text-primary mb-4" />
              <h3 className="text-xl font-semibold">Choose Your Theme</h3>
              <p className="text-gray-600 mt-2">Select a theme color for your professional documents and dashboard</p>
            </div>

            <div className="space-y-6">
              <div className="space-y-4">
                <Label>Choose Your Theme Color</Label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {THEME_OPTIONS.map((theme) => (
                    <Card 
                      key={theme.value}
                      className={`cursor-pointer transition-all ${
                        formData.selectedTheme === theme.value 
                          ? 'ring-2 ring-primary shadow-md' 
                          : 'hover:shadow-sm'
                      }`}
                      onClick={() => updateFormData('selectedTheme', theme.value)}
                    >
                      <CardContent className="p-4 text-center">
                        <div 
                          className="w-12 h-12 rounded-full mx-auto mb-2"
                          style={{ backgroundColor: theme.color }}
                        />
                        <p className="font-medium">{theme.label}</p>
                        {formData.selectedTheme === theme.value && (
                          <Badge className="mt-2">Selected</Badge>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            </div>
          </div>
        );

      case 'complete':
        return (
          <div className="text-center space-y-6 py-8">
            <CheckCircle className="w-24 h-24 mx-auto text-green-500" />
            <div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">You're All Set!</h3>
              <p className="text-gray-600 text-lg">
                Welcome to MusoBuddy, {formData.firstName}!
              </p>
            </div>
            
            <div className="bg-green-50 border border-green-200 rounded-lg p-6 max-w-md mx-auto">
              <h4 className="font-semibold text-green-900 mb-3">What's Next?</h4>
              <ul className="text-sm text-green-800 space-y-2 text-left">
                <li>• Create your first booking</li>
                <li>• Set up your email integration</li>
                <li>• Explore Google Calendar sync</li>
                <li>• Generate your booking widget</li>
                <li>• Create professional contracts & invoices</li>
              </ul>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  const progress = ((currentStep + 1) / STEPS.length) * 100;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onDismiss?.()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <DialogTitle className="text-2xl">Welcome to MusoBuddy!</DialogTitle>
              <p className="text-sm text-gray-500 mt-1">Optional setup wizard to help configure your account</p>
            </div>
            {onDismiss && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={onDismiss}
                className="text-gray-500 hover:text-gray-700"
              >
                Skip Setup
              </Button>
            )}
          </div>
          <div className="space-y-2">
            <Progress value={progress} className="w-full" />
            <div className="flex justify-between items-center text-sm text-gray-500">
              <span>Step {currentStep + 1} of {STEPS.length}</span>
              <span>{STEPS[currentStep]?.title}</span>
            </div>
          </div>
        </DialogHeader>

        <div className="overflow-y-auto px-1 max-h-[60vh]">
          {renderStepContent()}
        </div>

        <Separator />

        <div className="flex justify-between items-center pt-2">
          <Button 
            variant="outline" 
            onClick={handlePrevious}
            disabled={currentStep === 0}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Previous
          </Button>

          <div className="flex items-center space-x-2">
            {STEPS.map((_, index) => (
              <div
                key={index}
                className={`w-2 h-2 rounded-full ${
                  index <= currentStep ? 'bg-primary' : 'bg-gray-300'
                }`}
              />
            ))}
          </div>

          {currentStep < STEPS.length - 1 ? (
            <Button onClick={handleNext}>
              Next
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          ) : (
            <Button 
              onClick={handleComplete}
              disabled={completeOnboardingMutation.isPending}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              {completeOnboardingMutation.isPending ? 'Setting up...' : 'Complete Setup'}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}