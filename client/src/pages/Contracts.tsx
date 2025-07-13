import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { FileText, Plus, Search, Filter, Download, Edit, Trash2, Eye } from 'lucide-react';

const fetchContracts = async () => {
  const response = await fetch('/api/contracts', {
    credentials: 'include',
  });
  if (!response.ok) throw new Error('Failed to fetch contracts');
  return response.json();
};

const createContract = async (contract: any) => {
  const response = await fetch('/api/contracts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(contract),
  });
  if (!response.ok) throw new Error('Failed to create contract');
  return response.json();
};

const updateContract = async ({ id, ...updates }: any) => {
  const response = await fetch(`/api/contracts/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(updates),
  });
  if (!response.ok) throw new Error('Failed to update contract');
  return response.json();
};

const Contracts = () => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [formData, setFormData] = useState({
    enquiryId: '',
    clientName: '',
    clientEmail: '',
    eventDate: '',
    eventTime: '',
    venue: '',
    venueAddress: '',
    fee: '',
    deposit: '',
    depositDue: '',
    balanceDue: '',
    cancellationTerms: '',
    setupTime: '',
    performanceTime: '',
    packupTime: '',
    additionalTerms: ''
  });

  const queryClient = useQueryClient();

  const { data: contracts = [], isLoading, error } = useQuery({
    queryKey: ['contracts'],
    queryFn: fetchContracts,
  });

  const createMutation = useMutation({
    mutationFn: createContract,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
      setShowAddForm(false);
      setFormData({
        enquiryId: '',
        clientName: '',
        clientEmail: '',
        eventDate: '',
        eventTime: '',
        venue: '',
        venueAddress: '',
        fee: '',
        deposit: '',
        depositDue: '',
        balanceDue: '',
        cancellationTerms: '',
        setupTime: '',
        performanceTime: '',
        packupTime: '',
        additionalTerms: ''
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: updateContract,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate(formData);
  };

  const handleStatusChange = (id: string, status: string) => {
    updateMutation.mutate({ id, status });
  };

  const filteredContracts = contracts.filter((contract: any) => {
    const matchesSearch = contract.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         contract.contractNumber.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || contract.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const statusOptions = [
    { value: 'draft', label: 'Draft', color: 'status-draft' },
    { value: 'sent', label: 'Sent', color: 'status-sent' },
    { value: 'signed', label: 'Signed', color: 'status-signed' },
    { value: 'cancelled', label: 'Cancelled', color: 'status-cancelled' },
  ];

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-foreground">Contracts</h1>
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-card rounded-lg p-6 shadow-sm animate-pulse">
              <div className="h-4 bg-muted rounded w-1/4 mb-2"></div>
              <div className="h-6 bg-muted rounded w-1/2 mb-4"></div>
              <div className="h-4 bg-muted rounded w-3/4"></div>
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
            <FileText className="h-8 w-8 text-primary" />
            Contracts
          </h1>
          <p className="text-muted-foreground mt-2">
            Manage booking contracts and agreements
          </p>
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          className="bg-primary text-primary-foreground px-4 py-2 rounded-md flex items-center gap-2 hover:bg-primary/90 transition-colors"
        >
          <Plus className="h-4 w-4" />
          New Contract
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 bg-card p-4 rounded-lg shadow-sm">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search contracts..."
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

      {/* Add Contract Form */}
      {showAddForm && (
        <div className="bg-card rounded-lg p-6 shadow-sm border">
          <h2 className="text-xl font-semibold text-foreground mb-4">Create New Contract</h2>
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
              <label className="block text-sm font-medium text-foreground mb-1">Event Date *</label>
              <input
                type="date"
                required
                value={formData.eventDate}
                onChange={(e) => setFormData({...formData, eventDate: e.target.value})}
                className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Event Time</label>
              <input
                type="time"
                value={formData.eventTime}
                onChange={(e) => setFormData({...formData, eventTime: e.target.value})}
                className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Venue</label>
              <input
                type="text"
                value={formData.venue}
                onChange={(e) => setFormData({...formData, venue: e.target.value})}
                className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Venue Address</label>
              <input
                type="text"
                value={formData.venueAddress}
                onChange={(e) => setFormData({...formData, venueAddress: e.target.value})}
                className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Total Fee (£) *</label>
              <input
                type="number"
                step="0.01"
                required
                value={formData.fee}
                onChange={(e) => setFormData({...formData, fee: e.target.value})}
                className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Deposit (£)</label>
              <input
                type="number"
                step="0.01"
                value={formData.deposit}
                onChange={(e) => setFormData({...formData, deposit: e.target.value})}
                className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Deposit Due Date</label>
              <input
                type="date"
                value={formData.depositDue}
                onChange={(e) => setFormData({...formData, depositDue: e.target.value})}
                className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Balance Due Date</label>
              <input
                type="date"
                value={formData.balanceDue}
                onChange={(e) => setFormData({...formData, balanceDue: e.target.value})}
                className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Setup Time</label>
              <input
                type="text"
                value={formData.setupTime}
                onChange={(e) => setFormData({...formData, setupTime: e.target.value})}
                placeholder="e.g., 1 hour before"
                className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Performance Time</label>
              <input
                type="text"
                value={formData.performanceTime}
                onChange={(e) => setFormData({...formData, performanceTime: e.target.value})}
                placeholder="e.g., 18:00 - 22:00"
                className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-foreground mb-1">Additional Terms</label>
              <textarea
                value={formData.additionalTerms}
                onChange={(e) => setFormData({...formData, additionalTerms: e.target.value})}
                rows={3}
                placeholder="Special terms, conditions, or requirements"
                className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div className="md:col-span-2 flex gap-2">
              <button
                type="submit"
                disabled={createMutation.isPending}
                className="bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {createMutation.isPending ? 'Creating...' : 'Create Contract'}
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

      {/* Contracts List */}
      <div className="space-y-4">
        {filteredContracts.length === 0 ? (
          <div className="text-center py-12 bg-card rounded-lg">
            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">No contracts found</h3>
            <p className="text-muted-foreground">
              {searchTerm || statusFilter !== 'all' 
                ? 'Try adjusting your search or filter criteria'
                : 'Create your first contract to get started'
              }
            </p>
          </div>
        ) : (
          filteredContracts.map((contract: any) => (
            <div key={contract.id} className="bg-card rounded-lg p-6 shadow-sm border hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold text-foreground">{contract.contractNumber}</h3>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium status-${contract.status}`}>
                      {contract.status}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                    <div className="text-muted-foreground">
                      <span className="font-medium">Client:</span> {contract.clientName}
                    </div>
                    <div className="text-muted-foreground">
                      <span className="font-medium">Event Date:</span> {new Date(contract.eventDate).toLocaleDateString()}
                    </div>
                    <div className="text-muted-foreground">
                      <span className="font-medium">Fee:</span> £{contract.fee}
                    </div>
                    {contract.venue && (
                      <div className="text-muted-foreground">
                        <span className="font-medium">Venue:</span> {contract.venue}
                      </div>
                    )}
                    {contract.deposit && (
                      <div className="text-muted-foreground">
                        <span className="font-medium">Deposit:</span> £{contract.deposit}
                      </div>
                    )}
                    <div className="text-muted-foreground">
                      <span className="font-medium">Created:</span> {new Date(contract.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 ml-4">
                  <select
                    value={contract.status}
                    onChange={(e) => handleStatusChange(contract.id, e.target.value)}
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

export default Contracts;