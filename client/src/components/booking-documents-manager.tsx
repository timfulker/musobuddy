import { useState, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Upload, FileText, Loader2, Eye, Download, Trash2, Plus, Receipt, File } from "lucide-react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface BookingDocument {
  id: number;
  documentType: string;
  documentName: string;
  documentUrl: string;
  uploadedAt: string;
}

interface BookingDocumentsManagerProps {
  booking: any;
  isOpen: boolean;
  onClose: () => void;
}

const DOCUMENT_TYPES = [
  { value: 'contract', label: 'Contract', icon: FileText },
  { value: 'invoice', label: 'Invoice', icon: Receipt },
  { value: 'other', label: 'Other', icon: File },
];

export default function BookingDocumentsManager({ booking, isOpen, onClose }: BookingDocumentsManagerProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedDocumentType, setSelectedDocumentType] = useState<string>('other');
  const [uploading, setUploading] = useState(false);

  // Query to get all documents for this booking
  const { data: documentsResponse, isLoading: loadingDocuments, error: queryError, refetch } = useQuery({
    queryKey: [`/api/bookings/${booking?.id}/documents`],
    queryFn: async () => {
      if (!booking?.id) {
        console.log('📄 No booking ID provided');
        return { success: false, documents: [] };
      }
      console.log(`📄 Fetching documents for booking ${booking.id}...`);
      try {
        const response = await apiRequest(`/api/bookings/${booking.id}/documents`);
        console.log('📄 Response status:', response.status);
        const data = await response.json();
        console.log('📄 Documents response:', data);
        return data;
      } catch (error: any) {
        console.error('📄 Failed to fetch documents:', error);
        return { success: false, documents: [], error: error.message };
      }
    },
    enabled: !!booking?.id && isOpen,
    retry: false,
    refetchOnWindowFocus: true,
  });

  const documents = documentsResponse?.documents || [];

  // Upload mutation
  const uploadMutation = useMutation({
    mutationFn: async ({ file, documentType }: { file: File; documentType: string }) => {
      const formData = new FormData();
      formData.append('document', file);
      formData.append('documentType', documentType);

      const response = await apiRequest(`/api/bookings/${booking.id}/documents`, {
        method: 'POST',
        body: formData,
      });

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/bookings/${booking.id}/documents`] });
      queryClient.invalidateQueries({ queryKey: ["/api/bookings"] });
      toast({
        title: "Success",
        description: "Document uploaded successfully",
      });
      setSelectedFile(null);
      setSelectedDocumentType('other');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    },
    onError: (error: any) => {
      toast({
        title: "Upload Failed",
        description: error.message || "Failed to upload document",
        variant: "destructive",
      });
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (documentId: number) => {
      const response = await apiRequest(`/api/documents/${documentId}`, {
        method: 'DELETE',
      });
      return response.json();
    },
    onSuccess: () => {
      // Force immediate cache refresh
      queryClient.invalidateQueries({ queryKey: [`/api/bookings/${booking.id}/documents`] });
      queryClient.refetchQueries({ queryKey: [`/api/bookings/${booking.id}/documents`] });
      queryClient.invalidateQueries({ queryKey: ["/api/bookings"] });
      toast({
        title: "Success",
        description: "Document removed successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to remove document",
        variant: "destructive",
      });
    },
  });

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.type !== 'application/pdf') {
        toast({
          title: "Invalid File Type",
          description: "Please select a PDF file",
          variant: "destructive",
        });
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: "File Too Large",
          description: "File size must be less than 10MB",
          variant: "destructive",
        });
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !selectedDocumentType) return;
    
    setUploading(true);
    try {
      await uploadMutation.mutateAsync({ file: selectedFile, documentType: selectedDocumentType });
    } finally {
      setUploading(false);
    }
  };

  const handleView = (documentUrl: string) => {
    window.open(documentUrl, '_blank');
  };

  const handleDownload = (documentUrl: string, documentName: string) => {
    const link = document.createElement('a');
    link.href = documentUrl;
    link.download = documentName;
    link.click();
  };

  const handleDelete = async (documentId: number, documentName: string) => {
    if (confirm(`Are you sure you want to remove "${documentName}"?`)) {
      await deleteMutation.mutateAsync(documentId);
    }
  };

  const getDocumentTypeInfo = (type: string) => {
    return DOCUMENT_TYPES.find(t => t.value === type) || DOCUMENT_TYPES[2]; // Default to 'other'
  };

  // Only allow upload if we have successfully loaded documents AND under the limit
  // FIXED: Always allow upload if API fails to load documents (better UX)
  const canUploadMore = !loadingDocuments && (
    documentsResponse === undefined || // First load
    documentsResponse?.success !== false || // API success
    (documentsResponse?.success === false && documents.length === 0) // API failed but no documents
  ) && documents.length < 5;
  
  // Debug logging
  console.log('📄 Upload availability check:', {
    loadingDocuments,
    documentsResponse,
    documentsLength: documents.length,
    canUploadMore,
    queryError
  });

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Document Management</DialogTitle>
          <DialogDescription>
            Manage documents for booking: {booking?.title || booking?.clientName} (Max: 5 documents)
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Existing Documents */}
          {loadingDocuments ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : documents.length > 0 ? (
            <div className="space-y-3">
              <h3 className="font-medium text-gray-900">Documents ({documents.length}/5)</h3>
              {documents.map((doc) => {
                const typeInfo = getDocumentTypeInfo(doc.documentType);
                const TypeIcon = typeInfo.icon;
                
                return (
                  <div key={doc.id} className="flex items-center justify-between p-4 bg-gray-50 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                        <TypeIcon className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-gray-900">{doc.documentName}</p>
                          <Badge variant="outline" className="text-xs">
                            {typeInfo.label}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-500">
                          Uploaded: {new Date(doc.uploadedAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleView(doc.documentUrl)}
                      >
                        <Eye className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDownload(doc.documentUrl, doc.documentName)}
                      >
                        <Download className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(doc.id, doc.documentName)}
                        disabled={deleteMutation.isPending}
                        className="text-red-600 hover:text-red-700"
                      >
                        {deleteMutation.isPending ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Trash2 className="h-3 w-3" />
                        )}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-6 border-2 border-dashed border-gray-300 rounded-lg bg-gray-50">
              <FileText className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600">No documents uploaded yet</p>
            </div>
          )}

          {/* Upload Section */}
          {canUploadMore && (
            <>
              {documents.length > 0 && (
                <div className="border-t pt-6">
                  <h3 className="font-medium text-gray-900 mb-4">Add New Document</h3>
                </div>
              )}

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="documentType">Document Type</Label>
                    <Select value={selectedDocumentType} onValueChange={setSelectedDocumentType}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        {DOCUMENT_TYPES.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            <div className="flex items-center gap-2">
                              <type.icon className="w-4 h-4" />
                              {type.label}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="document">Select File</Label>
                    <Input
                      ref={fileInputRef}
                      id="document"
                      type="file"
                      accept=".pdf"
                      onChange={handleFileSelect}
                      className="cursor-pointer"
                    />
                  </div>
                </div>

                <p className="text-xs text-gray-500">
                  Only PDF files up to 10MB are allowed
                </p>

                {selectedFile && (
                  <Alert>
                    <FileText className="h-4 w-4" />
                    <AlertDescription>
                      Selected: {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)}MB)
                    </AlertDescription>
                  </Alert>
                )}

                <div className="flex gap-2">
                  <Button
                    onClick={handleUpload}
                    disabled={!selectedFile || uploading}
                    className="flex-1"
                  >
                    {uploading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Plus className="h-4 w-4 mr-2" />
                        Add Document
                      </>
                    )}
                  </Button>
                  <Button
                    onClick={onClose}
                    variant="outline"
                    disabled={uploading}
                  >
                    Close
                  </Button>
                </div>
              </div>
            </>
          )}

          {!canUploadMore && !loadingDocuments && (
            <Alert>
              <FileText className="h-4 w-4" />
              <AlertDescription>
                {documents.length >= 5
                  ? "Maximum of 5 documents per booking reached. Remove a document to add a new one."
                  : documentsResponse?.success === false 
                    ? "Unable to load existing documents, but you can still upload new ones above."
                    : "Document upload is currently unavailable."
                }
              </AlertDescription>
            </Alert>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}