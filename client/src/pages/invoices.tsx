import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Search, Filter, MoreHorizontal, DollarSign, Calendar, FileText, Download, ArrowLeft, Plus } from "lucide-react";
import { insertInvoiceSchema, type Invoice } from "@shared/schema";
import { Link, useLocation } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";

const invoiceFormSchema = z.object({
  invoiceNumber: z.string().min(1, "Invoice number is required"),
  contractId: z.number().min(1, "Please select a contract"),
  clientName: z.string().min(1, "Client name is required"),
  businessAddress: z.string().optional(),
  amount: z.string().min(1, "Amount is required"),
  dueDate: z.string().min(1, "Due date is required"),
  performanceDate: z.string().optional(),
});

// Edit Invoice Form Component
function EditInvoiceForm({ invoice, onClose }: { invoice: Invoice; onClose: () => void }) {
  const { toast } = useToast();
  
  const form = useForm<z.infer<typeof invoiceFormSchema>>({
    resolver: zodResolver(invoiceFormSchema),
    defaultValues: {
      invoiceNumber: invoice.invoiceNumber,
      contractId: invoice.contractId,
      clientName: invoice.clientName,
      businessAddress: invoice.businessAddress || "",
      amount: invoice.amount,
      dueDate: new Date(invoice.dueDate).toISOString().split('T')[0],
      performanceDate: invoice.performanceDate ? new Date(invoice.performanceDate).toISOString().split('T')[0] : "",
    },
  });

  const updateInvoiceMutation = useMutation({
    mutationFn: async (data: z.infer<typeof invoiceFormSchema>) => {
      return await apiRequest(`/api/invoices/${invoice.id}`, "PATCH", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      onClose();
      toast({
        title: "Success",
        description: "Invoice updated successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update invoice",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: z.infer<typeof invoiceFormSchema>) => {
    updateInvoiceMutation.mutate(data);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="invoiceNumber"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Invoice Number</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="clientName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Client Name</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="amount"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Amount (£)</FormLabel>
              <FormControl>
                <Input type="number" step="0.01" {...field} />
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

        <div className="flex justify-end space-x-2 pt-4">
          <Button variant="outline" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            type="submit" 
            disabled={updateInvoiceMutation.isPending}
            className="bg-purple-600 hover:bg-purple-700"
          >
            {updateInvoiceMutation.isPending ? "Updating..." : "Update Invoice"}
          </Button>
        </div>
      </form>
    </Form>
  );
}

export default function Invoices() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [location, navigate] = useLocation();
  const { toast } = useToast();

  // Check URL parameters to auto-open dialog
  useEffect(() => {
    // Use window.location.search for more reliable parameter detection
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('action') === 'new') {
      setIsDialogOpen(true);
      // Clean up URL after opening dialog
      const cleanUrl = window.location.pathname;
      window.history.replaceState({}, document.title, cleanUrl);
    }
  }, [location]);

  const form = useForm<z.infer<typeof invoiceFormSchema>>({
    resolver: zodResolver(invoiceFormSchema),
    defaultValues: {
      invoiceNumber: `INV-${Date.now()}`,
      contractId: 0,
      clientName: "",
      businessAddress: "",
      amount: "",
      dueDate: "",
      performanceDate: "",
    },
  });

  const { data: invoices = [], isLoading } = useQuery({
    queryKey: ["/api/invoices"],
  });

  const { data: contracts = [] } = useQuery({
    queryKey: ["/api/contracts"],
  });

  const { data: userSettings = {} } = useQuery({
    queryKey: ["/api/settings"],
  });

  // Watch for contract selection changes to autofill fields
  const selectedContractId = form.watch("contractId");
  const selectedContract = contracts.find((c: any) => c.id === parseInt(selectedContractId?.toString() || "0"));

  // Autofill form when contract is selected
  useEffect(() => {
    if (selectedContract) {
      const deposit = selectedContract.deposit ? parseFloat(selectedContract.deposit) : 0;
      const fee = parseFloat(selectedContract.fee);
      const amountDue = fee - deposit;
      
      form.setValue("clientName", selectedContract.clientName);
      form.setValue("amount", amountDue.toString());
      form.setValue("performanceDate", new Date(selectedContract.eventDate).toISOString().split('T')[0]);
      
      // Set due date to 30 days after event date
      const eventDate = new Date(selectedContract.eventDate);
      const dueDate = new Date(eventDate);
      dueDate.setDate(dueDate.getDate() + 30);
      form.setValue("dueDate", dueDate.toISOString().split('T')[0]);
    }
  }, [selectedContract, form]);

  // Auto-populate business address from user settings
  useEffect(() => {
    if (userSettings.businessAddress) {
      form.setValue("businessAddress", userSettings.businessAddress);
    }
  }, [userSettings, form]);

  const createInvoiceMutation = useMutation({
    mutationFn: async (data: z.infer<typeof invoiceFormSchema>) => {
      const payload = {
        ...data,
        dueDate: data.dueDate, // Keep as string
        performanceDate: data.performanceDate || null, // Keep as string or null
        amount: data.amount,
        contractId: parseInt(data.contractId.toString()),
        // Add professional invoice fields with contract data
        performanceFee: selectedContract?.fee || "0",
        depositPaid: selectedContract?.deposit || "0",
      };
      return await apiRequest("POST", "/api/invoices", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      setIsDialogOpen(false);
      form.reset();
      // Clean up URL parameters
      const cleanUrl = location.split('?')[0];
      navigate(cleanUrl, { replace: true });
      toast({
        title: "Success",
        description: "Invoice created successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to create invoice. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: z.infer<typeof invoiceFormSchema>) => {
    console.log("Form submission triggered");
    console.log("Form data:", data);
    console.log("Form errors:", form.formState.errors);
    console.log("Selected contract ID:", selectedContractId);
    
    // Create the final payload with the selected contract
    const finalData = {
      ...data,
      contractId: selectedContractId || 1, // Use the watched contract ID
    };
    
    console.log("Final data being submitted:", finalData);
    createInvoiceMutation.mutate(finalData);
  };

  const handleDialogClose = () => {
    setIsDialogOpen(false);
    // Clean up URL if there are parameters
    if (window.location.search) {
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "draft": return "bg-gray-100 text-gray-800";
      case "sent": return "bg-blue-100 text-blue-800";
      case "paid": return "bg-green-100 text-green-800";
      case "overdue": return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "No date set";
    return new Date(dateString).toLocaleDateString("en-GB");
  };

  // Invoice action handlers
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  const handleEditInvoice = (invoice: Invoice) => {
    setEditingInvoice(invoice);
    setIsEditDialogOpen(true);
  };

  const handlePreviewInvoice = (invoice: Invoice) => {
    // Create a comprehensive invoice preview
    const invoiceHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Invoice ${invoice.invoiceNumber}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 40px; color: #333; }
          .header { text-align: center; margin-bottom: 40px; }
          .invoice-title { font-size: 28px; font-weight: bold; color: #2563eb; }
          .invoice-number { font-size: 18px; color: #666; }
          .section { margin: 30px 0; }
          .row { display: flex; justify-content: space-between; margin: 20px 0; }
          .col { flex: 1; }
          .amount { font-size: 24px; font-weight: bold; color: #059669; }
          .total-section { border-top: 2px solid #e5e7eb; padding-top: 20px; }
          .footer { margin-top: 50px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="invoice-title">INVOICE</div>
          <div class="invoice-number">#${invoice.invoiceNumber}</div>
        </div>
        
        <div class="section">
          <div class="row">
            <div class="col">
              <strong>From:</strong><br>
              Tim Fulker Music<br>
              59 Gloucester Road<br>
              Bournemouth, Dorset BH7 6JA<br>
              Phone: 07764190034<br>
              Email: timfulkermusic@gmail.com
            </div>
            <div class="col">
              <strong>To:</strong><br>
              ${invoice.clientName}<br>
              [Client Address]
            </div>
          </div>
        </div>
        
        <div class="section">
          <div class="row">
            <div class="col">
              <strong>Invoice Date:</strong><br>
              ${new Date(invoice.createdAt!).toLocaleDateString('en-GB')}
            </div>
            <div class="col">
              <strong>Due Date:</strong><br>
              ${new Date(invoice.dueDate).toLocaleDateString('en-GB')}
            </div>
          </div>
        </div>
        
        <div class="section">
          <h3>Services</h3>
          <div style="border: 1px solid #e5e7eb; padding: 20px;">
            <div class="row">
              <div class="col"><strong>Description</strong></div>
              <div class="col" style="text-align: right;"><strong>Amount</strong></div>
            </div>
            <div class="row">
              <div class="col">Musical Performance Services</div>
              <div class="col" style="text-align: right;">£${Number(invoice.amount).toLocaleString()}</div>
            </div>
          </div>
        </div>
        
        <div class="total-section">
          <div class="row">
            <div class="col"></div>
            <div class="col" style="text-align: right;">
              <strong>Total Amount: <span class="amount">£${Number(invoice.amount).toLocaleString()}</span></strong>
            </div>
          </div>
        </div>
        
        <div class="footer">
          <p>Payment terms: Net 30 days</p>
          <p>Thank you for your business!</p>
        </div>
      </body>
      </html>
    `;
    
    // Open in new window for preview
    const previewWindow = window.open('', '_blank');
    if (previewWindow) {
      previewWindow.document.write(invoiceHtml);
      previewWindow.document.close();
    }
  };

  const sendInvoiceMutation = useMutation({
    mutationFn: async (invoice: Invoice) => {
      return apiRequest("POST", `/api/invoices/send-email`, { invoiceId: invoice.id });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      toast({
        title: "Success",
        description: "Invoice sent to client successfully!",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to send invoice email",
        variant: "destructive",
      });
    },
  });

  const handleSendInvoice = (invoice: Invoice) => {
    sendInvoiceMutation.mutate(invoice);
  };

  const handleDeleteInvoice = (invoice: Invoice) => {
    if (confirm(`Are you sure you want to delete invoice ${invoice.invoiceNumber}?`)) {
      // TODO: Implement delete functionality
      toast({
        title: "Delete Invoice",
        description: "Delete functionality will be implemented soon",
      });
    }
  };

  const handleDownloadInvoice = (invoice: Invoice) => {
    // Create invoice content for download
    const invoiceContent = `
INVOICE #${invoice.invoiceNumber}

═══════════════════════════════════════════════════════════════

FROM:
Tim Fulker Music
59 Gloucester Road
Bournemouth, Dorset BH7 6JA
Phone: 07764190034
Email: timfulkermusic@gmail.com

TO:
${invoice.clientName}
[Client Address]

═══════════════════════════════════════════════════════════════

INVOICE DETAILS:
Invoice Date: ${new Date(invoice.createdAt!).toLocaleDateString('en-GB')}
Due Date: ${new Date(invoice.dueDate).toLocaleDateString('en-GB')}
Amount: £${Number(invoice.amount).toLocaleString()}

═══════════════════════════════════════════════════════════════

SERVICES:
Musical Performance Services                                £${Number(invoice.amount).toLocaleString()}

═══════════════════════════════════════════════════════════════

TOTAL AMOUNT DUE: £${Number(invoice.amount).toLocaleString()}

Payment terms: Net 30 days
Thank you for your business!

Generated on: ${new Date().toLocaleDateString('en-GB')}
    `;

    // Create and download the file
    const blob = new Blob([invoiceContent], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Invoice-${invoice.invoiceNumber}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
    
    toast({
      title: "Download Complete",
      description: `Invoice ${invoice.invoiceNumber} downloaded successfully`,
    });
  };

  const handleSendReminder = (invoice: Invoice) => {
    // TODO: Implement reminder functionality
    toast({
      title: "Send Reminder",
      description: "Reminder functionality will be implemented soon",
    });
  };

  const getDaysUntilDue = (dueDateString: string) => {
    if (!dueDateString) return null;
    const dueDate = new Date(dueDateString);
    const today = new Date();
    const diffTime = dueDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const filteredInvoices = invoices.filter((invoice: Invoice) => {
    const matchesSearch = searchQuery === "" || 
      invoice.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      invoice.clientName.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || invoice.status === statusFilter;
    
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
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link href="/">
              <Button variant="outline" size="sm" className="bg-white border-purple-200 text-purple-700 hover:bg-purple-50 hover:border-purple-300">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Dashboard
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Invoices</h1>
              <p className="text-gray-600">Track payments and manage your invoicing</p>
            </div>
          </div>
          
          <Button 
            className="bg-purple-600 hover:bg-purple-700"
            onClick={() => setIsDialogOpen(true)}
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Invoice
          </Button>

          <Dialog open={isDialogOpen} onOpenChange={handleDialogClose}>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Create New Invoice</DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="invoiceNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Invoice Number</FormLabel>
                        <FormControl>
                          <Input placeholder="INV-001" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="contractId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Contract</FormLabel>
                        <Select 
                          onValueChange={(value) => field.onChange(parseInt(value))} 
                          value={field.value?.toString() || ""}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a contract" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {(contracts as any[]).map((contract: any) => (
                              <SelectItem key={contract.id} value={contract.id.toString()}>
                                {contract.clientName} - {contract.eventTitle}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="clientName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Client Name</FormLabel>
                        <FormControl>
                          <Input placeholder="John Smith" {...field} />
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
                        <FormLabel>Your Business Address</FormLabel>
                        <FormControl>
                          <Input placeholder="Your business address for the invoice header" {...field} />
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

                  {selectedContract && (
                    <div className="bg-blue-50 p-3 rounded-lg space-y-2 text-sm">
                      <p><strong>Performance Fee:</strong> £{selectedContract.fee}</p>
                      {selectedContract.deposit && (
                        <p><strong>Deposit Paid:</strong> £{selectedContract.deposit}</p>
                      )}
                      <p><strong>Amount Due:</strong> £{(parseFloat(selectedContract.fee) - (selectedContract.deposit ? parseFloat(selectedContract.deposit) : 0)).toFixed(2)}</p>
                    </div>
                  )}

                  <FormField
                    control={form.control}
                    name="amount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Amount Due (£)</FormLabel>
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

                  <div className="flex justify-end space-x-2 pt-4">
                    <Button variant="outline" type="button" onClick={handleDialogClose}>
                      Cancel
                    </Button>
                    <Button 
                      type="submit" 
                      disabled={createInvoiceMutation.isPending}
                      className="bg-purple-600 hover:bg-purple-700"
                    >
                      {createInvoiceMutation.isPending ? "Creating..." : "Create Invoice"}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>

          {/* Edit Invoice Dialog */}
          <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Edit Invoice</DialogTitle>
              </DialogHeader>
              {editingInvoice && <EditInvoiceForm invoice={editingInvoice} onClose={() => setIsEditDialogOpen(false)} />}
            </DialogContent>
          </Dialog>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <DollarSign className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Total Outstanding</p>
                  <p className="text-xl font-bold">
                    £{invoices.filter((inv: Invoice) => inv.status === "sent").reduce((sum: number, inv: Invoice) => sum + Number(inv.amount), 0).toLocaleString()}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <FileText className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Pending Invoices</p>
                  <p className="text-xl font-bold">
                    {invoices.filter((inv: Invoice) => inv.status === "sent").length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Overdue</p>
                  <p className="text-xl font-bold">
                    {invoices.filter((inv: Invoice) => inv.status === "overdue").length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                  <DollarSign className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">This Month</p>
                  <p className="text-xl font-bold">
                    £{invoices.filter((inv: Invoice) => inv.status === "paid").reduce((sum: number, inv: Invoice) => sum + Number(inv.amount), 0).toLocaleString()}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-4">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Search invoices..."
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
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="overdue">Overdue</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Invoices List */}
        <div className="space-y-4">
          {filteredInvoices.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <DollarSign className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 text-lg">No invoices found</p>
                <p className="text-gray-400">Create your first invoice from a signed contract</p>
                <Button 
                  className="mt-4 bg-purple-600 hover:bg-purple-700"
                  onClick={() => setIsDialogOpen(true)}
                >
                  <DollarSign className="w-4 h-4 mr-2" />
                  Create Invoice
                </Button>
              </CardContent>
            </Card>
          ) : (
            filteredInvoices.map((invoice: Invoice) => {
              const daysUntilDue = getDaysUntilDue(invoice.dueDate);
              return (
                <Card key={invoice.id} className="hover:shadow-md transition-shadow cursor-pointer">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-3">
                          <h3 className="text-lg font-semibold text-gray-900">
                            Invoice #{invoice.invoiceNumber}
                          </h3>
                          <Badge className={getStatusColor(invoice.status)}>
                            {invoice.status.toUpperCase()}
                          </Badge>
                          {invoice.status === "sent" && daysUntilDue !== null && (
                            <Badge variant={daysUntilDue < 0 ? "destructive" : daysUntilDue <= 7 ? "outline" : "secondary"}>
                              {daysUntilDue < 0 ? `${Math.abs(daysUntilDue)} days overdue` : 
                               daysUntilDue === 0 ? "Due today" :
                               `Due in ${daysUntilDue} days`}
                            </Badge>
                          )}
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <p className="font-medium text-gray-900">{invoice.clientName}</p>
                            <p className="text-gray-500">Client</p>
                          </div>
                          
                          <div>
                            <p className="font-medium text-gray-900">£{Number(invoice.amount).toLocaleString()}</p>
                            <p className="text-gray-500">Amount</p>
                          </div>
                          
                          <div>
                            <p className="font-medium text-gray-900">{formatDate(invoice.dueDate)}</p>
                            <p className="text-gray-500">Due Date</p>
                          </div>
                          
                          <div>
                            <p className="font-medium text-gray-900">{formatDate(invoice.createdAt!)}</p>
                            <p className="text-gray-500">Created</p>
                          </div>
                        </div>
                        
                        {invoice.paidAt && (
                          <div className="mt-3 p-3 bg-green-50 rounded-lg">
                            <p className="text-sm text-green-700">
                              Paid on {formatDate(invoice.paidAt)}
                            </p>
                          </div>
                        )}
                      </div>
                      
                      <div className="flex flex-col items-end space-y-2">
                        <div className="text-right mb-2">
                          <p className="text-xs text-gray-500 mb-1">Status</p>
                          <Badge 
                            variant={
                              invoice.status === "paid" ? "default" : 
                              invoice.status === "sent" ? "secondary" :
                              invoice.status === "overdue" ? "destructive" : "outline"
                            }
                          >
                            {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
                          </Badge>
                        </div>
                        
                        <div className="flex flex-col space-y-1">
                          {invoice.status === "draft" && (
                            <>
                              <Button size="sm" variant="outline" className="text-xs" onClick={() => handleEditInvoice(invoice)}>
                                Edit
                              </Button>
                              <Button size="sm" variant="outline" className="text-xs" onClick={() => handlePreviewInvoice(invoice)}>
                                Preview
                              </Button>
                              <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-xs" onClick={() => handleSendInvoice(invoice)}>
                                Send
                              </Button>
                              <Button size="sm" variant="outline" className="text-red-600 hover:text-red-700 text-xs" onClick={() => handleDeleteInvoice(invoice)}>
                                Delete
                              </Button>
                            </>
                          )}
                          
                          {invoice.status === "sent" && (
                            <>
                              <Button size="sm" variant="outline" className="text-xs" onClick={() => handlePreviewInvoice(invoice)}>
                                Preview
                              </Button>
                              <Button size="sm" variant="outline" className="text-xs" onClick={() => handleDownloadInvoice(invoice)}>
                                <Download className="w-3 h-3 mr-1" />
                                Download
                              </Button>
                              <Button size="sm" variant="outline" className="text-xs" onClick={() => handleSendReminder(invoice)}>
                                Reminder
                              </Button>
                            </>
                          )}
                          
                          {invoice.status === "paid" && (
                            <Button size="sm" variant="outline" className="text-xs" onClick={() => handleDownloadInvoice(invoice)}>
                              <Download className="w-3 h-3 mr-1" />
                              Download
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}