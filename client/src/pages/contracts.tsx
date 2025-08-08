import React, { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Search, Filter, MoreHorizontal, FileText, Calendar, DollarSign, User, Eye, Mail, Download, Trash2, Archive, FileDown, CheckSquare, Square, MapPin, Edit, RefreshCw, Info } from "lucide-react";
import { z } from "zod";
import Sidebar from "@/components/sidebar";
import MobileNav from "@/components/mobile-nav";
import { useResponsive } from "@/hooks/useResponsive";
import { useAuth } from "@/hooks/useAuth";
import { Link } from "wouter";

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

interface Enquiry {
  id: number;
  clientName: string;
  clientEmail: string;
  eventDate: string;
  venue?: string;
  fee?: string;
}

const contractFormSchema = z.object({
  clientName: z.string().min(1, "Client name is required"),
  clientEmail: z.string().email("Valid email required").min(1, "Client email is required"),
  eventDate: z.string().min(1, "Event date is required"),
  fee: z.string().min(1, "Performance fee is required"),
  
  contractNumber: z.string().optional(),
  venue: z.string().optional(),
  eventTime: z.string().optional(),
  eventEndTime: z.string().optional(),
  deposit: z.string().optional(),
  clientAddress: z.string().optional(),
  clientPhone: z.string().optional(),
  venueAddress: z.string().optional(),
  paymentInstructions: z.string().optional(),
  equipmentRequirements: z.string().optional(),
  specialRequirements: z.string().optional(),
  clientFillableFields: z.array(z.string()).optional(),
  enquiryId: z.number().optional(),
  status: z.string().default("draft"),
  template: z.string().optional().default("professional"),
});

type ContractFormData = z.infer<typeof contractFormSchema>;

interface Settings {
  businessName?: string;
  businessEmail?: string;
  businessAddress?: string;
  phone?: string;
  website?: string;
  defaultInvoiceDueDays?: number;
  customGigTypes?: string[];
}

