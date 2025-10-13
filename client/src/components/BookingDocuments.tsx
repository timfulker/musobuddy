import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Upload, File, Trash2, Download, AlertCircle } from "lucide-react";
import { 
  useBookingDocuments, 
  useUploadDocument, 
  useDeleteDocument, 
  useGetDocumentDownload 
} from "@/hooks/useBookingDocuments";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface BookingDocumentsProps {
  bookingId: number;
}

export function BookingDocuments({ bookingId }: BookingDocumentsProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [documentType, setDocumentType] = useState<string>("other");
  const [uploadError, setUploadError] = useState<string>("");

  const { data: documents, isLoading, error } = useBookingDocuments(bookingId);
  const uploadMutation = useUploadDocument();
  const deleteMutation = useDeleteDocument();
  const downloadMutation = useGetDocumentDownload();

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setUploadError("");
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setUploadError("Please select a file first");
      return;
    }

    try {
      await uploadMutation.mutateAsync({
        bookingId,
        file: selectedFile,
        documentType,
      });
      
      setSelectedFile(null);
      setDocumentType("other");
      // Reset file input
      const fileInput = document.getElementById('document-upload') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
      
    } catch (error: any) {
      setUploadError(error.message || "Failed to upload document");
    }
  };

  const handleDelete = async (documentId: number) => {
    if (confirm("Are you sure you want to delete this document?")) {
      try {
        await deleteMutation.mutateAsync({ bookingId, documentId });
      } catch (error: any) {
        console.error("Failed to delete document:", error);
      }
    }
  };

  const handleDownload = async (documentId: number, documentName: string) => {
    try {
      const result = await downloadMutation.mutateAsync({ bookingId, documentId });
      
      // Open download URL in new tab
      window.open(result.downloadUrl, '_blank');
      
    } catch (error: any) {
      console.error("Failed to get download URL:", error);
    }
  };

  const getDocumentTypeLabel = (type: string) => {
    switch (type) {
      case 'contract': return 'Contract';
      case 'invoice': return 'Invoice';
      case 'other': return 'Other';
      default: return type;
    }
  };

  const getDocumentTypeColor = (type: string) => {
    switch (type) {
      case 'contract': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      case 'invoice': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300';
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <File className="h-5 w-5" />
            Documents
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            Loading documents...
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <File className="h-5 w-5" />
            Documents
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Failed to load documents. Please try again.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <File className="h-5 w-5" />
          Documents
          {documents && documents.length > 0 && (
            <Badge variant="secondary">{documents.length}</Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Upload Section */}
        <div className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg p-4">
          <div className="space-y-3">
            <div>
              <label htmlFor="document-upload" className="cursor-pointer">
                <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
                  <Upload className="h-4 w-4" />
                  Choose file to upload
                </div>
              </label>
              <input
                id="document-upload"
                type="file"
                onChange={handleFileSelect}
                className="hidden"
                accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png,.gif"
              />
            </div>

            {selectedFile && (
              <div className="space-y-2">
                <div className="text-sm">
                  Selected: <span className="font-medium">{selectedFile.name}</span>
                </div>
                
                <Select value={documentType} onValueChange={setDocumentType}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select document type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="contract">Contract</SelectItem>
                    <SelectItem value="invoice">Invoice</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>

                <Button 
                  onClick={handleUpload} 
                  disabled={uploadMutation.isPending}
                  className="w-full"
                >
                  {uploadMutation.isPending ? "Uploading..." : "Upload Document"}
                </Button>
              </div>
            )}

            {uploadError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{uploadError}</AlertDescription>
              </Alert>
            )}
          </div>
        </div>

        {/* Documents List */}
        {documents && documents.length > 0 ? (
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Uploaded Documents</h4>
            {documents.map((document: any) => (
              <div
                key={document.id}
                className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <File className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate">
                      {document.documentName}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(document.uploadedAt).toLocaleDateString()}
                    </div>
                  </div>
                  <Badge 
                    variant="secondary" 
                    className={getDocumentTypeColor(document.documentType)}
                  >
                    {getDocumentTypeLabel(document.documentType)}
                  </Badge>
                </div>
                
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDownload(document.id, document.documentName)}
                    disabled={downloadMutation.isPending}
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(document.id)}
                    disabled={deleteMutation.isPending}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <File className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No documents uploaded yet</p>
            <p className="text-sm">Upload files to keep all booking documents in one place</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}