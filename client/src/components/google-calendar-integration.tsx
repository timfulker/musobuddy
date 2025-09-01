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
      console.log('🚀 Frontend: Making API request to /api/google-calendar/sync');
      console.log('📋 Frontend: Request data:', { direction, linkUnknownEvents: direction === 'import' || direction === 'bidirectional' });
      
      const response = await apiRequest('/api/google-calendar/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          direction,
          linkUnknownEvents: direction === 'import' || direction === 'bidirectional'
        }),
      });
      
      console.log('📨 Frontend: API response status:', response.status);
      const data = await response.json();
      console.log('📨 Frontend: API response data:', data);
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/bookings'] });
      toast({
        title: "Sync Complete",
        description: `Exported ${data.exported || 0} events, updated ${data.updated || 0} existing, imported ${data.imported || 0} new bookings`,
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
    console.log('🔄 Frontend: Sync button clicked with direction:', direction);
    setIsSyncing(true);
    console.log('📤 Frontend: Calling syncMutation.mutate...');
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
            <p className="ml-4">Loading Google Calendar status...</p>
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
            <h3 className="text-lg font-medium mb-2">Connect Your Google Calendar</h3>
            <p className="mb-6 text-gray-600">
              Sync your MusoBuddy bookings with Google Calendar for automatic two-way updates
            </p>
            
            <div className="bg-gray-50 p-4 rounded-lg mb-6">
              <h4 className="font-medium mb-2">What happens when you connect:</h4>
              <ul className="text-sm space-y-1 text-left text-gray-700">
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
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Google Calendar Integration
          </div>
          <div 
            className="inline-flex items-center px-3 py-1 rounded-full border"
            style={{ 
              backgroundColor: calendarStatus?.connected ? '#f0fdf4' : '#fef2f2', 
              borderColor: calendarStatus?.connected ? '#22c55e' : '#ef4444',
              color: calendarStatus?.connected ? '#15803d' : '#dc2626',
              fontSize: '14px',
              fontWeight: '500'
            }}
          >
            {calendarStatus?.connected ? (
              <CheckCircle className="w-3 h-3 mr-1" style={{ color: '#15803d' }} />
            ) : (
              <X className="w-3 h-3 mr-1" style={{ color: '#dc2626' }} />
            )}
            {calendarStatus?.connected ? 'Connected' : 'Disconnected'}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Sync Status */}
        <div className="flex items-center justify-between p-3 rounded-lg border border-green-200" style={{ backgroundColor: '#f0fdf4' }}>
          <div className="flex items-center gap-3">
            <CheckCircle className="w-5 h-5" style={{ color: '#16a34a' }} />
            <div>
              <p style={{ color: '#000000', fontWeight: '600', fontSize: '14px', margin: 0 }}>Google Calendar Connected</p>
              <p style={{ color: '#374151', fontSize: '12px', margin: 0 }}>
                Last sync: {calendarStatus.lastSyncAt 
                  ? new Date(calendarStatus.lastSyncAt).toLocaleString() 
                  : 'Never'}
              </p>
            </div>
          </div>
        </div>

        {/* Manual Sync Controls */}
        <div className="space-y-2">
          <Label className="text-sm font-medium" style={{ color: '#111827 !important' }}>Quick Sync</Label>
          <div className="grid grid-cols-3 gap-2">
            <Button 
              variant="outline" 
              onClick={() => handleSync('export')}
              disabled={isSyncing || syncMutation.isPending}
              className="flex items-center gap-1 h-8 text-xs px-2"
              style={{ backgroundColor: '#ffffff !important', border: '1px solid #d1d5db !important', color: '#111827 !important' }}
            >
              <Upload className="w-3 h-3" />
              Export
            </Button>
            <Button 
              variant="outline" 
              onClick={() => handleSync('import')}
              disabled={isSyncing || syncMutation.isPending}
              className="flex items-center gap-1 h-8 text-xs px-2"
              style={{ backgroundColor: '#ffffff !important', border: '1px solid #d1d5db !important', color: '#111827 !important' }}
            >
              <Download className="w-3 h-3" />
              Import
            </Button>
            <Button 
              variant="outline" 
              onClick={() => handleSync('bidirectional')}
              disabled={isSyncing || syncMutation.isPending}
              className="flex items-center gap-1 h-8 text-xs px-2"
              style={{ backgroundColor: '#ffffff !important', border: '1px solid #d1d5db !important', color: '#111827 !important' }}
            >
              {(isSyncing || syncMutation.isPending) ? (
                <RefreshCw className="w-3 h-3 animate-spin" />
              ) : (
                <ArrowRightLeft className="w-3 h-3" />
              )}
              Sync
            </Button>
          </div>
        </div>

        <Separator />

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          
          {/* Left Column - Sync Settings */}
          <div className="space-y-3">
            <Label className="text-sm font-semibold" style={{ color: '#111827 !important' }}>Sync Settings</Label>
            
            <div className="space-y-3">
              <div className="bg-gray-50 p-3 rounded border">
                <div className="flex items-start justify-between">
                  <div className="space-y-1 flex-1">
                    <Label htmlFor="sync-enabled" style={{ color: '#111827 !important' }} className="font-medium text-sm">Enable Sync</Label>
                    <p className="text-xs" style={{ color: '#374151 !important' }}>
                      Enable automatic synchronization between MusoBuddy and Google Calendar
                    </p>
                  </div>
                  <div className="ml-4 flex-shrink-0">
                    <div
                      onClick={() => updateSetting('syncEnabled', !calendarStatus.syncEnabled)}
                      className="relative inline-flex h-6 w-11 items-center rounded-full cursor-pointer"
                      style={{
                        backgroundColor: calendarStatus.syncEnabled ? 'rgb(34, 197, 94)' : 'rgb(107, 114, 128)',
                        border: '2px solid',
                        borderColor: calendarStatus.syncEnabled ? 'rgb(22, 163, 74)' : 'rgb(75, 85, 99)',
                        transition: 'all 0.2s'
                      }}
                    >
                      <div 
                        className="absolute h-4 w-4 rounded-full"
                        style={{
                          backgroundColor: 'rgb(255, 255, 255)',
                          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.3)',
                          transform: calendarStatus.syncEnabled ? 'translateX(22px)' : 'translateX(2px)',
                          transition: 'transform 0.2s'
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 p-3 rounded-lg border">
                <div className="flex items-start justify-between">
                  <div className="space-y-1 flex-1">
                    <Label htmlFor="auto-sync-bookings" style={{ color: '#111827 !important' }} className="font-medium text-sm">Export Bookings</Label>
                    <p className="text-xs" style={{ color: '#374151 !important' }}>
                      Automatically create Google Calendar events for new MusoBuddy bookings
                    </p>
                  </div>
                  <div className="ml-4 flex-shrink-0">
                    <div
                      onClick={() => calendarStatus.syncEnabled && updateSetting('autoSyncBookings', !calendarStatus.autoSyncBookings)}
                      className="relative inline-flex h-6 w-11 items-center rounded-full"
                      style={{
                        backgroundColor: calendarStatus.autoSyncBookings && calendarStatus.syncEnabled ? 'rgb(34, 197, 94)' : 'rgb(107, 114, 128)',
                        border: '2px solid',
                        borderColor: calendarStatus.autoSyncBookings && calendarStatus.syncEnabled ? 'rgb(22, 163, 74)' : 'rgb(75, 85, 99)',
                        cursor: calendarStatus.syncEnabled ? 'pointer' : 'not-allowed',
                        opacity: calendarStatus.syncEnabled ? '1' : '0.5',
                        transition: 'all 0.2s'
                      }}
                    >
                      <div 
                        className="absolute h-4 w-4 rounded-full"
                        style={{
                          backgroundColor: 'rgb(255, 255, 255)',
                          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.3)',
                          transform: calendarStatus.autoSyncBookings && calendarStatus.syncEnabled ? 'translateX(22px)' : 'translateX(2px)',
                          transition: 'transform 0.2s'
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 p-3 rounded-lg border">
                <div className="flex items-start justify-between">
                  <div className="space-y-1 flex-1">
                    <Label htmlFor="auto-import-events" style={{ color: '#111827 !important' }} className="font-medium text-sm">Import Events</Label>
                    <p className="text-xs" style={{ color: '#374151 !important' }}>
                      Automatically import Google Calendar events as MusoBuddy bookings
                    </p>
                  </div>
                  <div className="ml-4 flex-shrink-0">
                    <div
                      onClick={() => calendarStatus.syncEnabled && updateSetting('autoImportEvents', !calendarStatus.autoImportEvents)}
                      className="relative inline-flex h-6 w-11 items-center rounded-full"
                      style={{
                        backgroundColor: calendarStatus.autoImportEvents && calendarStatus.syncEnabled ? 'rgb(34, 197, 94)' : 'rgb(107, 114, 128)',
                        border: '2px solid',
                        borderColor: calendarStatus.autoImportEvents && calendarStatus.syncEnabled ? 'rgb(22, 163, 74)' : 'rgb(75, 85, 99)',
                        cursor: calendarStatus.syncEnabled ? 'pointer' : 'not-allowed',
                        opacity: calendarStatus.syncEnabled ? '1' : '0.5',
                        transition: 'all 0.2s'
                      }}
                    >
                      <div 
                        className="absolute h-4 w-4 rounded-full"
                        style={{
                          backgroundColor: 'rgb(255, 255, 255)',
                          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.3)',
                          transform: calendarStatus.autoImportEvents && calendarStatus.syncEnabled ? 'translateX(22px)' : 'translateX(2px)',
                          transition: 'transform 0.2s'
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 p-3 rounded-lg border">
                <div className="space-y-2">
                  <Label htmlFor="sync-direction" style={{ color: '#111827 !important' }} className="font-medium text-sm">Sync Direction</Label>
                  <Select
                    value={calendarStatus.syncDirection}
                    onValueChange={(value) => updateSetting('syncDirection', value)}
                    disabled={!calendarStatus.syncEnabled}
                  >
                    <SelectTrigger style={{ backgroundColor: '#ffffff !important', border: '1px solid #d1d5db !important', color: '#111827 !important' }}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent style={{ backgroundColor: '#ffffff !important', border: '1px solid #d1d5db !important' }}>
                      <SelectItem value="bidirectional" style={{ color: '#111827 !important' }}>Two-way sync</SelectItem>
                      <SelectItem value="export_only" style={{ color: '#111827 !important' }}>Export only (MusoBuddy → Google)</SelectItem>
                      <SelectItem value="import_only" style={{ color: '#111827 !important' }}>Import only (Google → MusoBuddy)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Warning & Disconnect */}
          <div className="space-y-3">
            <div className="bg-yellow-50 border border-yellow-200 p-2 rounded-lg">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-2">
                  <h3 className="text-xs font-medium text-yellow-800">
                    Sync Notes
                  </h3>
                  <div className="mt-1 text-xs text-yellow-700">
                    <p>Sync respects your direction settings.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Disconnect */}
        <div className="space-y-2">
          <Label className="text-sm font-medium" style={{ color: '#111827' }}>Disconnect</Label>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm" className="bg-red-600 hover:bg-red-700 text-white h-8 text-xs">
                <Unlink className="w-4 h-4 mr-2" />
                Disconnect Google Calendar
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="luminance-aware">
              <AlertDialogHeader>
                <AlertDialogTitle className="luminance-aware font-semibold">Disconnect Google Calendar?</AlertDialogTitle>
                <AlertDialogDescription className="luminance-aware-muted">
                  This will stop syncing your MusoBuddy bookings with Google Calendar. 
                  Existing events will remain in both calendars, but future changes won't sync.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="luminance-aware">Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => disconnectMutation.mutate()}
                  className="bg-destructive hover:bg-destructive/90 text-white"
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