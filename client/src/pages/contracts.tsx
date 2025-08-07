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
import { Checkbox } from '@/components/ui/checkbox';
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
  CheckSquare,
  Square,
  Info
} from 'lucide-react';

interface Contract {
  id: number;
  contractNumber: string;
  clientName: string;
  clientEmail: string;
  clientPhone?: string;
  clientAddress?: string;
  eventDate: string;
  eventTime?: string;
  venue: string;
  venueAddress?: string;
  fee: string;
  deposit?: string;
  paymentInstructions?: string;
  equipmentRequirements?: string;
  specialRequirements?: string;
  terms?: string;
  status: 'draft' | 'sent' | 'signed' | 'completed';
  createdAt: string;
  signedAt?: string;
  cloudStorageUrl?: string;
  clientFillableFields?: string[];
}

const contractSchema = z.object({
  contractNumber: z.string().min(1, 'Contract number is required'),
  clientName: z.string().min(1, 'Client name is required'),
  clientEmail: z.string().email('Valid email is required'),
  clientPhone: z.string().optional(),
  clientAddress: z.string().optional(),
  eventDate: z.string().min(1, 'Event date is required'),
  eventTime: z.string().optional(),
  venue: z.string().min(1, 'Venue is required'),
  venueAddress: z.string().optional(),
  fee: z.string().min(1, 'Fee is required'),
  deposit: z.string().optional(),
  paymentInstructions: z.string().optional(),
  equipmentRequirements: z.string().optional(),
  specialRequirements: z.string().optional(),
  terms: z.string().optional()
});

type ContractForm = z.infer<typeof contractSchema>;

