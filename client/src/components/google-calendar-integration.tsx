import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Calendar, RefreshCw, Unlink, CheckCircle, AlertCircle, Clock, ArrowRightLeft, Download, Upload } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

export default function GoogleCalendarIntegration() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  // Check Google Calendar integration status
  const { data: calendarStatus, isLoading } = useQuery({
    queryKey: ['/api/google-calendar/status'],
    queryFn: async () => {
      const response = await apiRequest('/api/google-calendar/status');
      return response.json();
    },
  });

  // Connect Google Calendar mutation
  const connectMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('/api/google-calendar/auth');
      const data = await response.json();
      
      // Open OAuth popup
      const popup = window.open(data.authUrl, 'google-calendar-auth', 'width=500,height=600');
      
      return new Promise((resolve, reject) => {
        const checkClosed = setInterval(() => {
          if (popup?.closed) {
            clearInterval(checkClosed);
            // Check if connection was successful
            setTimeout(() => {
              queryClient.invalidateQueries({ queryKey: ['/api/google-calendar/status'] });
              resolve(true);
            }, 1000);
          }
        }, 1000);

        // Handle postMessage from popup
        const handleMessage = (event: MessageEvent) => {
          if (event.origin !== window.location.origin) return;
          
          if (event.data.type === 'GOOGLE_CALENDAR_SUCCESS') {
            popup?.close();
            clearInterval(checkClosed);
            window.removeEventListener('message', handleMessage);
            resolve(true);
          } else if (event.data.type === 'GOOGLE_CALENDAR_ERROR') {
            popup?.close();
            clearInterval(checkClosed);
            window.removeEventListener('message', handleMessage);
            reject(new Error(event.data.message));
          }
        };

        window.addEventListener('message', handleMessage);
      });
    },
    onSuccess: () => {
      toast({
        title: "Google Calendar Connected",
        description: "Your Google Calendar is now synced with MusoBuddy",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/google-calendar/status'] });
    },
    onError: (error: any) => {
      toast({
        title: "Connection Failed",
        description: error.message || "Failed to connect Google Calendar",
        variant: "destructive",
      });
    },
  });

  // Update settings mutation
  const updateSettingsMutation = useMutation({
    mutationFn: async (settings: any) => {
      const response = await apiRequest('/api/google-calendar/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/google-calendar/status'] });
      toast({
        title: "Settings Updated",
        description: "Google Calendar sync settings have been saved",
      });
    },
    onError: () => {
      toast({
        title: "Update Failed",
        description: "Failed to update sync settings",
        variant: "destructive",
      });
    },
  });

  // Manual sync mutation
  const syncMutation = useMutation({
    mutationFn: async (direction: string) => {
      const response = await apiRequest('/api/google-calendar/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ direction }),
      });
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/bookings'] });
      toast({
        title: "Sync Complete",
        description: `Exported ${data.exported} events, imported ${data.imported} events`,
      });
    },
    onError: () => {
      toast({
        title: "Sync Failed",
        description: "Failed to sync with Google Calendar",
        variant: "destructive",
      });
    },
  });

  // Disconnect mutation
  const disconnectMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('/api/google-calendar/disconnect', {
        method: 'DELETE',
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/google-calendar/status'] });
      toast({
        title: "Google Calendar Disconnected",
        description: "Your Google Calendar has been disconnected from MusoBuddy",
      });
    },
    onError: () => {
      toast({
        title: "Disconnect Failed",
        description: "Failed to disconnect Google Calendar",
        variant: "destructive",
      });
    },
  });

  const handleConnect = () => {
    setIsConnecting(true);
    connectMutation.mutate();
    setTimeout(() => setIsConnecting(false), 3000);
  };

  const handleSync = (direction: string) => {
    setIsSyncing(true);
    syncMutation.mutate(direction);
    setTimeout(() => setIsSyncing(false), 3000);
  };

  const updateSetting = (key: string, value: any) => {
    updateSettingsMutation.mutate({
      ...calendarStatus,
      [key]: value,
    });
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Google Calendar Integration
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!calendarStatus?.connected) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Google Calendar Integration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center py-6">
            <Calendar className="w-12 h-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Connect Your Google Calendar</h3>
            <p className="text-gray-600 mb-6">
              Sync your MusoBuddy bookings with Google Calendar for automatic two-way updates
            </p>
            
            <div className="bg-gray-50 p-4 rounded-lg mb-6">
              <h4 className="font-medium text-gray-900 mb-2">What happens when you connect:</h4>
              <ul className="text-sm space-y-1 text-gray-700 text-left">
                <li>• Your bookings automatically appear in Google Calendar</li>
                <li>• Changes in Google Calendar sync back to MusoBuddy</li>
                <li>• Real-time updates when events are created or modified</li>
                <li>• Keep your existing calendar import for Apple Calendar</li>
              </ul>
            </div>

            <Button 
              onClick={handleConnect} 
              disabled={isConnecting || connectMutation.isPending}
              size="lg"
            >
              {(isConnecting || connectMutation.isPending) ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Connecting...
                </>
              ) : (
                <>
                  <Calendar className="w-4 h-4 mr-2" />
                  Connect Google Calendar
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Google Calendar Integration
          </div>
          <Badge variant="outline" className="text-green-700 border-green-700">
            <CheckCircle className="w-3 h-3 mr-1" />
            Connected
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Sync Status */}
        <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg border border-green-200">
          <div className="flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <div>
              <p className="font-medium text-green-900">Google Calendar Connected</p>
              <p className="text-sm text-green-700">
                Last sync: {calendarStatus.lastSyncAt 
                  ? new Date(calendarStatus.lastSyncAt).toLocaleString() 
                  : 'Never'}
              </p>
            </div>
          </div>
        </div>

        {/* Manual Sync Controls */}
        <div className="space-y-3">
          <Label className="text-base font-medium">Manual Sync</Label>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Button 
              variant="outline" 
              onClick={() => handleSync('export')}
              disabled={isSyncing || syncMutation.isPending}
              className="flex items-center gap-2"
            >
              <Upload className="w-4 h-4" />
              Export to Google
            </Button>
            <Button 
              variant="outline" 
              onClick={() => handleSync('import')}
              disabled={isSyncing || syncMutation.isPending}
              className="flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Import from Google
            </Button>
            <Button 
              variant="outline" 
              onClick={() => handleSync('bidirectional')}
              disabled={isSyncing || syncMutation.isPending}
              className="flex items-center gap-2"
            >
              {(isSyncing || syncMutation.isPending) ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <ArrowRightLeft className="w-4 h-4" />
              )}
              Full Sync
            </Button>
          </div>
        </div>

        <Separator />

        {/* Sync Settings */}
        <div className="space-y-4">
          <Label className="text-base font-medium">Sync Settings</Label>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="sync-enabled">Enable Sync</Label>
                <p className="text-sm text-gray-600">
                  Enable automatic synchronization between MusoBuddy and Google Calendar
                </p>
              </div>
              <Switch
                id="sync-enabled"
                checked={calendarStatus.syncEnabled}
                onCheckedChange={(checked) => updateSetting('syncEnabled', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="auto-sync-bookings">Export Bookings</Label>
                <p className="text-sm text-gray-600">
                  Automatically create Google Calendar events for new MusoBuddy bookings
                </p>
              </div>
              <Switch
                id="auto-sync-bookings"
                checked={calendarStatus.autoSyncBookings}
                onCheckedChange={(checked) => updateSetting('autoSyncBookings', checked)}
                disabled={!calendarStatus.syncEnabled}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="auto-import-events">Import Events</Label>
                <p className="text-sm text-gray-600">
                  Automatically import Google Calendar events as MusoBuddy bookings
                </p>
              </div>
              <Switch
                id="auto-import-events"
                checked={calendarStatus.autoImportEvents}
                onCheckedChange={(checked) => updateSetting('autoImportEvents', checked)}
                disabled={!calendarStatus.syncEnabled}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="sync-direction">Sync Direction</Label>
              <Select
                value={calendarStatus.syncDirection}
                onValueChange={(value) => updateSetting('syncDirection', value)}
                disabled={!calendarStatus.syncEnabled}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bidirectional">Two-way sync</SelectItem>
                  <SelectItem value="export_only">Export only (MusoBuddy → Google)</SelectItem>
                  <SelectItem value="import_only">Import only (Google → MusoBuddy)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <Separator />

        {/* Disconnect */}
        <div className="space-y-3">
          <Label className="text-base font-medium">Disconnect</Label>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm">
                <Unlink className="w-4 h-4 mr-2" />
                Disconnect Google Calendar
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Disconnect Google Calendar?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will stop syncing your MusoBuddy bookings with Google Calendar. 
                  Existing events will remain in both calendars, but future changes won't sync.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => disconnectMutation.mutate()}
                  className="bg-destructive hover:bg-destructive/90"
                >
                  Disconnect
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </CardContent>
    </Card>
  );
}