export default function Contracts() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [previewContract, setPreviewContract] = useState<Contract | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [selectedContracts, setSelectedContracts] = useState<number[]>([]);
  const [bulkActionLoading, setBulkActionLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [editingContract, setEditingContract] = useState<Contract | null>(null);
  const [customMessageDialog, setCustomMessageDialog] = useState(false);
  const [contractToSend, setContractToSend] = useState<Contract | null>(null);
  const [customMessage, setCustomMessage] = useState("");
  const [dataLoaded, setDataLoaded] = useState(false);
  const { isDesktop } = useResponsive();
  const { toast } = useToast();
  const [location, setLocation] = useLocation();
  const { user } = useAuth();

  const { data: contracts = [], isLoading, error } = useQuery<Contract[]>({
    queryKey: ["/api/contracts"],
  });

  const { data: enquiries = [] } = useQuery<Enquiry[]>({
    queryKey: ["/api/bookings"],
  });

  const { data: settings } = useQuery<Settings>({
    queryKey: ["/api/settings"],
  });

  const form = useForm<ContractFormData>({
    resolver: zodResolver(contractFormSchema),
    defaultValues: {
      enquiryId: 0,
      contractNumber: "",
      clientName: "",
      clientEmail: "",
      clientPhone: "",
      clientAddress: "",
      eventDate: "",
      eventTime: "",
      eventEndTime: "",
      venue: "",
      venueAddress: "",
      fee: "",
      deposit: "",
      paymentInstructions: "",
      equipmentRequirements: "",
      specialRequirements: "",
      status: "draft",
      template: "professional",
    },
  });

  const watchEventDate = form.watch('eventDate');
  const watchClientName = form.watch('clientName');
  
  React.useEffect(() => {
    if (watchEventDate && watchClientName && !editingContract) {
      const contractNumber = `(${new Date(watchEventDate).toLocaleDateString('en-GB', { 
        day: '2-digit', 
        month: '2-digit', 
        year: 'numeric' 
      })} - ${watchClientName})`;
      
      form.setValue('contractNumber', contractNumber);
    }
  }, [watchEventDate, watchClientName, editingContract, form]);

  const createContractMutation = useMutation({
    mutationFn: async (data: ContractFormData) => {
      const response = await apiRequest("/api/contracts", {
        method: "POST",
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create contract");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contracts"] });
      toast({
        title: "Success",
        description: "Contract created successfully",
      });
      setIsDialogOpen(false);
      form.reset();
      setEditingContract(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateContractMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: ContractFormData }) => {
      const response = await apiRequest(`/api/contracts/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to update contract");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contracts"] });
      toast({
        title: "Success",
        description: "Contract updated successfully",
      });
      setIsDialogOpen(false);
      form.reset();
      setEditingContract(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteContractMutation = useMutation({
    mutationFn: async (contractId: number) => {
      const response = await apiRequest(`/api/contracts/${contractId}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to delete contract");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contracts"] });
      toast({
        title: "Success",
        description: "Contract deleted successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const sendContractMutation = useMutation({
    mutationFn: async ({ contractId, customMessage }: { contractId: number; customMessage?: string }) => {
      const response = await apiRequest(`/api/contracts/${contractId}/send`, {
        method: "POST",
        body: JSON.stringify({ customMessage }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to send contract");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contracts"] });
      toast({
        title: "Success",
        description: "Contract sent successfully to client",
      });
      setCustomMessageDialog(false);
      setContractToSend(null);
      setCustomMessage("");
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
      setCustomMessageDialog(false);
    },
  });

  const handleSubmit = (data: ContractFormData) => {
    if (editingContract) {
      updateContractMutation.mutate({ id: editingContract.id, data });
    } else {
      createContractMutation.mutate(data);
    }
  };

  const handleEdit = (contract: Contract) => {
    setEditingContract(contract);
    
    // Map contract data to form data
    const formData: ContractFormData = {
      contractNumber: contract.contractNumber || '',
      clientName: contract.clientName || '',
      clientEmail: contract.clientEmail || '',
      clientPhone: contract.clientPhone || '',
      clientAddress: contract.clientAddress || '',
      eventDate: contract.eventDate || '',
      eventTime: contract.eventTime || '',
      venue: contract.venue || '',
      venueAddress: contract.venueAddress || '',
      fee: contract.fee || '',
      deposit: contract.deposit || '',
      paymentInstructions: contract.paymentInstructions || '',
      equipmentRequirements: contract.equipmentRequirements || '',
      specialRequirements: contract.specialRequirements || '',
      clientFillableFields: contract.clientFillableFields || [],
      status: contract.status || 'draft',
      template: 'professional',
    };
    
    form.reset(formData);
    setIsDialogOpen(true);
  };

  const handleDelete = (contract: Contract) => {
    if (confirm(`Are you sure you want to delete contract ${contract.contractNumber}?`)) {
      deleteContractMutation.mutate(contract.id);
    }
  };

  const handleSendContract = (contract: Contract) => {
    setContractToSend(contract);
    setCustomMessage("");
    setCustomMessageDialog(true);
  };

  const filteredContracts = React.useMemo(() => {
    return contracts.filter((contract: Contract) => {
      const matchesSearch = searchQuery === '' || 
        contract.contractNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        contract.clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        contract.venue.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesStatus = statusFilter === 'all' || contract.status === statusFilter;
      
      return matchesSearch && matchesStatus;
    });
  }, [contracts, searchQuery, statusFilter]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'signed': return 'default';
      case 'sent': return 'secondary';
      case 'completed': return 'default';
      default: return 'outline';
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
          <FileText className="w-4 h-4 mr-2" />
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
              <Mail className="w-8 h-8 text-blue-600 dark:text-blue-400" />
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
              <CheckSquare className="w-8 h-8 text-green-600 dark:text-green-400" />
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
              <Edit className="w-8 h-8 text-yellow-600 dark:text-yellow-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search contracts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[200px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="sent">Sent</SelectItem>
            <SelectItem value="signed">Signed</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Contracts List */}
      {isLoading ? (
        <div className="text-center py-8">Loading contracts...</div>
      ) : filteredContracts.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">No contracts found</h3>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              {searchQuery || statusFilter !== 'all' ? 'Try adjusting your filters' : 'Get started by creating your first contract'}
            </p>
            {(!searchQuery && statusFilter === 'all') && (
              <Button onClick={() => setIsDialogOpen(true)} className="bg-primary hover:bg-primary/90">
                <FileText className="w-4 h-4 mr-2" />
                Create Contract
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredContracts.map((contract: Contract) => (
            <Card key={contract.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-3">
                      <h3 className="font-semibold text-lg text-gray-900 dark:text-gray-100">
                        {contract.contractNumber}
                      </h3>
                      <Badge variant={getStatusBadgeVariant(contract.status)} className="capitalize">
                        {contract.status}
                      </Badge>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-gray-500" />
                        <span className="text-gray-600 dark:text-gray-300">{contract.clientName}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-gray-500" />
                        <span className="text-gray-600 dark:text-gray-300">{formatDate(contract.eventDate)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-gray-500" />
                        <span className="text-gray-600 dark:text-gray-300">{contract.venue}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <DollarSign className="w-4 h-4 text-gray-500" />
                        <span className="text-gray-600 dark:text-gray-300">£{contract.fee}</span>
                      </div>
                    </div>
                  </div>
                  
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleEdit(contract)}>
                        <Edit className="w-4 h-4 mr-2" />
                        Edit
                      </DropdownMenuItem>
                      {contract.status === 'draft' && (
                        <DropdownMenuItem onClick={() => handleSendContract(contract)}>
                          <Mail className="w-4 h-4 mr-2" />
                          Send to Client
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem onClick={() => handleDelete(contract)} className="text-red-600">
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Enhanced Contract Form Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={(open) => {
        if (!open) {
          setIsDialogOpen(false);
          setEditingContract(null);
          form.reset();
        }
      }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
              {editingContract ? 'Edit Contract' : 'Create New Contract'}
            </DialogTitle>
            <DialogDescription>
              {editingContract 
                ? 'Make changes to the existing contract details'
                : 'Fill in the contract details. Fields marked with * are required. Optional fields can be completed by you or the client later.'
              }
            </DialogDescription>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-8">
              {/* Essential Information Section */}
              <div className="space-y-4">
                <div className="flex items-center gap-3 pb-2 border-b border-gray-200 dark:border-gray-700">
                  <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                    Essential Contract Information
                  </h3>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="contractNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-red-600 font-medium">Contract Number *</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Auto-generated: (DD/MM/YYYY - Client Name)"
                            {...field}
                            className="border-red-200 focus:border-red-400"
                          />
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
                        <FormLabel className="text-red-600 font-medium">Client Name *</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="e.g., John Smith"
                            {...field}
                            className="border-red-200 focus:border-red-400"
                          />
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
                        <FormLabel className="text-red-600 font-medium">Client Email *</FormLabel>
                        <FormControl>
                          <Input 
                            type="email"
                            placeholder="client@example.com"
                            {...field}
                            className="border-red-200 focus:border-red-400"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="eventDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-red-600 font-medium">Event Date *</FormLabel>
                        <FormControl>
                          <Input 
                            type="date"
                            {...field}
                            className="border-red-200 focus:border-red-400"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="venue"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-red-600 font-medium">Venue *</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="e.g., The Grand Hotel"
                            {...field}
                            className="border-red-200 focus:border-red-400"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="fee"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-red-600 font-medium">Performance Fee (£) *</FormLabel>
                        <FormControl>
                          <Input 
                            type="number"
                            placeholder="500"
                            {...field}
                            className="border-red-200 focus:border-red-400"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* Optional Information Section */}
              <div className="space-y-4">
                <div className="flex items-center gap-3 pb-2 border-b border-gray-200 dark:border-gray-700">
                  <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                    Additional Details
                  </h3>
                  <span className="text-sm text-gray-500">(Optional - can be filled by client later)</span>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="eventTime"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-blue-600">Start Time</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., 7:30 PM" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="eventEndTime"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-blue-600">End Time</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., 11:00 PM" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="clientPhone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-blue-600">Client Phone</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., +44 7700 900123" {...field} />
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
                        <FormLabel className="text-blue-600">Venue Address</FormLabel>
                        <FormControl>
                          <Input placeholder="Full venue address" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="deposit"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-blue-600">Deposit (£)</FormLabel>
                        <FormControl>
                          <Input type="number" placeholder="100" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <div className="grid grid-cols-1 gap-6">
                  <FormField
                    control={form.control}
                    name="clientAddress"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-blue-600">Client Address</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Client's full address" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="equipmentRequirements"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-blue-600">Equipment Requirements</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Sound system, lighting, instruments needed..." {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="specialRequirements"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-blue-600">Special Requirements</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Dress code, special requests, accessibility needs..." {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="paymentInstructions"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-blue-600">Payment Instructions</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Bank details, payment schedule, preferred payment method..." {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-4 pt-6 border-t border-gray-200 dark:border-gray-700">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => {
                    setIsDialogOpen(false);
                    setEditingContract(null);
                    form.reset();
                  }}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={createContractMutation.isPending || updateContractMutation.isPending}
                  className="bg-primary hover:bg-primary/90"
                >
                  {createContractMutation.isPending || updateContractMutation.isPending ? 'Saving...' : 
                   editingContract ? 'Update Contract' : 'Create Contract'}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Send Contract Dialog */}
      <Dialog open={customMessageDialog} onOpenChange={setCustomMessageDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Send Contract to Client</DialogTitle>
            <DialogDescription>
              Add a personal message to include with the contract (optional)
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <Textarea
              placeholder="Hi [Client Name], please find your contract attached. Looking forward to performing at your event!"
              value={customMessage}
              onChange={(e) => setCustomMessage(e.target.value)}
              rows={4}
            />
            
            <div className="flex justify-end gap-4">
              <Button variant="outline" onClick={() => setCustomMessageDialog(false)}>
                Cancel
              </Button>
              <Button 
                onClick={() => contractToSend && sendContractMutation.mutate({ 
                  contractId: contractToSend.id, 
                  customMessage 
                })}
                disabled={sendContractMutation.isPending}
              >
                {sendContractMutation.isPending ? 'Sending...' : 'Send Contract'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );

  if (isDesktop) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="flex">
          <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
          <main className={`flex-1 transition-all duration-300 ${sidebarOpen ? 'lg:ml-64' : 'lg:ml-20'}`}>
            <div className="p-6">
              <ContractsContent />
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <MobileNav />
      <main className="p-4">
        <ContractsContent />
      </main>
    </div>
  );
}