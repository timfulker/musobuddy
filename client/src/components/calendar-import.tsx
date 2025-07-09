import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, Link, Calendar, CheckCircle, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface CalendarImportProps {
  onImportComplete?: () => void;
}

export default function CalendarImport({ onImportComplete }: CalendarImportProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [importType, setImportType] = useState<'google' | 'apple' | null>(null);
  const [googleTokens, setGoogleTokens] = useState<any>(null);
  const [googleCalendars, setGoogleCalendars] = useState<any[]>([]);
  const [selectedCalendar, setSelectedCalendar] = useState<string>('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [importStep, setImportStep] = useState<'select' | 'configure' | 'importing' | 'complete'>('select');
  const [importResult, setImportResult] = useState<any>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Google Calendar Authentication
  const googleAuthMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('/api/calendar/google/auth');
      return response.json();
    },
    onSuccess: (data) => {
      // Redirect to Google OAuth (full page redirect for better compatibility)
      window.location.href = data.authUrl;
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to initialize Google Calendar connection",
        variant: "destructive",
      });
    },
  });

  // Get Google Calendars
  const getCalendarsMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('/api/calendar/google/calendars');
      return response.json();
    },
    onSuccess: (calendars) => {
      setGoogleCalendars(calendars);
      setImportStep('configure');
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to fetch Google calendars",
        variant: "destructive",
      });
    },
  });

  // Google Calendar Import
  const googleImportMutation = useMutation({
    mutationFn: async (data: { calendarId: string; startDate?: string; endDate?: string }) => {
      const response = await apiRequest('/api/calendar/google/import', {
        method: 'POST',
        body: JSON.stringify(data),
      });
      return response.json();
    },
    onSuccess: (result) => {
      setImportResult(result);
      setImportStep('complete');
      queryClient.invalidateQueries({ queryKey: ['/api/bookings'] });
      queryClient.invalidateQueries({ queryKey: ['/api/enquiries'] });
      onImportComplete?.();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to import Google Calendar events",
        variant: "destructive",
      });
      setImportStep('configure');
    },
  });

  // Apple Calendar Import
  const appleImportMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('icsFile', file);
      
      const response = await apiRequest('/api/calendar/apple/import', {
        method: 'POST',
        body: formData,
      });
      return response.json();
    },
    onSuccess: (result) => {
      setImportResult(result);
      setImportStep('complete');
      queryClient.invalidateQueries({ queryKey: ['/api/bookings'] });
      queryClient.invalidateQueries({ queryKey: ['/api/enquiries'] });
      onImportComplete?.();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to import Apple Calendar file",
        variant: "destructive",
      });
      setImportStep('configure');
    },
  });

  // Check for Google OAuth success on component mount
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('google_auth') === 'success') {
      setImportType('google');
      setIsDialogOpen(true);
      getCalendarsMutation.mutate();
      // Clean up URL
      window.history.replaceState({}, '', window.location.pathname);
    } else if (urlParams.get('error')) {
      toast({
        title: "Authentication Error",
        description: "Failed to connect Google Calendar. Please try again.",
        variant: "destructive",
      });
    }
  }, [getCalendarsMutation, toast]);

  const handleGoogleImport = () => {
    setImportType('google');
    setImportStep('configure');
    googleAuthMutation.mutate();
  };

  const handleAppleImport = () => {
    setImportType('apple');
    setImportStep('configure');
  };

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

  const executeGoogleImport = () => {
    if (!selectedCalendar) {
      toast({
        title: "Missing Information",
        description: "Please select a calendar to import",
        variant: "destructive",
      });
      return;
    }

    setImportStep('importing');
    googleImportMutation.mutate({
      calendarId: selectedCalendar,
    });
  };

  const executeAppleImport = () => {
    if (!selectedFile) {
      toast({
        title: "Missing File",
        description: "Please select an .ics file to import",
        variant: "destructive",
      });
      return;
    }

    setImportStep('importing');
    appleImportMutation.mutate(selectedFile);
  };

  const resetDialog = () => {
    setImportType(null);
    setImportStep('select');
    setGoogleTokens(null);
    setGoogleCalendars([]);
    setSelectedCalendar('');
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
          <Upload className="w-4 h-4 mr-2" />
          Import Calendar
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Import Calendar Events</DialogTitle>
          <DialogDescription>
            Import your existing bookings from Google Calendar or Apple Calendar
          </DialogDescription>
        </DialogHeader>

        {importStep === 'select' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4">
              <Card className="cursor-pointer hover:bg-muted/50" onClick={handleGoogleImport}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center">
                    <Calendar className="w-5 h-5 mr-2 text-blue-600" />
                    Google Calendar
                  </CardTitle>
                  <CardDescription>
                    Connect your Google account and import events directly
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button className="w-full" onClick={handleGoogleImport}>
                    <Link className="w-4 h-4 mr-2" />
                    Connect Google Calendar
                  </Button>
                </CardContent>
              </Card>

              <Card className="cursor-pointer hover:bg-muted/50" onClick={handleAppleImport}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center">
                    <Calendar className="w-5 h-5 mr-2 text-gray-600" />
                    Apple Calendar
                  </CardTitle>
                  <CardDescription>
                    Upload an exported .ics file from Apple Calendar
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button variant="outline" className="w-full" onClick={handleAppleImport}>
                    <Upload className="w-4 h-4 mr-2" />
                    Upload .ics File
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {importStep === 'configure' && importType === 'google' && (
          <div className="space-y-4">
            <div>
              <Label htmlFor="calendar-select">Select Calendar</Label>
              <Select value={selectedCalendar} onValueChange={setSelectedCalendar}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a calendar to import" />
                </SelectTrigger>
                <SelectContent>
                  {googleCalendars.length > 0 ? (
                    googleCalendars.map((calendar) => (
                      <SelectItem key={calendar.id} value={calendar.id}>
                        {calendar.summary}
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="loading" disabled>
                      Loading calendars...
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
              
              {googleCalendars.length === 0 && (
                <div className="mt-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <p className="text-sm text-amber-700">
                    <strong>Authentication needed:</strong> Please update your Google Cloud Console OAuth settings to include:
                  </p>
                  <code className="text-xs bg-amber-100 px-2 py-1 rounded mt-1 block">
                    https://workspace.timfulker.repl.co/api/calendar/google/callback
                  </code>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="mt-2"
                    onClick={() => getCalendarsMutation.mutate()}
                  >
                    Retry Connection
                  </Button>
                </div>
              )}
            </div>
            
            <div className="flex justify-between">
              <Button variant="outline" onClick={resetDialog}>
                Back
              </Button>
              <Button onClick={executeGoogleImport} disabled={!selectedCalendar || googleCalendars.length === 0}>
                Import Events
              </Button>
            </div>
          </div>
        )}

        {importStep === 'configure' && importType === 'apple' && (
          <div className="space-y-4">
            <div>
              <Label htmlFor="file-upload">Calendar File (.ics)</Label>
              <Input
                id="file-upload"
                type="file"
                accept=".ics"
                onChange={handleFileUpload}
                className="mt-1"
              />
              {selectedFile && (
                <p className="text-sm text-muted-foreground mt-1">
                  Selected: {selectedFile.name}
                </p>
              )}
            </div>
            <div className="flex justify-between">
              <Button variant="outline" onClick={resetDialog}>
                Back
              </Button>
              <Button onClick={executeAppleImport} disabled={!selectedFile}>
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
              {importResult.errors.length > 0 && (
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
      </DialogContent>
    </Dialog>
  );
}