export default function Contracts() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingContract, setEditingContract] = useState<Contract | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedContracts, setSelectedContracts] = useState<number[]>([]);
  const [bulkActionLoading, setBulkActionLoading] = useState(false);
  const [contractToSend, setContractToSend] = useState<Contract | null>(null);
  const [customMessage, setCustomMessage] = useState('');
  const [customMessageDialog, setCustomMessageDialog] = useState(false);

  const { isDesktop } = useResponsive();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<ContractForm>({
    resolver: zodResolver(contractSchema),
    defaultValues: {
      contractNumber: '',
      clientName: '',
      clientEmail: '',
      clientPhone: '',
      clientAddress: '',
      eventDate: '',
      eventTime: '',
      venue: '',
      venueAddress: '',
      fee: '',
      deposit: '',
      paymentInstructions: '',
      equipmentRequirements: '',
      specialRequirements: '',
      terms: ''
    }
  });

  // Fetch contracts
  const { data: contracts = [], isLoading } = useQuery({
    queryKey: ['/api/contracts'],
    queryFn: async () => {
      const response = await apiRequest('/api/contracts');
      if (!response.ok) {
        throw new Error('Failed to fetch contracts');
      }
      return response.json();
    }
  });

  // Create contract mutation
  const createContractMutation = useMutation({
    mutationFn: async (data: ContractForm) => {
      const response = await apiRequest('/api/contracts', {
        method: 'POST',
        body: JSON.stringify(data)
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create contract');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/contracts'] });
      toast({
        title: 'Contract Created',
        description: 'The contract has been created successfully.'
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

  // Update contract mutation  
  const updateContractMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: ContractForm }) => {
      const response = await apiRequest(`/api/contracts/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data)
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update contract');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/contracts'] });
      toast({
        title: 'Contract Updated',
        description: 'The contract has been updated successfully.'
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

  // Send email mutation
  const sendEmailMutation = useMutation({
    mutationFn: async ({ contractId, customMessage }: { contractId: number; customMessage?: string }) => {
      const response = await apiRequest(`/api/contracts/${contractId}/send`, {
        method: 'POST',
        body: JSON.stringify({ customMessage })
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to send contract');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/contracts'] });
      toast({
        title: 'Contract Sent',
        description: 'The contract has been sent successfully.'
      });
      setCustomMessageDialog(false);
      setContractToSend(null);
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

  // Delete contract mutation
  const deleteContractMutation = useMutation({
    mutationFn: async (contractId: number) => {
      const response = await apiRequest(`/api/contracts/${contractId}`, {
        method: 'DELETE'
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete contract');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/contracts'] });
      toast({
        title: 'Contract Deleted',
        description: 'The contract has been deleted successfully.'
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

  // Filter contracts
  const filteredContracts = useMemo(() => {
    return contracts.filter((contract: Contract) => {
      const matchesSearch = searchQuery === '' || 
        contract.contractNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        contract.clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        contract.venue.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesStatus = statusFilter === 'all' || contract.status === statusFilter;
      
      return matchesSearch && matchesStatus;
    });
  }, [contracts, searchQuery, statusFilter]);

  // Handle form submission
  const handleSubmit = async (data: ContractForm) => {
    try {
      if (editingContract) {
        await updateContractMutation.mutateAsync({ id: editingContract.id, data });
      } else {
        // Generate contract number if not provided
        if (!data.contractNumber) {
          const now = new Date();
          data.contractNumber = `CT-${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(contracts.length + 1).padStart(3, '0')}`;
        }
        await createContractMutation.mutateAsync(data);
      }
    } catch (error) {
      console.error('Form submission error:', error);
    }
  };

  // Handle dialog close
  const handleDialogClose = (reset: boolean = false) => {
    setIsDialogOpen(false);
    setEditingContract(null);
    if (reset) {
      form.reset();
    }
  };

  // Handle edit contract
  const handleEditContract = (contract: Contract) => {
    setEditingContract(contract);
    form.reset({
      contractNumber: contract.contractNumber,
      clientName: contract.clientName,
      clientEmail: contract.clientEmail,
      clientPhone: contract.clientPhone || '',
      clientAddress: contract.clientAddress || '',
      eventDate: contract.eventDate,
      eventTime: contract.eventTime || '',
      venue: contract.venue,
      venueAddress: contract.venueAddress || '',
      fee: contract.fee,
      deposit: contract.deposit || '',
      paymentInstructions: contract.paymentInstructions || '',
      equipmentRequirements: contract.equipmentRequirements || '',
      specialRequirements: contract.specialRequirements || '',
      terms: contract.terms || ''
    });
    setIsDialogOpen(true);
  };

  // Handle send contract
  const handleSendContract = (contract: Contract) => {
    setContractToSend(contract);
    setCustomMessage('');
    setCustomMessageDialog(true);
  };

  // Handle confirm send contract
  const handleConfirmSendContract = () => {
    if (contractToSend) {
      sendEmailMutation.mutate({
        contractId: contractToSend.id,
        customMessage: customMessage.trim() || undefined
      });
    }
  };

  // Handle download contract
  const handleDownloadContract = async (contract: Contract) => {
    try {
      const response = await apiRequest(`/api/contracts/${contract.id}/download`, {
        method: 'GET'
      });
      
      if (!response.ok) {
        throw new Error('Failed to download contract');
      }
      
      // Get the blob and create download link
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${contract.contractNumber}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast({
        title: 'Download Started',
        description: 'The contract PDF is being downloaded.'
      });
    } catch (error) {
      toast({
        title: 'Download Failed',
        description: error instanceof Error ? error.message : 'Failed to download contract',
        variant: 'destructive'
      });
    }
  };

  // Handle delete contract
  const handleDeleteContract = (contract: Contract) => {
    if (window.confirm(`Are you sure you want to delete contract ${contract.contractNumber}?`)) {
      deleteContractMutation.mutate(contract.id);
    }
  };

  // Handle select contract
  const handleSelectContract = (contractId: number) => {
    setSelectedContracts(prev => 
      prev.includes(contractId) 
        ? prev.filter(id => id !== contractId)
        : [...prev, contractId]
    );
  };

  // Handle select all
  const handleSelectAll = () => {
    if (selectedContracts.length === filteredContracts.length) {
      setSelectedContracts([]);
    } else {
      setSelectedContracts(filteredContracts.map((contract: Contract) => contract.id));
    }
  };

  // Handle bulk delete
  const handleBulkDelete = async () => {
    if (!selectedContracts.length) return;
    
    const confirmed = window.confirm(`Are you sure you want to delete ${selectedContracts.length} contract(s)?`);
    if (!confirmed) return;
    
    setBulkActionLoading(true);
    try {
      await Promise.all(
        selectedContracts.map(id => 
          deleteContractMutation.mutateAsync(id)
        )
      );
      setSelectedContracts([]);
    } catch (error) {
      console.error('Bulk delete error:', error);
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
      case 'signed': return 'default';
      case 'sent': return 'secondary';
      case 'completed': return 'default';
      default: return 'outline';
    }
  };

  // Get status icon
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'signed': return <CheckCircle2 className="w-4 h-4" />;
      case 'sent': return <Mail className="w-4 h-4" />;
      case 'completed': return <CheckCircle2 className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  const ContractsContent = () => (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Contracts</h1>
          <p className="text-gray-600 dark:text-gray-300 mt-2">
            Manage your performance contracts and digital signatures
          </p>
        </div>
        <Button onClick={() => setIsDialogOpen(true)} className="bg-primary hover:bg-primary/90">
          <Plus className="w-4 h-4 mr-2" />
          New Contract
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Total</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {contracts.length}
                </p>
              </div>
              <FileText className="w-8 h-8 text-gray-600 dark:text-gray-400" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Sent</p>
                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {contracts.filter((c: Contract) => c.status === 'sent').length}
                </p>
              </div>
              <Send className="w-8 h-8 text-blue-600 dark:text-blue-400" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Signed</p>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {contracts.filter((c: Contract) => c.status === 'signed').length}
                </p>
              </div>
              <CheckCircle2 className="w-8 h-8 text-green-600 dark:text-green-400" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Drafts</p>
                <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                  {contracts.filter((c: Contract) => c.status === 'draft').length}
                </p>
              </div>
              <Clock className="w-8 h-8 text-yellow-600 dark:text-yellow-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Contract Form Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={(open) => !open && handleDialogClose()}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingContract ? 'Edit Contract' : 'Create New Contract'}
            </DialogTitle>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
              {/* Essential Fields Section */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                  Essential Contract Information
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="contractNumber"
                    render={({ field }) => (
                      <FormItem className="space-y-2">
                        <FormLabel className="text-red-600 font-medium">Contract Number *</FormLabel>
                        <FormControl>
                          <Input placeholder="CT-2024-01-001" {...field} value={field.value || ""} />
                        </FormControl>
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
                  <FormField
                    control={form.control}
                    name="eventTime"
                    render={({ field }) => (
                      <FormItem className="space-y-2">
                        <FormLabel className="text-red-600 font-medium">Event Time</FormLabel>
                        <FormControl>
                          <Input placeholder="7:30 PM - 11:00 PM" {...field} value={field.value || ""} />
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
                          <Input placeholder="The Grand Hotel" {...field} value={field.value || ""} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="fee"
                    render={({ field }) => (
                      <FormItem className="space-y-2">
                        <FormLabel className="text-red-600 font-medium">Fee (£) *</FormLabel>
                        <FormControl>
                          <Input type="number" placeholder="500" {...field} value={field.value || ""} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold text-gray-900 text-lg">
                          {contract.contractNumber}
                        </h3>
                        <Badge variant={getStatusBadgeVariant(contract.status)} className="capitalize">
                          {getStatusIcon(contract.status)}
                          <span className="ml-1">{contract.status}</span>
                        </Badge>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-gray-600">
                        <div className="flex items-center gap-2">
                          <Mail className="w-4 h-4" />
                          <span className="font-medium">{contract.clientName}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <PoundSterling className="w-4 h-4" />
                          <span>£{contract.fee}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4" />
                          <span>{formatDate(contract.eventDate)}</span>
                          {contract.eventTime && <span>• {contract.eventTime}</span>}
                        </div>
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4" />
                          <span className="truncate">{contract.venue}</span>
                        </div>
                      </div>
                      
                      {contract.signedAt && (
                        <div className="mt-2 text-sm text-green-600">
                          <CheckCircle2 className="w-4 h-4 inline mr-1" />
                          Signed on {formatDate(contract.signedAt)}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 lg:flex-col lg:items-end">
                    <div className="text-xs text-gray-500 mb-2 hidden lg:block">
                      Created {formatDate(contract.createdAt)}
                    </div>
                    <div className="flex gap-2">
                      {contract.status === "draft" && (
                        <>
                          <Button 
                            size="sm" 
                            variant="outline" 
                            className="text-xs whitespace-nowrap text-gray-600 hover:text-gray-700"
                            onClick={() => handleEditContract(contract)}
                          >
                            <Edit2 className="w-3 h-3 mr-1" />
                            Edit
                          </Button>
                          <Button 
                            size="sm" 
                            className="text-xs whitespace-nowrap bg-blue-600 hover:bg-blue-700"
                            onClick={() => handleSendContract(contract)}
                          >
                            <Send className="w-3 h-3 mr-1" />
                            Send
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
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </>
      )}
    </div>

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
              className="bg-blue-600 hover:bg-blue-700"
            >
              {sendEmailMutation.isPending ? "Sending..." : "Send Contract"}
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
            <ContractsContent />
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
        <ContractsContent />
      </div>

      <MobileNav />
    </div>
  );
}