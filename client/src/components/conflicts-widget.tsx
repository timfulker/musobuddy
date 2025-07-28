import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, CheckCircle } from "lucide-react";

interface BackendConflict {
  bookingId: number;
  withBookingId: number;
  severity: 'hard' | 'soft';
  clientName: string;
  status: string;
  time: string;
  canEdit: boolean;
  canReject: boolean;
  type: string;
  message: string;
  date: string;
}

interface ConflictsWidgetProps {
  onFilterByConflictType?: (type: string) => void;
}

export default function ConflictsWidget({ onFilterByConflictType }: ConflictsWidgetProps) {
  const { data: conflicts = [], isLoading } = useQuery({
    queryKey: ['/api/conflicts'],
  });

  const backendConflicts = conflicts as BackendConflict[];

  // Group conflicts by severity for counter display
  const conflictCounts = React.useMemo(() => {
    const uniqueConflicts = new Map();
    backendConflicts.forEach((c: BackendConflict) => {
      const key = [c.bookingId, c.withBookingId].sort().join('-');
      if (!uniqueConflicts.has(key)) {
        uniqueConflicts.set(key, c);
      }
    });
    
    const conflicts = Array.from(uniqueConflicts.values());
    return {
      high: conflicts.filter((c: BackendConflict) => c.severity === 'hard').length,
      medium: conflicts.filter((c: BackendConflict) => c.severity === 'soft').length,
      low: 0,
    };
  }, [backendConflicts]);

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

  // Get unique conflicts for display
  const uniqueConflicts = React.useMemo(() => {
    const uniqueMap = new Map();
    backendConflicts.forEach((conflict: BackendConflict) => {
      const key = [conflict.bookingId, conflict.withBookingId].sort().join('-');
      if (!uniqueMap.has(key)) {
        uniqueMap.set(key, conflict);
      }
    });
    return Array.from(uniqueMap.values());
  }, [backendConflicts]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5" />
          Scheduling Conflicts
          {uniqueConflicts.length > 0 && (
            <Badge variant="destructive">{uniqueConflicts.length}</Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {uniqueConflicts.length === 0 ? (
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
                onClick={() => handleConflictTypeClick('hard')}
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
                onClick={() => handleConflictTypeClick('soft')}
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
              {uniqueConflicts.slice(0, 3).map((conflict: BackendConflict) => (
                <div
                  key={`${conflict.bookingId}-${conflict.withBookingId}`}
                  className={`p-3 rounded-lg border ${
                    conflict.severity === 'hard' ? 'border-red-200 bg-red-50' :
                    'border-orange-200 bg-orange-50'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge 
                          variant={conflict.severity === 'hard' ? 'destructive' : 'default'}
                          className="text-xs"
                        >
                          {conflict.severity === 'hard' ? 'CRITICAL' : 'WARNING'}
                        </Badge>
                        <span className="text-sm font-medium">
                          Same Day Conflict
                        </span>
                      </div>
                      <p className="text-xs text-gray-600 mb-2">
                        Conflict on {new Date(conflict.date).toLocaleDateString()}
                      </p>
                      <div className="text-xs text-gray-500 space-y-1">
                        <div className="flex items-center gap-2">
                          <span>• {conflict.clientName}</span>
                          <span className="text-gray-400">({conflict.time})</span>
                          <Badge variant="outline" className="text-xs">
                            {conflict.status}
                          </Badge>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">{conflict.message}</p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            {uniqueConflicts.length > 3 && (
              <div className="text-center">
                <Button variant="outline" size="sm">
                  View All {uniqueConflicts.length} Conflicts
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}