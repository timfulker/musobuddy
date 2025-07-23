import { useState, useRef, useCallback } from "react";
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
import { Plus, Search, Shield, Zap, Music, Upload, Download, AlertTriangle, CheckCircle, Clock, ArrowLeft, FileUp, X, Menu } from "lucide-react";
import { Link } from "wouter";
import { z } from "zod";
import Sidebar from "@/components/sidebar";
import MobileNav from "@/components/mobile-nav";

const complianceFormSchema = insertComplianceDocumentSchema.extend({
  expiryDate: z.string().optional(),
});

export default function Compliance() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadMethod, setUploadMethod] = useState<'url' | 'file'>('file');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const { data: documents = [], isLoading } = useQuery<ComplianceDocument[]>({
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
      setSelectedFile(null);
      setUploadMethod('file');
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

  const uploadDocumentMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const response = await fetch('/api/compliance/upload', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Upload failed');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/compliance"] });
      setIsDialogOpen(false);
      form.reset();
      setSelectedFile(null);
      setUploadMethod('file');
      toast({
        title: "Success",
        description: "Document uploaded successfully!",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Upload Error",
        description: error.message || "Failed to upload document. Please try again.",
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

  // File handling functions
  const handleFileSelect = useCallback((file: File) => {
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      toast({
        title: "File too large",
        description: "Please select a file smaller than 10MB",
        variant: "destructive",
      });
      return;
    }

    const allowedTypes = [
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/gif',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain'
    ];

    if (!allowedTypes.includes(file.type)) {
      toast({
        title: "Invalid file type",
        description: "Please upload PDF, Word, text, or image files",
        variant: "destructive",
      });
      return;
    }

    setSelectedFile(file);
    // Auto-fill document name if not set
    if (!form.getValues('name')) {
      form.setValue('name', file.name);
    }
  }, [form, toast]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  }, [handleFileSelect]);

  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFileSelect(e.target.files[0]);
    }
  }, [handleFileSelect]);

  const removeSelectedFile = useCallback(() => {
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  const handleDialogClose = useCallback(() => {
    setIsDialogOpen(false);
    setSelectedFile(null);
    setUploadMethod('file');
    setIsDragging(false);
    form.reset();
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [form]);

  const downloadDocument = useCallback((document: ComplianceDocument) => {
    if (document.documentUrl) {
      if (document.documentUrl.startsWith('data:')) {
        // Handle base64 data URLs
        const link = window.document.createElement('a');
        link.href = document.documentUrl;
        link.download = document.name || 'document';
        window.document.body.appendChild(link);
        link.click();
        window.document.body.removeChild(link);
      } else {
        // Handle regular URLs
        window.open(document.documentUrl, '_blank');
      }
    }
  }, []);

  const onSubmit = (data: z.infer<typeof complianceFormSchema>) => {
    if (uploadMethod === 'file' && selectedFile) {
      // Upload file
      const formData = new FormData();
      formData.append('documentFile', selectedFile);
      formData.append('type', data.type);
      formData.append('name', data.name);
      if (data.expiryDate) {
        formData.append('expiryDate', data.expiryDate);
      }
      uploadDocumentMutation.mutate(formData);
    } else {
      // Create document with URL
      createDocumentMutation.mutate(data);
    }
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
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      
      {/* Main Content */}
      <div className="md:ml-64">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="md:hidden mr-3"
              >
                <Menu className="h-4 w-4" />
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Compliance</h1>
                <p className="text-gray-600">Manage your insurance, licenses, and certifications</p>
              </div>
            </div>
            <Dialog open={isDialogOpen} onOpenChange={handleDialogClose}>
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

                    {/* Upload Method Selector */}
                    <div className="space-y-3">
                      <label className="text-sm font-medium">Document Source</label>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant={uploadMethod === 'file' ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setUploadMethod('file')}
                        >
                          <Upload className="w-4 h-4 mr-2" />
                          Upload File
                        </Button>
                        <Button
                          type="button"
                          variant={uploadMethod === 'url' ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setUploadMethod('url')}
                        >
                          <FileUp className="w-4 h-4 mr-2" />
                          Enter URL
                        </Button>
                      </div>
                    </div>

                    {/* File Upload Section */}
                    {uploadMethod === 'file' && (
                      <div className="space-y-3">
                        <label className="text-sm font-medium">Upload Document</label>
                        
                        {/* File Drop Zone */}
                        <div
                          className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                            isDragging
                              ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/10'
                              : 'border-gray-300 hover:border-gray-400'
                          }`}
                          onDragOver={handleDragOver}
                          onDragLeave={handleDragLeave}
                          onDrop={handleDrop}
                        >
                          {selectedFile ? (
                            <div className="space-y-2">
                              <div className="flex items-center justify-center space-x-2">
                                <FileUp className="w-5 h-5 text-green-600" />
                                <span className="text-sm font-medium text-green-600">
                                  {selectedFile.name}
                                </span>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={removeSelectedFile}
                                >
                                  <X className="w-4 h-4" />
                                </Button>
                              </div>
                              <p className="text-xs text-gray-500">
                                {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                              </p>
                            </div>
                          ) : (
                            <div className="space-y-2">
                              <Upload className="w-8 h-8 text-gray-400 mx-auto" />
                              <div>
                                <p className="text-sm text-gray-600">
                                  Drag and drop your document here, or{' '}
                                  <Button
                                    type="button"
                                    variant="link"
                                    className="p-0 h-auto text-purple-600"
                                    onClick={() => fileInputRef.current?.click()}
                                  >
                                    browse files
                                  </Button>
                                </p>
                                <p className="text-xs text-gray-500 mt-1">
                                  PDF, Word, images, or text files (max 10MB)
                                </p>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Hidden File Input */}
                        <input
                          ref={fileInputRef}
                          type="file"
                          className="hidden"
                          accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png,.gif"
                          onChange={handleFileInputChange}
                        />
                      </div>
                    )}

                    {/* URL Input Section */}
                    {uploadMethod === 'url' && (
                      <FormField
                        control={form.control}
                        name="documentUrl"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Document URL</FormLabel>
                            <FormControl>
                              <Input placeholder="https://..." {...field} value={field.value || ''} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}

                    <div className="flex justify-end space-x-3">
                      <Button type="button" variant="outline" onClick={handleDialogClose}>
                        Cancel
                      </Button>
                      <Button 
                        type="submit" 
                        disabled={createDocumentMutation.isPending || uploadDocumentMutation.isPending}
                      >
                        {(createDocumentMutation.isPending || uploadDocumentMutation.isPending) ? (
                          uploadMethod === 'file' ? "Uploading..." : "Adding..."
                        ) : (
                          uploadMethod === 'file' ? "Upload Document" : "Add Document"
                        )}
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
                              <span>Expires: {document.expiryDate ? formatDate(document.expiryDate.toString()) : 'No expiry date'}</span>
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
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => downloadDocument(document)}
                            >
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

      {/* Mobile Navigation */}
      <MobileNav />
    </div>
  );
}