import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Search, Filter, MoreHorizontal, PoundSterling, Calendar, FileText, Download, Plus, Send, Edit, CheckCircle, AlertTriangle, AlertCircle, Trash2, Archive, FileDown, RefreshCw, ArrowLeft, Eye, CreditCard } from "lucide-react";
import { insertInvoiceSchema, type Invoice } from "@shared/schema";
import { useLocation, Link } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuthContext } from "@/contexts/AuthContext";
import { z } from "zod";
import Sidebar from "@/components/sidebar";
import MobileNav from "@/components/mobile-nav";
import { useResponsive } from "@/hooks/useResponsive";
import { auth } from '@/lib/firebase';

const invoiceFormSchema = z.object({
  contractId: z.number().optional(), // Made optional - contracts are just for auto-fill
  bookingId: z.number().optional(), // Link to booking for dynamic data
  clientName: z.string().min(1, "Client name is required"),
  clientEmail: z.string().email("Please enter a valid email address").or(z.literal("")).optional(),
  ccEmail: z.string().email("Please enter a valid email address").or(z.literal("")).optional(),
  clientAddress: z.string().optional(),
  venueAddress: z.string().optional(),
  amount: z.string().min(1, "Amount is required").refine((val) => {
    const num = parseFloat(val);
    return !isNaN(num) && num > 0;
  }, "Amount must be a valid number greater than 0"),
  dueDate: z.string().min(1, "Due date is required"),
  performanceDate: z.string().optional(),
  performanceFee: z.string().optional(),
  depositPaid: z.string().optional(),
  performanceDuration: z.string().optional(), // Performance duration from booking
  gigType: z.string().optional(), // Gig type from booking
  invoiceType: z.string().default("performance"), // performance | ad_hoc
  description: z.string().optional(), // Description for ad-hoc invoices
});

