import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Receipt, Plus, Search, Filter, Download, DollarSign, Calendar } from 'lucide-react';

const fetchInvoices = async () => {
  const response = await fetch('/api/invoices');
  if (!response.ok) throw new Error('Failed to fetch invoices');
  return response.json();
};

const createInvoice = async (invoice: any) => {
  const response = await fetch('/api/invoices', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(invoice),
  });
  if (!response.ok) throw new Error('Failed to create invoice');
  return response.json();
};

const updateInvoice = async ({ id, ...updates }: any) => {
  const response = await fetch(`/api/invoices/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  });
  if (!response.ok) throw new Error('Failed to update invoice');
  return response.json();
};

const Invoices = () => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [formData, setFormData] = useState({
    contractId: '',
    clientName: '',
    clientEmail: '',
    amount: '',
    vatAmount: '0',
    dueDate: '',
    description: '',
    lineItems: ['']
  });

  const queryClient = useQueryClient();

  const { data: invoices = [], isLoading, error } = useQuery({
    queryKey: ['invoices'],
    queryFn: fetchInvoices,
  });

  const createMutation = useMutation({
    mutationFn: createInvoice,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      setShowAddForm(false);
      setFormData({
        contractId: '',
        clientName: '',
        clientEmail: '',
        amount: '',
        vatAmount: '0',
        dueDate: '',
        description: '',
        lineItems: ['']
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: updateInvoice,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(formData.amount);
    const vatAmount = parseFloat(formData.vatAmount || '0');
    const totalAmount = amount + vatAmount;
    
    createMutation.mutate({
      ...formData,
      amount,
      vatAmount,
      totalAmount,
      lineItems: formData.lineItems.filter(item => item.trim() !== '')
    });
  };

  const handleStatusChange = (id: string, status: string) => {
    const updates: any = { id, status };
    if (status === 'paid') {
      updates.paidAt = new Date().toISOString();
      updates.paidAmount = invoices.find((inv: any) => inv.id === id)?.totalAmount;
    }
    updateMutation.mutate(updates);
  };

  const filteredInvoices = invoices.filter((invoice: any) => {
    const matchesSearch = invoice.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         invoice.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || invoice.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const statusOptions = [
    { value: 'draft', label: 'Draft', color: 'status-draft' },
    { value: 'sent', label: 'Sent', color: 'status-sent' },
    { value: 'paid', label: 'Paid', color: 'status-paid' },
    { value: 'overdue', label: 'Overdue', color: 'status-overdue' },
    { value: 'cancelled', label: 'Cancelled', color: 'status-cancelled' },
  ];

  // Calculate totals
  const totalOutstanding = filteredInvoices
    .filter((inv: any) => inv.status === 'sent' || inv.status === 'overdue')
    .reduce((sum: number, inv: any) => sum + parseFloat(inv.totalAmount || 0), 0);

  const totalPaid = filteredInvoices
    .filter((inv: any) => inv.status === 'paid')
    .reduce((sum: number, inv: any) => sum + parseFloat(inv.totalAmount || 0), 0);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-foreground">Invoices</h1>
        <div className="animate-pulse space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-card rounded-lg p-6 shadow-sm">
              <div className="h-4 bg-muted rounded w-1/4 mb-2"></div>
              <div className="h-6 bg-muted rounded w-1/2"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
            <Receipt className="h-8 w-8 text-primary" />
            Invoices
          </h1>
          <p className="text-muted-foreground mt-2">
            Manage invoices and track payments
          </p>
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          className="bg-primary text-primary-foreground px-4 py-2 rounded-md flex items-center gap-2 hover:bg-primary/90 transition-colors"
        >
          <Plus className="h-4 w-4" />
          New Invoice
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-card rounded-lg p-6 shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total Outstanding</p>
              <p className="text-2xl font-bold text-orange-600">£{totalOutstanding.toFixed(2)}</p>
            </div>
            <div className="p-3 rounded-full bg-orange-50 dark:bg-orange-900/20">
              <DollarSign className="h-6 w-6 text-orange-600" />
            </div>
          </div>
        </div>
        <div className="bg-card rounded-lg p-6 shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total Paid</p>
              <p className="text-2xl font-bold text-green-600">£{totalPaid.toFixed(2)}</p>
            </div>
            <div className="p-3 rounded-full bg-green-50 dark:bg-green-900/20">
              <DollarSign className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </div>
        <div className="bg-card rounded-lg p-6 shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total Invoices</p>
              <p className="text-2xl font-bold text-foreground">{filteredInvoices.length}</p>
            </div>
            <div className="p-3 rounded-full bg-blue-50 dark:bg-blue-900/20">
              <Receipt className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 bg-card p-4 rounded-lg shadow-sm">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search invoices..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-input rounded-md bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-input rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="all">All Status</option>
            {statusOptions.map(status => (
              <option key={status.value} value={status.value}>{status.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Add Invoice Form */}
      {showAddForm && (
        <div className="bg-card rounded-lg p-6 shadow-sm border">
          <h2 className="text-xl font-semibold text-foreground mb-4">Create New Invoice</h2>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Client Name *</label>
              <input
                type="text"
                required
                value={formData.clientName}
                onChange={(e) => setFormData({...formData, clientName: e.target.value})}
                className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Client Email *</label>
              <input
                type="email"
                required
                value={formData.clientEmail}
                onChange={(e) => setFormData({...formData, clientEmail: e.target.value})}
                className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Amount (£) *</label>
              <input
                type="number"
                step="0.01"
                required
                value={formData.amount}
                onChange={(e) => setFormData({...formData, amount: e.target.value})}
                className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">VAT Amount (£)</label>
              <input
                type="number"
                step="0.01"
                value={formData.vatAmount}
                onChange={(e) => setFormData({...formData, vatAmount: e.target.value})}
                className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Due Date *</label>
              <input
                type="date"
                required
                value={formData.dueDate}
                onChange={(e) => setFormData({...formData, dueDate: e.target.value})}
                className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Total Amount</label>
              <input
                type="text"
                disabled
                value={`£${(parseFloat(formData.amount || '0') + parseFloat(formData.vatAmount || '0')).toFixed(2)}`}
                className="w-full px-3 py-2 border border-input rounded-md bg-muted text-muted-foreground"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-foreground mb-1">Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                rows={2}
                placeholder="Invoice description"
                className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div className="md:col-span-2 flex gap-2">
              <button
                type="submit"
                disabled={createMutation.isPending}
                className="bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {createMutation.isPending ? 'Creating...' : 'Create Invoice'}
              </button>
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="bg-muted text-muted-foreground px-4 py-2 rounded-md hover:bg-muted/80 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Invoices List */}
      <div className="space-y-4">
        {filteredInvoices.length === 0 ? (
          <div className="text-center py-12 bg-card rounded-lg">
            <Receipt className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">No invoices found</h3>
            <p className="text-muted-foreground">
              {searchTerm || statusFilter !== 'all' 
                ? 'Try adjusting your search or filter criteria'
                : 'Create your first invoice to get started'
              }
            </p>
          </div>
        ) : (
          filteredInvoices.map((invoice: any) => (
            <div key={invoice.id} className="bg-card rounded-lg p-6 shadow-sm border hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold text-foreground">{invoice.invoiceNumber}</h3>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium status-${invoice.status}`}>
                      {invoice.status}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                    <div className="text-muted-foreground">
                      <span className="font-medium">Client:</span> {invoice.clientName}
                    </div>
                    <div className="text-muted-foreground">
                      <span className="font-medium">Amount:</span> £{invoice.totalAmount}
                    </div>
                    <div className="text-muted-foreground">
                      <span className="font-medium">Due:</span> {new Date(invoice.dueDate).toLocaleDateString()}
                    </div>
                    <div className="text-muted-foreground">
                      <span className="font-medium">Created:</span> {new Date(invoice.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                  {invoice.description && (
                    <p className="text-muted-foreground mt-3 text-sm">{invoice.description}</p>
                  )}
                </div>
                <div className="flex items-center gap-2 ml-4">
                  <select
                    value={invoice.status}
                    onChange={(e) => handleStatusChange(invoice.id, e.target.value)}
                    className="text-sm px-2 py-1 border border-input rounded bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    {statusOptions.map(status => (
                      <option key={status.value} value={status.value}>{status.label}</option>
                    ))}
                  </select>
                  <button
                    className="p-2 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-md transition-colors"
                    title="Download PDF"
                  >
                    <Download className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default Invoices;