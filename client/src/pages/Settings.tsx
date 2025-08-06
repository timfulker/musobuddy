import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { Plus, X } from 'lucide-react';

export default function Settings() {
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [newInstrument, setNewInstrument] = useState('');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch settings
  const { data: settings, isLoading: settingsLoading } = useQuery({
    queryKey: ['/api/settings'],
    queryFn: () => apiRequest('/api/settings').then(res => res.json()),
  });

  // Settings form state
  const [businessName, setBusinessName] = useState('');
  const [defaultTheme, setDefaultTheme] = useState('purple');
  const [emailSignature, setEmailSignature] = useState('');
  const [paymentInstructions, setPaymentInstructions] = useState('');
  const [defaultInvoiceDueDays, setDefaultInvoiceDueDays] = useState(30);

  // Update form when settings load
  useEffect(() => {
    if (settings) {
      setBusinessName(settings.businessName || '');
      setDefaultTheme(settings.defaultTheme || 'purple');
      setEmailSignature(settings.emailSignature || '');
      setPaymentInstructions(settings.paymentInstructions || '');
      setDefaultInvoiceDueDays(settings.defaultInvoiceDueDays || 30);
    }
  }, [settings]);

  // Update settings mutation
  const updateSettingsMutation = useMutation({
    mutationFn: (data: any) => apiRequest('/api/settings', {
      method: 'PATCH',
      body: data
    }),
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Settings updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/settings'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || 'Failed to update settings',
        variant: "destructive",
      });
    }
  });

  // Add instrument mutation
  const addInstrumentMutation = useMutation({
    mutationFn: (instrument: string) => apiRequest('/api/settings/instrument', {
      method: 'POST',
      body: { instrument }
    }),
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Instrument added successfully",
      });
      setNewInstrument('');
      queryClient.invalidateQueries({ queryKey: ['/api/settings'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || 'Failed to add instrument',
        variant: "destructive",
      });
    }
  });

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (newPassword !== confirmPassword) {
      toast({
        title: "Error",
        description: "New passwords don't match",
        variant: "destructive",
      });
      return;
    }

    if (newPassword.length < 6) {
      toast({
        title: "Error",
        description: "Password must be at least 6 characters long",
        variant: "destructive",
      });
      return;
    }

    setIsChangingPassword(true);

    try {
      await apiRequest('/api/auth/change-password', {
        method: 'POST',
        body: {
          currentPassword,
          newPassword
        }
      });

      toast({
        title: "Success",
        description: "Password updated successfully",
      });

      // Clear form
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');

    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || 'Failed to update password',
        variant: "destructive",
      });
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleBusinessSettingsSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateSettingsMutation.mutate({
      businessName,
      defaultTheme,
      emailSignature,
      paymentInstructions,
      defaultInvoiceDueDays
    });
  };

  const handleAddInstrument = () => {
    if (newInstrument.trim()) {
      addInstrumentMutation.mutate(newInstrument.trim());
    }
  };

  const removeInstrument = (instrument: string) => {
    const updatedInstruments = (settings?.instruments || []).filter((i: string) => i !== instrument);
    updateSettingsMutation.mutate({ instruments: updatedInstruments });
  };

  if (settingsLoading) {
    return (
      <div className="container max-w-4xl py-8">
        <div>Loading settings...</div>
      </div>
    );
  }

  return (
    <div className="container max-w-4xl py-8">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
          <p className="text-muted-foreground">
            Manage your business settings, preferences, and account security.
          </p>
        </div>

        {/* Business Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Business Settings</CardTitle>
            <CardDescription>
              Configure your business information and defaults.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleBusinessSettingsSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="business-name">Business Name</Label>
                  <Input
                    id="business-name"
                    type="text"
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    placeholder="Your Business Name"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="theme">Default Theme</Label>
                  <Select value={defaultTheme} onValueChange={setDefaultTheme}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a theme" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="purple">Purple</SelectItem>
                      <SelectItem value="ocean">Ocean Blue</SelectItem>
                      <SelectItem value="forest">Forest Green</SelectItem>
                      <SelectItem value="clean">Clean Pro Audio</SelectItem>
                      <SelectItem value="midnight">Midnight Blue</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="invoice-due-days">Default Invoice Due Days</Label>
                  <Input
                    id="invoice-due-days"
                    type="number"
                    min="1"
                    max="90"
                    value={defaultInvoiceDueDays}
                    onChange={(e) => setDefaultInvoiceDueDays(parseInt(e.target.value) || 30)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email-signature">Email Signature</Label>
                <Textarea
                  id="email-signature"
                  value={emailSignature}
                  onChange={(e) => setEmailSignature(e.target.value)}
                  placeholder="Your email signature..."
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="payment-instructions">Payment Instructions</Label>
                <Textarea
                  id="payment-instructions"
                  value={paymentInstructions}
                  onChange={(e) => setPaymentInstructions(e.target.value)}
                  placeholder="Bank details, payment methods, etc..."
                  rows={3}
                />
              </div>

              <Button 
                type="submit" 
                disabled={updateSettingsMutation.isPending}
              >
                {updateSettingsMutation.isPending ? 'Saving...' : 'Save Business Settings'}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Instruments */}
        <Card>
          <CardHeader>
            <CardTitle>Your Instruments</CardTitle>
            <CardDescription>
              Manage the instruments you play for bookings and contracts.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="Add new instrument..."
                  value={newInstrument}
                  onChange={(e) => setNewInstrument(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleAddInstrument()}
                />
                <Button 
                  onClick={handleAddInstrument}
                  disabled={!newInstrument.trim() || addInstrumentMutation.isPending}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              
              <div className="flex flex-wrap gap-2">
                {(settings?.instruments || []).map((instrument: string) => (
                  <div
                    key={instrument}
                    className="flex items-center gap-2 bg-secondary px-3 py-1 rounded-full text-sm"
                  >
                    {instrument}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeInstrument(instrument)}
                      className="h-4 w-4 p-0 hover:bg-destructive hover:text-destructive-foreground"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Password Change */}
        <Card>
          <CardHeader>
            <CardTitle>Change Password</CardTitle>
            <CardDescription>
              Update your password to keep your account secure.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handlePasswordChange} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="current-password">Current Password</Label>
                <Input
                  id="current-password"
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="new-password">New Password</Label>
                <Input
                  id="new-password"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  minLength={6}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirm New Password</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={6}
                />
              </div>

              <Button type="submit" disabled={isChangingPassword}>
                {isChangingPassword ? 'Updating...' : 'Update Password'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}