import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from '@/hooks/use-toast';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Send, Search, Loader2, CheckCircle, Plus, Calendar, User, Mail, PoundSterling, FileText, ArrowLeft } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useLocation } from "wouter";

// Mobile-optimized invoice form schema (simplified for mobile use)
const mobileInvoiceSchema = z.object({
  clientName: z.string().min(1, "Client name is required"),
  clientEmail: z.string().email("Please enter a valid email address"),
  amount: z.string().min(1, "Amount is required"),
  dueDate: z.string().min(1, "Due date is required"),
  performanceDate: z.string().optional(),
  description: z.string().optional(),
  bookingId: z.number().optional(), // Link to existing booking
});

export default function MobileInvoiceSender() {
  const [invoiceId, setInvoiceId] = useState('');
  const [sending, setSending] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('send');
  const [creating, setCreating] = useState(false);
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [location, setLocation] = useLocation();

  // Invoice creation form
  const form = useForm<z.infer<typeof mobileInvoiceSchema>>({
    resolver: zodResolver(mobileInvoiceSchema),
    defaultValues: {
      clientName: "",
      clientEmail: "",
      amount: "",
      dueDate: "",
      performanceDate: "",
      description: "",
      bookingId: undefined,
    },
  });

  // Fetch recent invoices
  const { data: invoices, isLoading } = useQuery({
    queryKey: ['/api/invoices'],
    select: (data: any[]) => 
      data
        ?.filter(invoice => invoice.status !== 'Paid')
        ?.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        ?.slice(0, 10) || []
  });

  // Fetch recent bookings for auto-fill
  const { data: bookings = [] } = useQuery({
    queryKey: ['/api/bookings'],
    select: (data: any[]) => {
      console.log('Mobile Invoice: Raw booking data:', data?.slice(0, 3));
      return data
        ?.filter(booking => booking.clientName && booking.fee) // Only require clientName and fee
        ?.sort((a, b) => new Date(b.eventDate || b.createdAt).getTime() - new Date(a.eventDate || a.createdAt).getTime())
        ?.slice(0, 10) || []
    }
  });

  // Create invoice mutation
  const createInvoiceMutation = useMutation({
    mutationFn: async (data: z.infer<typeof mobileInvoiceSchema>) => {
      const response = await apiRequest('/api/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          dueDate: new Date(data.dueDate),
          performanceDate: data.performanceDate ? new Date(data.performanceDate) : null,
          performanceFee: data.amount, // Use amount as performance fee
          invoiceType: 'performance',
        }),
      });
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/invoices'] });
      toast({
        title: "Invoice created successfully!",
        description: `Invoice #${data.invoiceNumber} has been created and can be sent immediately.`
      });
      form.reset();
      setActiveTab('send'); // Switch to send tab after creation
    },
    onError: (error: any) => {
      toast({
        title: "Error creating invoice",
        description: error.message || "Failed to create invoice",
        variant: "destructive"
      });
    }
  });

  // Auto-fill form from booking
  const fillFromBooking = (booking: any) => {
    form.setValue('clientName', booking.clientName || '');
    form.setValue('clientEmail', booking.clientEmail || '');
    form.setValue('amount', booking.fee?.toString() || '');
    if (booking.eventDate) {
      const eventDate = new Date(booking.eventDate).toISOString().split('T')[0];
      form.setValue('performanceDate', eventDate);
      // Set due date to 7 days after performance for mobile simplicity
      const dueDate = new Date(booking.eventDate);
      dueDate.setDate(dueDate.getDate() + 7);
      form.setValue('dueDate', dueDate.toISOString().split('T')[0]);
    }
    form.setValue('description', `${booking.eventType || 'Performance'} at ${booking.venue || 'venue'}`);
    form.setValue('bookingId', booking.id);
    setActiveTab('create');
  };

  // Set default due date (7 days from today) when creating new invoice
  useEffect(() => {
    if (activeTab === 'create' && !form.getValues('dueDate')) {
      const defaultDueDate = new Date();
      defaultDueDate.setDate(defaultDueDate.getDate() + 7);
      form.setValue('dueDate', defaultDueDate.toISOString().split('T')[0]);
    }
  }, [activeTab, form]);

  // Handle form submission
  const onSubmit = async (data: z.infer<typeof mobileInvoiceSchema>) => {
    setCreating(true);
    try {
      await createInvoiceMutation.mutateAsync(data);
    } finally {
      setCreating(false);
    }
  };

  const sendInvoiceDirectly = async (id: string) => {
    setSending(true);
    
    // Find token the same way the console command does
    let token = null;
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.includes('auth')) {
        const stored = localStorage.getItem(key);
        if (stored) {
          try {
            const parsed = JSON.parse(stored);
            if (parsed.token) {
              token = parsed.token;
              break;
            }
          } catch {
            if (typeof stored === 'string' && stored.length > 20) {
              token = stored;
              break;
            }
          }
        }
      }
    }

    if (!token) {
      toast({
        title: "No authentication found",
        description: "Please log in first",
        variant: "destructive"
      });
      setSending(false);
      return;
    }

    try {
      const response = await fetch('/api/invoices/send-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ invoiceId: parseInt(id) })
      });

      const data = await response.json();
      
      if (data.error) {
        toast({
          title: "Error sending invoice",
          description: data.error,
          variant: "destructive"
        });
      } else {
        toast({
          title: "Invoice sent successfully!",
          description: `Invoice ${id} has been emailed to the client`
        });
        setInvoiceId('');
      }
    } catch (error) {
      toast({
        title: "Network error",
        description: "Failed to send invoice",
        variant: "destructive"
      });
    }
    
    setSending(false);
  };

  // Filter invoices based on search
  const filteredInvoices = invoices?.filter(invoice => 
    invoice.clientName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    invoice.invoiceNumber?.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  return (
    <div className={`${isMobile ? 'p-4' : 'max-w-2xl mx-auto p-6'} space-y-6`}>
      {/* Header Card */}
      <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950 border-blue-200 dark:border-blue-800">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-blue-900 dark:text-blue-100">
            <FileText className="h-5 w-5" />
            Mobile Invoice Manager
          </CardTitle>
          <p className="text-sm text-blue-700 dark:text-blue-300">
            Create new invoices or send existing ones - perfect for gigs!
          </p>
        </CardHeader>
      </Card>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="send" className="flex items-center gap-2">
            <Send className="h-4 w-4" />
            Quick Send
          </TabsTrigger>
          <TabsTrigger value="create" className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Create New
          </TabsTrigger>
        </TabsList>

        {/* Quick Send Tab */}
        <TabsContent value="send" className="space-y-4 mt-6">

      {/* Manual Invoice ID Entry */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Send by Invoice ID</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              value={invoiceId}
              onChange={(e) => setInvoiceId(e.target.value)}
              placeholder="Enter invoice ID (e.g. 197)"
              type="number"
              className="text-center text-lg font-mono"
            />
            <Button 
              onClick={() => sendInvoiceDirectly(invoiceId)}
              disabled={!invoiceId || sending}
              size="lg"
              className="px-6"
            >
              {sending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Send
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Recent Invoices */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Recent Unpaid Invoices</CardTitle>
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search by client name or invoice number..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {isLoading ? (
            <div className="text-center py-8">
              <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-gray-400" />
              <p className="text-sm text-gray-500">Loading invoices...</p>
            </div>
          ) : filteredInvoices.length > 0 ? (
            filteredInvoices.map((invoice) => (
              <div key={invoice.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">
                    {invoice.clientName}
                  </p>
                  <p className="text-xs text-gray-500">
                    {invoice.invoiceNumber} • £{invoice.amount}
                  </p>
                  <p className="text-xs text-gray-400">
                    ID: {invoice.id}
                  </p>
                </div>
                <Button
                  onClick={() => sendInvoiceDirectly(invoice.id.toString())}
                  disabled={sending}
                  size="sm"
                  className="ml-3 flex-shrink-0"
                >
                  {sending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </Button>
              </div>
            ))
          ) : (
            <div className="text-center py-8">
              <Send className="w-8 h-8 mx-auto mb-2 text-gray-300" />
              <p className="text-sm text-gray-500">
                {searchTerm ? 'No invoices match your search' : 'No unpaid invoices found'}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Usage Tip */}
      <Card className="bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800">
        <CardContent className="pt-6">
          <div className="flex gap-3">
            <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-green-900 dark:text-green-100">
                Perfect for gigs!
              </p>
              <p className="text-xs text-green-700 dark:text-green-300 mt-1">
                Send invoices instantly when clients ask for immediate payment. Works great during or right after performances.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
        </TabsContent>

        {/* Create New Tab */}
        <TabsContent value="create" className="space-y-4 mt-6">
          {/* Auto-fill from Bookings */}
          {bookings.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Quick Fill from Recent Bookings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {bookings.slice(0, 3).map((booking) => (
                  <div 
                    key={booking.id} 
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                    onClick={() => fillFromBooking(booking)}
                  >
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center gap-2">
                        <User className="h-3 w-3 text-gray-400" />
                        <span className="text-xs text-gray-500 font-medium">Client:</span>
                        <span className="font-medium text-sm truncate">{booking.clientName}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-3 w-3 text-gray-400" />
                        <span className="text-xs text-gray-500 font-medium">Event:</span>
                        <span className="text-xs text-gray-600">{booking.eventType} • £{booking.fee}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-3 w-3 text-gray-400" />
                        <span className="text-xs text-gray-500 font-medium">Date:</span>
                        <span className="text-xs text-gray-600">
                          {booking.eventDate ? new Date(booking.eventDate).toLocaleDateString() : 'Date TBC'}
                        </span>
                      </div>
                    </div>
                    <Button size="sm" variant="outline">
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Invoice Creation Form */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Create New Invoice
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="clientName"
                    render={({ field }) => (
                      <FormItem>
                        <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          <User className="h-4 w-4" />
                          Client Name
                        </label>
                        <FormControl>
                          <Input placeholder="Enter client name" {...field} />
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
                        <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          <Mail className="h-4 w-4" />
                          Client Email
                        </label>
                        <FormControl>
                          <Input placeholder="client@example.com" type="email" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="amount"
                      render={({ field }) => (
                        <FormItem>
                          <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            <PoundSterling className="h-4 w-4" />
                            Amount (£)
                          </label>
                          <FormControl>
                            <Input placeholder="500" type="number" {...field} />
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
                          <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            <Calendar className="h-4 w-4" />
                            Due Date
                          </label>
                          <FormControl>
                            <Input type="date" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="performanceDate"
                    render={({ field }) => (
                      <FormItem>
                        <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          <Calendar className="h-4 w-4" />
                          Performance Date (Optional)
                        </label>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          <FileText className="h-4 w-4" />
                          Description (Optional)
                        </label>
                        <FormControl>
                          <Textarea 
                            placeholder="e.g., Wedding performance at The Grand Hotel"
                            className="resize-none"
                            rows={3}
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button 
                    type="submit" 
                    disabled={creating || createInvoiceMutation.isPending}
                    className="w-full"
                    size="lg"
                  >
                    {creating || createInvoiceMutation.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Creating Invoice...
                      </>
                    ) : (
                      <>
                        <Plus className="w-4 h-4 mr-2" />
                        Create & Switch to Send
                      </>
                    )}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>

          {/* Mobile Tip */}
          <Card className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
            <CardContent className="pt-6">
              <div className="flex gap-3">
                <CheckCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                    Quick Creation
                  </p>
                  <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                    Fill essential details to create invoices on-the-go. Use bookings above for instant auto-fill!
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}