import React, { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Search, Filter, MoreHorizontal, FileText, Calendar, DollarSign, User, Eye, Mail, Download, Trash2, Archive, FileDown, CheckSquare, Square, MapPin, Edit, RefreshCw, Info } from "lucide-react";
import type { Contract, Enquiry } from "@shared/schema";
import { insertContractSchema } from "@shared/schema";
import { z } from "zod";
import Sidebar from "@/components/sidebar";
import MobileNav from "@/components/mobile-nav";
import { useResponsive } from "@/hooks/useResponsive";
import { ContractNotifications, useContractStatusMonitor } from "@/components/contract-notifications";

const contractFormSchema = z.object({
  // TESTING: Only 4 required fields as requested
  clientName: z.string().min(1, "Client name is required"),
  clientEmail: z.string().email("Valid email required").min(1, "Client email is required"),
  eventDate: z.string().min(1, "Event date is required"),
  fee: z.string().min(1, "Performance fee is required"),
  
  // Everything else optional
  contractNumber: z.string().optional(),
  venue: z.string().optional(),
  eventTime: z.string().optional(),
  eventEndTime: z.string().optional(),
  deposit: z.string().optional(),
  clientAddress: z.string().optional(),
  clientPhone: z.string().optional(),
  venueAddress: z.string().optional(),
  paymentInstructions: z.string().optional(),
  equipmentRequirements: z.string().optional(),
  specialRequirements: z.string().optional(),
  clientFillableFields: z.array(z.string()).optional(),
  enquiryId: z.number().optional(),
  status: z.string().default("draft"),
  reminderEnabled: z.boolean().default(false),
  reminderDays: z.number().min(1).max(30).default(3),
});

