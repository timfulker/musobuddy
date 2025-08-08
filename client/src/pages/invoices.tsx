import { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import Sidebar from '@/components/sidebar';
import MobileNav from '@/components/mobile-nav';
import { useResponsive } from '@/hooks/useResponsive';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { 
  FileText, 
  Plus, 
  Send, 
  Download, 
  Edit2, 
  Trash2, 
  Search, 
  Filter,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Calendar,
  MapPin,
  PoundSterling,
  Mail,
  Eye,
  Archive,
  FileDown,
  DollarSign
} from 'lucide-react';

interface Invoice {
  id: number;
  invoiceNumber: string;
  clientName: string;
  clientEmail: string;
  ccEmail?: string;
  clientAddress?: string;
  venueAddress?: string;
  amount: string;
  dueDate: string;
  performanceDate?: string;
  description?: string;
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'archived';
  createdAt: string;
  sentAt?: string;
  paidAt?: string;
  cloudStorageUrl?: string;
}

const invoiceSchema = z.object({
  invoiceNumber: z.string().min(1, 'Invoice number is required'),
  clientName: z.string().min(1, 'Client name is required'),
  clientEmail: z.string().email('Valid email is required'),
  ccEmail: z.string().email('Valid CC email required').optional().or(z.literal('')),
  clientAddress: z.string().optional(),
  venueAddress: z.string().optional(),
  amount: z.string().min(1, 'Amount is required'),
  dueDate: z.string().min(1, 'Due date is required'),
  performanceDate: z.string().optional(),
  description: z.string().optional()
});

type InvoiceForm = z.infer<typeof invoiceSchema>;

export default function Invoices() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedInvoices, setSelectedInvoices] = useState<number[]>([]);
  const [bulkActionLoading, setBulkActionLoading] = useState(false);
  const [invoiceToSend, setInvoiceToSend] = useState<Invoice | null>(null);
  const [customMessage, setCustomMessage] = useState('');
  const [customMessageDialog, setCustomMessageDialog] = useState(false);

  const { isDesktop } = useResponsive();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<InvoiceForm>({
    resolver: zodResolver(invoiceSchema),
    defaultValues: {
      invoiceNumber: '',
      clientName: '',
      clientEmail: '',
      ccEmail: '',
      clientAddress: '',
      venueAddress: '',
      amount: '',
      dueDate: '',
      performanceDate: '',
      description: ''
    }
  });

  // Fetch invoices
  const { data: invoices = [], isLoading } = useQuery({
    queryKey: ['/api/invoices'],
    queryFn: async () => {
      const response = await apiRequest('/api/invoices');
      if (!response.ok) {
        throw new Error('Failed to fetch invoices');
      }
      return response.json();
    }
  });

  // Create invoice mutation
  const createInvoiceMutation = useMutation({
    mutationFn: async (data: InvoiceForm) => {
      const response = await apiRequest('/api/invoices', {
        method: 'POST',
        body: JSON.stringify(data)
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create invoice');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/invoices'] });
      toast({
        title: 'Invoice Created',
        description: 'The invoice has been created successfully.'
      });
      handleDialogClose(true);
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive'
      });
    }
  });

  // Update invoice mutation
  const updateInvoiceMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: InvoiceForm }) => {
      const response = await apiRequest(`/api/invoices/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data)
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update invoice');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/invoices'] });
      toast({
        title: 'Invoice Updated',
        description: 'The invoice has been updated successfully.'
      });
      handleDialogClose(true);
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive'
      });
    }
  });

  // Send invoice mutation
  const sendInvoiceMutation = useMutation({
    mutationFn: async ({ invoiceId, customMessage }: { invoiceId: number; customMessage?: string }) => {
      const response = await apiRequest(`/api/invoices/${invoiceId}/send`, {
        method: 'POST',
        body: JSON.stringify({ customMessage })
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to send invoice');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/invoices'] });
      toast({
        title: 'Invoice Sent',
        description: 'The invoice has been sent successfully.'
      });
      setCustomMessageDialog(false);
      setInvoiceToSend(null);
      setCustomMessage('');
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive'
      });
      setCustomMessageDialog(false);
    }
  });

  // Delete invoice mutation
  const deleteInvoiceMutation = useMutation({
    mutationFn: async (invoiceId: number) => {
      const response = await apiRequest(`/api/invoices/${invoiceId}`, {
        method: 'DELETE'
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete invoice');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/invoices'] });
      toast({
        title: 'Invoice Deleted',
        description: 'The invoice has been deleted successfully.'
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive'
      });
    }
  });

  // Filter invoices
  const filteredInvoices = useMemo(() => {
    return invoices.filter((invoice: Invoice) => {
      const matchesSearch = searchQuery === '' || 
        invoice.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        invoice.clientName.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesStatus = statusFilter === 'all' || invoice.status === statusFilter;
      
      return matchesSearch && matchesStatus;
    });
  }, [invoices, searchQuery, statusFilter]);

  // Handle form submission
  const handleSubmit = async (data: InvoiceForm) => {
    try {
      if (editingInvoice) {
        await updateInvoiceMutation.mutateAsync({ id: editingInvoice.id, data });
      } else {
        // Generate invoice number if not provided
        if (!data.invoiceNumber) {
          const now = new Date();
          data.invoiceNumber = `INV-${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(invoices.length + 1).padStart(3, '0')}`;
        }
        await createInvoiceMutation.mutateAsync(data);
      }
    } catch (error) {
      console.error('Form submission error:', error);
    }
  };

  // Handle dialog close
  const handleDialogClose = (reset: boolean = false) => {
    setIsDialogOpen(false);
    setEditingInvoice(null);
    if (reset) {
      form.reset();
    }
  };

  // Handle edit invoice
  const handleEditInvoice = (invoice: Invoice) => {
    setEditingInvoice(invoice);
    form.reset({
      invoiceNumber: invoice.invoiceNumber,
      clientName: invoice.clientName,
      clientEmail: invoice.clientEmail,
      ccEmail: invoice.ccEmail || '',
      clientAddress: invoice.clientAddress || '',
      venueAddress: invoice.venueAddress || '',
      amount: invoice.amount,
      dueDate: invoice.dueDate,
      performanceDate: invoice.performanceDate || '',
      description: invoice.description || ''
    });
    setIsDialogOpen(true);
  };

  // Handle send invoice
  const handleSendInvoice = (invoice: Invoice) => {
    setInvoiceToSend(invoice);
    setCustomMessage('');
    setCustomMessageDialog(true);
  };

  // Handle confirm send invoice
  const handleConfirmSendInvoice = () => {
    if (invoiceToSend) {
      sendInvoiceMutation.mutate({
        invoiceId: invoiceToSend.id,
        customMessage: customMessage.trim() || undefined
      });
    }
  };

  // Handle download invoice
  const handleDownloadInvoice = async (invoice: Invoice) => {
    try {
      const response = await apiRequest(`/api/invoices/${invoice.id}/download`, {
        method: 'GET'
      });
      
      if (!response.ok) {
        throw new Error('Failed to download invoice');
      }
      
      // Get the blob and create download link
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${invoice.invoiceNumber}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast({
        title: 'Download Started',
        description: 'The invoice PDF is being downloaded.'
      });
    } catch (error) {
      toast({
        title: 'Download Failed',
        description: error instanceof Error ? error.message : 'Failed to download invoice',
        variant: 'destructive'
      });
    }
  };

  // Handle delete invoice
  const handleDeleteInvoice = (invoice: Invoice) => {
    if (window.confirm(`Are you sure you want to delete invoice ${invoice.invoiceNumber}?`)) {
      deleteInvoiceMutation.mutate(invoice.id);
    }
  };

  // Handle mark as paid
  const handleMarkAsPaid = async (invoice: Invoice) => {
    try {
      const response = await apiRequest(`/api/invoices/${invoice.id}/mark-paid`, {
        method: 'PATCH'
      });
      
      if (!response.ok) {
        throw new Error('Failed to mark invoice as paid');
      }
      
      queryClient.invalidateQueries({ queryKey: ['/api/invoices'] });
      toast({
        title: 'Invoice Marked as Paid',
        description: 'The invoice has been marked as paid successfully.'
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to mark as paid',
        variant: 'destructive'
      });
    }
  };

  // Handle select invoice
  const handleSelectInvoice = (invoiceId: number, checked: boolean) => {
    if (checked) {
      setSelectedInvoices(prev => [...prev, invoiceId]);
    } else {
      setSelectedInvoices(prev => prev.filter(id => id !== invoiceId));
    }
  };

  // Handle select all
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedInvoices(filteredInvoices.map((invoice: Invoice) => invoice.id));
    } else {
      setSelectedInvoices([]);
    }
  };

  // Handle bulk action
  const handleBulkAction = async (action: 'download' | 'archive' | 'delete') => {
    if (!selectedInvoices.length) return;
    
    setBulkActionLoading(true);
    try {
      switch (action) {
        case 'download':
          for (const id of selectedInvoices) {
            const invoice = invoices.find((inv: Invoice) => inv.id === id);
            if (invoice) {
              await handleDownloadInvoice(invoice);
            }
          }
          break;
        case 'archive':
        case 'delete':
          const confirmed = window.confirm(`Are you sure you want to ${action} ${selectedInvoices.length} invoice(s)?`);
          if (confirmed) {
            await Promise.all(
              selectedInvoices.map(id => 
                action === 'delete' ? deleteInvoiceMutation.mutateAsync(id) : 
                apiRequest(`/api/invoices/${id}/archive`, { method: 'PATCH' })
              )
            );
            queryClient.invalidateQueries({ queryKey: ['/api/invoices'] });
          }
          break;
      }
      setSelectedInvoices([]);
    } catch (error) {
      console.error(`Bulk ${action} error:`, error);
    } finally {
      setBulkActionLoading(false);
    }
  };

  // Format date for display
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Get status badge variant
  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'paid': return 'default';
      case 'sent': return 'secondary';
      case 'overdue': return 'destructive';
      case 'archived': return 'outline';
      default: return 'outline';
    }
  };

  // Get status icon
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'paid': return <CheckCircle2 className="w-4 h-4" />;
      case 'sent': return <Mail className="w-4 h-4" />;
      case 'overdue': return <AlertTriangle className="w-4 h-4" />;
      case 'archived': return <Archive className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  const InvoicesContent = () => (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Invoices</h1>
          <p className="text-gray-600 dark:text-gray-300 mt-2">
            Manage your performance invoices and track payments
          </p>
        </div>
        <Button onClick={() => setIsDialogOpen(true)} className="bg-primary hover:bg-primary/90">
          <Plus className="w-4 h-4 mr-2" />
          New Invoice
        </Button>
      </div>

      {/* Invoice Form Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={(open) => !open && handleDialogClose()}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingInvoice ? 'Edit Invoice' : 'Create New Invoice'}
            </DialogTitle>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="invoiceNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Invoice Number *</FormLabel>
                      <FormControl>
                        <Input placeholder="INV-2024-01-001" {...field} />
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
                      <FormLabel>Client Name *</FormLabel>
                      <FormControl>
                        <Input placeholder="John Smith" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="clientEmail"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Client Email *</FormLabel>
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
                      <FormLabel>CC Email (optional)</FormLabel>
                      <FormControl>
                        <Input 
                          type="email" 
                          placeholder="manager@company.com" 
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Performance description, songs, duration, etc." 
                        {...field} 
                      />
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
                      <FormLabel>Amount (£) *</FormLabel>
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
                      <FormLabel>Due Date *</FormLabel>
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
                <Button type="button" variant="outline" onClick={() => handleDialogClose()}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createInvoiceMutation.isPending || updateInvoiceMutation.isPending}>
                  {createInvoiceMutation.isPending || updateInvoiceMutation.isPending ? "Creating..." : "Create Invoice"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={customMessageDialog} onOpenChange={setCustomMessageDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Send Invoice Email</DialogTitle>
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
  );

  if (isDesktop) {
    return (
      <div className="min-h-screen bg-background flex">
        <div className="w-64 bg-white dark:bg-slate-900 shadow-xl border-r border-gray-200 dark:border-slate-700 fixed left-0 top-0 h-full z-30">
          <Sidebar isOpen={true} onClose={() => {}} />
        </div>
        <div className="flex-1 ml-64 min-h-screen">
          <div className="p-6">
            <InvoicesContent />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden" 
          onClick={() => setSidebarOpen(false)}
        />
      )}
      
      <div className={`
        fixed left-0 top-0 h-full w-80 bg-white dark:bg-slate-900 shadow-xl z-50 
        transform transition-transform duration-300 ease-in-out md:hidden
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      </div>

      <div className="p-6">
        <InvoicesContent />
      </div>

      <MobileNav />
    </div>
  );
}