export default function Invoices() {
  const { toast } = useToast();
  const [location, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const [editAndResendMode, setEditAndResendMode] = useState(false);
  const [selectedInvoices, setSelectedInvoices] = useState<number[]>([]);
  const [bulkActionLoading, setBulkActionLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [customMessageDialog, setCustomMessageDialog] = useState(false);
  const [invoiceToSend, setInvoiceToSend] = useState<Invoice | null>(null);
  const [customMessage, setCustomMessage] = useState("");
  const { isDesktop } = useResponsive();
  const { user } = useAuthContext();
  


  const { data: invoices = [], isLoading } = useQuery<Invoice[]>({
    queryKey: ['/api/invoices'],
  });

  const { data: contracts = [] } = useQuery<any[]>({
    queryKey: ['/api/contracts'],
  });

  const { data: userSettings } = useQuery<any>({
    queryKey: ['/api/settings'],
  });

  const { data: enquiries = [] } = useQuery<any[]>({
    queryKey: ['/api/bookings'],
  });

  const form = useForm<z.infer<typeof invoiceFormSchema>>({
    resolver: zodResolver(invoiceFormSchema),
    defaultValues: {
      contractId: undefined, // Optional contract selection
      bookingId: undefined, // Optional booking link
      clientName: "", 
      clientEmail: "",
      ccEmail: "",
      clientAddress: "",
      venueAddress: "",
      amount: "",
      dueDate: "",
      performanceDate: "",
      performanceFee: "",
      depositPaid: "",
      performanceDuration: "", // Performance duration from booking
      gigType: "", // Gig type from booking
      invoiceType: "performance", // Default to performance invoice
      description: "", // Empty description initially
    },
  });

  // Helper function to convert payment terms to days relative to performance date
  const getPaymentTermsDays = (paymentTerms: string): number => {
    switch (paymentTerms) {
      case "28_days_before": return -28; // 28 days before performance
      case "14_days_before": return -14; // 14 days before performance
      case "7_days_before": return -7; // 7 days before performance
      case "on_performance": return 0; // Due on performance date
      case "7_days_after": return 7; // 7 days after performance
      case "14_days_after": return 14; // 14 days after performance
      case "28_days_after": return 28; // 28 days after performance
      // Legacy terms (for backward compatibility)
      case "on_receipt": return 7; // Fallback to 7 days after performance
      case "3_days": return 3;
      case "7_days": return 7;
      case "14_days": return 14;
      case "30_days": return 28; // Map to 28 days after
      case "cash_as_agreed": return 0;
      default: return 7; // Fallback to 7 days after performance
    }
  };

  // Auto-set due date using user's payment terms setting from contract clauses
  useEffect(() => {
    if (userSettings?.contractClauses?.paymentTerms) {
      // Get current performance date from form or use current date as fallback
      const performanceDate = form.getValues("performanceDate");
      const baseDate = performanceDate ? new Date(performanceDate) : new Date();
      
      const daysToAdd = getPaymentTermsDays(userSettings.contractClauses.paymentTerms);
      const dueDate = new Date(baseDate);
      dueDate.setDate(dueDate.getDate() + daysToAdd);
      form.setValue("dueDate", dueDate.toISOString().split('T')[0]);
    }
  }, [userSettings, form]);

  // Update due date when performance date changes
  const performanceDate = form.watch("performanceDate");
  useEffect(() => {
    if (performanceDate && userSettings?.contractClauses?.paymentTerms) {
      const performanceDateObj = new Date(performanceDate);
      const daysToAdd = getPaymentTermsDays(userSettings.contractClauses.paymentTerms);
      const dueDate = new Date(performanceDateObj);
      dueDate.setDate(dueDate.getDate() + daysToAdd);
      form.setValue("dueDate", dueDate.toISOString().split('T')[0]);
    }
  }, [performanceDate, userSettings, form]);

  // Track if URL parameters have been processed
  const [urlParamsProcessed, setUrlParamsProcessed] = useState(false);

  // Check for URL parameters to auto-open dialog and pre-fill with booking/enquiry data
  useEffect(() => {
    if (urlParamsProcessed) return;

    const params = new URLSearchParams(window.location.search);
    const createNew = params.get('create');
    const action = params.get('action');
    const bookingId = params.get('bookingId');
    const enquiryId = params.get('enquiryId');
    
    if (createNew === 'true' || action === 'create') {
      setIsDialogOpen(true);
      setUrlParamsProcessed(true);
      
      // Pre-fill with booking data if bookingId is provided
      if (bookingId) {
        // Fetch booking data and auto-fill form using authenticated apiRequest
        apiRequest(`/api/bookings/${bookingId}`)
          .then(response => response.json())
          .then(booking => {
            if (booking) {
              // Calculate performance date from event date
              const performanceDate = booking.eventDate 
                ? new Date(booking.eventDate).toISOString().split('T')[0]
                : "";
                
              // Calculate due date using user's payment terms setting relative to performance date
              let dueDate: Date;
              if (performanceDate && userSettings?.contractClauses?.paymentTerms) {
                const performanceDateObj = new Date(performanceDate);
                const dueDays = getPaymentTermsDays(userSettings.contractClauses.paymentTerms);
                dueDate = new Date(performanceDateObj);
                dueDate.setDate(dueDate.getDate() + dueDays);
              } else {
                // Fallback to current date + 7 days if no performance date
                dueDate = new Date();
                dueDate.setDate(dueDate.getDate() + 7);
              }
              
              const parsedBookingId = parseInt(bookingId);
              
              form.reset({
                contractId: undefined,
                bookingId: parsedBookingId, // Store the booking ID
                clientName: booking.clientName || "",
                clientEmail: booking.clientEmail || "",
                ccEmail: "",
                clientAddress: booking.clientAddress || "",
                venueAddress: booking.venueAddress || booking.venue || "",
                amount: booking.finalAmount || "",
                dueDate: dueDate.toISOString().split('T')[0],
                performanceDate: performanceDate,
                performanceFee: booking.fee || "",
                depositPaid: "",
                performanceDuration: booking.performanceDuration || "", // Load from booking
                gigType: booking.gigType || "", // Load from booking
              });
              
              toast({
                title: "Booking Data Loaded",
                description: "Invoice form pre-filled with booking information",
              });
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
      } else if (enquiryId && enquiries && enquiries.length > 0) {
        const selectedEnquiry = enquiries.find(e => e.id === parseInt(enquiryId));
        if (selectedEnquiry) {
          // Calculate performance date from event date
          const performanceDate = selectedEnquiry.eventDate 
            ? new Date(selectedEnquiry.eventDate).toISOString().split('T')[0]
            : "";
            
          // Calculate due date using user's payment terms setting relative to performance date
          let dueDate: Date;
          if (performanceDate && userSettings?.contractClauses?.paymentTerms) {
            const performanceDateObj = new Date(performanceDate);
            const dueDays = getPaymentTermsDays(userSettings.contractClauses.paymentTerms);
            dueDate = new Date(performanceDateObj);
            dueDate.setDate(dueDate.getDate() + dueDays);
          } else {
            // Fallback to current date + 7 days if no performance date
            dueDate = new Date();
            dueDate.setDate(dueDate.getDate() + 7);
          }
          
          form.reset({
            contractId: undefined,
            bookingId: undefined, // No booking for enquiries
            clientName: selectedEnquiry.clientName || "",
            clientEmail: selectedEnquiry.clientEmail || "",
            ccEmail: "",
            clientAddress: selectedEnquiry.clientAddress || "",
            venueAddress: selectedEnquiry.venue || "",
            amount: selectedEnquiry.estimatedValue ? selectedEnquiry.estimatedValue.toString() : "",
            dueDate: dueDate.toISOString().split('T')[0],
            performanceDate: performanceDate,
            performanceFee: selectedEnquiry.estimatedValue ? selectedEnquiry.estimatedValue.toString() : "",
            depositPaid: "",
            performanceDuration: "", // Empty for enquiries
            gigType: "", // Empty for enquiries
          });
        }
      }
    }
  }, [location, enquiries, userSettings, urlParamsProcessed]);

  // Watch contract ID changes
  const selectedContractId = form.watch("contractId");

  // Auto-fill fields when contract is selected (for convenience)
  // Only auto-fill when user explicitly selects a contract (not when form first loads)
  const [contractHasBeenSelected, setContractHasBeenSelected] = useState(false);
  
  useEffect(() => {
    // Only auto-fill if a contract is explicitly selected AND we have contracts loaded
    if (selectedContractId && contracts.length > 0 && contractHasBeenSelected) {
      const selectedContract = contracts.find((c: any) => c.id === selectedContractId);
      if (selectedContract) {
        // Only fill empty fields to preserve user edits
        if (!form.getValues("clientName")) {
          form.setValue("clientName", selectedContract.clientName);
        }
        if (!form.getValues("clientEmail")) {
          form.setValue("clientEmail", selectedContract.clientEmail || "");
        }
        if (!form.getValues("venueAddress")) {
          form.setValue("venueAddress", selectedContract.venue || "");
        }
        if (!form.getValues("performanceDate") && selectedContract.eventDate) {
          form.setValue("performanceDate", new Date(selectedContract.eventDate).toISOString().split('T')[0]);
        }
        if (!form.getValues("amount") && selectedContract.fee) {
          // Calculate total fee including travel expenses
          const baseFee = Number(selectedContract.fee);
          const travelExpenses = Number(selectedContract.travelExpenses || 0);
          const totalFee = baseFee + travelExpenses;
          const deposit = Number(selectedContract.deposit) || 0;
          const amountDue = totalFee - deposit;
          form.setValue("amount", amountDue.toString());
          // Store fee and deposit for backend
          form.setValue("performanceFee", totalFee.toString());
          form.setValue("depositPaid", deposit.toString());
        }
      }
    }
  }, [selectedContractId, contracts, form, contractHasBeenSelected]);

  // Auto-fill business address and phone from settings
  useEffect(() => {
    if (userSettings?.businessAddress) {
      form.setValue("businessAddress", userSettings.businessAddress);
    }
    if (userSettings?.phone) {
      form.setValue("businessPhone", userSettings.phone);
    }
  }, [userSettings, form]);

  const createInvoiceMutation = useMutation({
    mutationFn: async (data: any) => {
      
      
      
      
      // Use apiRequest to include JWT authentication
      const response = await apiRequest('/api/invoices', {
        method: 'POST',
        body: data,
      });
      
      console.log("📝 Invoice response status:", response.status, response.ok);
      
      
      if (!response.ok) {
        let errorMessage = 'Failed to create invoice';
        try {
          const errorData = await response.text();
          console.error("🔥 Frontend: Error response:", errorData);
          if (errorData) {
            // Try to parse JSON error message
            try {
              const errorJson = JSON.parse(errorData);
              errorMessage = errorJson.error || errorJson.message || errorData;
            } catch {
              errorMessage = errorData;
            }
          }
          
          // Special handling for 404 errors (production deployment issue)
          if (response.status === 404) {
            errorMessage = 'Invoice service unavailable. The server may need to be redeployed.';
          }
        } catch (e) {
          console.error("🔥 Error reading response:", e);
        }
        throw new Error(errorMessage);
      }
      
      // Check if response has content before parsing
      const contentType = response.headers.get('content-type');
      const contentLength = response.headers.get('content-length');
      console.log("📝 Response content-type:", contentType, "content-length:", contentLength);
      
      // Handle empty responses
      if (!contentLength || contentLength === '0') {
        console.error("🔥 Empty response from server");
        throw new Error('Server returned empty response. Please try again.');
      }
      
      if (!contentType || !contentType.includes('application/json')) {
        console.error("🔥 Response is not JSON:", contentType);
        throw new Error('Server returned invalid response format');
      }
      
      const result = await response.json();
      
      return result;
    },
    onSuccess: (data) => {
      
      queryClient.invalidateQueries({ queryKey: ['/api/invoices'] });
      form.reset();
      setIsDialogOpen(false);
      setEditingInvoice(null);
      toast({
        title: "Success",
        description: "Invoice created successfully!",
      });
    },
    onError: (error: any) => {
      console.error("🔥 Frontend: Mutation error:", error);
      console.error("🔥 Frontend: Error message:", error.message);
      console.error("🔥 Frontend: Error stack:", error.stack);
      
      // Check if it's an authentication error and provide helpful guidance
      if (error.message && error.message.includes("session has expired")) {
        toast({
          title: "Session Expired",
          description: "Your session has expired. Please log out and log back in to continue.",
          variant: "destructive",
          action: (
            <Button 
              variant="outline" 
              onClick={() => window.location.href = "/api/logout"}
              className="ml-2 text-sm"
            >
              Log Out
            </Button>
          ),
        });
      } else {
        // Show specific error message if available
        const errorMessage = error.message || "Failed to create invoice. Please try again.";
        
        toast({
          title: "Error Creating Invoice",
          description: errorMessage,
          variant: "destructive",
        });
      }
    },
  });

  const updateInvoiceMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      
      const response = await apiRequest(`/api/invoices/${id}`, {
        method: 'PATCH',
        body: data
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/invoices'] });
      form.reset();
      setIsDialogOpen(false);
      setEditingInvoice(null);
      
      // Always show simple success message - no automatic sending
      setEditAndResendMode(false);
      toast({
        title: "Success",
        description: "Invoice updated successfully!",
      });
    },
    onError: (error: any) => {
      console.error("Update invoice error:", error);
      setEditAndResendMode(false);
      
      // Show specific error message if available
      const errorMessage = error.message || "Failed to update invoice. Please try again.";
      
      toast({
        title: "Error Updating Invoice",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  const handleEditInvoice = (invoice: Invoice) => {
    setEditingInvoice(invoice);
    setEditAndResendMode(false);
    // Pre-fill form with invoice data - fix field mappings
    form.reset({
      contractId: invoice.contractId || undefined,
      bookingId: invoice.bookingId || undefined, // Preserve booking link
      clientName: invoice.clientName,
      clientEmail: invoice.clientEmail || "",
      ccEmail: invoice.ccEmail || "",
      clientAddress: invoice.clientAddress || "",
      venueAddress: invoice.venueAddress || "",
      amount: invoice.amount.toString(),
      dueDate: new Date(invoice.dueDate).toISOString().split('T')[0],
      performanceDate: invoice.eventDate ? new Date(invoice.eventDate).toISOString().split('T')[0] : "",
      performanceFee: invoice.finalAmount ? invoice.finalAmount.toString() : "",
      depositPaid: invoice.depositPaid ? invoice.depositPaid.toString() : "",
      performanceDuration: invoice.performanceDuration || "", // Preserve from invoice
      gigType: invoice.gigType || "", // Preserve from invoice
    });
    setIsDialogOpen(true);
  };



  const onSubmit = (data: z.infer<typeof invoiceFormSchema>) => {
    console.log('📤 Submitting invoice with data:', data);
    console.log('📤 BookingId being sent:', data.bookingId);
    
    // Client-side validation with user-friendly prompts
    const validationIssues = [];
    
    if (!data.clientName.trim()) {
      validationIssues.push("Client name cannot be empty");
    }
    
    if (!data.amount.trim()) {
      validationIssues.push("Amount is required");
    } else {
      const amount = parseFloat(data.amount);
      if (isNaN(amount) || amount <= 0) {
        validationIssues.push("Amount must be a valid number greater than 0");
      }
    }
    
    if (!data.dueDate) {
      validationIssues.push("Due date is required");
    }
    
    if (data.clientEmail && data.clientEmail.trim() && !data.clientEmail.includes('@')) {
      validationIssues.push("Please enter a valid email address");
    }
    
    // Show validation issues as a prompt instead of failing
    if (validationIssues.length > 0) {
      toast({
        title: "Please fix the following issues:",
        description: validationIssues.join(", "),
        variant: "destructive",
      });
      return; // Don't submit the form
    }
    
    // Warn if no client email provided
    if (!data.clientEmail || !data.clientEmail.trim()) {
      toast({
        title: "Note",
        description: "No client email provided. You won't be able to send this invoice via email until you add one.",
      });
      // Still allow creation but warn the user
    }
    
    // Send data exactly as expected by the API
    const finalData = {
      contractId: selectedContractId || null, // Can be null for standalone invoices
      bookingId: data.bookingId || null, // Include booking ID if present
      // invoiceNumber is auto-generated by backend - don't send it
      clientName: data.clientName.trim(),
      clientEmail: data.clientEmail?.trim() || null,
      ccEmail: data.ccEmail?.trim() || null,
      clientAddress: data.clientAddress?.trim() || null,
      venueAddress: data.venueAddress?.trim() || null,
      amount: data.amount.trim(),
      dueDate: data.dueDate, // Keep as string - server will convert
      performanceDate: data.performanceDate || null,
      performanceFee: data.performanceFee?.trim() || null,
      depositPaid: data.depositPaid?.trim() || null,
      performanceDuration: data.performanceDuration?.trim() || null, // Include performance duration
      gigType: data.gigType?.trim() || null, // Include gig type
      invoiceType: data.invoiceType || "performance", // Include invoice type
      description: data.description?.trim() || null, // Include description for ad-hoc invoices
    };
    
    
    
    if (editingInvoice) {
      // Update existing invoice
      updateInvoiceMutation.mutate({ id: editingInvoice.id, data: finalData });
    } else {
      // Create new invoice
      createInvoiceMutation.mutate(finalData);
    }
  };

  const handleDialogClose = () => {
    setIsDialogOpen(false);
    setEditAndResendMode(false);
    setEditingInvoice(null);
    setContractHasBeenSelected(false); // Reset contract selection tracking
    form.reset(); // Clear the form completely when closing
    if (window.location.search) {
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "draft": return "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300";
      case "sent": return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300";
      case "paid": return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300";
      case "overdue": return "bg-red-500 text-white font-bold dark:bg-red-600 dark:text-red-100";
      case "archived": return "bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary";
      default: return "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300";
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "No date set";
    return new Date(dateString).toLocaleDateString("en-GB");
  };

  // Invoice action handlers
  const sendInvoiceMutation = useMutation({
    mutationFn: async ({ invoiceId, customMessage }: { invoiceId: number, customMessage?: string }) => {
      // Get Firebase authentication token
      const currentUser = auth.currentUser;
      if (!currentUser) {
        throw new Error('You must be logged in to send invoices');
      }
      
      const idToken = await currentUser.getIdToken();
      console.log('📧 Send email - Firebase user authenticated:', !!currentUser);
      console.log('📧 Send email - Invoice ID:', invoiceId);
      console.log('📧 Send email - Custom message:', customMessage ? 'Present' : 'None');
      
      const response = await fetch('/api/invoices/send-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`,
        },
        credentials: 'include', // Important for session handling
        body: JSON.stringify({ invoiceId, customMessage }),
      });
      
      
      
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('🔥 Email Send: Error response:', errorText);
        throw new Error(errorText || 'Failed to send invoice email');
      }
      
      const result = await response.json();
      
      return result;
    },
    onSuccess: () => {
      
      queryClient.invalidateQueries({ queryKey: ['/api/invoices'] });
      setCustomMessageDialog(false);
      setInvoiceToSend(null);
      setCustomMessage("");
      toast({
        title: "Success",
        description: "Invoice sent successfully with view link!",
      });
    },
    onError: (error: any) => {
      console.error('🔥 Email Send: ERROR');
      console.error('🔥 Email Send: Full error object:', error);
      console.error('🔥 Email Send: Error message:', error.message);
      console.error('🔥 Email Send: Error stack:', error.stack);
      
      if (error.message && error.message.includes("session has expired")) {
        toast({
          title: "Session Expired",
          description: "Your session has expired. Please log out and log back in to continue.",
          variant: "destructive",
          action: (
            <Button 
              variant="outline" 
              onClick={() => window.location.href = "/api/logout"}
              className="ml-2 text-sm"
            >
              Log Out
            </Button>
          ),
        });
      } else {
        toast({
          title: "Error",
          description: `Failed to send invoice email: ${error.message}`,
          variant: "destructive",
        });
      }
    },
  });

  const handleSendInvoice = (invoice: Invoice) => {
    
    
    
    
    // Check if invoice has client email
    if (!invoice.clientEmail) {
      toast({
        title: "No Email Address",
        description: "This invoice doesn't have a client email address. Please edit the invoice to add an email address first.",
        variant: "destructive",
      });
      return;
    }
    
    // Open custom message dialog
    setInvoiceToSend(invoice);
    setCustomMessage("");
    setCustomMessageDialog(true);
  };

  const handleConfirmSendInvoice = () => {
    if (invoiceToSend) {
      
      sendInvoiceMutation.mutate({
        invoiceId: invoiceToSend.id,
        customMessage: customMessage.trim() || undefined
      });
    }
  };

  // Mark invoice as paid mutation
  const markPaidMutation = useMutation({
    mutationFn: async (invoice: Invoice) => {
      const response = await apiRequest(`/api/invoices/${invoice.id}/mark-paid`, {
        method: 'POST',
        body: {}
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/invoices'] });
      toast({
        title: "Success",
        description: "Invoice marked as paid successfully!",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to mark invoice as paid",
        variant: "destructive",
      });
    },
  });

  // Send overdue reminder mutation
  const sendReminderMutation = useMutation({
    mutationFn: async (invoice: Invoice) => {
      const response = await apiRequest(`/api/invoices/${invoice.id}/send-reminder`, {
        method: 'POST',
        body: {}
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Overdue reminder sent successfully!",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to send overdue reminder",
        variant: "destructive",
      });
    },
  });

  const handleMarkAsPaid = (invoice: Invoice) => {
    markPaidMutation.mutate(invoice);
  };

  const handleSendReminder = (invoice: Invoice) => {
    sendReminderMutation.mutate(invoice);
  };

  const handleResendInvoice = (invoice: Invoice) => {
    // Check if invoice has client email
    if (!invoice.clientEmail) {
      toast({
        title: "No Email Address",
        description: "This invoice doesn't have a client email address. Please edit the invoice to add an email address first.",
        variant: "destructive",
      });
      return;
    }
    
    // Open custom message dialog for resend
    setInvoiceToSend(invoice);
    setCustomMessage("");
    setCustomMessageDialog(true);
  };

  // Restore archived invoice mutation
  const restoreInvoiceMutation = useMutation({
    mutationFn: async (invoice: Invoice) => {
      const response = await apiRequest(`/api/invoices/${invoice.id}`, { 
        method: 'PATCH',
        body: { status: "draft" }
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      toast({
        title: "Success",
        description: "Invoice restored from archive successfully!",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to restore invoice",
        variant: "destructive",
      });
    },
  });

  const handleRestoreInvoice = (invoice: Invoice) => {
    restoreInvoiceMutation.mutate(invoice);
  };

  // Remove payment link functionality from user interface - this should be for clients only

  // Bulk action handlers
  const handleSelectInvoice = (invoiceId: number, checked: boolean) => {
    if (checked) {
      setSelectedInvoices(prev => [...prev, invoiceId]);
    } else {
      setSelectedInvoices(prev => prev.filter(id => id !== invoiceId));
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedInvoices(filteredInvoices.map(invoice => invoice.id));
    } else {
      setSelectedInvoices([]);
    }
  };

  const deleteMutation = useMutation({
    mutationFn: async (invoiceIds: number[]) => {
      
      const responses = await Promise.all(
        invoiceIds.map(id => 
          apiRequest(`/api/invoices/${id}`, { method: 'DELETE' })
        )
      );
      return responses;
    },
    onSuccess: () => {
      
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      setSelectedInvoices([]);
      toast({
        title: "Invoices deleted",
        description: `${selectedInvoices.length} invoice(s) deleted successfully`,
      });
    },
    onError: (error: any) => {
      console.error("🔥 Frontend: Delete error:", error);
      toast({
        title: "Error deleting invoices",
        description: "Failed to delete selected invoices",
        variant: "destructive",
      });
    },
  });

  const archiveMutation = useMutation({
    mutationFn: async (invoiceIds: number[]) => {
      const responses = await Promise.all(
        invoiceIds.map(id => 
          apiRequest(`/api/invoices/${id}`, {
            method: 'PATCH',
            body: { status: "archived" }
          })
        )
      );
      return responses;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      setSelectedInvoices([]);
      toast({
        title: "Invoices archived",
        description: `${selectedInvoices.length} invoice(s) archived successfully`,
      });
    },
    onError: () => {
      toast({
        title: "Error archiving invoices",
        description: "Failed to archive selected invoices",
        variant: "destructive",
      });
    },
  });

  // Bulk restore mutation
  const bulkRestoreMutation = useMutation({
    mutationFn: async (invoiceIds: number[]) => {
      const responses = await Promise.all(
        invoiceIds.map(id => 
          apiRequest(`/api/invoices/${id}`, {
            method: 'PATCH',
            body: { status: "draft" }
          })
        )
      );
      return responses;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      setSelectedInvoices([]);
      toast({
        title: "Invoices restored",
        description: `${selectedInvoices.length} invoice(s) restored from archive successfully`,
      });
    },
    onError: () => {
      toast({
        title: "Error restoring invoices",
        description: "Failed to restore selected invoices",
        variant: "destructive",
      });
    },
  });

  const handleBulkAction = async (action: string) => {
    if (selectedInvoices.length === 0) return;
    
    setBulkActionLoading(true);
    
    try {
      switch (action) {
        case 'delete':
          await deleteMutation.mutateAsync(selectedInvoices);
          break;
        case 'archive':
          await archiveMutation.mutateAsync(selectedInvoices);
          break;
        case 'restore':
          await bulkRestoreMutation.mutateAsync(selectedInvoices);
          break;
        case 'download':
          // Download each selected invoice
          for (const invoiceId of selectedInvoices) {
            window.open(`/api/isolated/invoices/${invoiceId}/pdf`, '_blank');
          }
          setSelectedInvoices([]);
          toast({
            title: "Downloads started",
            description: `Downloading ${selectedInvoices.length} invoice(s)`,
          });
          break;
      }
    } catch (error) {
      console.error('Bulk action error:', error);
    } finally {
      setBulkActionLoading(false);
    }
  };

  const handleDownloadInvoice = async (invoice: Invoice) => {
    try {
      const response = await fetch(`/api/isolated/invoices/${invoice.id}/pdf`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Invoice-${invoice.invoiceNumber}.pdf`;
      a.click();
      window.URL.revokeObjectURL(url);
      
      toast({
        title: "Success",
        description: "Invoice PDF downloaded successfully!",
      });
    } catch (error) {
      console.error('Error downloading invoice:', error);
      toast({
        title: "Error",
        description: "Failed to download invoice PDF",
        variant: "destructive",
      });
    }
  };

  const handleViewInvoice = (invoice: Invoice) => {
    // Use direct R2 URL for secure access with random token
    if (invoice.cloudStorageUrl) {
      console.log('🔗 Opening direct R2 invoice URL:', invoice.cloudStorageUrl);
      window.open(invoice.cloudStorageUrl, '_blank');
    } else {
      toast({
        title: "Error",
        description: "Invoice PDF is not available yet. Please try again in a moment.",
        variant: "destructive",
      });
    }
  };

  const filteredInvoices = (invoices || []).filter((invoice: Invoice) => {
    const matchesSearch = searchQuery === "" || 
      invoice.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      invoice.clientName.toLowerCase().includes(searchQuery.toLowerCase());
    
    // Calculate if invoice is actually overdue
    const isActuallyOverdue = invoice.status === 'sent' && 
      new Date(invoice.dueDate) < new Date() && 
      !invoice.paidAt;
    
    // Handle status filtering with dynamic overdue calculation
    const matchesStatus = statusFilter === "all" || 
      invoice.status === statusFilter ||
      (statusFilter === "overdue" && isActuallyOverdue);
    
    return matchesSearch && matchesStatus;
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile menu toggle */}
      {!isDesktop && (
        <div className="fixed top-4 left-4 z-50">
          <button
            onClick={() => setSidebarOpen(true)}
            className="bg-white p-2 rounded-lg shadow-lg"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>
      )}

      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      
      {/* Main Content */}
      <div className={`min-h-screen ${isDesktop ? 'ml-64' : ''}`}>
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 ml-12 md:ml-0">Invoices</h1>
                <p className="text-gray-600">Manage your invoices and payments</p>
              </div>
            </div>
            <div className="flex gap-3">
              <Dialog open={isDialogOpen} onOpenChange={(open) => {
              setIsDialogOpen(open);
              if (!open) {
                setEditingInvoice(null);
                form.reset();
              }
            }}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Invoice
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>
                    {editAndResendMode ? "Edit Invoice & Resend" : editingInvoice ? "Edit Invoice" : "Create New Invoice"}
                  </DialogTitle>
                  <DialogDescription>
                    {editAndResendMode 
                      ? `Edit and resend invoice ${editingInvoice?.invoiceNumber}. The invoice number will remain unchanged for tax compliance.`
                      : editingInvoice 
                        ? "Edit the details of this invoice."
                        : "Create a new invoice for a client. You can auto-fill information from an existing contract."
                    }
                  </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">

                      <FormField
                        control={form.control}
                        name="contractId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Select Contract (optional - for auto-fill)</FormLabel>
                            <Select 
                              value={field.value?.toString()} 
                              onValueChange={(value) => {
                                field.onChange(parseInt(value));
                                setContractHasBeenSelected(true); // Mark that user has selected a contract
                              }}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Choose a contract to auto-fill fields" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {contracts.map((contract: any) => (
                                  <SelectItem key={contract.id} value={contract.id.toString()}>
                                    <div className="flex items-center justify-between w-full">
                                      <span>{contract.clientName} - {formatDate(contract.eventDate)}</span>
                                      {!contract.clientEmail && (
                                        <span className="text-xs text-red-500 ml-2">⚠ No email</span>
                                      )}
                                    </div>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    {/* Invoice Type Toggle */}
                    <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                      <FormField
                        control={form.control}
                        name="invoiceType"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Invoice Type</FormLabel>
                            <Select value={field.value} onValueChange={field.onChange}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select invoice type" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="performance">Performance Invoice</SelectItem>
                                <SelectItem value="ad_hoc">Ad-hoc Invoice</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      {form.watch("invoiceType") === "ad_hoc" && (
                        <FormField
                          control={form.control}
                          name="description"
                          render={({ field }) => (
                            <FormItem className="mt-4">
                              <FormLabel>Description</FormLabel>
                              <FormControl>
                                <Textarea 
                                  placeholder="e.g., Administrative costs for band members, Equipment rental, Travel expenses..." 
                                  {...field} 
                                  rows={3}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      )}
                    </div>

                    <FormField
                      control={form.control}
                      name="clientName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Client Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Client name" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="clientEmail"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Client Email</FormLabel>
                          <FormControl>
                            <Input type="email" placeholder="client@example.com" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="ccEmail"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>CC Email (Optional)</FormLabel>
                          <FormControl>
                            <Input type="email" placeholder="cc@example.com" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="clientAddress"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Client Address</FormLabel>
                            <FormControl>
                              <Input placeholder="Client's address" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="venueAddress"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Venue Address</FormLabel>
                            <FormControl>
                              <Input placeholder="Performance venue address" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      <FormField
                        control={form.control}
                        name="amount"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Amount (£)</FormLabel>
                            <FormControl>
                              <Input placeholder="500.00" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="dueDate"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Due Date</FormLabel>
                            <FormControl>
                              <Input type="date" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="performanceDate"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Performance Date</FormLabel>
                            <FormControl>
                              <Input type="date" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    {/* Performance Details */}
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="performanceDuration"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Performance Duration</FormLabel>
                            <FormControl>
                              <Input placeholder="e.g. 2 x 45 min sets" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="gigType"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Event Type</FormLabel>
                            <FormControl>
                              <Input placeholder="e.g. Wedding, Corporate Event" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="flex justify-end gap-3">
                      <Button type="button" variant="outline" onClick={handleDialogClose}>
                        Cancel
                      </Button>
                      <Button type="submit" disabled={createInvoiceMutation.isPending}>
                        {createInvoiceMutation.isPending ? "Creating..." : "Create Invoice"}
                      </Button>
                    </div>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>

            {/* Custom Message Dialog */}
            <Dialog open={customMessageDialog} onOpenChange={setCustomMessageDialog}>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>Send Invoice Email</DialogTitle>
                  <DialogDescription>
                    Send the invoice email to your client. You can customize the message before sending.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  {invoiceToSend && (
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <h4 className="font-medium text-gray-900 mb-2">
                        Invoice #{invoiceToSend.invoiceNumber}
                      </h4>
                      <div className="text-sm text-gray-600 space-y-1">
                        <p><strong>Client:</strong> {invoiceToSend.clientName}</p>
                        <p><strong>Email:</strong> {invoiceToSend.clientEmail}</p>
                        {invoiceToSend.ccEmail && <p><strong>CC:</strong> {invoiceToSend.ccEmail}</p>}
                        <p><strong>Amount:</strong> £{invoiceToSend.amount}</p>
                        <p><strong>Due Date:</strong> {formatDate(invoiceToSend.dueDate)}</p>
                      </div>
                    </div>
                  )}
                  
                  {/* Microsoft Email Domain Warning */}
                  {invoiceToSend?.clientEmail && (() => {
                    const email = invoiceToSend.clientEmail.toLowerCase();
                    const microsoftDomains = ['@hotmail.', '@outlook.', '@live.', '@msn.'];
                    const isMicrosoft = microsoftDomains.some(domain => email.includes(domain));
                    
                    if (isMicrosoft) {
                      return (
                        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                          <div className="flex items-start">
                            <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5 mr-2 flex-shrink-0" />
                            <div className="text-sm">
                              <p className="font-medium text-amber-900 mb-1">
                                Microsoft Email Delivery Warning
                              </p>
                              <p className="text-amber-700">
                                This email address is on a Microsoft domain (Hotmail/Outlook). 
                                Microsoft is currently blocking some Mailgun emails. If this email doesn't arrive:
                              </p>
                              <ul className="mt-2 space-y-1 text-amber-700 ml-4">
                                <li>• Check the spam/junk folder</li>
                                <li>• Try sending from your personal email</li>
                                <li>• Contact Mailgun support for IP rotation</li>
                              </ul>
                            </div>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  })()}
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">
                      Add a personal message (optional)
                    </label>
                    <div className="bg-amber-50 border border-amber-200 rounded-md p-3 mb-3">
                      <p className="text-xs text-amber-700">
                        <strong>Important:</strong> This message is for personal communication only. 
                        Do not include payment terms, invoice details, or business changes here - 
                        these should be made in the invoice itself.
                      </p>
                    </div>
                    <p className="text-xs text-gray-500">
                      Use this space for friendly greetings, additional context, or special instructions that don't modify the invoice terms.
                    </p>
                    <Textarea
                      placeholder="e.g., 'Thank you for your business!' or 'Please let me know if you have any questions about this invoice.'"
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
                      disabled={sendInvoiceMutation.isPending}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleConfirmSendInvoice}
                      disabled={sendInvoiceMutation.isPending || !invoiceToSend?.clientEmail}
                    >
                      {sendInvoiceMutation.isPending ? "Sending..." : "Send Invoice"}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="p-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 w-4 h-4" />
              <Input
                placeholder="Search by invoice number or client name..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-48">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="sent">Sent</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="overdue">Overdue</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Outstanding</p>
                  <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                    £{(invoices || []).filter((inv: Invoice) => inv.status === "sent").reduce((sum: number, inv: Invoice) => sum + Number(inv.amount), 0).toLocaleString()}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {(invoices || []).filter((inv: Invoice) => inv.status === "sent").length} invoices
                  </p>
                </div>
                <FileText className="w-8 h-8 text-blue-600 dark:text-blue-400" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Overdue</p>
                  <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                    {(invoices || []).filter((inv: Invoice) => inv.status === "overdue").length}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Need attention</p>
                </div>
                <Calendar className="w-8 h-8 text-red-600 dark:text-red-400" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Paid This Month</p>
                  <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                    £{(invoices || []).filter((inv: Invoice) => inv.status === "paid").reduce((sum: number, inv: Invoice) => sum + Number(inv.amount), 0).toLocaleString()}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Great progress!</p>
                </div>
                <PoundSterling className="w-8 h-8 text-green-600 dark:text-green-400" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Total Invoices</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{(invoices || []).length}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">All time</p>
                </div>
                <FileText className="w-8 h-8 text-gray-600 dark:text-gray-400" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Bulk Actions Bar */}
        {selectedInvoices.length > 0 && (
          <Card className="mb-4 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <span className="text-sm font-medium text-blue-900 dark:text-blue-100">
                    {selectedInvoices.length} invoice(s) selected
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setSelectedInvoices([])}
                  >
                    Clear Selection
                  </Button>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleBulkAction('download')}
                    disabled={bulkActionLoading}
                  >
                    <FileDown className="w-4 h-4 mr-1" />
                    Download PDFs
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleBulkAction('archive')}
                    disabled={bulkActionLoading}
                  >
                    <Archive className="w-4 h-4 mr-1" />
                    Archive
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleBulkAction('delete')}
                    disabled={bulkActionLoading}
                  >
                    <Trash2 className="w-4 h-4 mr-1" />
                    Delete
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Invoices List */}
        <div className="space-y-4">
          {filteredInvoices.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <FileText className="w-12 h-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">No invoices found</h3>
                <p className="text-gray-600 dark:text-gray-300 mb-4">
                  {searchQuery || statusFilter !== "all" 
                    ? "Try adjusting your search or filter criteria."
                    : "Get started by creating your first invoice."
                  }
                </p>
                <Button onClick={() => setIsDialogOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Invoice
                </Button>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Select All Checkbox */}
              {filteredInvoices.length > 0 && (
                <Card className="mb-4">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={selectedInvoices.length === filteredInvoices.length && filteredInvoices.length > 0}
                        onChange={(e) => handleSelectAll(e.target.checked)}
                        className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Select All ({filteredInvoices.length} invoices)
                      </span>
                    </div>
                  </CardContent>
                </Card>
              )}
              
{filteredInvoices.map((invoice: Invoice) => {
  const isSelected = selectedInvoices.includes(invoice.id);
  const isOverdue = invoice.status === 'overdue';
  
  // Calculate if invoice is actually overdue (sent, past due date, not paid)
  const isActuallyOverdue = invoice.status === 'sent' && 
    new Date(invoice.dueDate) < new Date() && 
    !invoice.paidAt;
  
  const getCardBackground = () => {
    if (isSelected) {
      return 'ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-900/20';
    }
    if (isActuallyOverdue) {
      console.log(`Overdue invoice detected: ${invoice.invoiceNumber} - Due: ${invoice.dueDate}, Status: ${invoice.status}`);
      return 'bg-gradient-to-r from-red-100 to-red-200/80 dark:from-red-950/60 dark:to-red-900/50 border-red-300 dark:border-red-700/60';
    }
    return '';
  };
  
  return (
    <Card key={invoice.id} className={`hover:shadow-md transition-shadow ${getCardBackground()}`}>
      <CardContent className="p-6">
        <div className="space-y-4">
          {/* Header with title, status, and checkbox */}
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={isSelected}
              onChange={(e) => handleSelectInvoice(invoice.id, e.target.checked)}
              className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
            />
            <h3 className="font-semibold text-lg text-gray-900 dark:text-gray-100">
              Invoice #{invoice.invoiceNumber}
            </h3>
            <Badge className={getStatusColor(isActuallyOverdue ? 'overdue' : invoice.status)}>
              {isActuallyOverdue ? 'overdue' : invoice.status}
            </Badge>
          </div>
          
          {/* Desktop Layout */}
          <div className="hidden lg:block">
            <div className="grid grid-cols-12 gap-4 items-center">
              {/* Invoice details - fixed columns */}
              <div className="col-span-8">
                <div className="grid grid-cols-4 gap-4 text-sm">
                  <div className="min-w-0">
                    <span className="font-medium text-gray-600 dark:text-gray-400 block">Client:</span>
                    <p className="text-gray-900 dark:text-gray-100 truncate" title={invoice.clientName}>
                      {invoice.clientName}
                    </p>
                  </div>
                  <div className="min-w-0">
                    <span className="font-medium text-gray-600 dark:text-gray-400 block">Amount:</span>
                    <p className="text-gray-900 dark:text-gray-100 font-semibold">
                      £{Number(invoice.amount).toLocaleString()}
                    </p>
                  </div>
                  <div className="min-w-0">
                    <span className="font-medium text-gray-600 dark:text-gray-400 block">Due:</span>
                    <p className="text-gray-900 dark:text-gray-100">
                      {formatDate(invoice.dueDate)}
                    </p>
                  </div>
                  <div className="min-w-0">
                    <span className="font-medium text-gray-600 dark:text-gray-400 block">Created:</span>
                    <p className="text-gray-900 dark:text-gray-100">
                      {formatDate(invoice.createdAt)}
                    </p>
                  </div>
                </div>
              </div>
              
              {/* Action buttons - fixed column */}
              <div className="col-span-4">
                <div className="flex items-center justify-end gap-2 flex-wrap">
                  {/* View button - available for all statuses */}
                  <Button 
                    size="sm" 
                    className="text-xs whitespace-nowrap bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 min-w-[70px]"
                    onClick={() => handleViewInvoice(invoice)}
                  >
                    <Eye className="w-3 h-3 mr-1" />
                    View
                  </Button>

                  {invoice.status === "draft" && (
                    <>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="text-xs whitespace-nowrap text-gray-600 hover:text-gray-700 min-w-[60px]"
                        onClick={() => handleEditInvoice(invoice)}
                      >
                        <Edit className="w-3 h-3 mr-1" />
                        Edit
                      </Button>
                      <Button 
                        size="sm" 
                        className="text-xs whitespace-nowrap bg-blue-600 hover:bg-blue-700 text-white min-w-[65px]" 
                        onClick={() => handleSendInvoice(invoice)}
                        disabled={sendInvoiceMutation.isPending}
                      >
                        <Send className="w-3 h-3 mr-1" />
                        {sendInvoiceMutation.isPending ? 'Sending...' : 'Send'}
                      </Button>
                    </>
                  )}
                  
                  {invoice.status === "sent" && (
                    <>
                      <Button 
                        size="sm" 
                        className="text-xs whitespace-nowrap bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 min-w-[85px]" 
                        onClick={() => handleDownloadInvoice(invoice)}
                      >
                        <Download className="w-3 h-3 mr-1" />
                        Download
                      </Button>
                      <Button 
                        size="sm" 
                        className="text-xs whitespace-nowrap bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 min-w-[85px]" 
                        onClick={() => handleMarkAsPaid(invoice)}
                        disabled={markPaidMutation.isPending}
                      >
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Mark Paid
                      </Button>
                      <Button 
                        size="sm" 
                        className="text-xs whitespace-nowrap bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 min-w-[70px]" 
                        onClick={() => handleResendInvoice(invoice)}
                        disabled={sendInvoiceMutation.isPending}
                      >
                        <RefreshCw className="w-3 h-3 mr-1" />
                        Resend
                      </Button>
                      <Button 
                        size="sm" 
                        className="text-xs whitespace-nowrap bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 min-w-[60px]" 
                        onClick={() => handleEditInvoice(invoice)}
                      >
                        <Edit className="w-3 h-3 mr-1" />
                        Edit
                      </Button>
                    </>
                  )}
                  
                  {invoice.status === "overdue" && (
                    <>
                      <Button 
                        size="sm" 
                        className="text-xs whitespace-nowrap bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 min-w-[85px]" 
                        onClick={() => handleDownloadInvoice(invoice)}
                      >
                        <Download className="w-3 h-3 mr-1" />
                        Download
                      </Button>
                      <Button 
                        size="sm" 
                        className="text-xs whitespace-nowrap bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 min-w-[85px]" 
                        onClick={() => handleMarkAsPaid(invoice)}
                        disabled={markPaidMutation.isPending}
                      >
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Mark Paid
                      </Button>
                      <Button 
                        size="sm" 
                        className="text-xs whitespace-nowrap bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 min-w-[70px]" 
                        onClick={() => handleResendInvoice(invoice)}
                        disabled={sendInvoiceMutation.isPending}
                      >
                        <RefreshCw className="w-3 h-3 mr-1" />
                        Resend
                      </Button>
                      <Button 
                        size="sm" 
                        className="text-xs whitespace-nowrap bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 min-w-[60px]" 
                        onClick={() => handleEditInvoice(invoice)}
                      >
                        <Edit className="w-3 h-3 mr-1" />
                        Edit
                      </Button>
                      <Button 
                        size="sm" 
                        className="text-xs whitespace-nowrap bg-white hover:bg-gray-50 text-red-700 border border-gray-300 min-w-[110px]" 
                        onClick={() => handleSendReminder(invoice)}
                        disabled={sendReminderMutation.isPending}
                      >
                        <AlertTriangle className="w-3 h-3 mr-1" />
                        Overdue Notice
                      </Button>
                    </>
                  )}
                  
                  {invoice.status === "paid" && (
                    <>
                      <Button 
                        size="sm" 
                        className="text-xs whitespace-nowrap bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 min-w-[85px]" 
                        onClick={() => handleDownloadInvoice(invoice)}
                      >
                        <Download className="w-3 h-3 mr-1" />
                        Download
                      </Button>
                      <Button 
                        size="sm" 
                        className="text-xs whitespace-nowrap bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 min-w-[95px]" 
                        onClick={() => handleResendInvoice(invoice)}
                        disabled={sendInvoiceMutation.isPending}
                      >
                        <RefreshCw className="w-3 h-3 mr-1" />
                        Resend Copy
                      </Button>
                      <Button 
                        size="sm" 
                        className="text-xs whitespace-nowrap bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 min-w-[60px]" 
                        onClick={() => handleEditInvoice(invoice)}
                      >
                        <Edit className="w-3 h-3 mr-1" />
                        Edit
                      </Button>
                    </>
                  )}

                  {invoice.status === "archived" && (
                    <>
                      <Button 
                        size="sm" 
                        className="text-xs whitespace-nowrap bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 min-w-[85px]" 
                        onClick={() => handleDownloadInvoice(invoice)}
                      >
                        <Download className="w-3 h-3 mr-1" />
                        Download
                      </Button>
                      <Button 
                        size="sm" 
                        className="text-xs whitespace-nowrap bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 min-w-[75px]" 
                        onClick={() => handleRestoreInvoice(invoice)}
                        disabled={restoreInvoiceMutation.isPending}
                      >
                        <RefreshCw className="w-3 h-3 mr-1" />
                        Restore
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Mobile Layout */}
          <div className="lg:hidden space-y-4">
            {/* Invoice details in mobile-friendly layout */}
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium text-gray-600 dark:text-gray-400">Client:</span>
                <p className="text-gray-900 dark:text-gray-100">{invoice.clientName}</p>
              </div>
              <div>
                <span className="font-medium text-gray-600 dark:text-gray-400">Amount:</span>
                <p className="text-gray-900 dark:text-gray-100 font-semibold">£{Number(invoice.amount).toLocaleString()}</p>
              </div>
              <div>
                <span className="font-medium text-gray-600 dark:text-gray-400">Due:</span>
                <p className="text-gray-900 dark:text-gray-100">{formatDate(invoice.dueDate)}</p>
              </div>
              <div>
                <span className="font-medium text-gray-600 dark:text-gray-400">Created:</span>
                <p className="text-gray-900 dark:text-gray-100">{formatDate(invoice.createdAt)}</p>
              </div>
            </div>
            
            {/* Mobile action buttons - same as before but in mobile layout */}
            <div className="flex flex-wrap gap-2">
              {/* Keep existing mobile button layout as-is */}
              <Button 
                size="sm" 
                className="text-xs bg-white hover:bg-gray-50 text-gray-700 border border-gray-300"
                onClick={() => handleViewInvoice(invoice)}
              >
                <Eye className="w-3 h-3 mr-1" />
                View
              </Button>
              
              {invoice.status === "draft" && (
                <>
                  <Button 
                    size="sm" 
                    className="text-xs bg-white hover:bg-gray-50 text-gray-700 border border-gray-300"
                    onClick={() => handleEditInvoice(invoice)}
                  >
                    <Edit className="w-3 h-3 mr-1" />
                    Edit
                  </Button>
                  <Button 
                    size="sm" 
                    className="text-xs bg-white hover:bg-gray-50 text-gray-700 border border-gray-300" 
                    onClick={() => handleSendInvoice(invoice)}
                    disabled={sendInvoiceMutation.isPending}
                  >
                    <Send className="w-3 h-3 mr-1" />
                    {sendInvoiceMutation.isPending ? 'Sending...' : 'Send'}
                  </Button>
                </>
              )}
              
              {invoice.status === "sent" && (
                <>
                  <Button 
                    size="sm" 
                    className="text-xs bg-white hover:bg-gray-50 text-gray-700 border border-gray-300" 
                    onClick={() => handleDownloadInvoice(invoice)}
                  >
                    <Download className="w-3 h-3 mr-1" />
                    Download
                  </Button>
                  <Button 
                    size="sm" 
                    className="text-xs bg-white hover:bg-gray-50 text-gray-700 border border-gray-300" 
                    onClick={() => handleMarkAsPaid(invoice)}
                    disabled={markPaidMutation.isPending}
                  >
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Mark Paid
                  </Button>
                  <Button 
                    size="sm" 
                    className="text-xs bg-white hover:bg-gray-50 text-gray-700 border border-gray-300" 
                    onClick={() => handleResendInvoice(invoice)}
                    disabled={sendInvoiceMutation.isPending}
                  >
                    <RefreshCw className="w-3 h-3 mr-1" />
                    Resend
                  </Button>
                  <Button 
                    size="sm" 
                    className="text-xs bg-white hover:bg-gray-50 text-gray-700 border border-gray-300" 
                    onClick={() => handleEditInvoice(invoice)}
                  >
                    <Edit className="w-3 h-3 mr-1" />
                    Edit
                  </Button>
                </>
              )}
              
              {invoice.status === "overdue" && (
                <>
                  <Button 
                    size="sm" 
                    className="text-xs bg-white hover:bg-gray-50 text-gray-700 border border-gray-300" 
                    onClick={() => handleDownloadInvoice(invoice)}
                  >
                    <Download className="w-3 h-3 mr-1" />
                    Download
                  </Button>
                  <Button 
                    size="sm" 
                    className="text-xs bg-white hover:bg-gray-50 text-gray-700 border border-gray-300" 
                    onClick={() => handleMarkAsPaid(invoice)}
                    disabled={markPaidMutation.isPending}
                  >
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Mark Paid
                  </Button>
                  <Button 
                    size="sm" 
                    className="text-xs bg-white hover:bg-gray-50 text-gray-700 border border-gray-300" 
                    onClick={() => handleResendInvoice(invoice)}
                    disabled={sendInvoiceMutation.isPending}
                  >
                    <RefreshCw className="w-3 h-3 mr-1" />
                    Resend
                  </Button>
                  <Button 
                    size="sm" 
                    className="text-xs bg-white hover:bg-gray-50 text-gray-700 border border-gray-300" 
                    onClick={() => handleEditInvoice(invoice)}
                  >
                    <Edit className="w-3 h-3 mr-1" />
                    Edit
                  </Button>
                  <Button 
                    size="sm" 
                    className="text-xs bg-white hover:bg-gray-50 text-red-700 border border-gray-300" 
                    onClick={() => handleSendReminder(invoice)}
                    disabled={sendReminderMutation.isPending}
                  >
                    <AlertTriangle className="w-3 h-3 mr-1" />
                    Overdue Notice
                  </Button>
                </>
              )}
              
              {invoice.status === "paid" && (
                <>
                  <Button 
                    size="sm" 
                    className="text-xs bg-white hover:bg-gray-50 text-gray-700 border border-gray-300" 
                    onClick={() => handleDownloadInvoice(invoice)}
                  >
                    <Download className="w-3 h-3 mr-1" />
                    Download
                  </Button>
                  <Button 
                    size="sm" 
                    className="text-xs bg-white hover:bg-gray-50 text-gray-700 border border-gray-300" 
                    onClick={() => handleResendInvoice(invoice)}
                    disabled={sendInvoiceMutation.isPending}
                  >
                    <RefreshCw className="w-3 h-3 mr-1" />
                    Resend Copy
                  </Button>
                  <Button 
                    size="sm" 
                    className="text-xs bg-white hover:bg-gray-50 text-gray-700 border border-gray-300" 
                    onClick={() => handleEditInvoice(invoice)}
                  >
                    <Edit className="w-3 h-3 mr-1" />
                    Edit
                  </Button>
                </>
              )}

              {invoice.status === "archived" && (
                <>
                  <Button 
                    size="sm" 
                    className="text-xs bg-white hover:bg-gray-50 text-gray-700 border border-gray-300" 
                    onClick={() => handleDownloadInvoice(invoice)}
                  >
                    <Download className="w-3 h-3 mr-1" />
                    Download
                  </Button>
                  <Button 
                    size="sm" 
                    className="text-xs bg-white hover:bg-gray-50 text-gray-700 border border-gray-300" 
                    onClick={() => handleRestoreInvoice(invoice)}
                    disabled={restoreInvoiceMutation.isPending}
                  >
                    <RefreshCw className="w-3 h-3 mr-1" />
                    Restore
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
})}
            </>
          )}
        </div>
      </div>
      </div>

      <MobileNav />
    </div>
  );
}