export default function Contracts() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [previewContract, setPreviewContract] = useState<Contract | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [selectedContracts, setSelectedContracts] = useState<number[]>([]);
  const [bulkActionLoading, setBulkActionLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [editingContract, setEditingContract] = useState<Contract | null>(null);
  const [customMessageDialog, setCustomMessageDialog] = useState(false);
  const [contractToSend, setContractToSend] = useState<Contract | null>(null);
  const [customMessage, setCustomMessage] = useState("");
  const { isDesktop } = useResponsive();
  const { toast } = useToast();
  const [location, setLocation] = useLocation();
  
  // Monitor contract signings for real-time notifications
  useContractStatusMonitor();

  const { data: contracts = [], isLoading, error } = useQuery<Contract[]>({
    queryKey: ["/api/contracts"],
  });

  const { data: enquiries = [] } = useQuery<Enquiry[]>({
    queryKey: ["/api/enquiries"],
  });

  const { data: settings } = useQuery({
    queryKey: ["/api/settings"],
  });

  // Initialize form first before any useEffect
  const form = useForm<z.infer<typeof contractFormSchema>>({
    resolver: zodResolver(contractFormSchema),
    defaultValues: {
      enquiryId: 0,
      contractNumber: "",
      clientName: "",
      clientEmail: "",
      clientPhone: "",
      clientAddress: "",
      eventDate: "",
      eventTime: "",
      eventEndTime: "",
      venue: "",
      venueAddress: "",
      fee: "",
      deposit: "",
      paymentInstructions: "",
      equipmentRequirements: "",
      specialRequirements: "",
      status: "draft",
      reminderEnabled: false,
      reminderDays: 3,
    },
  });

  // Watch for changes in event date and client name to auto-update contract number
  const watchEventDate = form.watch('eventDate');
  const watchClientName = form.watch('clientName');
  
  React.useEffect(() => {
    // Auto-update contract number when event date or client name changes
    if (watchEventDate && watchClientName && !editingContract) {
      const eventDate = new Date(watchEventDate);
      const formattedDate = eventDate.toLocaleDateString('en-GB');
      const contractNumber = `(${formattedDate} - ${watchClientName})`;
      form.setValue('contractNumber', contractNumber);
    }
  }, [watchEventDate, watchClientName, editingContract, form]);

  // Check URL params to auto-open form dialog and auto-fill with enquiry data
  React.useEffect(() => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get('action') === 'new' && !isLoading && contracts.length >= 0) {
        setIsDialogOpen(true);

        // Auto-generate contract number in format (dd/mm/yyyy - Client Name)
        // Use today's date as default, but will be updated when event date is selected
        const today = new Date();
        const formattedDate = today.toLocaleDateString('en-GB');
        const contractNumber = `(${formattedDate} - )`;
        form.setValue('contractNumber', contractNumber);

        // Set default terms from settings if available
        if (settings?.defaultTerms) {
          form.setValue('terms', settings.defaultTerms);
        }

        // Auto-fill with enquiry data if enquiryId is provided
        const enquiryId = urlParams.get('enquiryId');
        if (enquiryId && enquiries.length > 0) {
          const enquiry = enquiries.find(e => e.id === parseInt(enquiryId));
          if (enquiry) {
            // Auto-fill form with enquiry data
            form.setValue('enquiryId', enquiry.id);
            form.setValue('clientName', enquiry.clientName || '');
            form.setValue('clientEmail', enquiry.clientEmail || '');
            form.setValue('clientPhone', enquiry.clientPhone || '');
            form.setValue('venue', enquiry.venue || '');
            form.setValue('eventDate', enquiry.eventDate ? new Date(enquiry.eventDate).toISOString().split('T')[0] : '');
            
            // Convert enquiry time to 24-hour format if needed
            const convertToTimeFormat = (timeStr: string) => {
              if (!timeStr) return '';
              
              // If already in HH:MM format, return as is
              if (/^\d{2}:\d{2}$/.test(timeStr)) {
                return timeStr;
              }
              
              // Convert from formats like "7:00 PM" or "19:00" to HH:MM
              const time = timeStr.toLowerCase().replace(/\s+/g, '');
              
              if (time.includes('pm') || time.includes('am')) {
                const [timePart, meridian] = time.split(/(am|pm)/);
                const [hours, minutes = '00'] = timePart.split(':');
                let hour24 = parseInt(hours);
                
                if (meridian === 'pm' && hour24 !== 12) {
                  hour24 += 12;
                } else if (meridian === 'am' && hour24 === 12) {
                  hour24 = 0;
                }
                
                return `${hour24.toString().padStart(2, '0')}:${minutes.padStart(2, '0')}`;
              }
              
              return timeStr;
            };
            
            form.setValue('eventTime', convertToTimeFormat(enquiry.eventTime || ''));
            form.setValue('fee', enquiry.estimatedValue || '');
            
            // Auto-generate contract number with event date and client name
            if (enquiry.eventDate && enquiry.clientName) {
              const eventDate = new Date(enquiry.eventDate);
              const formattedDate = eventDate.toLocaleDateString('en-GB');
              const contractNumber = `(${formattedDate} - ${enquiry.clientName})`;
              form.setValue('contractNumber', contractNumber);
            }
          }
        }
      }
    } catch (error) {
      console.error('Error in useEffect:', error);
      // Don't crash the app, just log the error
    }
  }, [enquiries, settings, contracts, form, isLoading]);

  // Clean up URL when dialog closes
  const handleDialogClose = (open: boolean) => {
    setIsDialogOpen(open);
    if (!open) {
      // Clean up URL when closing dialog
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get('action') === 'new') {
        window.history.replaceState({}, '', window.location.pathname);
      }
      // Clear editing state and reset form
      setEditingContract(null);
      form.reset();
    }
  };

  const createContractMutation = useMutation({
    mutationFn: async (data: z.infer<typeof contractFormSchema>) => {
      const contractData = {
        ...data,
        eventDate: data.eventDate ? new Date(data.eventDate).toISOString() : null,
        enquiryId: data.enquiryId || null, // Use actual enquiry ID from form
      };

      return apiRequest("/api/contracts", {
        method: "POST",
        body: JSON.stringify(contractData),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contracts"] });
      handleDialogClose(false);
      form.reset();
      toast({
        title: "Success",
        description: "Contract generated successfully!",
      });
    },
    onError: (error) => {
      console.error('Create contract error:', error);
      toast({
        title: "Error",
        description: `Failed to generate contract: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const updateContractMutation = useMutation({
    mutationFn: async ({ id, contractData }: { id: number, contractData: any }) => {
      return apiRequest(`/api/contracts/${id}`, {
        method: "PATCH",
        body: JSON.stringify(contractData),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contracts"] });
      handleDialogClose(false);
      form.reset();
      setEditingContract(null);
      toast({
        title: "Success",
        description: "Contract updated successfully!",
      });
    },
    onError: (error) => {
      console.error('Update contract error:', error);
      toast({
        title: "Error",
        description: `Failed to update contract: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Email sending mutation
  const sendEmailMutation = useMutation({
    mutationFn: async ({ contractId, customMessage }: { contractId: number, customMessage?: string }) => {
      console.log('🔥 FRONTEND: Sending contract email for contract:', contractId);

      return apiRequest("/api/contracts/send-email", {
        method: "POST",
        body: JSON.stringify({ contractId, customMessage }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contracts"] });
      setCustomMessageDialog(false);
      setContractToSend(null);
      setCustomMessage("");
      toast({
        title: "Success",
        description: "Contract sent to client successfully!",
      });
    },
    onError: (error) => {
      console.error('🔥 FRONTEND: Contract email mutation error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to send contract email",
        variant: "destructive",
      });
    },
  });

  const sendReminderMutation = useMutation({
    mutationFn: async (contractId: number) => {
      return apiRequest(`/api/contracts/${contractId}/send-reminder`, {
        method: "POST",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contracts"] });
      toast({
        title: "Success",
        description: "Reminder sent successfully!",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to send reminder: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const deleteContractMutation = useMutation({
    mutationFn: async (contractId: number) => {
      console.log("🔥 Deleting contract:", contractId);
      return apiRequest(`/api/contracts/${contractId}`, {
        method: "DELETE",
      });
    },
    onSuccess: (data) => {
      console.log("🔥 Delete success, invalidating cache");
      queryClient.invalidateQueries({ queryKey: ["/api/contracts"] });
      toast({
        title: "Success",
        description: "Contract deleted successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete contract",
        variant: "destructive",
      });
    },
  });

  const handleEditContract = (contract: Contract) => {
    setEditingContract(contract);
    form.setValue('enquiryId', contract.enquiryId || 0);
    form.setValue('contractNumber', contract.contractNumber);
    form.setValue('clientName', contract.clientName);
    form.setValue('clientEmail', contract.clientEmail || '');
    form.setValue('clientPhone', contract.clientPhone || '');
    form.setValue('clientAddress', contract.clientAddress || '');
    form.setValue('eventDate', contract.eventDate ? new Date(contract.eventDate).toISOString().split('T')[0] : '');
    form.setValue('eventTime', contract.eventTime || '');
    form.setValue('eventEndTime', contract.eventEndTime || '');
    form.setValue('venue', contract.venue || '');
    form.setValue('venueAddress', contract.venueAddress || '');
    form.setValue('fee', contract.fee);
    form.setValue('deposit', contract.deposit || '');
    form.setValue('paymentInstructions', contract.paymentInstructions || '');
    form.setValue('equipmentRequirements', contract.equipmentRequirements || '');
    form.setValue('specialRequirements', contract.specialRequirements || '');
    form.setValue('reminderEnabled', contract.reminderEnabled || false);
    form.setValue('reminderDays', contract.reminderDays || 3);
    setIsDialogOpen(true);
  };

  const handlePreviewContract = (contract: Contract) => {
    setPreviewContract(contract);
    setIsPreviewOpen(true);
  };

  const handleSendEmail = (contract: Contract) => {
    console.log('🔥 FRONTEND: handleSendEmail called with contract:', contract.id);
    console.log('🔥 FRONTEND: Contract details:', contract);
    console.log('🔥 FRONTEND: sendEmailMutation.isPending:', sendEmailMutation.isPending);
    sendEmailMutation.mutate({ contractId: contract.id });
  };

  const handleViewSignedContract = (contract: Contract) => {
    console.log('🎯 FRONTEND: handleViewSignedContract called');
    console.log('🎯 Contract status:', contract.status);
    console.log('🎯 Cloud storage URL:', contract.cloudStorageUrl);
    
    // For signed contracts, use app server route (which handles authenticated vs client access)
    if (contract.status === 'signed') {
      console.log('✅ Opening signed contract via app server');
      const viewUrl = `/api/contracts/${contract.id}/download`;
      window.open(viewUrl, '_blank');
    }
    // For draft/unsigned contracts, use local view
    else {
      console.log('📄 Opening draft contract in local view');
      setLocation(`/view-contract/${contract.id}`);
    }
  };

  const handleSelectContract = (contractId: number) => {
    if (selectedContracts.includes(contractId)) {
      setSelectedContracts(prev => prev.filter(id => id !== contractId));
    } else {
      setSelectedContracts(prev => [...prev, contractId]);
    }
  };

  const handleSelectAll = () => {
    if (selectedContracts.length === filteredContracts.length) {
      setSelectedContracts([]);
    } else {
      setSelectedContracts(filteredContracts.map(contract => contract.id));
    }
  };

  const handleBulkDelete = async () => {
    if (selectedContracts.length === 0 || bulkActionLoading) return;

    setBulkActionLoading(true);
    try {
      const result = await apiRequest('/api/contracts/bulk-delete', {
        method: 'POST',
        body: JSON.stringify({ contractIds: selectedContracts })
      });

      console.log('🔥 Bulk delete result:', result);

      queryClient.invalidateQueries({ queryKey: ["/api/contracts"] });
      setSelectedContracts([]);

      toast({
        title: "Contracts deleted",
        description: `${selectedContracts.length} contract${selectedContracts.length !== 1 ? 's' : ''} deleted successfully`,
      });
    } catch (error: any) {
      console.error('🔥 Bulk delete error:', error);
      
      toast({
        title: "Error deleting contracts",
        description: `Failed to delete selected contracts: ${error.message || 'Unknown error'}`,
        variant: "destructive",
      });
    } finally {
      setBulkActionLoading(false);
    }
  };

  const handleDeleteContract = (contract: Contract) => {
    if (confirm(`Are you sure you want to delete contract ${contract.contractNumber}?`)) {
      deleteContractMutation.mutate(contract.id);
    }
  };

  const handleSendContract = (contract: Contract) => {
    setContractToSend(contract);
    setCustomMessage("");
    setCustomMessageDialog(true);
  };

  const handleConfirmSendContract = () => {
    if (contractToSend) {
      sendEmailMutation.mutate({ 
        contractId: contractToSend.id, 
        customMessage: customMessage.trim() || undefined 
      });
    }
  };

  const handleDownloadContract = async (contract: Contract) => {
    try {
      console.log('📄 Downloading contract PDF via app server to avoid CORS issues');
      
      // Always use app server download route to avoid CORS issues with R2 storage
      const response = await fetch(`/api/contracts/${contract.id}/download`, {
        method: 'GET',
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error(`Download failed: ${response.status}`);
      }

      // Get the PDF blob
      const blob = await response.blob();
      
      // Create download URL and trigger download
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Contract-${contract.contractNumber}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      toast({
        title: "Success",
        description: "Contract PDF downloaded successfully!",
      });
    } catch (error) {
      console.error('Error downloading contract:', error);
      toast({
        title: "Error",
        description: "Failed to download contract PDF",
        variant: "destructive",
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "draft": return "bg-gray-100 text-gray-800";
      case "sent": return "bg-blue-100 text-blue-800";
      case "signed": return "bg-green-100 text-green-800";
      case "completed": return "bg-purple-100 text-purple-800";
      case "unsigned": return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getContractDisplayStatus = (contract: Contract) => {
    // Check if contract is unsigned (sent but not signed)
    if (contract.status === "sent" && !contract.signedAt) {
      return "unsigned";
    }
    return contract.status;
  };

  const isContractUnsigned = (contract: Contract) => {
    return contract.status === "sent" && !contract.signedAt;
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "No date set";
    return new Date(dateString).toLocaleDateString("en-GB");
  };

  const filteredContracts = contracts.filter((contract: Contract) => {
    const matchesSearch = searchQuery === "" || 
      contract.contractNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contract.clientName.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === "all" || contract.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  // Handle loading state
  if (isLoading) {
    return (
      <div className="flex min-h-screen">
        {isDesktop && <Sidebar />}
        <div className={`flex-1 p-4 ${isDesktop ? 'ml-64' : ''}`}>
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2 text-gray-600">Loading contracts...</p>
            </div>
          </div>
        </div>
        {!isDesktop && <MobileNav />}
      </div>
    );
  }

  // Handle error state
  if (error) {
    return (
      <div className="flex min-h-screen">
        {isDesktop && <Sidebar />}
        <div className={`flex-1 p-4 ${isDesktop ? 'ml-64' : ''}`}>
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <p className="text-red-600">Error loading contracts. Please try again.</p>
              <button 
                onClick={() => window.location.reload()} 
                className="mt-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Retry
              </button>
            </div>
          </div>
        </div>
        {!isDesktop && <MobileNav />}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile menu toggle */}
      {!isDesktop && (
        <div className="fixed top-4 left-4 z-50">
          <button
            onClick={() => setSidebarOpen(true)}
            className="bg-card p-2 rounded-lg shadow-lg"
          >
            <svg className="w-6 h-6 text-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>
      )}

      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main Content */}
      <div className={`min-h-screen ${isDesktop ? 'ml-64' : ''}`}>
        <div className="p-6">
          <div className="max-w-7xl mx-auto space-y-6">
            {/* Real-time contract notifications */}
            <ContractNotifications />

            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white ml-12 md:ml-0">Contracts</h1>
                <p className="text-gray-600 dark:text-gray-400">Manage your performance contracts and agreements</p>
              </div>

              <Dialog open={isDialogOpen} onOpenChange={handleDialogClose}>
                <DialogTrigger asChild>
                  <Button className="bg-purple-600 hover:bg-purple-700">
                    <FileText className="w-4 h-4 mr-2" />
                    Generate Contract
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader className="pb-4">
                    <DialogTitle>{editingContract ? 'Edit Contract' : 'Generate New Contract'}</DialogTitle>
                  </DialogHeader>
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit((data) => {
                      if (editingContract) {
                        const contractData = {
                          ...data,
                          eventDate: data.eventDate ? new Date(data.eventDate).toISOString() : null,
                          enquiryId: data.enquiryId || null,
                        };
                        updateContractMutation.mutate({ id: editingContract.id, contractData });
                      } else {
                        createContractMutation.mutate(data);
                      }
                    })} className="space-y-6 pt-4">
                      
                      {/* Required Fields Section */}
                      <div className="space-y-4">
                        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                          <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                          Required Fields (Must be completed by musician)
                        </h3>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <FormField
                            control={form.control}
                            name="contractNumber"
                            render={({ field }) => (
                              <FormItem className="space-y-2">
                                <FormLabel className="text-red-600 font-medium">Contract Number *</FormLabel>
                                <FormControl>
                                  <Input placeholder="(dd/mm/yyyy - Client Name)" {...field} value={field.value || ""} />
                                </FormControl>
                                <p className="text-sm text-gray-600">Format: (dd/mm/yyyy - Client Name). Auto-generated but editable for contract re-issuance.</p>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="clientName"
                            render={({ field }) => (
                              <FormItem className="space-y-2">
                                <FormLabel className="text-red-600 font-medium">Client Name *</FormLabel>
                                <FormControl>
                                  <Input placeholder="John Smith" {...field} value={field.value || ""} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <FormField
                            control={form.control}
                            name="venue"
                            render={({ field }) => (
                              <FormItem className="space-y-2">
                                <FormLabel className="text-red-600 font-medium">Venue *</FormLabel>
                                <FormControl>
                                  <Input placeholder="The Grand Hotel, London" {...field} value={field.value || ""} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="eventDate"
                            render={({ field }) => (
                              <FormItem className="space-y-2">
                                <FormLabel className="text-red-600 font-medium">Event Date *</FormLabel>
                                <FormControl>
                                  <Input type="date" {...field} value={field.value || ""} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <FormField
                            control={form.control}
                            name="eventTime"
                            render={({ field }) => (
                              <FormItem className="space-y-2">
                                <FormLabel className="text-red-600 font-medium">Start Time *</FormLabel>
                                <FormControl>
                                  <Input type="time" step="300" {...field} value={field.value || ""} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="eventEndTime"
                            render={({ field }) => (
                              <FormItem className="space-y-2">
                                <FormLabel className="text-red-600 font-medium">End Time *</FormLabel>
                                <FormControl>
                                  <Input type="time" step="300" {...field} value={field.value || ""} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <FormField
                            control={form.control}
                            name="fee"
                            render={({ field }) => (
                              <FormItem className="space-y-2">
                                <FormLabel className="text-red-600 font-medium">Performance Fee (£) *</FormLabel>
                                <FormControl>
                                  <Input type="number" placeholder="500" {...field} value={field.value || ""} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="deposit"
                            render={({ field }) => (
                              <FormItem className="space-y-2">
                                <FormLabel className="text-red-600 font-medium">Deposit (£)</FormLabel>
                                <FormControl>
                                  <Input type="number" placeholder="100" {...field} value={field.value || ""} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-1 gap-6">
                          <FormField
                            control={form.control}
                            name="clientEmail"
                            render={({ field }) => (
                              <FormItem className="space-y-2">
                                <FormLabel className="text-red-600 font-medium">Client Email *</FormLabel>
                                <FormControl>
                                  <Input type="email" placeholder="client@example.com" {...field} value={field.value || ""} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      </div>

                      {/* Optional Fields Section */}
                      <div className="space-y-4">
                        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                          <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                          Optional Fields (Can be filled by musician or client)
                        </h3>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <FormField
                            control={form.control}
                            name="clientPhone"
                            render={({ field }) => (
                              <FormItem className="space-y-2">
                                <FormLabel className="text-blue-600 font-medium">Client Phone</FormLabel>
                                <FormControl>
                                  <Input placeholder="07123 456789" {...field} value={field.value || ""} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <FormField
                            control={form.control}
                            name="clientAddress"
                            render={({ field }) => (
                              <FormItem className="space-y-2">
                                <FormLabel className="text-blue-600 font-medium">Client Address</FormLabel>
                                <FormControl>
                                  <Textarea 
                                    placeholder="123 Main Street, London, SW1A 1AA" 
                                    {...field} 
                                    value={field.value || ""} 
                                    rows={2}
                                    className="min-h-[60px]"
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="venueAddress"
                            render={({ field }) => (
                              <FormItem className="space-y-2">
                                <FormLabel className="text-blue-600 font-medium">Venue Address</FormLabel>
                                <FormControl>
                                  <Textarea 
                                    placeholder="456 Event Street, London, EC1A 1BB" 
                                    {...field} 
                                    value={field.value || ""} 
                                    rows={2}
                                    className="min-h-[60px]"
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      </div>

                      {/* Rider Fields Section */}
                      <div className="space-y-4">
                        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                          <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                          Rider Information (Optional - for professional requirements)
                        </h3>
                        
                        <FormField
                          control={form.control}
                          name="paymentInstructions"
                          render={({ field }) => (
                            <FormItem className="space-y-2">
                              <FormLabel className="text-green-600 font-medium">Payment Instructions</FormLabel>
                              <FormControl>
                                <Textarea 
                                  placeholder="How payment should be made (bank transfer, cash on day, etc.)" 
                                  {...field} 
                                  value={field.value || ""} 
                                  rows={2}
                                  className="min-h-[60px]"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="equipmentRequirements"
                          render={({ field }) => (
                            <FormItem className="space-y-2">
                              <FormLabel className="text-green-600 font-medium">Equipment Requirements</FormLabel>
                              <FormControl>
                                <Textarea 
                                  placeholder="Equipment needed from venue (power, microphones, etc.)" 
                                  {...field} 
                                  value={field.value || ""} 
                                  rows={2}
                                  className="min-h-[60px]"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="specialRequirements"
                          render={({ field }) => (
                            <FormItem className="space-y-2">
                              <FormLabel className="text-green-600 font-medium">Special Requirements</FormLabel>
                              <FormControl>
                                <Textarea 
                                  placeholder="Any special requests or rider requirements" 
                                  {...field} 
                                  value={field.value || ""} 
                                  rows={2}
                                  className="min-h-[60px]"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                          <div className="flex items-start space-x-3">
                            <Info className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                            <div>
                              <h4 className="font-medium text-blue-900 mb-1">Personal Contract Conditions</h4>
                              <p className="text-sm text-blue-700 mb-2">
                                You can set default contract terms, payment instructions, and professional conditions in Settings → Default Contract Terms.
                              </p>
                              <p className="text-xs text-blue-600">
                                These will be automatically included in all contracts alongside the fields above.
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Reminder Settings */}
                      <div className="space-y-4">
                        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                          <span className="w-2 h-2 bg-purple-500 rounded-full"></span>
                          Reminder Settings (Optional)
                        </h3>
                        
                        <FormField
                          control={form.control}
                          name="reminderEnabled"
                          render={({ field }) => (
                            <FormItem className="flex items-center space-x-3">
                              <FormControl>
                                <input
                                  type="checkbox"
                                  checked={field.value || false}
                                  onChange={(e) => field.onChange(e.target.checked)}
                                  className="w-4 h-4 text-purple-600 bg-gray-100 border-gray-300 rounded focus:ring-purple-500"
                                />
                              </FormControl>
                              <FormLabel className="text-sm font-medium text-gray-700">
                                Enable automatic reminders if contract is not signed
                              </FormLabel>
                            </FormItem>
                          )}
                        />

                        {form.watch('reminderEnabled') && (
                          <FormField
                            control={form.control}
                            name="reminderDays"
                            render={({ field }) => (
                              <FormItem className="space-y-2">
                                <FormLabel className="text-purple-600 font-medium">Send reminder every</FormLabel>
                                <div className="flex items-center space-x-2">
                                  <FormControl>
                                    <Select value={field.value?.toString()} onValueChange={(value) => field.onChange(parseInt(value))}>
                                      <SelectTrigger className="w-32">
                                        <SelectValue placeholder="3" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="1">1 day</SelectItem>
                                        <SelectItem value="3">3 days</SelectItem>
                                        <SelectItem value="5">5 days</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </FormControl>
                                  <span className="text-sm text-gray-600">until contract is signed</span>
                                </div>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        )}
                      </div>

                      <div className="flex justify-end space-x-3 pt-4 border-t">
                        <Button type="button" variant="outline" onClick={() => handleDialogClose(false)}>
                          Cancel
                        </Button>
                        <Button type="submit" disabled={createContractMutation.isPending || updateContractMutation.isPending}>
                          {editingContract ? (
                            updateContractMutation.isPending ? "Updating..." : "Update Contract"
                          ) : (
                            createContractMutation.isPending ? "Generating..." : "Generate Contract"
                          )}
                        </Button>
                      </div>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            </div>

            {/* Filters */}
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-4">
                  <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                    <Input
                      placeholder="Search contracts..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="Filter by status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="sent">Sent</SelectItem>
                      <SelectItem value="signed">Signed</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Bulk Actions */}
            {selectedContracts.length > 0 && (
              <Card className="bg-blue-50 border-blue-200">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <span className="text-sm font-medium text-blue-900">
                        {selectedContracts.length} contract{selectedContracts.length !== 1 ? 's' : ''} selected
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedContracts([])}
                        className="text-blue-700 border-blue-300 hover:bg-blue-100"
                      >
                        Clear Selection
                      </Button>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleBulkDelete()}
                        disabled={bulkActionLoading}
                        className="bg-red-600 hover:bg-red-700"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        {bulkActionLoading ? "Deleting..." : "Delete Selected"}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Contracts List */}
            <div className="space-y-4">
              {filteredContracts.length === 0 ? (
                <Card>
                  <CardContent className="p-12 text-center">
                    <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500 text-lg">No contracts found</p>
                    <p className="text-gray-400">Generate your first contract from a qualified enquiry</p>
                    <Button 
                      className="mt-4 bg-purple-600 hover:bg-purple-700"
                      onClick={() => setIsDialogOpen(true)}
                    >
                      <FileText className="w-4 h-4 mr-2" />
                      Generate Contract
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <>
                  {/* Select All Header */}
                  <Card className="bg-gray-50">
                    <CardContent className="p-4">
                      <div className="flex items-center space-x-3">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleSelectAll()}
                          className="p-1 h-8 w-8"
                        >
                          {selectedContracts.length === filteredContracts.length ? 
                            <CheckSquare className="w-4 h-4 text-blue-600" /> : 
                            <Square className="w-4 h-4 text-gray-400" />
                          }
                        </Button>
                        <span className="text-sm text-gray-600">
                          {selectedContracts.length === filteredContracts.length ? 
                            "All contracts selected" : 
                            "Select all contracts"
                          }
                        </span>
                      </div>
                    </CardContent>
                  </Card>

                  {filteredContracts.map((contract: Contract) => (
                    <Card key={contract.id} className={`hover:shadow-md transition-shadow cursor-pointer ${selectedContracts.includes(contract.id) ? 'bg-blue-50 border-blue-200' : ''}`}>
                      <CardContent className="p-6">
                        <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                          <div className="flex items-start gap-3 flex-1 min-w-0">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleSelectContract(contract.id)}
                              className="p-1 h-8 w-8 mt-1"
                            >
                              {selectedContracts.includes(contract.id) ? 
                                <CheckSquare className="w-4 h-4 text-blue-600" /> : 
                                <Square className="w-4 h-4 text-gray-400" />
                              }
                            </Button>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center space-x-3 mb-3">
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                                  Contract #{contract.contractNumber}
                                </h3>
                                <Badge className={getStatusColor(getContractDisplayStatus(contract))}>
                                  {getContractDisplayStatus(contract).toUpperCase()}
                                </Badge>
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-sm text-gray-600 dark:text-gray-300">
                                <div className="lg:col-span-2">
                                  <span className="font-medium">Client:</span>
                                  <p className="text-gray-900 dark:text-gray-100 truncate">{contract.clientName}</p>
                                </div>
                                <div>
                                  <span className="font-medium">Fee:</span>
                                  <p className="text-gray-900 dark:text-gray-100 font-semibold">£{contract.fee}</p>
                                </div>
                                <div>
                                  <span className="font-medium">Date:</span>
                                  <p className="text-gray-900 dark:text-gray-100">{formatDate(contract.eventDate)}</p>
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center gap-2 lg:flex-nowrap lg:flex-shrink-0 lg:justify-start">
                            {/* View button - available for all statuses */}
                            <Button 
                              size="sm" 
                              className="text-xs whitespace-nowrap bg-green-600 hover:bg-green-700 text-white"
                              onClick={() => handleViewSignedContract(contract)}
                            >
                              <Eye className="w-3 h-3 mr-1" />
                              View
                            </Button>

                            {contract.status === "draft" && (
                              <>
                                <Button 
                                  size="sm" 
                                  variant="outline" 
                                  className="text-xs whitespace-nowrap text-gray-600 hover:text-gray-700"
                                  onClick={() => handleEditContract(contract)}
                                >
                                  <Edit className="w-3 h-3 mr-1" />
                                  Edit
                                </Button>
                                <Button 
                                  size="sm" 
                                  className="text-xs whitespace-nowrap bg-blue-600 hover:bg-blue-700 text-white" 
                                  onClick={() => handleSendContract(contract)}
                                  disabled={sendEmailMutation.isPending}
                                >
                                  {sendEmailMutation.isPending ? "Sending..." : "Send"}
                                </Button>
                                <Button 
                                  size="sm" 
                                  variant="outline" 
                                  className="text-xs whitespace-nowrap text-red-600 hover:text-red-700"
                                  onClick={() => handleDeleteContract(contract)}
                                >
                                  Delete
                                </Button>
                              </>
                            )}

                            {contract.status === "sent" && (
                              <>
                                <Button 
                                  size="sm" 
                                  variant="outline" 
                                  className="text-xs whitespace-nowrap text-gray-600 hover:text-gray-700"
                                  onClick={() => handleDownloadContract(contract)}
                                >
                                  <Download className="w-3 h-3 mr-1" />
                                  Download
                                </Button>
                                <Button 
                                  size="sm" 
                                  variant="outline" 
                                  className="text-xs whitespace-nowrap text-blue-600 hover:text-blue-700"
                                  onClick={() => handleSendContract(contract)}
                                >
                                  Resend
                                </Button>
                                {isContractUnsigned(contract) && (
                                  <Button 
                                    size="sm" 
                                    variant="outline" 
                                    className="text-xs whitespace-nowrap bg-amber-50 hover:bg-amber-100 text-amber-700 border-amber-200" 
                                    onClick={() => sendReminderMutation.mutate(contract.id)}
                                    disabled={sendReminderMutation.isPending}
                                    title="Send reminder email to client (automatically refreshes signing link if needed)"
                                  >
                                    <Mail className="w-3 h-3 mr-1" />
                                    {sendReminderMutation.isPending ? "Sending..." : "Send Reminder"}
                                  </Button>
                                )}
                              </>
                            )}

                            {contract.status === "signed" && (
                              <>
                                <Button 
                                  size="sm" 
                                  variant="outline" 
                                  className="text-xs whitespace-nowrap text-gray-600 hover:text-gray-700"
                                  onClick={() => handleDownloadContract(contract)}
                                >
                                  <Download className="w-3 h-3 mr-1" />
                                  Download
                                </Button>
                              </>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </>
              )}
            </div>

            {/* Custom Message Dialog */}
            <Dialog open={customMessageDialog} onOpenChange={setCustomMessageDialog}>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>Send Contract Email</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  {contractToSend && (
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <h4 className="font-medium text-gray-900 mb-2">
                        Contract #{contractToSend.contractNumber}
                      </h4>
                      <div className="text-sm text-gray-600 space-y-1">
                        <p><strong>Client:</strong> {contractToSend.clientName}</p>
                        <p><strong>Email:</strong> {contractToSend.clientEmail}</p>
                        <p><strong>Event:</strong> {formatDate(contractToSend.eventDate)} at {contractToSend.venue}</p>
                        <p><strong>Fee:</strong> £{contractToSend.fee}</p>
                      </div>
                    </div>
                  )}
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">
                      Add a personal message (optional)
                    </label>
                    <div className="bg-amber-50 border border-amber-200 rounded-md p-3 mb-3">
                      <p className="text-xs text-amber-700">
                        <strong>Important:</strong> This message is for personal communication only. 
                        Do not include payment terms, event details, or contractual changes here - 
                        these should be made in the contract itself.
                      </p>
                    </div>
                    <p className="text-xs text-gray-500">
                      Use this space for friendly greetings, additional context, or special instructions that don't modify the contract terms.
                    </p>
                    <Textarea
                      placeholder="e.g., 'Looking forward to performing at your special event!' or 'Please let me know if you have any questions.'"
                      value={customMessage}
                      onChange={(e) => setCustomMessage(e.target.value)}
                      rows={4}
                      className="resize-none"
                    />
                  </div>
                  
                  <div className="flex justify-end space-x-2">
                    <Button
                      variant="outline"
                      onClick={() => setCustomMessageDialog(false)}
                      disabled={sendEmailMutation.isPending}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleConfirmSendContract}
                      disabled={sendEmailMutation.isPending}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      {sendEmailMutation.isPending ? "Sending..." : "Send Contract"}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>

      <MobileNav />
    </div>
  );
}