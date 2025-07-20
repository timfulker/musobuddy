import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Upload, FileText, Download, Eye, Edit, Save, Clock, User } from 'lucide-react';
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

interface ContractExtraction {
  id: number;
  importedContractId: number;
  extractedData: {
    clientName?: string;
    clientEmail?: string;
    clientAddress?: string;
    venue?: string;
    venueAddress?: string;
    eventDate?: string;
    eventTime?: string;
    eventEndTime?: string;
    fee?: number;
    equipmentRequirements?: string;
    specialRequirements?: string;
    performanceDuration?: number;
    eventType?: string;
  };
  extractionTimeSeconds: number;
  userId: string;
  createdAt: string;
}

function ManualExtractionInterface({ contracts }: { contracts: ImportedContract[] }) {
  const [selectedContract, setSelectedContract] = useState<ImportedContract | null>(null);
  const [extractionData, setExtractionData] = useState({
    clientName: '',
    clientEmail: '',
    clientAddress: '',
    venue: '',
    venueAddress: '',
    eventDate: '',
    eventTime: '',
    eventEndTime: '',
    fee: '',
    equipmentRequirements: '',
    specialRequirements: '',
    performanceDuration: '',
    eventType: '',
  });
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const handleStartExtraction = (contract: ImportedContract) => {
    setSelectedContract(contract);
    setStartTime(new Date());
    setExtractionData({
      clientName: '',
      clientEmail: '',
      clientAddress: '',
      venue: '',
      venueAddress: '',
      eventDate: '',
      eventTime: '',
      eventEndTime: '',
      fee: '',
      equipmentRequirements: '',
      specialRequirements: '',
      performanceDuration: '',
      eventType: '',
    });
  };

  const handleSaveExtraction = async () => {
    if (!selectedContract || !startTime) return;

    setIsExtracting(true);
    const extractionTimeSeconds = Math.floor((new Date().getTime() - startTime.getTime()) / 1000);

    try {
      // Convert fee and duration to numbers
      const numericData = {
        ...extractionData,
        fee: extractionData.fee ? parseFloat(extractionData.fee) : undefined,
        performanceDuration: extractionData.performanceDuration ? parseInt(extractionData.performanceDuration) : undefined,
      };

      // Remove empty strings and undefined values
      const cleanedData = Object.fromEntries(
        Object.entries(numericData).filter(([_, value]) => value !== '' && value !== undefined)
      );

      await apiRequest('/api/contracts/save-extraction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          importedContractId: selectedContract.id,
          extractedData: cleanedData,
          extractionTimeSeconds,
        }),
      });

      queryClient.invalidateQueries({ queryKey: ['/api/contracts/extractions'] });
      
      toast({
        title: 'Success',
        description: `Manual extraction saved in ${extractionTimeSeconds} seconds`,
      });

      setSelectedContract(null);
      setStartTime(null);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to save extraction data',
        variant: 'destructive',
      });
    } finally {
      setIsExtracting(false);
    }
  };

  const openContractForExtraction = (contract: ImportedContract) => {
    if (contract.cloudStorageUrl) {
      window.open(contract.cloudStorageUrl, '_blank');
    }
  };

  return (
    <div className="space-y-6">
      {!selectedContract ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Edit className="h-5 w-5" />
              Select Contract for Manual Extraction
            </CardTitle>
          </CardHeader>
          <CardContent>
            {contracts.length === 0 ? (
              <div className="text-center py-8">
                <FileText className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                <p className="text-gray-500">No contracts available for extraction</p>
                <p className="text-sm text-gray-400 mt-1">
                  Upload contracts in the Upload tab first
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {contracts.map((contract) => (
                  <div
                    key={contract.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <FileText className="h-4 w-4 text-blue-500" />
                        <span className="font-medium">{contract.filename}</span>
                        <Badge variant="secondary">{contract.contractType}</Badge>
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        Uploaded {new Date(contract.uploadedAt).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openContractForExtraction(contract)}
                      >
                        <Eye className="h-4 w-4" />
                        View PDF
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleStartExtraction(contract)}
                      >
                        <Edit className="h-4 w-4" />
                        Extract Data
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Edit className="h-5 w-5" />
                Extracting from: {selectedContract.filename}
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Clock className="h-4 w-4" />
                {startTime && `Started: ${startTime.toLocaleTimeString()}`}
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex gap-2 mb-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => openContractForExtraction(selectedContract)}
              >
                <Eye className="h-4 w-4" />
                View PDF
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedContract(null)}
              >
                Cancel
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Client Information */}
              <div className="space-y-4">
                <h3 className="font-semibold text-gray-900 dark:text-white">Client Information</h3>
                
                <div>
                  <Label htmlFor="clientName">Client Name</Label>
                  <Input
                    id="clientName"
                    value={extractionData.clientName}
                    onChange={(e) => setExtractionData(prev => ({ ...prev, clientName: e.target.value }))}
                    placeholder="Enter client name"
                  />
                </div>

                <div>
                  <Label htmlFor="clientEmail">Client Email</Label>
                  <Input
                    id="clientEmail"
                    type="email"
                    value={extractionData.clientEmail}
                    onChange={(e) => setExtractionData(prev => ({ ...prev, clientEmail: e.target.value }))}
                    placeholder="Enter client email"
                  />
                </div>

                <div>
                  <Label htmlFor="clientAddress">Client Address</Label>
                  <Textarea
                    id="clientAddress"
                    value={extractionData.clientAddress}
                    onChange={(e) => setExtractionData(prev => ({ ...prev, clientAddress: e.target.value }))}
                    placeholder="Enter client address"
                    rows={3}
                  />
                </div>
              </div>

              {/* Event Information */}
              <div className="space-y-4">
                <h3 className="font-semibold text-gray-900 dark:text-white">Event Information</h3>
                
                <div>
                  <Label htmlFor="venue">Venue</Label>
                  <Input
                    id="venue"
                    value={extractionData.venue}
                    onChange={(e) => setExtractionData(prev => ({ ...prev, venue: e.target.value }))}
                    placeholder="Enter venue name"
                  />
                </div>

                <div>
                  <Label htmlFor="venueAddress">Venue Address</Label>
                  <Textarea
                    id="venueAddress"
                    value={extractionData.venueAddress}
                    onChange={(e) => setExtractionData(prev => ({ ...prev, venueAddress: e.target.value }))}
                    placeholder="Enter venue address"
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label htmlFor="eventDate">Event Date</Label>
                    <Input
                      id="eventDate"
                      type="date"
                      value={extractionData.eventDate}
                      onChange={(e) => setExtractionData(prev => ({ ...prev, eventDate: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="eventType">Event Type</Label>
                    <Input
                      id="eventType"
                      value={extractionData.eventType}
                      onChange={(e) => setExtractionData(prev => ({ ...prev, eventType: e.target.value }))}
                      placeholder="Wedding, corporate, etc."
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label htmlFor="eventTime">Start Time</Label>
                    <Input
                      id="eventTime"
                      type="time"
                      value={extractionData.eventTime}
                      onChange={(e) => setExtractionData(prev => ({ ...prev, eventTime: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="eventEndTime">End Time</Label>
                    <Input
                      id="eventEndTime"
                      type="time"
                      value={extractionData.eventEndTime}
                      onChange={(e) => setExtractionData(prev => ({ ...prev, eventEndTime: e.target.value }))}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Financial and Requirements */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-4">
                <h3 className="font-semibold text-gray-900 dark:text-white">Financial</h3>
                
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label htmlFor="fee">Fee (£)</Label>
                    <Input
                      id="fee"
                      type="number"
                      step="0.01"
                      value={extractionData.fee}
                      onChange={(e) => setExtractionData(prev => ({ ...prev, fee: e.target.value }))}
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <Label htmlFor="performanceDuration">Duration (minutes)</Label>
                    <Input
                      id="performanceDuration"
                      type="number"
                      value={extractionData.performanceDuration}
                      onChange={(e) => setExtractionData(prev => ({ ...prev, performanceDuration: e.target.value }))}
                      placeholder="120"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="font-semibold text-gray-900 dark:text-white">Requirements</h3>
                
                <div>
                  <Label htmlFor="equipmentRequirements">Equipment Requirements</Label>
                  <Textarea
                    id="equipmentRequirements"
                    value={extractionData.equipmentRequirements}
                    onChange={(e) => setExtractionData(prev => ({ ...prev, equipmentRequirements: e.target.value }))}
                    placeholder="PA system, microphones, etc."
                    rows={2}
                  />
                </div>

                <div>
                  <Label htmlFor="specialRequirements">Special Requirements</Label>
                  <Textarea
                    id="specialRequirements"
                    value={extractionData.specialRequirements}
                    onChange={(e) => setExtractionData(prev => ({ ...prev, specialRequirements: e.target.value }))}
                    placeholder="Parking, access requirements, etc."
                    rows={2}
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => setSelectedContract(null)}
                disabled={isExtracting}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveExtraction}
                disabled={isExtracting}
              >
                <Save className="h-4 w-4 mr-2" />
                {isExtracting ? 'Saving...' : 'Save Extraction'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
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
      const response = await fetch('/api/contracts/import', {
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
          Upload contracts and manually extract key information to build training data for automatic parsing
        </p>
      </div>

      <Tabs defaultValue="upload" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="upload">Upload Contracts</TabsTrigger>
          <TabsTrigger value="extract">Manual Extraction</TabsTrigger>
        </TabsList>

        {/* Upload Tab */}
        <TabsContent value="upload" className="space-y-6">
          {/* Upload Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                Upload Contract PDF
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="file-upload">Select Contract PDF</Label>
                <Input
                  id="file-upload"
                  type="file"
                  accept=".pdf"
                  onChange={handleFileSelect}
                  className="mt-1"
                />
              </div>

              {selectedFile && (
                <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <FileText className="h-4 w-4" />
                    <span className="font-medium">{selectedFile.name}</span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Size: {formatFileSize(selectedFile.size)}
                  </p>
                </div>
              )}

              <div>
                <Label htmlFor="contract-type">Contract Type</Label>
                <Select value={contractType} onValueChange={setContractType}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select contract type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="musicians_union">Musicians Union Contract</SelectItem>
                    <SelectItem value="custom">Custom Contract</SelectItem>
                    <SelectItem value="unknown">Unknown</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button
                onClick={handleUpload}
                disabled={!selectedFile || isUploading}
                className="w-full"
              >
                {isUploading ? 'Uploading...' : 'Upload Contract'}
              </Button>
            </CardContent>
          </Card>

          {/* Uploaded Contracts List */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Uploaded Contracts ({contracts.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-8">
                  <div className="text-gray-500">Loading contracts...</div>
                </div>
              ) : contracts.length === 0 ? (
                <div className="text-center py-8">
                  <FileText className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                  <p className="text-gray-500">No contracts uploaded yet</p>
                  <p className="text-sm text-gray-400 mt-1">
                    Upload your first contract to start building the learning dataset
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {contracts.map((contract) => (
                    <div
                      key={contract.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <FileText className="h-4 w-4 text-blue-500" />
                          <span className="font-medium">{contract.filename}</span>
                          <Badge variant="secondary">{contract.contractType}</Badge>
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          {formatFileSize(contract.fileSize)} • {formatDate(contract.uploadedAt)}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openContractPDF(contract)}
                        >
                          <Eye className="h-4 w-4" />
                          View PDF
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Manual Extraction Tab */}
        <TabsContent value="extract" className="space-y-6">
          <ManualExtractionInterface contracts={contracts} />
        </TabsContent>
      </Tabs>
    </div>
  );
}