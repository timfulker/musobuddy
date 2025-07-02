import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Settings as SettingsIcon, Save, Building, Phone, Globe, CreditCard, FileText } from "lucide-react";
import { insertUserSettingsSchema, type UserSettings } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";

const settingsFormSchema = insertUserSettingsSchema.omit({ userId: true });

export default function Settings() {
  const { toast } = useToast();

  const { data: settings = {}, isLoading } = useQuery({
    queryKey: ["/api/settings"],
  });

  const form = useForm<z.infer<typeof settingsFormSchema>>({
    resolver: zodResolver(settingsFormSchema),
    defaultValues: {
      businessName: settings.businessName || "",
      businessAddress: settings.businessAddress || "",
      phone: settings.phone || "",
      website: settings.website || "",
      taxNumber: settings.taxNumber || "",
      bankDetails: settings.bankDetails || "",
      defaultTerms: settings.defaultTerms || "",
    },
  });

  // Update form when settings data loads
  const [hasInitialized, setHasInitialized] = useState(false);
  if (settings.businessName && !hasInitialized) {
    form.reset({
      businessName: settings.businessName || "",
      businessAddress: settings.businessAddress || "",
      phone: settings.phone || "",
      website: settings.website || "",
      taxNumber: settings.taxNumber || "",
      bankDetails: settings.bankDetails || "",
      defaultTerms: settings.defaultTerms || "",
    });
    setHasInitialized(true);
  }

  const saveSettingsMutation = useMutation({
    mutationFn: async (data: z.infer<typeof settingsFormSchema>) => {
      return await apiRequest({
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }, "/api/settings");
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
    saveSettingsMutation.mutate(data);
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
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="flex items-center gap-3 mb-8">
        <Settings className="h-8 w-8 text-blue-600" />
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

              <FormField
                control={form.control}
                name="bankDetails"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Bank Details for Invoices</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Bank Name: Your Bank&#10;Account Name: Your Business Name&#10;Sort Code: 12-34-56&#10;Account Number: 12345678"
                        className="min-h-[100px]"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
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
  );
}