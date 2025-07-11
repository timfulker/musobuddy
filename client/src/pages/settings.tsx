import React, { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Checkbox } from "@/components/ui/checkbox";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Settings as SettingsIcon, Save, Building, Phone, Globe, CreditCard, FileText, Mail, Key, Plus, X, Music, Sparkles } from "lucide-react";
import { insertUserSettingsSchema, type UserSettings } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import Sidebar from "@/components/sidebar";

const settingsFormSchema = insertUserSettingsSchema.omit({ userId: true }).extend({
  nextInvoiceNumber: z.number().min(1, "Invoice number must be at least 1"),
  gigTypes: z.string().optional(),
  eventTypes: z.string().optional(),
  instrumentsPlayed: z.string().optional(),
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
  
  // State for tag management
  const [eventTypes, setEventTypes] = useState<string[]>([]);
  const [gigTypes, setGigTypes] = useState<string[]>([]);
  const [newEventType, setNewEventType] = useState("");
  const [newGigType, setNewGigType] = useState("");
  
  // State for instrument selection
  const [selectedInstruments, setSelectedInstruments] = useState<string[]>([]);
  const [customInstruments, setCustomInstruments] = useState<string[]>([]);
  const [newInstrument, setNewInstrument] = useState("");
  
  // Define instrument categories
  const instrumentCategories = {
    "Band / Pop / Function": ["saxophone", "guitar", "piano", "vocals", "bass", "drums", "dj", "keyboard", "synth", "singer-songwriter"],
    "Classical / Traditional": ["violin", "viola", "cello", "flute", "clarinet", "oboe", "harp"],
    "Brass / Jazz / Marching": ["trumpet", "trombone", "percussion"]
  };

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
      eventTypes: settings.eventTypes || "",
      instrumentsPlayed: settings.instrumentsPlayed || "",
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
      gigTypes: settings.gigTypes || "",
      eventTypes: settings.eventTypes || "",
      instrumentsPlayed: settings.instrumentsPlayed || "",
    });
    
    // Initialize tag arrays
    setEventTypes(settings.eventTypes ? settings.eventTypes.split('\n').filter(Boolean) : []);
    setGigTypes(settings.gigTypes ? settings.gigTypes.split('\n').filter(Boolean) : []);
    
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

  // Helper functions for tag management
  const addEventType = () => {
    if (newEventType.trim() && !eventTypes.includes(newEventType.trim())) {
      const updatedTypes = [...eventTypes, newEventType.trim()];
      setEventTypes(updatedTypes);
      form.setValue('eventTypes', updatedTypes.join('\n'));
      setNewEventType("");
    }
  };

  const removeEventType = (typeToRemove: string) => {
    const updatedTypes = eventTypes.filter(type => type !== typeToRemove);
    setEventTypes(updatedTypes);
    form.setValue('eventTypes', updatedTypes.join('\n'));
  };

  const addGigType = () => {
    if (newGigType.trim() && !gigTypes.includes(newGigType.trim())) {
      const updatedTypes = [...gigTypes, newGigType.trim()];
      setGigTypes(updatedTypes);
      form.setValue('gigTypes', updatedTypes.join('\n'));
      setNewGigType("");
    }
  };

  const removeGigType = (typeToRemove: string) => {
    const updatedTypes = gigTypes.filter(type => type !== typeToRemove);
    setGigTypes(updatedTypes);
    form.setValue('gigTypes', updatedTypes.join('\n'));
  };

  // Handle instrument selection
  const handleInstrumentChange = (instrument: string, checked: boolean) => {
    let updatedInstruments;
    if (checked) {
      updatedInstruments = [...selectedInstruments, instrument];
    } else {
      updatedInstruments = selectedInstruments.filter(i => i !== instrument);
    }
    setSelectedInstruments(updatedInstruments);
  };

  const addCustomInstrument = () => {
    if (newInstrument.trim() && !customInstruments.includes(newInstrument.trim()) && !selectedInstruments.includes(newInstrument.trim())) {
      const instrument = newInstrument.trim().toLowerCase();
      setCustomInstruments([...customInstruments, instrument]);
      setSelectedInstruments([...selectedInstruments, instrument]);
      setNewInstrument("");
    }
  };

  const removeCustomInstrument = (instrument: string) => {
    setCustomInstruments(customInstruments.filter(i => i !== instrument));
    setSelectedInstruments(selectedInstruments.filter(i => i !== instrument));
  };



  // Default gig type mappings for known instruments
  const defaultGigMappings: { [key: string]: string[] } = {
    'saxophone': ['Wedding Ceremony Music', 'Jazz Club Performance', 'Corporate Event Entertainment', 'Function Band', 'Sax + DJ', 'Wedding Reception', 'Private Party'],
    'guitar': ['Acoustic Wedding Ceremony', 'Spanish Guitar', 'Classical Guitar', 'Folk Music', 'Singer-Songwriter', 'Acoustic Duo', 'Background Music'],
    'piano': ['Piano Bar', 'Wedding Ceremony', 'Classical Recital', 'Jazz Piano', 'Cocktail Piano', 'Restaurant Background', 'Solo Piano'],
    'vocals': ['Wedding Singer', 'Jazz Vocalist', 'Corporate Entertainment', 'Function Band Vocals', 'Solo Vocalist', 'Tribute Acts', 'Karaoke Host'],
    'dj': ['Wedding DJ', 'Corporate Event DJ', 'Party DJ', 'Club DJ', 'Mobile DJ', 'Sax + DJ', 'Event DJ'],
    'violin': ['Wedding Ceremony', 'String Quartet', 'Classical Performance', 'Folk Violin', 'Electric Violin', 'Background Music', 'Solo Violin'],
    'trumpet': ['Jazz Band', 'Big Band', 'Wedding Fanfare', 'Classical Trumpet', 'Brass Ensemble', 'Mariachi Band', 'Military Ceremony'],
    'drums': ['Function Band', 'Jazz Ensemble', 'Rock Band', 'Wedding Band', 'Corporate Event Band', 'Percussion Solo', 'Session Musician'],
    'bass': ['Function Band', 'Jazz Ensemble', 'Wedding Band', 'Corporate Event Band', 'Session Musician', 'Acoustic Bass', 'Electric Bass'],
    'keyboard': ['Function Band', 'Wedding Ceremony', 'Jazz Piano', 'Corporate Entertainment', 'Solo Keyboard', 'Accompanist', 'Session Musician'],
    'cello': ['Wedding Ceremony', 'String Quartet', 'Classical Performance', 'Solo Cello', 'Chamber Music', 'Background Music', 'Church Music'],
    'flute': ['Wedding Ceremony', 'Classical Performance', 'Jazz Flute', 'Folk Music', 'Solo Flute', 'Wind Ensemble', 'Background Music'],
    'harp': ['Wedding Ceremony', 'Classical Harp', 'Celtic Harp', 'Background Music', 'Solo Harp', 'Church Music', 'Private Events'],
    'trombone': ['Jazz Band', 'Big Band', 'Brass Ensemble', 'Wedding Fanfare', 'Classical Trombone', 'Mariachi Band', 'Military Ceremony'],
    'clarinet': ['Jazz Ensemble', 'Classical Performance', 'Wedding Ceremony', 'Folk Music', 'Solo Clarinet', 'Wind Ensemble', 'Background Music']
  };

  // Auto-update gig types based on instrument selection
  const updateGigTypesFromInstruments = async () => {
    if (selectedInstruments.length === 0) {
      return;
    }

    let allSuggestions: string[] = [];
    const unknownInstruments: string[] = [];

    // Get suggestions for known instruments from default mappings
    selectedInstruments.forEach(instrument => {
      if (defaultGigMappings[instrument]) {
        allSuggestions = [...allSuggestions, ...defaultGigMappings[instrument]];
      } else {
        unknownInstruments.push(instrument);
      }
    });

    // Only use AI for unknown instruments if OpenAI key is available
    if (unknownInstruments.length > 0) {
      try {
        const response = await fetch('/api/suggest-gigs', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ instruments: unknownInstruments }),
        });

        if (response.ok) {
          const aiSuggestions = await response.json();
          allSuggestions = [...allSuggestions, ...aiSuggestions];
        }
      } catch (error) {
        console.log('AI suggestions not available for unknown instruments:', unknownInstruments);
      }
    }

    // Update gig types with all suggestions
    const newGigTypes = [...new Set([...gigTypes, ...allSuggestions])];
    setGigTypes(newGigTypes);
    form.setValue('gigTypes', newGigTypes.join('\n'));
  };

  // Auto-update gig types when instruments change
  React.useEffect(() => {
    if (selectedInstruments.length > 0) {
      updateGigTypesFromInstruments();
    }
  }, [selectedInstruments]);

  const saveSettingsMutation = useMutation({
    mutationFn: async (data: z.infer<typeof settingsFormSchema>) => {
      return await apiRequest("POST", "/api/settings", data);
    },
    onSuccess: () => {
      toast({
        title: "Settings saved",
        description: "Your business settings have been updated successfully.",
      });
      // Invalidate all settings-related caches so forms refresh with new data
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
      // Force refetch settings data to update all components that depend on it
      queryClient.refetchQueries({ queryKey: ["/api/settings"] });
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

          {/* Performance Configuration */}
          <Card>
            <CardHeader>
              <div>
                <CardTitle>Performance Configuration</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Configure your performance types and available services
                </p>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <FormField
                control={form.control}
                name="eventTypes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Available Event Types</FormLabel>
                    <div className="space-y-3">
                      {/* Add new event type */}
                      <div className="flex gap-2">
                        <Input
                          placeholder="e.g., Wedding, Corporate Event, Private Party"
                          value={newEventType}
                          onChange={(e) => setNewEventType(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              addEventType();
                            }
                          }}
                        />
                        <Button
                          type="button"
                          onClick={addEventType}
                          size="sm"
                          className="flex items-center gap-1"
                        >
                          <Plus className="h-4 w-4" />
                          Add
                        </Button>
                      </div>
                      
                      {/* Display existing event types as tags */}
                      {eventTypes.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {eventTypes.map((type, index) => (
                            <div
                              key={index}
                              className="flex items-center gap-1 bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 px-3 py-1 rounded-full text-sm"
                            >
                              <span>{type}</span>
                              <button
                                type="button"
                                onClick={() => removeEventType(type)}
                                className="text-purple-600 dark:text-purple-400 hover:text-purple-800 dark:hover:text-purple-200"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Add event types that will appear in the "Event Type" dropdown when creating enquiries.
                    </p>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="gigTypes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Available Gig Types</FormLabel>
                    <div className="space-y-3">
                      {/* Instrument Selection for Auto-Population */}
                      <div className="border rounded-lg p-4 bg-muted/20">
                        <div className="flex items-center gap-2 mb-3">
                          <Music className="h-4 w-4 text-purple-600" />
                          <h4 className="font-medium text-sm">What Do You Play?</h4>
                        </div>
                        <p className="text-sm text-muted-foreground mb-3">
                          Select instruments you play to automatically populate gig types below
                        </p>
                        
                        {/* Instrument Selection */}
                        <div className="space-y-3">
                          {Object.entries(instrumentCategories).map(([category, instruments]) => (
                            <div key={category} className="space-y-2">
                              <h5 className="font-medium text-xs text-muted-foreground uppercase tracking-wide">{category}</h5>
                              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                                {instruments.map((instrument) => (
                                  <div key={instrument} className="flex items-center space-x-2">
                                    <Checkbox
                                      id={instrument}
                                      checked={selectedInstruments.includes(instrument)}
                                      onCheckedChange={(checked) => 
                                        handleInstrumentChange(instrument, checked as boolean)
                                      }
                                    />
                                    <label
                                      htmlFor={instrument}
                                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 capitalize"
                                    >
                                      {instrument.replace('-', ' ')}
                                    </label>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Custom Instrument Addition */}
                        <div className="space-y-2 mt-4">
                          <h5 className="font-medium text-sm">Add Custom Instrument</h5>
                          <div className="flex gap-2">
                            <Input
                              placeholder="e.g., Harmonica, Bagpipes, etc."
                              value={newInstrument}
                              onChange={(e) => setNewInstrument(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  addCustomInstrument();
                                }
                              }}
                            />
                            <Button
                              type="button"
                              onClick={addCustomInstrument}
                              size="sm"
                              className="flex items-center gap-1"
                            >
                              <Plus className="h-4 w-4" />
                              Add
                            </Button>
                          </div>
                        </div>

                        {/* Display custom instruments */}
                        {customInstruments.length > 0 && (
                          <div className="space-y-2 mt-3">
                            <h5 className="font-medium text-xs text-muted-foreground uppercase tracking-wide">Custom Instruments</h5>
                            <div className="flex flex-wrap gap-2">
                              {customInstruments.map((instrument) => (
                                <div
                                  key={instrument}
                                  className="flex items-center gap-1 bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-200 px-3 py-1 rounded-full text-sm"
                                >
                                  <span className="capitalize">{instrument}</span>
                                  <button
                                    type="button"
                                    onClick={() => removeCustomInstrument(instrument)}
                                    className="text-orange-600 dark:text-orange-400 hover:text-orange-800 dark:hover:text-orange-200"
                                  >
                                    <X className="h-3 w-3" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {selectedInstruments.length > 0 && (
                          <p className="text-sm text-green-600 dark:text-green-400 mt-3">
                            ✓ Gig types will be automatically added based on your instrument selection
                          </p>
                        )}
                      </div>
                      
                      {/* Manual Add new gig type */}
                      <div className="space-y-2">
                        <h5 className="font-medium text-sm">Add Additional Gig Types</h5>
                        <div className="flex gap-2">
                          <Input
                            placeholder="e.g., Saxophone Solo, DJ Set, Sax + DJ, Band Performance"
                            value={newGigType}
                            onChange={(e) => setNewGigType(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                addGigType();
                              }
                            }}
                          />
                          <Button
                            type="button"
                            onClick={addGigType}
                            size="sm"
                            className="flex items-center gap-1"
                          >
                            <Plus className="h-4 w-4" />
                            Add
                          </Button>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Add any custom gig types not covered by your instrument selections above.
                        </p>
                      </div>
                      
                      {/* Display existing gig types as tags */}
                      {gigTypes.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {gigTypes.map((type, index) => (
                            <div
                              key={index}
                              className="flex items-center gap-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-3 py-1 rounded-full text-sm"
                            >
                              <span>{type}</span>
                              <button
                                type="button"
                                onClick={() => removeGigType(type)}
                                className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Add gig types that will appear in the "Gig Type" dropdown when creating enquiries. Types are automatically added based on your instrument selection above.
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