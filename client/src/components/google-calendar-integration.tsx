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
        // Skip popup monitoring entirely to avoid COOP warnings
        // Rely solely on postMessage for communication
        console.log('📱 OAuth popup opened, waiting for response via postMessage...');

        // Handle postMessage from popup (primary method)
        const handleMessage = (event: MessageEvent) => {
          if (event.origin !== window.location.origin) return;
          
          if (event.data.type === 'GOOGLE_CALENDAR_SUCCESS') {
            console.log('✅ OAuth success message received');
            window.removeEventListener('message', handleMessage);
            queryClient.invalidateQueries({ queryKey: ['/api/google-calendar/status'] });
            resolve(true);
          } else if (event.data.type === 'GOOGLE_CALENDAR_ERROR') {
            console.log('❌ OAuth error message received:', event.data.message);
            window.removeEventListener('message', handleMessage);
            reject(new Error(event.data.message));
          }
        };

        window.addEventListener('message', handleMessage);
        
        // User-friendly timeout with periodic status checks
        const timeoutDuration = 300000; // 5 minutes
        const checkInterval = 30000; // Check every 30 seconds
        let elapsed = 0;
        
        const statusChecker = setInterval(() => {
          elapsed += checkInterval;
          
          // Silently check if auth succeeded
          queryClient.invalidateQueries({ queryKey: ['/api/google-calendar/status'] });
          
          if (elapsed >= timeoutDuration) {
            clearInterval(statusChecker);
            window.removeEventListener('message', handleMessage);
            console.log('⏱️ OAuth timeout - checking final status');
            resolve(true); // Let status check determine actual result
          }
        }, checkInterval);
        
        // Clean up on resolution
        const originalResolve = resolve;
        resolve = (value) => {
          clearInterval(statusChecker);
          originalResolve(value);
        };
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
          <CardTitle className="flex items-center gap-2 text-black" style={{ color: 'black' }}>
            <Calendar className="w-5 h-5" />
            Google Calendar Integration
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="ml-4 text-black" style={{ color: 'black' }}>Loading Google Calendar status...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!calendarStatus?.connected) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-black" style={{ color: 'black' }}>
            <Calendar className="w-5 h-5" />
            Google Calendar Integration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center py-6">
            <Calendar className="w-12 h-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium mb-2 text-black" style={{ color: 'black' }}>Connect Your Google Calendar</h3>
            <p className="mb-6 text-gray-600" style={{ color: '#4b5563' }}>
              Sync your MusoBuddy bookings with Google Calendar for automatic two-way updates
            </p>
            
            <div className="bg-gray-50 p-4 rounded-lg mb-6">
              <h4 className="font-medium mb-2 text-black" style={{ color: 'black' }}>What happens when you connect:</h4>
              <ul className="text-sm space-y-1 text-left text-gray-700" style={{ color: '#374151' }}>
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
    <div>
      <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-black" style={{ color: 'black' }}>
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
              <p className="font-medium text-green-900" style={{ color: '#14532d' }}>Google Calendar Connected</p>
              <p className="text-sm text-green-700" style={{ color: '#15803d' }}>
                Last sync: {calendarStatus.lastSyncAt 
                  ? new Date(calendarStatus.lastSyncAt).toLocaleString() 
                  : 'Never'}
              </p>
            </div>
          </div>
        </div>

        {/* Manual Sync Controls */}
        <div className="space-y-3">
          <Label className="text-base font-medium text-black" style={{ color: 'black' }}>Manual Sync</Label>
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
          <Label className="text-base font-medium text-black" style={{ color: 'black' }}>Sync Settings</Label>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="sync-enabled" className="text-black" style={{ color: 'black' }}>Enable Sync</Label>
                <p className="text-sm text-gray-600" style={{ color: '#4b5563' }}>
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
                <Label htmlFor="auto-sync-bookings" className="text-black" style={{ color: 'black' }}>Export Bookings</Label>
                <p className="text-sm text-gray-600" style={{ color: '#4b5563' }}>
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
                <Label htmlFor="auto-import-events" className="text-black" style={{ color: 'black' }}>Import Events</Label>
                <p className="text-sm text-gray-600" style={{ color: '#4b5563' }}>
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
              <Label htmlFor="sync-direction" className="text-black" style={{ color: 'black' }}>Sync Direction</Label>
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
          <Label className="text-base font-medium text-black" style={{ color: 'black' }}>Disconnect</Label>
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
    </div>
  );
}