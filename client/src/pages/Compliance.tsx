import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ShieldCheck, Plus, Search, Filter, AlertTriangle, Calendar, FileText, Upload } from 'lucide-react';

const fetchCompliance = async () => {
  const response = await fetch('/api/compliance');
  if (!response.ok) throw new Error('Failed to fetch compliance');
  return response.json();
};

const createCompliance = async (compliance: any) => {
  const response = await fetch('/api/compliance', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(compliance),
  });
  if (!response.ok) throw new Error('Failed to create compliance');
  return response.json();
};

const updateCompliance = async ({ id, ...updates }: any) => {
  const response = await fetch(`/api/compliance/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  });
  if (!response.ok) throw new Error('Failed to update compliance');
  return response.json();
};

const Compliance = () => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [formData, setFormData] = useState({
    type: '',
    provider: '',
    policyNumber: '',
    expiryDate: '',
    documentUrl: ''
  });

  const queryClient = useQueryClient();

  const { data: compliance = [], isLoading, error } = useQuery({
    queryKey: ['compliance'],
    queryFn: fetchCompliance,
  });

  const createMutation = useMutation({
    mutationFn: createCompliance,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['compliance'] });
      setShowAddForm(false);
      setFormData({
        type: '',
        provider: '',
        policyNumber: '',
        expiryDate: '',
        documentUrl: ''
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: updateCompliance,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['compliance'] });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate(formData);
  };

  const handleStatusChange = (id: string, status: string) => {
    updateMutation.mutate({ id, status });
  };

  const filteredCompliance = compliance.filter((item: any) => {
    const matchesSearch = item.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (item.provider && item.provider.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const statusOptions = [
    { value: 'active', label: 'Active', color: 'status-confirmed' },
    { value: 'expired', label: 'Expired', color: 'status-overdue' },
    { value: 'cancelled', label: 'Cancelled', color: 'status-cancelled' },
  ];

  const complianceTypes = [
    { value: 'public_liability', label: 'Public Liability Insurance' },
    { value: 'pat_testing', label: 'PAT Testing Certificate' },
    { value: 'dbs_check', label: 'DBS Check' },
    { value: 'music_license', label: 'Music Performance License' },
    { value: 'business_insurance', label: 'Business Insurance' },
    { value: 'equipment_insurance', label: 'Equipment Insurance' },
    { value: 'other', label: 'Other' },
  ];

  // Check for items expiring soon (within 30 days)
  const today = new Date();
  const thirtyDaysFromNow = new Date();
  thirtyDaysFromNow.setDate(today.getDate() + 30);

  const expiringSoon = compliance.filter((item: any) => {
    const expiryDate = new Date(item.expiryDate);
    return expiryDate <= thirtyDaysFromNow && expiryDate >= today && item.status === 'active';
  });

  const expired = compliance.filter((item: any) => {
    const expiryDate = new Date(item.expiryDate);
    return expiryDate < today && item.status === 'active';
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-foreground">Compliance</h1>
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
            <ShieldCheck className="h-8 w-8 text-primary" />
            Compliance
          </h1>
          <p className="text-muted-foreground mt-2">
            Track insurance, certifications, and legal requirements
          </p>
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          className="bg-primary text-primary-foreground px-4 py-2 rounded-md flex items-center gap-2 hover:bg-primary/90 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Add Compliance Item
        </button>
      </div>

      {/* Alert Summary */}
      {(expired.length > 0 || expiringSoon.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {expired.length > 0 && (
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="h-5 w-5 text-destructive" />
                <h3 className="font-semibold text-destructive">Expired Items</h3>
              </div>
              <p className="text-sm text-destructive/80">
                You have {expired.length} expired compliance item{expired.length > 1 ? 's' : ''} that need immediate attention.
              </p>
            </div>
          )}
          {expiringSoon.length > 0 && (
            <div className="bg-warning/10 border border-warning/20 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="h-5 w-5 text-warning" />
                <h3 className="font-semibold text-warning">Expiring Soon</h3>
              </div>
              <p className="text-sm text-warning/80">
                {expiringSoon.length} item{expiringSoon.length > 1 ? 's' : ''} expiring within 30 days.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-card rounded-lg p-6 shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Active Items</p>
              <p className="text-2xl font-bold text-green-600">
                {compliance.filter((item: any) => item.status === 'active').length}
              </p>
            </div>
            <div className="p-3 rounded-full bg-green-50 dark:bg-green-900/20">
              <ShieldCheck className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </div>
        <div className="bg-card rounded-lg p-6 shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Expiring Soon</p>
              <p className="text-2xl font-bold text-orange-600">{expiringSoon.length}</p>
            </div>
            <div className="p-3 rounded-full bg-orange-50 dark:bg-orange-900/20">
              <Calendar className="h-6 w-6 text-orange-600" />
            </div>
          </div>
        </div>
        <div className="bg-card rounded-lg p-6 shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Expired</p>
              <p className="text-2xl font-bold text-red-600">{expired.length}</p>
            </div>
            <div className="p-3 rounded-full bg-red-50 dark:bg-red-900/20">
              <AlertTriangle className="h-6 w-6 text-red-600" />
            </div>
          </div>
        </div>
        <div className="bg-card rounded-lg p-6 shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total Items</p>
              <p className="text-2xl font-bold text-foreground">{compliance.length}</p>
            </div>
            <div className="p-3 rounded-full bg-blue-50 dark:bg-blue-900/20">
              <FileText className="h-6 w-6 text-blue-600" />
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
              placeholder="Search compliance items..."
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

      {/* Add Compliance Form */}
      {showAddForm && (
        <div className="bg-card rounded-lg p-6 shadow-sm border">
          <h2 className="text-xl font-semibold text-foreground mb-4">Add Compliance Item</h2>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Type *</label>
              <select
                required
                value={formData.type}
                onChange={(e) => setFormData({...formData, type: e.target.value})}
                className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">Select compliance type</option>
                {complianceTypes.map(type => (
                  <option key={type.value} value={type.value}>{type.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Provider/Issuer</label>
              <input
                type="text"
                value={formData.provider}
                onChange={(e) => setFormData({...formData, provider: e.target.value})}
                className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Policy/Certificate Number</label>
              <input
                type="text"
                value={formData.policyNumber}
                onChange={(e) => setFormData({...formData, policyNumber: e.target.value})}
                className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Expiry Date *</label>
              <input
                type="date"
                required
                value={formData.expiryDate}
                onChange={(e) => setFormData({...formData, expiryDate: e.target.value})}
                className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-foreground mb-1">Document URL</label>
              <input
                type="url"
                value={formData.documentUrl}
                onChange={(e) => setFormData({...formData, documentUrl: e.target.value})}
                placeholder="https://example.com/document.pdf"
                className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div className="md:col-span-2 flex gap-2">
              <button
                type="submit"
                disabled={createMutation.isPending}
                className="bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {createMutation.isPending ? 'Adding...' : 'Add Compliance Item'}
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

      {/* Compliance List */}
      <div className="space-y-4">
        {filteredCompliance.length === 0 ? (
          <div className="text-center py-12 bg-card rounded-lg">
            <ShieldCheck className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">No compliance items found</h3>
            <p className="text-muted-foreground">
              {searchTerm || statusFilter !== 'all' 
                ? 'Try adjusting your search or filter criteria'
                : 'Add your first compliance item to get started'
              }
            </p>
          </div>
        ) : (
          filteredCompliance.map((item: any) => {
            const expiryDate = new Date(item.expiryDate);
            const isExpired = expiryDate < today;
            const isExpiringSoon = expiryDate <= thirtyDaysFromNow && expiryDate >= today;
            
            return (
              <div key={item.id} className={`bg-card rounded-lg p-6 shadow-sm border hover:shadow-md transition-shadow ${
                isExpired ? 'border-destructive/50' : isExpiringSoon ? 'border-warning/50' : ''
              }`}>
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-foreground">
                        {complianceTypes.find(t => t.value === item.type)?.label || item.type}
                      </h3>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium status-${item.status}`}>
                        {item.status}
                      </span>
                      {isExpired && (
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
                          Expired
                        </span>
                      )}
                      {isExpiringSoon && !isExpired && (
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200">
                          Expiring Soon
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                      {item.provider && (
                        <div className="text-muted-foreground">
                          <span className="font-medium">Provider:</span> {item.provider}
                        </div>
                      )}
                      {item.policyNumber && (
                        <div className="text-muted-foreground">
                          <span className="font-medium">Policy #:</span> {item.policyNumber}
                        </div>
                      )}
                      <div className="text-muted-foreground">
                        <span className="font-medium">Expires:</span> {expiryDate.toLocaleDateString()}
                      </div>
                      <div className="text-muted-foreground">
                        <span className="font-medium">Added:</span> {new Date(item.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <select
                      value={item.status}
                      onChange={(e) => handleStatusChange(item.id, e.target.value)}
                      className="text-sm px-2 py-1 border border-input rounded bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    >
                      {statusOptions.map(status => (
                        <option key={status.value} value={status.value}>{status.label}</option>
                      ))}
                    </select>
                    {item.documentUrl && (
                      <a
                        href={item.documentUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-md transition-colors"
                        title="View Document"
                      >
                        <FileText className="h-4 w-4" />
                      </a>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default Compliance;