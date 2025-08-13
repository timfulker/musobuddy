import { useState } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Upload, CheckCircle, AlertCircle, Calendar, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import GoogleCalendarIntegration from "./google-calendar-integration";

interface CalendarImportProps {
  onImportComplete?: () => void;
}

export default function CalendarImport({ onImportComplete }: CalendarImportProps) {
  // Check Google Calendar status to show appropriate tab
  const { data: calendarStatus } = useQuery({
    queryKey: ['/api/google-calendar/status'],
    queryFn: async () => {
      const response = await apiRequest('/api/google-calendar/status');
      return response.json();
    },
  });
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [importStep, setImportStep] = useState<'select' | 'importing' | 'complete'>('select');
  const [importResult, setImportResult] = useState<any>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Local Calendar File Import
  const fileImportMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('icsFile', file);
      
      const response = await apiRequest('/api/calendar/import', {
        method: 'POST',
        body: formData,
      });
      return response.json();
    },
    onSuccess: (result) => {
      setImportResult(result);
      setImportStep('complete');
      queryClient.invalidateQueries({ queryKey: ['/api/bookings'] });
      onImportComplete?.();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to import calendar file",
        variant: "destructive",
      });
      setImportStep('select');
    },
  });

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.name.endsWith('.ics')) {
      setSelectedFile(file);
    } else {
      toast({
        title: "Invalid File",
        description: "Please select a valid .ics calendar file",
        variant: "destructive",
      });
    }
  };

  const executeFileImport = () => {
    if (!selectedFile) {
      toast({
        title: "Missing File",
        description: "Please select an .ics file to import",
        variant: "destructive",
      });
      return;
    }

    setImportStep('importing');
    fileImportMutation.mutate(selectedFile);
  };

  const resetDialog = () => {
    setImportStep('select');
    setSelectedFile(null);
    setImportResult(null);
  };

  const handleDialogClose = () => {
    setIsDialogOpen(false);
    resetDialog();
  };

  return (
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Calendar className="w-4 h-4 mr-2" />
          Calendar Sync
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[700px]">
        <DialogHeader>
          <DialogTitle>Calendar Integration</DialogTitle>
          <DialogDescription>
            Sync your bookings with your calendar using Google Calendar integration or import from .ics files
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue={calendarStatus?.connected ? "google" : "import"} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="google" className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Google Calendar
            </TabsTrigger>
            <TabsTrigger value="import" className="flex items-center gap-2">
              <Upload className="w-4 h-4" />
              Import File
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="google" className="mt-6">
            <GoogleCalendarIntegration />
          </TabsContent>
          
          <TabsContent value="import" className="mt-6">
            <div className="text-center mb-6">
              <h3 className="text-lg font-medium mb-2">Import Calendar File (.ics)</h3>
              <p className="text-muted-foreground">
                Import your existing bookings from Apple Calendar, Outlook, or other calendar apps
              </p>
            </div>

            {importStep === 'select' && (
              <div className="space-y-4">
                <div>
              <Label htmlFor="file-upload">Calendar File (.ics)</Label>
              <Input
                id="file-upload"
                type="file"
                accept=".ics"
                onChange={handleFileUpload}
                className="mt-2"
              />
              {selectedFile && (
                <p className="text-sm text-muted-foreground mt-2">
                  Selected: {selectedFile.name}
                </p>
              )}
            </div>
            
            <div className="bg-muted p-4 rounded-lg">
              <h4 className="font-medium mb-2">How to export your calendar:</h4>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li>• <strong>Google Calendar:</strong> Settings → Import & Export → Export</li>
                <li>• <strong>Apple Calendar:</strong> File → Export → Export as .ics</li>
                <li>• <strong>Outlook:</strong> File → Save Calendar → iCalendar format</li>
              </ul>
            </div>

                <div className="flex justify-end">
                  <Button onClick={executeFileImport} disabled={!selectedFile}>
                    Import Events
                  </Button>
                </div>
              </div>
            )}

            {importStep === 'importing' && (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-muted-foreground">Importing calendar events...</p>
              </div>
            )}

            {importStep === 'complete' && importResult && (
              <div className="space-y-4">
                <div className="flex items-center text-green-600">
                  <CheckCircle className="w-5 h-5 mr-2" />
                  <span className="font-medium">Import Complete!</span>
                </div>
                
                <div className="bg-muted p-4 rounded-lg space-y-2">
                  <p><strong>Created:</strong> {importResult.created} new bookings</p>
                  <p><strong>Skipped:</strong> {importResult.skipped} duplicate events</p>
                  {importResult.errors && importResult.errors.length > 0 && (
                    <div className="flex items-start text-amber-600">
                      <AlertCircle className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="font-medium">Warnings:</p>
                        <ul className="text-sm mt-1">
                          {importResult.errors.slice(0, 3).map((error: string, index: number) => (
                            <li key={index}>• {error}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex justify-between">
                  <Button variant="outline" onClick={handleDialogClose}>
                    Close
                  </Button>
                  <Button onClick={() => window.location.reload()}>
                    Refresh Calendar
                  </Button>
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}