import React, { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { Search, Filter, MoreHorizontal, FileText, Calendar, DollarSign, User, ArrowLeft, Eye, Mail, Download } from "lucide-react";
import type { Contract, Enquiry } from "@shared/schema";
import { insertContractSchema } from "@shared/schema";
import { z } from "zod";
import { Link } from "wouter";

const contractFormSchema = insertContractSchema.extend({
  eventDate: z.string().optional(),
}).omit({
  userId: true,
  signedAt: true,
});

export default function Contracts() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [previewContract, setPreviewContract] = useState<Contract | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const { toast } = useToast();

  const { data: contracts = [], isLoading } = useQuery<Contract[]>({
    queryKey: ["/api/contracts"],
  });

  const { data: enquiries = [] } = useQuery<Enquiry[]>({
    queryKey: ["/api/enquiries"],
  });

  // Check URL params to auto-open form dialog
  React.useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('action') === 'new') {
      setIsDialogOpen(true);
    }
  }, []);

  // Clean up URL when dialog closes
  const handleDialogClose = (open: boolean) => {
    setIsDialogOpen(open);
    if (!open) {
      // Clean up URL when closing dialog
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get('action') === 'new') {
        window.history.replaceState({}, '', window.location.pathname);
      }
    }
  };

  const createContractMutation = useMutation({
    mutationFn: async (data: z.infer<typeof contractFormSchema>) => {
      const contractData = {
        ...data,
        eventDate: data.eventDate ? new Date(data.eventDate).toISOString() : null,
        enquiryId: 1, // Default enquiry ID for now
      };
      
      const response = await fetch("/api/contracts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(contractData),
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contracts"] });
      handleDialogClose(false);
      form.reset();
      toast({
        title: "Success",
        description: "Contract generated successfully!",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to generate contract: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const form = useForm<z.infer<typeof contractFormSchema>>({
    resolver: zodResolver(contractFormSchema),
    defaultValues: {
      enquiryId: 0,
      contractNumber: "",
      clientName: "",
      eventDate: "",
      eventTime: "",
      venue: "",
      fee: "",
      deposit: "",
      terms: "",
      status: "draft",
    },
  });

  // Email sending mutation
  const sendEmailMutation = useMutation({
    mutationFn: async (contract: Contract) => {
      return fetch("/api/contracts/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contractId: contract.id }),
      });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Contract sent to client successfully!",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to send contract email",
        variant: "destructive",
      });
    },
  });

  const handlePreviewContract = (contract: Contract) => {
    setPreviewContract(contract);
    setIsPreviewOpen(true);
  };

  const handleSendEmail = (contract: Contract) => {
    sendEmailMutation.mutate(contract);
  };

  // Additional contract action handlers
  const handleEditContract = (contract: Contract) => {
    // TODO: Implement edit functionality
    toast({
      title: "Edit Contract",
      description: "Edit functionality will be implemented soon",
    });
  };

  const handleDeleteContract = (contract: Contract) => {
    if (confirm(`Are you sure you want to delete contract ${contract.contractNumber}?`)) {
      // TODO: Implement delete functionality
      toast({
        title: "Delete Contract",
        description: "Delete functionality will be implemented soon",
      });
    }
  };

  const handleDownloadContract = (contract: Contract) => {
    // Create comprehensive contract document
    const contractData = `
LIVE ENGAGEMENT CONTRACT
Solo Musician Performance Agreement
Contract #${contract.contractNumber}

═══════════════════════════════════════════════════════════════

AGREEMENT DETAILS

An agreement made on ${formatDate(new Date())} between the Hirer and the Musician 
for the performance engagement detailed below.

═══════════════════════════════════════════════════════════════

THE HIRER
Name: ${contract.clientName}
Address: [To be completed]
Phone: [To be completed]
Email: [To be completed]

THE MUSICIAN
Name: Tim Fulker
Address: 59 Gloucester Road, Bournemouth, Dorset BH7 6JA
Phone: 07764190034
Email: timfulkermusic@gmail.com

═══════════════════════════════════════════════════════════════

ENGAGEMENT DETAILS

Date: ${formatDate(contract.eventDate)}
Start Time: ${contract.eventTime}
Venue: ${contract.venue}
Performance Fee: £${contract.fee}
${contract.deposit ? `Deposit Required: £${contract.deposit} (payable upon signing)` : ''}

═══════════════════════════════════════════════════════════════

TERMS & CONDITIONS

• The fee listed above is payable on the date of performance.

• The Hirer and Musician agree that equipment and instruments are not available 
  for use by others without specific permission of the Musician.

• The Hirer shall ensure safe electricity supply and security of the Musician 
  and property at the venue.

• No audio/visual recording or transmission permitted without prior written 
  consent of the Musician.

• This agreement may only be modified or cancelled by mutual written consent 
  of both parties.

${contract.terms ? `
ADDITIONAL TERMS:
${contract.terms}
` : ''}

═══════════════════════════════════════════════════════════════

SIGNATURES

HIRER SIGNATURE
Signature: _________________________________
Print Name: ${contract.clientName}
Phone: _________________________________
Email: _________________________________
Date: _________________________________

MUSICIAN SIGNATURE
Signature: _________________________________
Print Name: Tim Fulker
Phone: 07764190034
Email: timfulkermusic@gmail.com
Date: _________________________________

═══════════════════════════════════════════════════════════════

CONTRACT STATUS: ${contract.status.toUpperCase()}
Created: ${formatDate(contract.createdAt!)}
${contract.signedAt ? `Signed: ${formatDate(contract.signedAt)}` : ''}

One copy to be retained by the Hirer and one copy by the Musician.
    `;
    
    const blob = new Blob([contractData], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `live-engagement-contract-${contract.contractNumber}.txt`;
    a.click();
    window.URL.revokeObjectURL(url);
    
    toast({
      title: "Success",
      description: "Professional contract downloaded successfully!",
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "draft": return "bg-gray-100 text-gray-800";
      case "sent": return "bg-blue-100 text-blue-800";
      case "signed": return "bg-green-100 text-green-800";
      case "completed": return "bg-purple-100 text-purple-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "No date set";
    return new Date(dateString).toLocaleDateString("en-GB");
  };

  const filteredContracts = contracts.filter((contract: Contract) => {
    const matchesSearch = searchQuery === "" || 
      contract.contractNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contract.clientName.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || contract.status === statusFilter;
    
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
              <h1 className="text-3xl font-bold text-gray-900">Contracts</h1>
              <p className="text-gray-600">Manage your performance contracts and agreements</p>
            </div>
          </div>
          
          <Dialog open={isDialogOpen} onOpenChange={handleDialogClose}>
            <DialogTrigger asChild>
              <Button className="bg-purple-600 hover:bg-purple-700">
                <FileText className="w-4 h-4 mr-2" />
                Generate Contract
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Generate New Contract</DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit((data) => createContractMutation.mutate(data))} className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="contractNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Contract Number</FormLabel>
                          <FormControl>
                            <Input placeholder="CT-2024-001" {...field} value={field.value || ""} />
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
                            <Input placeholder="John Smith" {...field} value={field.value || ""} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="eventTime"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Event Time</FormLabel>
                          <FormControl>
                            <Input placeholder="7:00 PM" {...field} value={field.value || ""} />
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
                          <FormLabel>Event Date</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} value={field.value || ""} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="venue"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Venue</FormLabel>
                          <FormControl>
                            <Input placeholder="The Grand Hotel, London" {...field} value={field.value || ""} />
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
                          <FormLabel>Performance Fee (£)</FormLabel>
                          <FormControl>
                            <Input type="number" placeholder="1500" {...field} value={field.value || ""} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="deposit"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Deposit Amount (£)</FormLabel>
                        <FormControl>
                          <Input type="number" placeholder="500" {...field} value={field.value || ""} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="terms"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Terms & Conditions</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Payment terms, cancellation policy, etc..." {...field} value={field.value || ""} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex justify-end space-x-3">
                    <Button type="button" variant="outline" onClick={() => handleDialogClose(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={createContractMutation.isPending}>
                      {createContractMutation.isPending ? "Generating..." : "Generate Contract"}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>

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

        {/* Contracts List */}
        <div className="space-y-4">
          {filteredContracts.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 text-lg">No contracts found</p>
                <p className="text-gray-400">Generate your first contract from a qualified enquiry</p>
                <Button 
                  className="mt-4 bg-purple-600 hover:bg-purple-700"
                  onClick={() => setIsDialogOpen(true)}
                >
                  <FileText className="w-4 h-4 mr-2" />
                  Generate Contract
                </Button>
              </CardContent>
            </Card>
          ) : (
            filteredContracts.map((contract: Contract) => (
              <Card key={contract.id} className="hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-3">
                        <h3 className="text-lg font-semibold text-gray-900">
                          Contract #{contract.contractNumber}
                        </h3>
                        <Badge className={getStatusColor(contract.status)}>
                          {contract.status.toUpperCase()}
                        </Badge>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                        <div className="flex items-center space-x-2 text-gray-600">
                          <User className="w-4 h-4" />
                          <div>
                            <p className="font-medium">{contract.clientName}</p>
                            <p className="text-xs text-gray-500">Client</p>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-2 text-gray-600">
                          <Calendar className="w-4 h-4" />
                          <div>
                            <p className="font-medium">{formatDate(contract.eventDate)}</p>
                            <p className="text-xs text-gray-500">{contract.eventTime}</p>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-2 text-gray-600">
                          <DollarSign className="w-4 h-4" />
                          <div>
                            <p className="font-medium">£{contract.fee}</p>
                            {contract.deposit && (
                              <p className="text-xs text-gray-500">Deposit: £{contract.deposit}</p>
                            )}
                          </div>
                        </div>
                        
                        <div className="text-gray-600">
                          <p className="font-medium text-sm">{contract.venue}</p>
                          <p className="text-xs text-gray-500">Venue</p>
                        </div>
                      </div>
                      
                      {contract.terms && (
                        <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                          <p className="text-sm text-gray-700 line-clamp-2">{contract.terms}</p>
                        </div>
                      )}
                      
                      <div className="mt-3 flex items-center space-x-4 text-xs text-gray-500">
                        <span>Created: {formatDate(contract.createdAt!)}</span>
                        {contract.signedAt && (
                          <span>Signed: {formatDate(contract.signedAt)}</span>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex flex-col items-end space-y-2">
                      <div className="text-right mb-2">
                        <p className="text-xs text-gray-500 mb-1">Status</p>
                        <Badge 
                          variant={
                            contract.status === "signed" ? "default" : 
                            contract.status === "sent" ? "secondary" :
                            contract.status === "completed" ? "default" : "outline"
                          }
                        >
                          {contract.status.charAt(0).toUpperCase() + contract.status.slice(1)}
                        </Badge>
                      </div>
                      
                      <div className="flex flex-col space-y-1">
                        {contract.status === "draft" && (
                          <>
                            <Button size="sm" variant="outline" className="text-xs" onClick={() => handleEditContract(contract)}>
                              Edit
                            </Button>
                            <Button size="sm" variant="outline" className="text-xs" onClick={() => handlePreviewContract(contract)}>
                              Preview
                            </Button>
                            <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-xs" onClick={() => handleSendEmail(contract)}>
                              Send
                            </Button>
                            <Button size="sm" variant="outline" className="text-red-600 hover:text-red-700 text-xs" onClick={() => handleDeleteContract(contract)}>
                              Delete
                            </Button>
                          </>
                        )}
                        
                        {contract.status === "sent" && (
                          <>
                            <Button size="sm" variant="outline" className="text-xs" onClick={() => handlePreviewContract(contract)}>
                              Preview
                            </Button>
                            <Button size="sm" variant="outline" className="text-xs" onClick={() => handleDownloadContract(contract)}>
                              <Download className="w-3 h-3 mr-1" />
                              Download
                            </Button>
                            <Button size="sm" variant="outline" className="text-xs" onClick={() => handleSendEmail(contract)}>
                              Resend
                            </Button>
                          </>
                        )}
                        
                        {contract.status === "signed" && (
                          <>
                            <Button size="sm" variant="outline" className="text-xs" onClick={() => handlePreviewContract(contract)}>
                              Preview
                            </Button>
                            <Button size="sm" variant="outline" className="text-xs" onClick={() => handleDownloadContract(contract)}>
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
            ))
          )}
        </div>

        {/* Contract Preview Dialog */}
        <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Contract Preview</DialogTitle>
            </DialogHeader>
            {previewContract && (
              <div className="space-y-6 p-4">
                {/* Contract Header */}
                <div className="text-center border-b-2 border-gray-200 pb-6">
                  <h1 className="text-3xl font-bold text-gray-900 mb-1">LIVE ENGAGEMENT CONTRACT</h1>
                  <p className="text-lg text-gray-600">Solo Musician Performance Agreement</p>
                  <p className="text-sm text-gray-500 mt-2">Contract #{previewContract.contractNumber}</p>
                </div>

                {/* Agreement Statement */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-gray-800 leading-relaxed">
                    An agreement made on <strong>{formatDate(new Date())}</strong> between the Hirer and the Musician 
                    for the performance engagement detailed below.
                  </p>
                </div>

                {/* Party Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2">
                      THE HIRER
                    </h3>
                    <div className="space-y-2">
                      <p className="font-medium text-gray-900">{previewContract.clientName}</p>
                      <div className="text-sm text-gray-600 space-y-1">
                        <p><strong>Address:</strong> [To be completed]</p>
                        <p><strong>Phone:</strong> [To be completed]</p>
                        <p><strong>Email:</strong> [To be completed]</p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2">
                      THE MUSICIAN
                    </h3>
                    <div className="space-y-2">
                      <p className="font-medium text-gray-900">Tim Fulker</p>
                      <div className="text-sm text-gray-600 space-y-1">
                        <p><strong>Address:</strong> 59 Gloucester Road, Bournemouth, Dorset BH7 6JA</p>
                        <p><strong>Phone:</strong> 07764190034</p>
                        <p><strong>Email:</strong> timfulkermusic@gmail.com</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Engagement Details */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2">
                    ENGAGEMENT DETAILS
                  </h3>
                  
                  <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">Date</th>
                          <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">Start Time</th>
                          <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">Venue</th>
                          <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">Fee</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="border-t border-gray-200">
                          <td className="px-4 py-3 text-sm text-gray-900">{formatDate(previewContract.eventDate)}</td>
                          <td className="px-4 py-3 text-sm text-gray-900">{previewContract.eventTime}</td>
                          <td className="px-4 py-3 text-sm text-gray-900">{previewContract.venue}</td>
                          <td className="px-4 py-3 text-sm font-semibold text-green-600">£{previewContract.fee}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {previewContract.deposit && (
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <p className="text-sm text-blue-800">
                        <strong>Deposit Required:</strong> £{previewContract.deposit} (payable upon signing)
                      </p>
                    </div>
                  )}
                </div>

                {/* Terms and Conditions */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2">
                    TERMS & CONDITIONS
                  </h3>
                  
                  <div className="space-y-3 text-sm text-gray-700">
                    <div className="flex items-start space-x-2">
                      <span className="text-gray-400 mt-1">•</span>
                      <p>The fee listed above is payable on the date of performance.</p>
                    </div>
                    <div className="flex items-start space-x-2">
                      <span className="text-gray-400 mt-1">•</span>
                      <p>The Hirer and Musician agree that equipment and instruments are not available for use by others without specific permission.</p>
                    </div>
                    <div className="flex items-start space-x-2">
                      <span className="text-gray-400 mt-1">•</span>
                      <p>The Hirer shall ensure safe electricity supply and security of the Musician and property at the venue.</p>
                    </div>
                    <div className="flex items-start space-x-2">
                      <span className="text-gray-400 mt-1">•</span>
                      <p>No audio/visual recording or transmission permitted without prior written consent.</p>
                    </div>
                    <div className="flex items-start space-x-2">
                      <span className="text-gray-400 mt-1">•</span>
                      <p>This agreement may only be modified or cancelled by mutual written consent.</p>
                    </div>
                  </div>

                  {previewContract.terms && (
                    <div className="mt-4">
                      <h4 className="font-medium text-gray-900 mb-2">Additional Terms:</h4>
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <p className="text-sm text-gray-700 whitespace-pre-wrap">{previewContract.terms}</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Signature Section */}
                <div className="space-y-6 border-t-2 border-gray-200 pt-6">
                  <h3 className="text-lg font-semibold text-gray-900">SIGNATURES</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-4">
                      <h4 className="font-medium text-gray-900">HIRER SIGNATURE</h4>
                      <div className="space-y-3">
                        <div className="border-b border-gray-300 pb-1">
                          <p className="text-xs text-gray-500 mb-1">Signature</p>
                          <div className="h-8"></div>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 mb-1">Print Name</p>
                          <p className="text-sm text-gray-700">{previewContract.clientName}</p>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-xs text-gray-500 mb-1">Phone</p>
                            <p className="text-sm text-gray-700">[To be completed]</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 mb-1">Email</p>
                            <p className="text-sm text-gray-700">[To be completed]</p>
                          </div>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 mb-1">Date</p>
                          <div className="border-b border-gray-300 h-6"></div>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h4 className="font-medium text-gray-900">MUSICIAN SIGNATURE</h4>
                      <div className="space-y-3">
                        <div className="border-b border-gray-300 pb-1">
                          <p className="text-xs text-gray-500 mb-1">Signature</p>
                          <div className="h-8"></div>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 mb-1">Print Name</p>
                          <p className="text-sm text-gray-700">Tim Fulker</p>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-xs text-gray-500 mb-1">Phone</p>
                            <p className="text-sm text-gray-700">07764190034</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 mb-1">Email</p>
                            <p className="text-sm text-gray-700">timfulkermusic@gmail.com</p>
                          </div>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 mb-1">Date</p>
                          <div className="border-b border-gray-300 h-6"></div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="text-center text-xs text-gray-500 border-t border-gray-200 pt-4">
                  <p className="mb-2">Contract Status: <Badge className={getStatusColor(previewContract.status)}>{previewContract.status.toUpperCase()}</Badge></p>
                  <p>Created: {formatDate(previewContract.createdAt!)}</p>
                  {previewContract.signedAt && (
                    <p className="text-green-600 font-medium">Signed: {formatDate(previewContract.signedAt)}</p>
                  )}
                  <p className="mt-2 italic">One copy to be retained by the Hirer and one copy by the Musician.</p>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}