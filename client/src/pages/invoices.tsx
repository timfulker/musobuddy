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
import { Search, Filter, MoreHorizontal, DollarSign, Calendar, FileText, Download, ArrowLeft, Plus, Send, Edit } from "lucide-react";
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

export default function Invoices() {
  const { toast } = useToast();
  const [location] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Check for URL parameters to auto-open dialog
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const createNew = params.get('create');
    if (createNew === 'true') {
      setIsDialogOpen(true);
    }
  }, [location]);

  const { data: invoices = [], isLoading } = useQuery({
    queryKey: ['/api/invoices'],
  });

  const { data: contracts = [] } = useQuery({
    queryKey: ['/api/contracts'],
  });

  const { data: userSettings } = useQuery({
    queryKey: ['/api/settings'],
  });

  const form = useForm<z.infer<typeof invoiceFormSchema>>({
    resolver: zodResolver(invoiceFormSchema),
    defaultValues: {
      invoiceNumber: "",
      contractId: 1,
      clientName: "", 
      businessAddress: userSettings?.businessAddress || "",
      amount: "",
      dueDate: "",
      performanceDate: "",
    },
  });

  // Watch contract ID changes
  const selectedContractId = form.watch("contractId");

  // Auto-fill client name and amount when contract is selected
  useEffect(() => {
    if (selectedContractId && contracts.length > 0) {
      const selectedContract = contracts.find((c: any) => c.id === selectedContractId);
      if (selectedContract) {
        form.setValue("clientName", selectedContract.clientName);
        if (selectedContract.eventDate) {
          form.setValue("performanceDate", new Date(selectedContract.eventDate).toISOString().split('T')[0]);
        }
        if (selectedContract.fee) {
          // Calculate amount due (fee minus any deposit)
          const fee = Number(selectedContract.fee);
          const deposit = Number(selectedContract.deposit) || 0;
          const amountDue = fee - deposit;
          form.setValue("amount", amountDue.toString());
        }
      }
    }
  }, [selectedContractId, contracts, form]);

  // Auto-fill business address from settings
  useEffect(() => {
    if (userSettings?.businessAddress) {
      form.setValue("businessAddress", userSettings.businessAddress);
    }
  }, [userSettings, form]);

  const createInvoiceMutation = useMutation({
    mutationFn: async (data: z.infer<typeof invoiceFormSchema>) => {
      return await apiRequest('/api/invoices', 'POST', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/invoices'] });
      form.reset();
      setIsDialogOpen(false);
      toast({
        title: "Success",
        description: "Invoice created successfully!",
      });
    },
    onError: (error) => {
      console.error("Create invoice error:", error);
      toast({
        title: "Error",
        description: "Failed to create invoice. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: z.infer<typeof invoiceFormSchema>) => {
    const finalData = {
      ...data,
      contractId: selectedContractId || 1,
    };
    createInvoiceMutation.mutate(finalData);
  };

  const handleDialogClose = () => {
    setIsDialogOpen(false);
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
  const sendInvoiceMutation = useMutation({
    mutationFn: async (invoice: Invoice) => {
      return await apiRequest(`/api/invoices/${invoice.id}/send`, 'POST');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/invoices'] });
      toast({
        title: "Success",
        description: "Invoice sent successfully with PDF attachment!",
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

  const handleDownloadInvoice = async (invoice: Invoice) => {
    try {
      const response = await fetch(`/api/invoices/${invoice.id}/pdf`);
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
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Invoices</h1>
            <p className="text-gray-600">Manage your invoices and payments</p>
          </div>
          <div className="flex gap-3">
            <Link href="/">
              <Button variant="outline" size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Dashboard
              </Button>
            </Link>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Invoice
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Create New Invoice</DialogTitle>
                </DialogHeader>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
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
                            <FormLabel>Select Contract</FormLabel>
                            <Select 
                              value={field.value?.toString()} 
                              onValueChange={(value) => field.onChange(parseInt(value))}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Choose a contract" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {contracts.map((contract: any) => (
                                  <SelectItem key={contract.id} value={contract.id.toString()}>
                                    {contract.clientName} - {formatDate(contract.eventDate)}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
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
                      name="businessAddress"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Business Address</FormLabel>
                          <FormControl>
                            <Input placeholder="Your business address" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

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
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="p-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
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
                  <p className="text-sm font-medium text-gray-600">Outstanding</p>
                  <p className="text-2xl font-bold text-blue-600">
                    £{invoices.filter((inv: Invoice) => inv.status === "sent").reduce((sum: number, inv: Invoice) => sum + Number(inv.amount), 0).toLocaleString()}
                  </p>
                  <p className="text-xs text-gray-500">
                    {invoices.filter((inv: Invoice) => inv.status === "sent").length} invoices
                  </p>
                </div>
                <FileText className="w-8 h-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Overdue</p>
                  <p className="text-2xl font-bold text-red-600">
                    {invoices.filter((inv: Invoice) => inv.status === "overdue").length}
                  </p>
                  <p className="text-xs text-gray-500">Need attention</p>
                </div>
                <Calendar className="w-8 h-8 text-red-600" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Paid This Month</p>
                  <p className="text-2xl font-bold text-green-600">
                    £{invoices.filter((inv: Invoice) => inv.status === "paid").reduce((sum: number, inv: Invoice) => sum + Number(inv.amount), 0).toLocaleString()}
                  </p>
                  <p className="text-xs text-gray-500">Great progress!</p>
                </div>
                <DollarSign className="w-8 h-8 text-green-600" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Invoices</p>
                  <p className="text-2xl font-bold text-gray-900">{invoices.length}</p>
                  <p className="text-xs text-gray-500">All time</p>
                </div>
                <FileText className="w-8 h-8 text-gray-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Invoices List */}
        <div className="space-y-4">
          {filteredInvoices.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No invoices found</h3>
                <p className="text-gray-600 mb-4">
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
            filteredInvoices.map((invoice: Invoice) => {
              return (
                <Card key={invoice.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-semibold text-lg text-gray-900">
                            Invoice #{invoice.invoiceNumber}
                          </h3>
                          <Badge className={getStatusColor(invoice.status)}>
                            {invoice.status}
                          </Badge>
                        </div>
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600">
                          <div>
                            <span className="font-medium">Client:</span>
                            <p className="text-gray-900">{invoice.clientName}</p>
                          </div>
                          <div>
                            <span className="font-medium">Amount:</span>
                            <p className="text-gray-900 font-semibold">£{Number(invoice.amount).toLocaleString()}</p>
                          </div>
                          <div>
                            <span className="font-medium">Due Date:</span>
                            <p className="text-gray-900">{formatDate(invoice.dueDate)}</p>
                          </div>
                          <div>
                            <span className="font-medium">Created:</span>
                            <p className="text-gray-900">{formatDate(invoice.createdAt!)}</p>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2 ml-4">
                        {invoice.status === "draft" && (
                          <>
                            <Button size="sm" variant="outline" className="text-xs">
                              <Edit className="w-3 h-3 mr-1" />
                              Edit
                            </Button>
                            <Button size="sm" className="text-xs" onClick={() => handleSendInvoice(invoice)}>
                              <Send className="w-3 h-3 mr-1" />
                              Send
                            </Button>
                          </>
                        )}
                        
                        {(invoice.status === "sent" || invoice.status === "overdue") && (
                          <Button size="sm" variant="outline" className="text-xs" onClick={() => handleDownloadInvoice(invoice)}>
                            <Download className="w-3 h-3 mr-1" />
                            Download
                          </Button>
                        )}
                        
                        {invoice.status === "paid" && (
                          <Button size="sm" variant="outline" className="text-xs" onClick={() => handleDownloadInvoice(invoice)}>
                            <Download className="w-3 h-3 mr-1" />
                            Download
                          </Button>
                        )}
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