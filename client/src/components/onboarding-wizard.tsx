import { useState, useEffect } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
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

  // Fetch existing user settings to pre-populate form
  const { data: userSettings } = useQuery({
    queryKey: ['/api/settings'],
    enabled: !!user,
  });

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

  // Pre-populate form data when user settings are loaded
  useEffect(() => {
    if (userSettings) {
      setFormData(prev => ({
        ...prev,
        // Business Address
        addressLine1: userSettings.addressLine1 || '',
        addressLine2: userSettings.addressLine2 || '',
        city: userSettings.city || '',
        postcode: userSettings.postcode || '',
        
        // Email Setup
        businessEmail: userSettings.businessEmail || user?.email || '',
        emailPrefix: userSettings.emailPrefix || '',
        
        // Bank Details - parse JSON if exists
        bankName: userSettings.bankDetails?.bankName || '',
        accountName: userSettings.bankDetails?.accountName || '',
        accountNumber: userSettings.bankDetails?.accountNumber || '',
        sortCode: userSettings.bankDetails?.sortCode || '',
      }));
    }
  }, [userSettings, user?.email]);

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
    if (!formData.addressLine1 || !formData.city || !formData.postcode || !formData.emailPrefix || !formData.businessEmail) {
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
      case 'address':
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <MapPin className="w-16 h-16 mx-auto text-primary mb-4" />
              <h3 className="text-xl font-semibold">Business Address</h3>
              <p className="text-gray-600 mt-2">This will appear on your contracts and invoices</p>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="addressLine1">Address Line 1 *</Label>
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
                  placeholder="Apartment, suite, etc."
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="city">City *</Label>
                  <Input
                    id="city"
                    value={formData.city}
                    onChange={(e) => updateFormData('city', e.target.value)}
                    placeholder="e.g., Manchester"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="postcode">Postcode *</Label>
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

      case 'email':
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <Mail className="w-16 h-16 mx-auto text-primary mb-4" />
              <h3 className="text-xl font-semibold">Email Setup</h3>
              <p className="text-gray-600 mt-2">Set up your professional booking email</p>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="businessEmail">Business Email *</Label>
                <Input
                  id="businessEmail"
                  value={formData.businessEmail}
                  onChange={(e) => updateFormData('businessEmail', e.target.value)}
                  placeholder="your@email.com"
                  type="email"
                />
                <p className="text-xs text-gray-500">Your main business email address</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="emailPrefix">Booking Email Prefix *</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="emailPrefix"
                    value={formData.emailPrefix}
                    onChange={(e) => updateFormData('emailPrefix', e.target.value.toLowerCase().replace(/[^a-z0-9]/g, ''))}
                    placeholder="e.g., tim, saxweddings"
                    className="flex-1"
                  />
                  <span className="text-gray-500">@enquiries.musobuddy.com</span>
                </div>
                <p className="text-xs text-gray-500">
                  Your personalized email for receiving booking requests
                </p>
                <p className="text-xs text-amber-600">
                  ⚠️ This prefix must be unique and cannot be changed later
                </p>
              </div>
            </div>
          </div>
        );

      case 'bank':
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <CreditCard className="w-16 h-16 mx-auto text-primary mb-4" />
              <h3 className="text-xl font-semibold">Bank Details</h3>
              <p className="text-gray-600 mt-2">For receiving payments and invoicing</p>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="bankName">Bank Name</Label>
                <Input
                  id="bankName"
                  value={formData.bankName}
                  onChange={(e) => updateFormData('bankName', e.target.value)}
                  placeholder="e.g., Lloyds Bank"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="accountName">Account Name</Label>
                <Input
                  id="accountName"
                  value={formData.accountName}
                  onChange={(e) => updateFormData('accountName', e.target.value)}
                  placeholder="Name on the account"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="accountNumber">Account Number</Label>
                  <Input
                    id="accountNumber"
                    value={formData.accountNumber}
                    onChange={(e) => updateFormData('accountNumber', e.target.value)}
                    placeholder="12345678"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="sortCode">Sort Code</Label>
                  <Input
                    id="sortCode"
                    value={formData.sortCode}
                    onChange={(e) => updateFormData('sortCode', e.target.value)}
                    placeholder="12-34-56"
                  />
                </div>
              </div>
            </div>
          </div>
        );

      case 'widget':
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <Music className="w-16 h-16 mx-auto text-primary mb-4" />
              <h3 className="text-xl font-semibold">Booking Widget & QR Code</h3>
              <p className="text-gray-600 mt-2">Generate your personalized booking link and QR code</p>
            </div>

            <div className="space-y-4">
              <Card>
                <CardContent className="p-6 text-center">
                  <p className="text-sm text-gray-600 mb-4">
                    Your booking widget will be automatically generated when you complete setup. 
                    This will create a unique QR code and booking link for your business.
                  </p>
                  <div className="bg-gray-100 rounded-lg p-4">
                    <p className="font-mono text-sm">
                      🔗 Your booking link will be generated after setup
                    </p>
                    <p className="font-mono text-sm mt-2">
                      📱 QR code will be created for easy sharing
                    </p>
                  </div>
                </CardContent>
              </Card>
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
              <h4 className="font-semibold text-green-900 mb-3">Setup Complete!</h4>
              <ul className="text-sm text-green-800 space-y-2 text-left">
                <li>✓ Business address configured</li>
                <li>✓ Email prefix reserved</li>
                <li>✓ Bank details added</li>
                <li>✓ Booking widget ready</li>
                <li>✓ Ready to receive bookings!</li>
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
                className="text-gray-500 hover:text-gray-700 mr-8"
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