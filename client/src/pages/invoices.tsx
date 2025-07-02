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

const invoiceFormSchema = insertInvoiceSchema.extend({
  dueDate: z.string(),
});

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
      clientName: "",
      amount: "",
      dueDate: "",
      contractId: 0,
      invoiceNumber: `INV-${Date.now()}`,
    },
  });

  const { data: invoices = [], isLoading } = useQuery({
    queryKey: ["/api/invoices"],
  });

  const { data: contracts = [] } = useQuery({
    queryKey: ["/api/contracts"],
  });

  const createInvoiceMutation = useMutation({
    mutationFn: async (data: z.infer<typeof invoiceFormSchema>) => {
      const payload = {
        ...data,
        dueDate: new Date(data.dueDate),
        amount: data.amount,
        contractId: parseInt(data.contractId.toString()),
      };
      return await apiRequest("/api/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
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
    createInvoiceMutation.mutate(data);
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
          
          <Dialog open={isDialogOpen} onOpenChange={handleDialogClose}>
            <DialogTrigger asChild>
              <Button 
                className="bg-purple-600 hover:bg-purple-700"
                onClick={() => setIsDialogOpen(true)}
              >
                <Plus className="w-4 h-4 mr-2" />
                Create Invoice
              </Button>
            </DialogTrigger>
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
                        <Select onValueChange={field.onChange} value={field.value?.toString()}>
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
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                        
                        {invoice.status === "draft" && (
                          <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                            Send Invoice
                          </Button>
                        )}
                        
                        {invoice.status === "sent" && (
                          <Button size="sm" variant="outline">
                            Send Reminder
                          </Button>
                        )}
                        
                        <Button size="sm" variant="outline">
                          <Download className="w-4 h-4 mr-1" />
                          Download
                        </Button>
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