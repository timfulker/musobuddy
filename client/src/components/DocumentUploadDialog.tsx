import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, FileText, CheckCircle, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface DocumentUploadDialogProps {
  booking: any;
  open: boolean;
  onClose: () => void;
}

export default function DocumentUploadDialog({ booking, open, onClose }: DocumentUploadDialogProps) {
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [documentType, setDocumentType] = useState<string>("contract");
  const [uploadedDocuments, setUploadedDocuments] = useState<any[]>([]);
  const [loadingDocuments, setLoadingDocuments] = useState(false);

  // Fetch existing documents when dialog opens
  React.useEffect(() => {
    if (open && booking) {
      fetchDocuments();
    }
  }, [open, booking]);

  const fetchDocuments = async () => {
    setLoadingDocuments(true);
    try {
      const response = await apiRequest(`/api/bookings/${booking.id}/documents`);
      setUploadedDocuments(response.documents || []);
    } catch (error) {
      console.error('Failed to fetch documents:', error);
    } finally {
      setLoadingDocuments(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type === 'application/pdf') {
        setSelectedFile(file);
      } else {
        toast({
          title: "Invalid file type",
          description: "Please select a PDF file",
          variant: "destructive",
        });
      }
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      toast({
        title: "No file selected",
        description: "Please select a PDF file to upload",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append('document', selectedFile);
    formData.append('type', documentType);

    try {
      const response = await fetch(`/api/bookings/${booking.id}/upload-document`, {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Upload failed');
      }

      toast({
        title: "Success",
        description: `${documentType === 'contract' ? 'Contract' : documentType === 'invoice' ? 'Invoice' : 'Document'} uploaded successfully`,
      });
      
      // Refresh documents list
      await fetchDocuments();
      
      // Clear selection
      setSelectedFile(null);
      
      // Invalidate bookings query to refresh the list
      queryClient.invalidateQueries({ queryKey: ["/api/bookings"] });
      
    } catch (error: any) {
      console.error('Upload error:', error);
      toast({
        title: "Upload failed",
        description: error.message || "Failed to upload document",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={() => onClose()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Upload Document for Booking</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          {/* Booking Info */}
          <div className="bg-gray-50 p-3 rounded-lg">
            <p className="text-sm text-gray-600">
              <span className="font-medium">Client:</span> {booking?.clientName || 'Unknown'}
            </p>
            <p className="text-sm text-gray-600">
              <span className="font-medium">Event:</span> {booking?.eventType || 'Event'} - {booking?.eventDate ? new Date(booking.eventDate).toLocaleDateString() : 'Date TBC'}
            </p>
          </div>

          {/* Existing Documents */}
          {uploadedDocuments.length > 0 && (
            <div className="space-y-2">
              <Label>Existing Documents</Label>
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {uploadedDocuments.map((doc, index) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg text-sm">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-gray-500" />
                      <span className="font-medium">{doc.type === 'contract' ? 'Contract' : doc.type === 'invoice' ? 'Invoice' : 'Document'}</span>
                      <span className="text-gray-500">- {doc.filename}</span>
                    </div>
                    <a 
                      href={doc.url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 text-xs"
                    >
                      View
                    </a>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Document Type Selection */}
          <div className="space-y-2">
            <Label htmlFor="document-type">Document Type</Label>
            <Select value={documentType} onValueChange={setDocumentType}>
              <SelectTrigger>
                <SelectValue placeholder="Select document type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="contract">Contract</SelectItem>
                <SelectItem value="invoice">Invoice</SelectItem>
                <SelectItem value="general">Other Document</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* File Upload */}
          <div className="space-y-2">
            <Label htmlFor="file-upload">Select PDF File</Label>
            <div className="flex items-center gap-2">
              <Input
                id="file-upload"
                type="file"
                accept=".pdf"
                onChange={handleFileChange}
                disabled={uploading}
                className="flex-1"
              />
            </div>
            {selectedFile && (
              <p className="text-sm text-gray-600 flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                Selected: {selectedFile.name}
              </p>
            )}
          </div>

          {/* Note about AI parsing */}
          <div className="bg-blue-50 p-3 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>Note:</strong> This will simply upload and store the PDF file. No AI parsing or data extraction will be performed. The document will be attached to this booking for reference.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={uploading}>
            Cancel
          </Button>
          <Button onClick={handleUpload} disabled={uploading || !selectedFile}>
            {uploading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Uploading...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4 mr-2" />
                Upload Document
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}