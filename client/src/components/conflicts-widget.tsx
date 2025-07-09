import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Clock, CheckCircle, MapPin, Calendar, Users } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useState } from 'react';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

interface ConflictInfo {
  id: number;
  type: 'enquiry' | 'contract' | 'booking';
  title: string;
  clientName: string;
  eventDate: Date;
  eventTime: string;
  venue: string;
  status: string;
}

interface ConflictAnalysis {
  severity: 'critical' | 'warning' | 'manageable';
  travelTime: number | null;
  distance: number | null;
  timeGap: number | null;
  reason: string;
  recommendations: string[];
}

interface BookingConflict {
  id: number;
  userId: string;
  enquiryId: number;
  conflictingId: number;
  conflictingType: 'enquiry' | 'contract' | 'booking';
  conflictSeverity: 'critical' | 'warning' | 'manageable';
  conflictReason: string;
  recommendations: string[];
  isResolved: boolean;
  resolution?: string;
  notes?: string;
  createdAt: Date;
  resolvedAt?: Date;
}

export function ConflictsWidget() {
  const [selectedConflict, setSelectedConflict] = useState<BookingConflict | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: conflicts = [], isLoading } = useQuery({
    queryKey: ['/api/conflicts'],
    refetchInterval: 30000 // Refresh every 30 seconds
  });

  const resolveConflictMutation = useMutation({
    mutationFn: async ({ conflictId, resolution, notes }: { conflictId: number; resolution: string; notes?: string }) => {
      await apiRequest(`/api/conflicts/${conflictId}/resolve`, {
        method: 'POST',
        body: { resolution, notes }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/conflicts'] });
      toast({
        title: "Conflict resolved",
        description: "The booking conflict has been resolved successfully."
      });
      setIsDialogOpen(false);
      setSelectedConflict(null);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to resolve conflict. Please try again.",
        variant: "destructive"
      });
    }
  });

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-500 text-white';
      case 'warning': return 'bg-amber-500 text-white';
      case 'manageable': return 'bg-green-500 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical': return <AlertTriangle className="w-4 h-4" />;
      case 'warning': return <Clock className="w-4 h-4" />;
      case 'manageable': return <CheckCircle className="w-4 h-4" />;
      default: return <AlertTriangle className="w-4 h-4" />;
    }
  };

  const formatTimeGap = (timeGap: number | null) => {
    if (timeGap === null) return 'Unknown';
    if (timeGap < 0) return `${Math.abs(timeGap)}m overlap`;
    const hours = Math.floor(timeGap / 60);
    const minutes = timeGap % 60;
    return hours > 0 ? `${hours}h ${minutes}m gap` : `${minutes}m gap`;
  };

  const handleResolveConflict = (resolution: string, notes?: string) => {
    if (!selectedConflict) return;
    
    resolveConflictMutation.mutate({
      conflictId: selectedConflict.id,
      resolution,
      notes
    });
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" />
            Booking Conflicts
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-sm text-gray-500 mt-2">Loading conflicts...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" />
            Booking Conflicts
            {conflicts.length > 0 && (
              <Badge variant="outline" className="ml-auto">
                {conflicts.length} active
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {conflicts.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-2" />
              <p className="text-sm text-gray-500">No booking conflicts detected</p>
              <p className="text-xs text-gray-400 mt-1">Your schedule is clear!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {conflicts.slice(0, 3).map((conflict: BookingConflict) => (
                <div
                  key={conflict.id}
                  className="p-3 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => {
                    setSelectedConflict(conflict);
                    setIsDialogOpen(true);
                  }}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge className={getSeverityColor(conflict.conflictSeverity)}>
                          {getSeverityIcon(conflict.conflictSeverity)}
                          {conflict.conflictSeverity}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {conflict.conflictingType}
                        </Badge>
                      </div>
                      <p className="text-sm font-medium">Enquiry #{conflict.enquiryId}</p>
                      <p className="text-xs text-gray-500 mb-1">{conflict.conflictReason}</p>
                      <div className="flex items-center gap-3 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {new Date(conflict.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    <Button size="sm" variant="outline" className="ml-2">
                      Resolve
                    </Button>
                  </div>
                </div>
              ))}
              
              {conflicts.length > 3 && (
                <div className="text-center pt-2">
                  <Button variant="ghost" size="sm">
                    View all {conflicts.length} conflicts
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              Booking Conflict Resolution
            </DialogTitle>
          </DialogHeader>
          
          {selectedConflict && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Badge className={getSeverityColor(selectedConflict.conflictSeverity)}>
                  {getSeverityIcon(selectedConflict.conflictSeverity)}
                  {selectedConflict.conflictSeverity}
                </Badge>
                <span className="text-sm text-gray-600">
                  Enquiry #{selectedConflict.enquiryId} conflicts with {selectedConflict.conflictingType} #{selectedConflict.conflictingId}
                </span>
              </div>
              
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm font-medium mb-2">Conflict Details:</p>
                <p className="text-sm text-gray-600">{selectedConflict.conflictReason}</p>
              </div>
              
              <div className="bg-blue-50 p-4 rounded-lg">
                <p className="text-sm font-medium mb-2">Recommendations:</p>
                <ul className="text-sm text-gray-600 space-y-1">
                  {selectedConflict.recommendations.map((rec, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <span className="text-blue-600">•</span>
                      {rec}
                    </li>
                  ))}
                </ul>
              </div>
              
              <div className="flex gap-2 pt-4">
                <Button 
                  onClick={() => handleResolveConflict('accepted', 'Both bookings can be managed with proper planning')}
                  className="flex-1"
                  disabled={resolveConflictMutation.isPending}
                >
                  Accept Both Bookings
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => handleResolveConflict('declined', 'New enquiry declined due to conflict')}
                  className="flex-1"
                  disabled={resolveConflictMutation.isPending}
                >
                  Decline New Enquiry
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => handleResolveConflict('rescheduled', 'Offered alternative dates to client')}
                  className="flex-1"
                  disabled={resolveConflictMutation.isPending}
                >
                  Reschedule
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}