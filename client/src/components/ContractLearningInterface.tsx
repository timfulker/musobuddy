import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Upload, FileText, Download, Eye } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';

interface ImportedContract {
  id: number;
  filename: string;
  fileSize: number;
  contractType: string;
  uploadedAt: string;
  cloudStorageUrl: string;
  bookingId?: number;
}

export function ContractLearningInterface() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [contractType, setContractType] = useState<string>('unknown');
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch imported contracts
  const { data: contracts = [], isLoading } = useQuery<ImportedContract[]>({
    queryKey: ['/api/contracts/imported'],
  });

  // Upload contract mutation
  const uploadMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const response = await fetch('/api/contracts/import-pdf', {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Upload failed');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/contracts/imported'] });
      setSelectedFile(null);
      setContractType('unknown');
      setIsUploading(false);
      toast({
        title: 'Success',
        description: 'Contract PDF uploaded successfully',
      });
    },
    onError: (error: Error) => {
      setIsUploading(false);
      toast({
        title: 'Upload Failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.type !== 'application/pdf') {
        toast({
          title: 'Invalid File Type',
          description: 'Please select a PDF file',
          variant: 'destructive',
        });
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('contractType', contractType);

    uploadMutation.mutate(formData);
  };

  const openContractPDF = (contract: ImportedContract) => {
    if (contract.cloudStorageUrl) {
      window.open(contract.cloudStorageUrl, '_blank');
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Contract Learning System</h2>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Phase 1: Import contract PDFs for the learning system. Manual data extraction coming in Phase 2.
        </p>
      </div>

      {/* Upload Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Import Contract PDF
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="contract-file">Select PDF File</Label>
            <Input
              id="contract-file"
              type="file"
              accept=".pdf"
              onChange={handleFileSelect}
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="contract-type">Contract Type</Label>
            <Select value={contractType} onValueChange={setContractType}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="unknown">Unknown</SelectItem>
                <SelectItem value="musicians_union">Musicians Union</SelectItem>
                <SelectItem value="custom">Custom</SelectItem>
                <SelectItem value="wedding">Wedding Contract</SelectItem>
                <SelectItem value="corporate">Corporate Event</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {selectedFile && (
            <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-md">
              <p className="text-sm">
                <strong>Selected:</strong> {selectedFile.name} ({formatFileSize(selectedFile.size)})
              </p>
            </div>
          )}

          <Button
            onClick={handleUpload}
            disabled={!selectedFile || isUploading}
            className="w-full"
          >
            {isUploading ? 'Uploading...' : 'Upload Contract PDF'}
          </Button>
        </CardContent>
      </Card>

      {/* Imported Contracts List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Imported Contracts ({contracts.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">
              <p>Loading contracts...</p>
            </div>
          ) : contracts.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No contracts imported yet</p>
              <p className="text-sm">Upload your first contract PDF to get started</p>
            </div>
          ) : (
            <div className="space-y-3">
              {contracts.map((contract) => (
                <div
                  key={contract.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <FileText className="h-4 w-4 text-red-500" />
                      <div>
                        <p className="font-medium">{contract.filename}</p>
                        <p className="text-sm text-gray-500">
                          {contract.contractType} • {formatFileSize(contract.fileSize)} • {formatDate(contract.uploadedAt)}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openContractPDF(contract)}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      View PDF
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled
                      title="Coming in Phase 2"
                    >
                      Extract Data
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Next Phase Preview */}
      <Card className="border-blue-200 bg-blue-50 dark:bg-blue-950/20">
        <CardHeader>
          <CardTitle className="text-blue-800 dark:text-blue-200">Coming Next: Phase 2</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm text-blue-700 dark:text-blue-300">
            <li>• Manual data extraction interface for each uploaded contract</li>
            <li>• Form fields to extract key information (client name, date, venue, fee, etc.)</li>
            <li>• Timer tracking for extraction speed measurement</li>
            <li>• Learning pattern storage for future automation</li>
            <li>• Recognition of Musicians Union contract patterns</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}