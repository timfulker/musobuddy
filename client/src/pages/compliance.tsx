import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertComplianceDocumentSchema, type ComplianceDocument } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Plus, Search, Shield, Zap, Music, Upload, Download, AlertTriangle, CheckCircle, Clock, ArrowLeft } from "lucide-react";
import { Link } from "wouter";
import { z } from "zod";
import Sidebar from "@/components/sidebar";

const complianceFormSchema = insertComplianceDocumentSchema.extend({
  expiryDate: z.string().optional(),
});

export default function Compliance() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { toast } = useToast();

  const { data: documents = [], isLoading } = useQuery({
    queryKey: ["/api/compliance"],
  });

  const createDocumentMutation = useMutation({
    mutationFn: async (data: z.infer<typeof complianceFormSchema>) => {
      const documentData = {
        ...data,
        expiryDate: data.expiryDate ? new Date(data.expiryDate) : null,
      };
      return await apiRequest("/api/compliance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(documentData),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/compliance"] });
      setIsDialogOpen(false);
      form.reset();
      toast({
        title: "Success",
        description: "Compliance document added successfully!",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to add document. Please try again.",
        variant: "destructive",
      });
    },
  });

  const form = useForm<z.infer<typeof complianceFormSchema>>({
    resolver: zodResolver(complianceFormSchema),
    defaultValues: {
      type: "",
      name: "",
      expiryDate: "",
      status: "valid",
      documentUrl: "",
    },
  });

  const onSubmit = (data: z.infer<typeof complianceFormSchema>) => {
    createDocumentMutation.mutate(data);
  };

  const getIcon = (type: string) => {
    switch (type) {
      case "public_liability": return <Shield className="w-6 h-6" />;
      case "pat_testing": return <Zap className="w-6 h-6" />;
      case "music_license": return <Music className="w-6 h-6" />;
      default: return <Shield className="w-6 h-6" />;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "public_liability": return "Public Liability Insurance";
      case "pat_testing": return "PAT Testing Certificate";
      case "music_license": return "Music Performance License";
      default: return type;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "valid": return "bg-green-50 text-green-600 border-green-200";
      case "expiring": return "bg-orange-50 text-orange-600 border-orange-200";
      case "expired": return "bg-red-50 text-red-600 border-red-200";
      default: return "bg-gray-50 text-gray-600 border-gray-200";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "valid": return <CheckCircle className="w-5 h-5 text-green-600" />;
      case "expiring": return <Clock className="w-5 h-5 text-orange-600" />;
      case "expired": return <AlertTriangle className="w-5 h-5 text-red-600" />;
      default: return <CheckCircle className="w-5 h-5 text-gray-600" />;
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "No expiry date";
    return new Date(dateString).toLocaleDateString("en-GB");
  };

  const getDaysUntilExpiry = (expiryDateString: string) => {
    if (!expiryDateString) return null;
    const expiryDate = new Date(expiryDateString);
    const today = new Date();
    const diffTime = expiryDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getComplianceStatus = () => {
    const expired = documents.filter((doc: ComplianceDocument) => doc.status === "expired").length;
    const expiring = documents.filter((doc: ComplianceDocument) => doc.status === "expiring").length;
    const valid = documents.filter((doc: ComplianceDocument) => doc.status === "valid").length;

    return { expired, expiring, valid, total: documents.length };
  };

  const status = getComplianceStatus();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
      
      {/* Main Content */}
      <div className="md:ml-64">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="md:hidden mr-3 p-2 rounded-md hover:bg-gray-100"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Compliance</h1>
                <p className="text-gray-600">Manage your insurance, licenses, and certifications</p>
              </div>
            </div>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-purple-600 hover:bg-purple-700">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Document
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Compliance Document</DialogTitle>
                </DialogHeader>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="type"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Document Type</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select document type" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="public_liability">Public Liability Insurance</SelectItem>
                              <SelectItem value="pat_testing">PAT Testing Certificate</SelectItem>
                              <SelectItem value="music_license">Music Performance License</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Document Name</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., 2024 Public Liability Certificate" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="expiryDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Expiry Date</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="documentUrl"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Document URL (Optional)</FormLabel>
                          <FormControl>
                            <Input placeholder="https://..." {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="flex justify-end space-x-3">
                      <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button type="submit" disabled={createDocumentMutation.isPending}>
                        {createDocumentMutation.isPending ? "Adding..." : "Add Document"}
                      </Button>
                    </div>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Main Content */}
        <div className="px-6 py-6 space-y-6">
          {/* Status Overview */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Valid Documents</p>
                    <p className="text-xl font-bold text-green-600">{status.valid}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                    <Clock className="w-5 h-5 text-orange-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Expiring Soon</p>
                    <p className="text-xl font-bold text-orange-600">{status.expiring}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                    <AlertTriangle className="w-5 h-5 text-red-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Expired</p>
                    <p className="text-xl font-bold text-red-600">{status.expired}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                    <Shield className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Total Documents</p>
                    <p className="text-xl font-bold text-purple-600">{status.total}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Documents List */}
          <div className="space-y-4">
            {documents.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <Shield className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500 text-lg">No compliance documents</p>
                  <p className="text-gray-400">Add your insurance certificates and licenses to stay compliant</p>
                  <Button className="mt-4 bg-purple-600 hover:bg-purple-700" onClick={() => setIsDialogOpen(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add First Document
                  </Button>
                </CardContent>
              </Card>
            ) : (
              documents.map((document: ComplianceDocument) => {
                const daysUntilExpiry = getDaysUntilExpiry(document.expiryDate!);
                return (
                  <Card key={document.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${getStatusColor(document.status)}`}>
                            {getIcon(document.type)}
                          </div>
                          
                          <div className="flex-1">
                            <div className="flex items-center space-x-3 mb-2">
                              <h3 className="text-lg font-semibold text-gray-900">
                                {getTypeLabel(document.type)}
                              </h3>
                              <div className="flex items-center space-x-2">
                                {getStatusIcon(document.status)}
                                <Badge className={getStatusColor(document.status)}>
                                  {document.status.toUpperCase()}
                                </Badge>
                              </div>
                            </div>
                            
                            <p className="text-gray-600 mb-2">{document.name}</p>
                            
                            <div className="flex items-center space-x-6 text-sm text-gray-500">
                              <span>Expires: {formatDate(document.expiryDate!)}</span>
                              {daysUntilExpiry !== null && (
                                <span className={
                                  daysUntilExpiry < 0 ? "text-red-600 font-medium" :
                                  daysUntilExpiry <= 30 ? "text-orange-600 font-medium" :
                                  "text-gray-500"
                                }>
                                  {daysUntilExpiry < 0 ? `${Math.abs(daysUntilExpiry)} days overdue` :
                                   daysUntilExpiry === 0 ? "Expires today" :
                                   `${daysUntilExpiry} days remaining`}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          {document.documentUrl && (
                            <Button variant="outline" size="sm">
                              <Download className="w-4 h-4 mr-1" />
                              Download
                            </Button>
                          )}
                          
                          <Button variant="outline" size="sm">
                            <Upload className="w-4 h-4 mr-1" />
                            Upload New
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>

          {/* Compliance Requirements Info */}
          <Card>
            <CardHeader>
              <CardTitle>Required Documents for Musicians</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <Shield className="w-5 h-5 text-blue-600" />
                    <h4 className="font-semibold">Public Liability Insurance</h4>
                  </div>
                  <p className="text-sm text-gray-600">
                    Essential protection covering claims from third parties. Most venues require £2-10 million coverage.
                  </p>
                </div>
                
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <Zap className="w-5 h-5 text-yellow-600" />
                    <h4 className="font-semibold">PAT Testing Certificate</h4>
                  </div>
                  <p className="text-sm text-gray-600">
                    Annual testing of portable electrical equipment. Required for amplifiers, keyboards, and other gear.
                  </p>
                </div>
                
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <Music className="w-5 h-5 text-purple-600" />
                    <h4 className="font-semibold">Music Performance License</h4>
                  </div>
                  <p className="text-sm text-gray-600">
                    PRS/PPL licenses for performing copyrighted music. Often handled by venues but worth having for outdoor events.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}