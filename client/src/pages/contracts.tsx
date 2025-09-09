import React, { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
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
import { useAuth } from "@/hooks/useAuth";
import { useIsMobile } from "@/hooks/use-mobile";
import { Link } from "wouter";
import { ContractNotifications, useContractStatusMonitor } from "@/components/contract-notifications";
import MobileFeatureGuard from "@/components/mobile-feature-guard";
import { useTheme } from "@/hooks/useTheme";
import { getBookingAmountDisplayText } from "@/utils/booking-calculations";
import { getContrastTextColor } from "@/lib/colorUtils";
import { calculateContractTotals } from "@/utils/booking-calculations";

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
  performanceDuration: z.string().optional(),
  deposit: z.string().optional(),
  depositDays: z.number().optional(),
  travelExpenses: z.string().optional(), // Travel expenses field
  originalFee: z.string().optional(), // Hidden field to track original fee when combined
  originalTravelExpenses: z.string().optional(), // Hidden field to track original travel
  clientAddress: z.string().optional(),
  clientPhone: z.string().optional(),
  venueAddress: z.string().optional(),
  paymentInstructions: z.string().optional(),
  equipmentRequirements: z.string().optional(),
  specialRequirements: z.string().optional(),
  clientFillableFields: z.array(z.string()).optional(),
  enquiryId: z.number().optional(),
  status: z.string().default("draft"),
  template: z.string().optional().default("professional"),
  // PHASE 2: Automated reminders (removed for manual-only phase 1)
  // reminderEnabled: z.boolean().default(false),
  // reminderDays: z.number().min(1).max(30).default(3),
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
  const [dataLoaded, setDataLoaded] = useState(false); // Track if auto-fill has been completed
  const { isDesktop } = useResponsive();
  const { toast } = useToast();
  const { theme } = useTheme();
  const [location, setLocation] = useLocation();
  const { user } = useAuth();
  

  
  // Monitor contract signings for real-time notifications
  useContractStatusMonitor();

  const { data: contracts = [], isLoading, error } = useQuery<Contract[]>({
    queryKey: ["/api/contracts"],
  });

  const { data: enquiries = [] } = useQuery<Enquiry[]>({
    queryKey: ["/api/bookings"],
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
      performanceDuration: "",
      venue: "",
      venueAddress: "",
      fee: "",
      deposit: "",
      depositDays: 7,
      travelExpenses: "",
      paymentInstructions: "",
      equipmentRequirements: "",
      specialRequirements: "",
      status: "draft",
      template: "professional", // Only professional template supported
      // PHASE 2: Automated reminders (removed for manual-only phase 1)
      // reminderEnabled: false,
      // reminderDays: 3,
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

  // Remove the toggle change handling - it's causing confusion
  // The form should be filled correctly when loading from bookings/contracts
  // Manual entry should work as expected based on what the user enters



  // Check URL params to auto-open form dialog and auto-fill with booking/enquiry data
  React.useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const action = urlParams.get('action');
    const bookingId = urlParams.get('bookingId');
    const isNewContractUrl = window.location.pathname === '/contracts/new';
    
    // Only run once when component mounts and data is loaded, and not already processed
    // CRITICAL: Check dataLoaded FIRST to prevent reopening after manual close
    if (!dataLoaded && (action === 'new' || action === 'create' || isNewContractUrl) && !isLoading) {
      console.log('📂 Opening dialog from URL params');
      
      // FORCE FORM RESET to prevent cached values
      form.reset({
        enquiryId: 0,
        contractNumber: "",
        clientName: "",
        clientEmail: "",
        clientPhone: "",
        clientAddress: "",
        eventDate: "",
        eventTime: "",
        eventEndTime: "",
        performanceDuration: "",
        venue: "",
        venueAddress: "",
        fee: "",
        deposit: "",
        depositDays: 7,
        travelExpenses: "",
        originalFee: "",
        originalTravelExpenses: "",
        paymentInstructions: "",
        equipmentRequirements: "",
        specialRequirements: "",
        status: "draft",
        template: "professional",
      });
      console.log('🔄 Form reset to clear any cached values');
      
      setIsDialogOpen(true);
      setDataLoaded(true); // CRITICAL FIX: Mark as loaded to prevent infinite loop

      // Auto-generate contract number in format (dd/mm/yyyy - Client Name)
      // Use today's date as default, but will be updated when event date is selected
      const today = new Date();
      const formattedDate = today.toLocaleDateString('en-GB');
      const contractNumber = `(${formattedDate} - )`;
      form.setValue('contractNumber', contractNumber);

      // Auto-fill with booking data if bookingId is provided
      if (bookingId) {
        // Fetch booking data and auto-fill form with cache-busting
        apiRequest(`/api/bookings/${bookingId}?t=${Date.now()}`, { method: 'GET' })
          .then(response => response.json())
          .then(booking => {
            if (booking) {
              // Auto-fill form with booking data
              form.setValue('clientName', booking.clientName || '');
              form.setValue('clientEmail', booking.clientEmail || '');
              form.setValue('clientPhone', booking.clientPhone || '');
              form.setValue('clientAddress', booking.clientAddress || '');
              form.setValue('venue', booking.venue || '');
              form.setValue('venueAddress', booking.venueAddress || '');
              form.setValue('eventDate', booking.eventDate ? new Date(booking.eventDate).toISOString().split('T')[0] : '');
              // Set time fields directly - now using same format as booking form
              form.setValue('eventTime', booking.eventTime || '');
              form.setValue('eventEndTime', booking.eventEndTime || '');
              form.setValue('performanceDuration', booking.performanceDuration || '');
              // Use the finalAmount (total fee) for contracts - no separate fees
              const totalFee = booking.finalAmount || booking.fee || '';
              
              console.log('💰 Using total fee for contract:', totalFee);
              console.log('🔍 Raw booking object:', booking);
              console.log('🔍 Available amounts: finalAmount:', booking.finalAmount, 'fee:', booking.fee, 'travelExpense:', booking.travelExpense);
              
              // Set the total fee as the contract fee - no separate performance/travel
              form.setValue('fee', totalFee.toString());
              
              // Remove travel expense fields - not needed for contracts
              form.setValue('travelExpenses', '0');
              form.setValue('originalFee', totalFee.toString());
              form.setValue('originalTravelExpenses', '0');
              
              console.log('💰 Contract will show total fee only:', totalFee);
              
              // Skip the old separate fee logic
              if (false) {
                // This block is now unused
                form.setValue('originalFee', baseFee);
                form.setValue('originalTravelExpenses', '0');
                form.setValue('travelExpenses', '0');
                form.setValue('fee', baseFee);
                console.log('💼 Using booking fee as-is:', baseFee);
                console.log('🎯 FINAL VALUES SET IN FORM:', {
                  fee: baseFee,
                  originalFee: baseFee,
                  travelExpenses: '0'
                });
              }
              
              form.setValue('equipmentRequirements', booking.equipmentRequirements || '');
              form.setValue('specialRequirements', booking.specialRequirements || '');
              
              // CRITICAL FIX: Set enquiryId to link contract back to booking
              form.setValue('enquiryId', parseInt(bookingId));
              
              // Auto-generate contract number with event date and client name
              if (booking.eventDate && booking.clientName) {
                const eventDate = new Date(booking.eventDate);
                const formattedDate = eventDate.toLocaleDateString('en-GB');
                const contractNumber = `(${formattedDate} - ${booking.clientName})`;
                form.setValue('contractNumber', contractNumber);
              }
              
              toast({
                title: "Booking Data Loaded",
                description: "Contract form pre-filled with booking information",
              });
              setDataLoaded(true); // Mark data as loaded
            }
          })
          .catch(error => {
            console.error('Error fetching booking data:', error);
            toast({
              title: "Error",
              description: "Could not load booking data for auto-fill",
              variant: "destructive",
            });
          });
      } else {
        // Auto-fill with enquiry data if enquiryId is provided (fallback)
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
            form.setValue('eventTime', enquiry.eventTime || '');
            form.setValue('eventEndTime', enquiry.eventEndTime || '');
            form.setValue('fee', enquiry.fee || '');
            
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
      setDataLoaded(true); // Mark data as loaded even if no specific auto-fill occurs
    }
  }, [enquiries, contracts, form, isLoading, dataLoaded, toast]); // Removed isDialogOpen from dependencies to prevent circular reopening

  // Simple dialog close handler without complex state management
  const handleDialogClose = (open: boolean) => {
    console.log('🔄 handleDialogClose called with:', open);
    
    if (!open) {
      console.log('🚪 Closing dialog - cleaning up state');
      
      // CRITICAL: Clean up URL BEFORE updating state to prevent re-triggering
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get('action') === 'new' || urlParams.get('action') === 'create' || 
          window.location.pathname === '/contracts/new') {
        console.log('🧹 Cleaning up URL params');
        window.history.replaceState({}, '', '/contracts');
      }
      
      // Clear all form and component state
      setEditingContract(null);
      form.reset();
      
      // Reset dataLoaded after a small delay to prevent immediate re-trigger
      setTimeout(() => {
        setDataLoaded(false);
        console.log('✅ Dialog cleanup complete - dataLoaded reset');
      }, 100);
    }
    
    // Always update the dialog state
    setIsDialogOpen(open);
  };

  const createContractMutation = useMutation({
    mutationFn: async (data: z.infer<typeof contractFormSchema>) => {
      const { travelExpenses, originalFee, originalTravelExpenses, ...dataWithoutTravelExpenses } = data;
      
      console.log('🐛 Debug contract creation values:', {
        originalFee,
        originalTravelExpenses, 
        travelExpenses,
        // Travel always shown separately now
      });
      
      // Use total fee for contracts - no separate performance/travel fees
      const feeToSave = parseFloat(data.fee || '0'); // Use the total fee from form
      const travelToSave = 0; // No travel expenses on contracts
      
      const contractData = {
        ...dataWithoutTravelExpenses,
        // Fix date format: backend expects YYYY-MM-DD, not ISO string
        eventDate: data.eventDate || null,
        // Include fee field - required by backend
        fee: data.fee || "0.00",
        travelExpenses: travelToSave,  // camelCase version
        travel_expenses: travelToSave,  // snake_case version for compatibility
        // Fix enquiryId: make truly optional with null
        enquiryId: data.enquiryId ? parseInt(data.enquiryId.toString()) : null,
      };
      
      console.log('📋 Contract Data being sent:', {
        fee: data.fee || "0.00",
        travel_expenses: travelToSave,
        originalFee,
        originalTravelExpenses,
        travelExpenses,
        note: 'Fee field included for backend requirement'
      });

      // Step 1: Create contract in database using apiRequest (includes JWT token)
      const response = await apiRequest("/api/contracts", {
        method: "POST",
        body: contractData,
      });
      
      const createdContract = await response.json();
      console.log('✅ Contract created with ID:', createdContract?.id);
      console.log('📋 Full contract response:', createdContract);

      // Validate we have a contract ID before proceeding
      if (!createdContract?.id) {
        throw new Error('Contract creation failed - no ID returned');
      }

      // Step 2: Immediately upload to R2 cloud storage
      console.log('☁️ Uploading new contract to R2 storage...');
      const r2Response = await apiRequest(`/api/contracts/${createdContract.id}/r2-url`, {
        method: 'GET',
      });

      try {
        const r2Data = await r2Response.json();
        console.log('✅ Contract created and uploaded to R2:', r2Data.url);
        createdContract.cloudStorageUrl = r2Data.url;
      } catch (error) {
        console.warn('⚠️ Contract created but R2 upload failed - will upload on first view');
      }

      return createdContract;
    },
    onSuccess: (contract) => {
      console.log('✅ Contract created successfully, closing dialog...');
      
      // Clean up URL FIRST to prevent re-triggering
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get('action') === 'new' || urlParams.get('action') === 'create' || 
          window.location.pathname === '/contracts/new') {
        window.history.replaceState({}, '', '/contracts');
      }
      
      // Clear form and state
      setEditingContract(null);
      form.reset();
      
      // Close dialog
      setIsDialogOpen(false);
      
      // Reset dataLoaded after a delay to prevent re-triggering
      setTimeout(() => {
        setDataLoaded(false);
      }, 200);
      
      // Invalidate queries and show success message
      queryClient.invalidateQueries({ queryKey: ["/api/contracts"] });
      toast({
        title: "Success",
        description: contract.cloudStorageUrl 
          ? "Contract created and stored in cloud!" 
          : "Contract created successfully!",
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
      // Step 1: Update contract in database
      const updatedContract = await apiRequest(`/api/contracts/${id}`, {
        method: "PATCH",
        body: JSON.stringify(contractData),
      });

      // Step 2: Update in R2 cloud storage (overwrite existing)
      console.log('☁️ Updating contract in R2 storage...');
      try {
        const r2Response = await apiRequest(`/api/contracts/${id}/r2-url`, {
          method: 'GET',
        });
        const r2Data = await r2Response.json();
        console.log('✅ Contract updated in R2:', r2Data.url);
        updatedContract.cloudStorageUrl = r2Data.url;
      } catch (error) {
        console.warn('⚠️ Contract updated but R2 update failed');
      }

      return updatedContract;
    },
    onSuccess: (contract) => {
      console.log('✅ Contract updated successfully, closing dialog...');
      
      // Clean up URL FIRST to prevent re-triggering
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get('action') === 'new' || urlParams.get('action') === 'create' || 
          window.location.pathname === '/contracts/new') {
        window.history.replaceState({}, '', '/contracts');
      }
      
      // Clear form and state
      setEditingContract(null);
      form.reset();
      
      // Close dialog
      setIsDialogOpen(false);
      
      // Reset dataLoaded after a delay to prevent re-triggering
      setTimeout(() => {
        setDataLoaded(false);
      }, 200);
      
      // Invalidate queries and show success message
      queryClient.invalidateQueries({ queryKey: ["/api/contracts"] });
      toast({
        title: "Success",
        description: contract.cloudStorageUrl 
          ? "Contract updated and stored in cloud!" 
          : "Contract updated successfully!",
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

  // CRITICAL FIX: Email sending mutation with correct isolated endpoint
  const sendEmailMutation = useMutation({
    mutationFn: async ({ contractId, customMessage }: { contractId: number, customMessage?: string }) => {
      console.log('📧 FIXED: Using isolated contract email endpoint...');
      console.log('📧 FIXED: Sending to:', `/api/isolated/contracts/send-email`);
      console.log('📧 FIXED: Contract ID:', contractId);
      
      // REVERT: Use working contract email endpoint
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
      console.error('🔥 FIXED: Contract email mutation error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to send contract email",
        variant: "destructive",
      });
    },
  });

  // Amendment mutation for sent contracts
  const amendContractMutation = useMutation({
    mutationFn: async (contractId: number) => {
      return apiRequest(`/api/contracts/${contractId}/amend`, {
        method: "POST",
      });
    },
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ["/api/contracts"] });
      toast({
        title: "Contract Amended",
        description: `Created amended contract: ${response.amendedContract.contractNumber}`,
      });
      // Optionally, open the edit dialog for the new amended contract
      setEditingContract(response.amendedContract);
      setIsDialogOpen(true);
    },
    onError: (error) => {
      console.error('Amendment error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to create amended contract",
        variant: "destructive",
      });
    },
  });

  // PHASE 2: Automated reminder system (commented out for manual-only phase 1)
  /*
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
  */

  const deleteContractMutation = useMutation({
    mutationFn: async (contractId: number) => {
      
      return apiRequest(`/api/contracts/${contractId}`, {
        method: "DELETE",
      });
    },
    onSuccess: (data) => {
      
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
    form.setValue('eventTime', contract.eventTime?.split(' - ')[0] || '');
    form.setValue('eventEndTime', contract.eventTime?.split(' - ')[1] || '');
    form.setValue('performanceDuration', contract.performanceDuration || '');
    form.setValue('venue', contract.venue || '');
    form.setValue('venueAddress', contract.venueAddress || '');
    // Store original values for toggle handling
    const baseFee = contract.fee || '';
    const travelFee = contract.travel_expenses || contract.travelExpenses || '';
    
    form.setValue('originalFee', baseFee);
    form.setValue('originalTravelExpenses', travelFee);
    form.setValue('travelExpenses', travelFee);
    
    // Always keep fees separate - no longer combine them
    form.setValue('fee', baseFee);
    
    form.setValue('deposit', contract.deposit || '');
    form.setValue('depositDays', contract.depositDays || 7);
    form.setValue('paymentInstructions', contract.paymentInstructions || '');
    form.setValue('equipmentRequirements', contract.equipmentRequirements || '');
    form.setValue('specialRequirements', contract.specialRequirements || '');
    // CRITICAL FIX: Always force professional template
    form.setValue('template', 'professional'); // FORCE PROFESSIONAL - ignore database value
    // PHASE 2: Reminder system fields (commented out for manual-only phase 1)
    // form.setValue('reminderEnabled', contract.reminderEnabled || false);
    // form.setValue('reminderDays', contract.reminderDays || 3);
    setIsDialogOpen(true);
  };

  const handlePreviewContract = (contract: Contract) => {
    setPreviewContract(contract);
    setIsPreviewOpen(true);
  };

  const handleSendEmail = (contract: Contract) => {
    
    
    
    sendEmailMutation.mutate({ contractId: contract.id });
  };

  // CRITICAL FIX: View contract function with correct isolated endpoint
  const handleViewSignedContract = async (contract: Contract) => {
    console.log('👁️ FIXED: View contract clicked:', {
      id: contract.id,
      status: contract.status,
      hasCloudUrl: !!contract.cloudStorageUrl,
      contractNumber: contract.contractNumber
    });
    
    try {
      // CRITICAL FIX: Use isolated R2 URL endpoint
      console.log('🔗 FIXED: Getting R2 URL from isolated endpoint...');
      const response = await fetch(`/api/isolated/contracts/${contract.id}/r2-url`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('✅ FIXED: Got R2 URL from isolated system:', data.url);
        
        // Open R2 URL directly in new tab - no intermediate pages
        window.open(data.url, '_blank');
        
        toast({
          title: "Contract Opened",
          description: "Opening contract directly from cloud storage",
        });
        
      } else {
        console.error('❌ FIXED: Failed to get R2 URL from isolated system:', response.status);
        // Fallback to main system download endpoint
        const downloadUrl = `/api/contracts/${contract.id}/download?force=true`;
        window.open(downloadUrl, '_blank');
      }
      
    } catch (error) {
      console.error('❌ FIXED: Error getting R2 URL from isolated system:', error);
      toast({
        title: "Error",
        description: "Failed to open contract. Using fallback method.",
        variant: "destructive",
      });
      
      // Fallback to main system download endpoint
      const downloadUrl = `/api/contracts/${contract.id}/download?force=true`;
      window.open(downloadUrl, '_blank');
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
    if (selectedContracts.length === filteredContracts?.length) {
      setSelectedContracts([]);
    } else {
      setSelectedContracts(filteredContracts?.map(contract => contract.id) || []);
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
      // Simple download approach
      const downloadLink = `/api/contracts/${contract.id}/download`;
      const a = document.createElement('a');
      a.href = downloadLink;
      a.download = `Contract-${contract.contractNumber}.pdf`;
      a.click();

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
      case "completed": return "bg-primary/10 text-primary";
      case "unsigned": return "bg-red-100 text-red-800";
      case "superseded": return "bg-yellow-100 text-yellow-800";
      case "voided": return "bg-red-100 text-red-800";
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

  const filteredContracts = contracts?.filter((contract: Contract) => {
    const matchesSearch = searchQuery === "" || 
      contract.contractNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contract.clientName.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === "all" || contract.status === statusFilter;

    return matchesSearch && matchesStatus;
  }) || [];

  // Handle loading state
  if (isLoading) {
    return (
      <div className="flex min-h-screen">
        {isDesktop && <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />}
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
        {isDesktop && <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />}
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
                  <Button className="bg-primary hover:bg-primary/90">
                    <FileText className="w-4 h-4 mr-2" />
                    Generate Contract
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader className="pb-4">
                    <DialogTitle>{editingContract ? 'Edit Contract' : 'Generate New Contract'}</DialogTitle>
                    <DialogDescription>
                      {editingContract ? 'Update the contract details below.' : 'Fill in the contract details below to generate a new contract.'}
                    </DialogDescription>
                  </DialogHeader>
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit((data) => {
                      if (editingContract) {
                        const { travelExpenses, originalFee, originalTravelExpenses, ...dataWithoutTravelExpenses } = data;
                        
                        // Use total fee for contracts - no separate performance/travel fees
                        let feeToSave: number;
                        let travelToSave: number;
                        
                        // Use total fee only
                        feeToSave = parseFloat(data.fee || '0'); // Use the total fee from form
                        travelToSave = 0; // No travel expenses on contracts
                        
                        const contractData = {
                          ...dataWithoutTravelExpenses,
                          eventDate: data.eventDate ? new Date(data.eventDate).toISOString() : null,
                          enquiryId: data.enquiryId || null,
                          fee: feeToSave,
                          travelExpenses: travelToSave,  // Backend expects camelCase
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
                                <FormLabel className="text-red-600 font-medium">Event Start Time *</FormLabel>
                                <FormControl>
                                  <Input 
                                    type="time" 
                                    placeholder="16:00" 
                                    {...field} 
                                    value={field.value || ""} 
                                    step="300"
                                  />
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
                                <FormLabel className="text-red-600 font-medium">Event Finish Time *</FormLabel>
                                <FormControl>
                                  <Input 
                                    type="time" 
                                    placeholder="18:00" 
                                    {...field} 
                                    value={field.value || ""} 
                                    step="300"
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-1 gap-6">
                          <FormField
                            control={form.control}
                            name="performanceDuration"
                            render={({ field }) => (
                              <FormItem className="space-y-2">
                                <FormLabel className="text-red-600 font-medium">Actual Performance Time</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value || ""}>
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Total time actually performing" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="not_specified">Not specified</SelectItem>
                                    <SelectItem value="30 minutes">30 minutes</SelectItem>
                                    <SelectItem value="45 minutes">45 minutes</SelectItem>
                                    <SelectItem value="1 hour">1 hour</SelectItem>
                                    <SelectItem value="75 minutes">75 minutes (1 hour 15 mins)</SelectItem>
                                    <SelectItem value="90 minutes">90 minutes (1.5 hours)</SelectItem>
                                    <SelectItem value="2 hours">2 hours</SelectItem>
                                    <SelectItem value="2.5 hours">2.5 hours</SelectItem>
                                    <SelectItem value="3 hours">3 hours</SelectItem>
                                    <SelectItem value="3.5 hours">3.5 hours</SelectItem>
                                    <SelectItem value="4 hours">4 hours</SelectItem>
                                    <SelectItem value="2 x 45 min sets">2 x 45 min sets</SelectItem>
                                    <SelectItem value="2 x 1 hour sets">2 x 1 hour sets</SelectItem>
                                    <SelectItem value="3 x 45 min sets">3 x 45 min sets</SelectItem>
                                  </SelectContent>
                                </Select>
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
                                <FormLabel className="text-red-600 font-medium">Total Fee (£) *</FormLabel>
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
                            name="depositDays"
                            render={({ field }) => (
                              <FormItem className="space-y-2">
                                <FormLabel className="text-red-600 font-medium">Deposit Due (Days)</FormLabel>
                                <FormControl>
                                  <Input 
                                    type="number" 
                                    placeholder="7" 
                                    {...field} 
                                    value={field.value || 7}
                                    onChange={(e) => field.onChange(parseInt(e.target.value) || 7)}
                                  />
                                </FormControl>
                                <div className="text-xs text-gray-500">
                                  Number of days client has to pay deposit after signing
                                </div>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        {/* Travel Expenses Field - HIDDEN (not needed for contracts) */}
                        {false && (
                          <div className="grid grid-cols-1 md:grid-cols-1 gap-6">
                            <FormField
                              control={form.control}
                              name="travelExpenses"
                              render={({ field }) => (
                                <FormItem className="space-y-2">
                                  <FormLabel className="text-red-600 font-medium">Travel Expenses (£)</FormLabel>
                                  <FormControl>
                                    <Input type="number" placeholder="50" {...field} value={field.value || ""} />
                                  </FormControl>
                                  <div className="text-xs text-gray-500">
                                    Shown separately from performance fee based on your settings
                                  </div>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                        )}

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



                      <div className="flex justify-end space-x-3 pt-4 border-t">
                        <Button 
                          type="button" 
                          variant="outline" 
                          onClick={() => handleDialogClose(false)}
                        >
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
                      className="mt-4 bg-primary hover:bg-primary/90"
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
                                {/* Show pending amendment indicator */}
                                {contract.status === "signed" && contract.supersededBy && (
                                  <Badge className="bg-amber-100 text-amber-800 text-xs">
                                    AMENDMENT PENDING
                                  </Badge>
                                )}
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-sm text-gray-600 dark:text-gray-300">
                                <div className="lg:col-span-2">
                                  <span className="font-medium">Client:</span>
                                  <p className="text-gray-900 dark:text-gray-100 truncate">{contract.clientName}</p>
                                </div>
                                <div>
                                  <span className="font-medium">Fee:</span>
                                  <p className="text-gray-900 dark:text-gray-100 font-semibold">
                                    {(() => {
                                      const amountDisplay = getBookingAmountDisplayText(
                                        { fee: parseFloat(contract.fee || '0'), travelExpenses: parseFloat(contract.travelExpenses || '0') }, 
                                        settings
                                      );
                                      return amountDisplay.subtitle 
                                        ? `${amountDisplay.main} ${amountDisplay.subtitle}`
                                        : amountDisplay.main;
                                    })()}
                                  </p>
                                </div>
                                <div>
                                  <span className="font-medium">Date:</span>
                                  <p className="text-gray-900 dark:text-gray-100">{formatDate(contract.eventDate?.toString() || '')}</p>
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
                                <Button 
                                  size="sm" 
                                  variant="outline" 
                                  className="text-xs whitespace-nowrap text-orange-600 hover:text-orange-700"
                                  onClick={() => amendContractMutation.mutate(contract.id)}
                                  disabled={amendContractMutation.isPending}
                                >
                                  <Edit className="w-3 h-3 mr-1" />
                                  {amendContractMutation.isPending ? "Creating..." : "Amend"}
                                </Button>
                                {/* PHASE 2: Send Reminder button (commented out for manual-only phase 1)
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
                                */}
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

                                {!contract.supersededBy && (
                                  <Button 
                                    size="sm" 
                                    variant="outline" 
                                    className="text-xs whitespace-nowrap text-orange-600 hover:text-orange-700"
                                    onClick={() => amendContractMutation.mutate(contract.id)}
                                    disabled={amendContractMutation.isPending}
                                  >
                                    <Edit className="w-3 h-3 mr-1" />
                                    {amendContractMutation.isPending ? "Creating..." : "Amend"}
                                  </Button>
                                )}
                                {contract.supersededBy && (
                                  <div className="text-xs text-amber-600 italic font-medium">
                                    Still legally binding (amendment pending)
                                  </div>
                                )}
                              </>
                            )}

                            {contract.status === "voided" && (
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
                                <div className="text-xs text-red-500 italic font-medium">
                                  Voided by signed amendment
                                </div>
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
                        <p><strong>Event:</strong> {formatDate(contractToSend.eventDate?.toString() || '')} at {contractToSend.venue}</p>
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
                      style={{
                        backgroundColor: theme.colors.primary,
                        color: getContrastTextColor(theme.colors.primary),
                        border: 'none'
                      }}
                      className="hover:opacity-90 transition-opacity"
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