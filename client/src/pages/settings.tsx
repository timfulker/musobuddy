import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Settings as SettingsIcon, Save, Building, Phone, Globe, CreditCard, FileText, Mail, Key } from "lucide-react";
import { insertUserSettingsSchema, type UserSettings } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import Sidebar from "@/components/sidebar";

const settingsFormSchema = insertUserSettingsSchema.omit({ userId: true }).extend({
  nextInvoiceNumber: z.number().min(1, "Invoice number must be at least 1"),
  gigTypes: z.string().optional(),
});

export default function Settings() {
  const { toast } = useToast();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [bankDetails, setBankDetails] = useState({
    bankName: "",
    accountName: "",
    sortCode: "",
    accountNumber: ""
  });

  const { data: settings = {}, isLoading } = useQuery({
    queryKey: ["/api/settings"],
  });

  const form = useForm<z.infer<typeof settingsFormSchema>>({
    resolver: zodResolver(settingsFormSchema),
    defaultValues: {
      businessName: settings.businessName || "",
      businessEmail: settings.businessEmail || "",
      businessAddress: settings.businessAddress || "",
      phone: settings.phone || "",
      website: settings.website || "",
      taxNumber: settings.taxNumber || "",
      bankDetails: settings.bankDetails || "",
      defaultTerms: settings.defaultTerms || "",
      emailFromName: settings.emailFromName || "",
      nextInvoiceNumber: settings.nextInvoiceNumber || 256,
      gigTypes: settings.gigTypes || "",
    },
  });

  // Update form when settings data loads
  const [hasInitialized, setHasInitialized] = useState(false);
  if (settings.businessName && !hasInitialized) {
    form.reset({
      businessName: settings.businessName || "",
      businessEmail: settings.businessEmail || "",
      businessAddress: settings.businessAddress || "",
      phone: settings.phone || "",
      website: settings.website || "",
      taxNumber: settings.taxNumber || "",
      bankDetails: settings.bankDetails || "",
      defaultTerms: settings.defaultTerms || "",
      emailFromName: settings.emailFromName || "",
      nextInvoiceNumber: settings.nextInvoiceNumber || 256,
    });
    
    // Parse bank details from stored string format
    const bankDetailsString = settings.bankDetails || "";
    const parsedBankDetails = {
      bankName: "",
      accountName: "",
      sortCode: "",
      accountNumber: ""
    };
    
    if (bankDetailsString) {
      const lines = bankDetailsString.split('\n');
      lines.forEach(line => {
        if (line.includes('Bank Name:')) parsedBankDetails.bankName = line.split('Bank Name:')[1]?.trim() || "";
        if (line.includes('Account Name:')) parsedBankDetails.accountName = line.split('Account Name:')[1]?.trim() || "";
        if (line.includes('Sort Code:')) parsedBankDetails.sortCode = line.split('Sort Code:')[1]?.trim() || "";
        if (line.includes('Account Number:')) parsedBankDetails.accountNumber = line.split('Account Number:')[1]?.trim() || "";
      });
    }
    
    setBankDetails(parsedBankDetails);
    setHasInitialized(true);
  }

  const saveSettingsMutation = useMutation({
    mutationFn: async (data: z.infer<typeof settingsFormSchema>) => {
      return await apiRequest("POST", "/api/settings", data);
    },
    onSuccess: () => {
      toast({
        title: "Settings saved",
        description: "Your business settings have been updated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to save settings. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: z.infer<typeof settingsFormSchema>) => {
    // Convert bank details table format back to string for storage
    const bankDetailsString = [
      bankDetails.bankName ? `Bank Name: ${bankDetails.bankName}` : '',
      bankDetails.accountName ? `Account Name: ${bankDetails.accountName}` : '',
      bankDetails.sortCode ? `Sort Code: ${bankDetails.sortCode}` : '',
      bankDetails.accountNumber ? `Account Number: ${bankDetails.accountNumber}` : ''
    ].filter(line => line.length > 0).join('\n');
    
    const updatedData = {
      ...data,
      bankDetails: bankDetailsString
    };
    
    saveSettingsMutation.mutate(updatedData);
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Loading settings...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile menu toggle */}
      <div className="md:hidden fixed top-4 left-4 z-50">
        <button
          onClick={() => setSidebarOpen(true)}
          className="bg-card p-2 rounded-lg shadow-lg"
        >
          <svg className="w-6 h-6 text-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </div>

      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main Content */}
      <div className="md:ml-64 min-h-screen">
        <div className="container mx-auto px-4 py-8 max-w-4xl">
          <div className="flex items-center gap-3 mb-8">
            <SettingsIcon className="h-8 w-8 text-blue-600" />
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Business Settings</h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                Configure your business details for contracts and invoices
              </p>
            </div>
          </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Business Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building className="h-5 w-5" />
                Business Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="businessName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Business Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Your Music Services" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="businessEmail"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Business Email</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="your@email.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="businessAddress"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Business Address</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="123 Music Street&#10;City, County&#10;Postcode"
                        className="min-h-[100px]"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <Phone className="h-4 w-4" />
                        Phone Number
                      </FormLabel>
                      <FormControl>
                        <Input placeholder="+44 1234 567890" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="website"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <Globe className="h-4 w-4" />
                        Website
                      </FormLabel>
                      <FormControl>
                        <Input placeholder="https://yourmusic.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          {/* Financial Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Financial Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="taxNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tax/VAT Number</FormLabel>
                    <FormControl>
                      <Input placeholder="GB123456789" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div>
                <FormLabel className="text-base font-medium">Bank Details for Invoices</FormLabel>
                <div className="mt-2 border rounded-lg overflow-hidden">
                  <table className="w-full">
                    <tbody>
                      <tr className="border-b">
                        <td className="px-3 py-2 bg-muted/50 font-medium text-sm w-32">Bank Name</td>
                        <td className="px-3 py-2">
                          <Input 
                            placeholder="Your Bank"
                            value={bankDetails.bankName}
                            onChange={(e) => setBankDetails(prev => ({ ...prev, bankName: e.target.value }))}
                            className="border-0 focus-visible:ring-0 p-0 h-auto"
                          />
                        </td>
                      </tr>
                      <tr className="border-b">
                        <td className="px-3 py-2 bg-muted/50 font-medium text-sm">Account Name</td>
                        <td className="px-3 py-2">
                          <Input 
                            placeholder="Your Business Name"
                            value={bankDetails.accountName}
                            onChange={(e) => setBankDetails(prev => ({ ...prev, accountName: e.target.value }))}
                            className="border-0 focus-visible:ring-0 p-0 h-auto"
                          />
                        </td>
                      </tr>
                      <tr className="border-b">
                        <td className="px-3 py-2 bg-muted/50 font-medium text-sm">Sort Code</td>
                        <td className="px-3 py-2">
                          <Input 
                            placeholder="12-34-56"
                            value={bankDetails.sortCode}
                            onChange={(e) => setBankDetails(prev => ({ ...prev, sortCode: e.target.value }))}
                            className="border-0 focus-visible:ring-0 p-0 h-auto"
                          />
                        </td>
                      </tr>
                      <tr>
                        <td className="px-3 py-2 bg-muted/50 font-medium text-sm">Account Number</td>
                        <td className="px-3 py-2">
                          <Input 
                            placeholder="12345678"
                            value={bankDetails.accountNumber}
                            onChange={(e) => setBankDetails(prev => ({ ...prev, accountNumber: e.target.value }))}
                            className="border-0 focus-visible:ring-0 p-0 h-auto"
                          />
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Contract Terms */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Default Contract Terms
              </CardTitle>
            </CardHeader>
            <CardContent>
              <FormField
                control={form.control}
                name="defaultTerms"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Standard Terms and Conditions</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Enter your standard terms and conditions that will appear on contracts..."
                        className="min-h-[120px]"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Email Settings */}
          <Card>
            <CardHeader className="flex flex-row items-center gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-100">
                <Mail className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <CardTitle>Email Settings</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Customize how your emails appear to clients
                </p>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <FormField
                control={form.control}
                name="emailFromName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email From Name</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g., Sarah Johnson Music, DJ Mike Events"
                        {...field}
                      />
                    </FormControl>
                    <p className="text-sm text-muted-foreground">
                      This name will appear in the "From" field when clients receive your contracts and invoices
                    </p>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="nextInvoiceNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Next Invoice Number Override</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="256"
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                      />
                    </FormControl>
                    <p className="text-sm text-muted-foreground">
                      The next invoice will use this number (formatted as 5 digits, e.g., 00256). Change this to sync with external systems or correct the sequence.
                    </p>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Gig Types Configuration */}
          <Card>
            <CardHeader>
              <div>
                <CardTitle>Gig Types Configuration</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Configure your available gig types for enquiry forms
                </p>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <FormField
                control={form.control}
                name="gigTypes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Available Gig Types</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Saxophone Solo&#10;DJ Set&#10;Sax + DJ&#10;Band Performance&#10;Wedding Ceremony&#10;Corporate Event"
                        className="min-h-[120px]"
                        {...field}
                      />
                    </FormControl>
                    <p className="text-sm text-muted-foreground">
                      Enter each gig type on a separate line. These will appear in the "Gig Type" dropdown when creating enquiries.
                    </p>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Save Button */}
          <div className="flex justify-end">
            <Button 
              type="submit" 
              size="lg"
              disabled={saveSettingsMutation.isPending}
              className="flex items-center gap-2"
            >
              <Save className="h-4 w-4" />
              {saveSettingsMutation.isPending ? "Saving..." : "Save Settings"}
            </Button>
          </div>
        </form>
      </Form>
        </div>
      </div>
    </div>
  );
}