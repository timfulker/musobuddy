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
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Upload, FileText, Loader2, Check, Eye, Download, Trash2 } from "lucide-react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { findActiveAuthToken } from "@/utils/authToken";

interface BookingDocumentUploadProps {
  booking: any;
  isOpen: boolean;
  onClose: () => void;
}

export default function BookingDocumentUpload({ booking, isOpen, onClose }: BookingDocumentUploadProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  // Query to check if document exists
  const { data: existingDocument, isLoading: checkingDocument } = useQuery<{
    success: boolean;
    documentUrl?: string;
    documentName?: string;
    uploadedAt?: string;
  }>({
    queryKey: [`/api/bookings/${booking?.id}/document`],
    queryFn: () => booking?.id ? apiRequest(`/api/bookings/${booking.id}/document`) : null,
    enabled: !!booking?.id && isOpen,
    retry: false,
  });

  // Upload mutation
  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('document', file);

      // Get the auth token
      const authToken = localStorage.getItem('authToken') || 
                       findActiveAuthToken();
      
      const headers: any = {};
      if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
      }

      const response = await fetch(`/api/bookings/${booking.id}/upload-document`, {
        method: 'POST',
        body: formData,
        credentials: 'include',
        headers,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Upload failed');
      }

      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [`/api/bookings/${booking.id}/document`] });
      queryClient.invalidateQueries({ queryKey: ["/api/bookings"] });
      toast({
        title: "Success",
        description: "Document uploaded successfully",
      });
      setSelectedFile(null);
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
    mutationFn: async () => {
      return apiRequest(`/api/bookings/${booking.id}/document`, {
        method: 'DELETE',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/bookings/${booking.id}/document`] });
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
    if (!selectedFile) return;
    
    setUploading(true);
    try {
      await uploadMutation.mutateAsync(selectedFile);
    } finally {
      setUploading(false);
    }
  };

  const handleView = () => {
    if (existingDocument?.documentUrl) {
      window.open(existingDocument.documentUrl, '_blank');
    }
  };

  const handleDownload = () => {
    if (existingDocument?.documentUrl) {
      const link = document.createElement('a');
      link.href = existingDocument.documentUrl;
      link.download = existingDocument.documentName || 'document.pdf';
      link.click();
    }
  };

  const handleDelete = async () => {
    if (confirm('Are you sure you want to remove this document?')) {
      await deleteMutation.mutateAsync();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Document Management</DialogTitle>
          <DialogDescription>
            Upload or manage documents for booking: {booking?.title || booking?.clientName}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {checkingDocument ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : existingDocument?.documentUrl ? (
            // Document exists - show view/download/delete options
            <div className="space-y-4">
              <Alert>
                <FileText className="h-4 w-4" />
                <AlertDescription>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{existingDocument.documentName}</p>
                      <p className="text-sm text-muted-foreground">
                        Uploaded: {new Date(existingDocument.uploadedAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </AlertDescription>
              </Alert>

              <div className="flex gap-2">
                <Button
                  onClick={handleView}
                  variant="outline"
                  className="flex-1"
                >
                  <Eye className="h-4 w-4 mr-2" />
                  View
                </Button>
                <Button
                  onClick={handleDownload}
                  variant="outline"
                  className="flex-1"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </Button>
                <Button
                  onClick={handleDelete}
                  variant="outline"
                  className="flex-1 text-red-600 hover:text-red-700"
                  disabled={deleteMutation.isPending}
                >
                  {deleteMutation.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4 mr-2" />
                  )}
                  Remove
                </Button>
              </div>

              <div className="border-t pt-4">
                <p className="text-sm text-muted-foreground mb-2">Replace with a new document:</p>
              </div>
            </div>
          ) : null}

          {/* Upload section */}
          {(!existingDocument?.documentUrl || existingDocument?.documentUrl) && (
            <>
              <div className="space-y-2">
                <Label htmlFor="document">
                  {existingDocument?.documentUrl ? 'Replace Document' : 'Select Document'}
                </Label>
                <Input
                  ref={fileInputRef}
                  id="document"
                  type="file"
                  accept=".pdf"
                  onChange={handleFileSelect}
                  className="cursor-pointer"
                />
                <p className="text-xs text-muted-foreground">
                  Only PDF files up to 10MB are allowed
                </p>
              </div>

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
                      <Upload className="h-4 w-4 mr-2" />
                      Upload Document
                    </>
                  )}
                </Button>
                <Button
                  onClick={onClose}
                  variant="outline"
                  disabled={uploading}
                >
                  Cancel
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}