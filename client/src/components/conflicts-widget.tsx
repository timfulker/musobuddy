import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, CheckCircle } from "lucide-react";

interface BackendConflict {
  id: string;
  bookings: Array<{
    id: number;
    clientName: string;
    eventDate: string;
    eventTime?: string;
    venue?: string;
    status: string;
  }>;
  severity: 'critical' | 'warning';
  type: 'same_day';
  date: string;
}

export default function ConflictsWidget({ onFilterByConflictType }: { onFilterByConflictType?: (severity: string) => void }) {
  const { data: conflicts = [], isLoading } = useQuery({
    queryKey: ["/api/conflicts"],
    staleTime: 30000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
  });

  const backendConflicts = conflicts as BackendConflict[];

  // Group conflicts by severity for counter display
  const conflictCounts = {
    high: backendConflicts.filter((c: BackendConflict) => c.severity === 'critical').length,
    medium: backendConflicts.filter((c: BackendConflict) => c.severity === 'warning').length,
    low: 0, // No resolved conflicts in this format
  };

  const handleConflictTypeClick = (severity: string) => {
    if (onFilterByConflictType) {
      onFilterByConflictType(severity);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Scheduling Conflicts
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">Loading conflicts...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5" />
          Scheduling Conflicts
          {backendConflicts.length > 0 && (
            <Badge variant="destructive">{backendConflicts.length}</Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {backendConflicts.length === 0 ? (
          <div className="text-sm text-muted-foreground flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-green-500" />
            No scheduling conflicts
          </div>
        ) : (
          <div className="space-y-4">
            {/* Conflict Type Counters */}
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                size="sm"
                className={`h-16 flex flex-col items-center justify-center gap-1 ${
                  conflictCounts.high > 0 ? 'border-red-300 bg-red-50 hover:bg-red-100' : 'opacity-50'
                }`}
                onClick={() => handleConflictTypeClick('critical')}
                disabled={conflictCounts.high === 0}
              >
                <div className="w-3 h-3 rounded-full bg-red-500"></div>
                <span className="text-xs font-medium">
                  {conflictCounts.high} Critical
                </span>
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                className={`h-16 flex flex-col items-center justify-center gap-1 ${
                  conflictCounts.medium > 0 ? 'border-orange-300 bg-orange-50 hover:bg-orange-100' : 'opacity-50'
                }`}
                onClick={() => handleConflictTypeClick('warning')}
                disabled={conflictCounts.medium === 0}
              >
                <div className="w-3 h-3 rounded-full bg-orange-500"></div>
                <span className="text-xs font-medium">
                  {conflictCounts.medium} Warning
                </span>
              </Button>
            </div>

            {/* Active Conflicts List */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-gray-600">Active Conflicts</h4>
              {backendConflicts.slice(0, 3).map((conflict: BackendConflict) => (
                <div
                  key={conflict.id}
                  className={`p-3 rounded-lg border ${
                    conflict.severity === 'critical' ? 'border-red-200 bg-red-50' :
                    'border-orange-200 bg-orange-50'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge 
                          variant={conflict.severity === 'critical' ? 'destructive' : 'default'}
                          className="text-xs"
                        >
                          {conflict.severity.toUpperCase()}
                        </Badge>
                        <span className="text-sm font-medium">
                          Same Day Conflict
                        </span>
                      </div>
                      <p className="text-xs text-gray-600 mb-2">
                        {conflict.bookings.length} bookings on {new Date(conflict.date).toLocaleDateString()}:
                      </p>
                      <div className="text-xs text-gray-500 space-y-1">
                        {conflict.bookings.map((booking, idx) => (
                          <div key={booking.id} className="flex items-center gap-2">
                            <span>• {booking.clientName}</span>
                            {booking.eventTime && <span className="text-gray-400">({booking.eventTime})</span>}
                            <Badge variant="outline" className="text-xs">
                              {booking.status}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            {backendConflicts.length > 3 && (
              <div className="text-center">
                <Button variant="outline" size="sm">
                  View All {backendConflicts.length} Conflicts
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}