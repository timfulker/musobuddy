import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, CheckCircle } from "lucide-react";

interface BookingConflict {
  id: number;
  enquiryId: number;
  conflictType: 'booking' | 'enquiry';
  conflictId: number;
  severity: 'high' | 'medium' | 'low';
  message: string;
  resolved: boolean;
  createdAt: string;
  enquiry?: {
    title: string;
    clientName: string;
    eventDate: string;
    eventTime?: string;
    venue?: string;
  };
  conflictItem?: {
    title: string;
    clientName: string;
    eventDate: string;
    eventTime?: string;
    venue?: string;
  };
}

export default function ConflictsWidget({ onFilterByConflictType }: { onFilterByConflictType?: (severity: string) => void }) {
  const { data: conflicts = [], isLoading } = useQuery({
    queryKey: ["/api/conflicts"],
    staleTime: 30000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
  });

  const unresolvedConflicts = (conflicts as BookingConflict[]).filter((c: BookingConflict) => !c.resolved);

  // Group conflicts by severity for counter display
  const conflictCounts = {
    high: unresolvedConflicts.filter((c: BookingConflict) => c.severity === 'high').length,
    medium: unresolvedConflicts.filter((c: BookingConflict) => c.severity === 'medium').length,
    low: unresolvedConflicts.filter((c: BookingConflict) => c.severity === 'low').length,
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
          {unresolvedConflicts.length > 0 && (
            <Badge variant="destructive">{unresolvedConflicts.length}</Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {unresolvedConflicts.length === 0 ? (
          <div className="text-sm text-muted-foreground flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-green-500" />
            No scheduling conflicts
          </div>
        ) : (
          <div className="space-y-4">
            {/* Conflict Type Counters */}
            <div className="grid grid-cols-3 gap-2">
              <Button
                variant="outline"
                size="sm"
                className={`h-16 flex flex-col items-center justify-center gap-1 ${
                  conflictCounts.high > 0 ? 'border-red-300 bg-red-50 hover:bg-red-100' : 'opacity-50'
                }`}
                onClick={() => handleConflictTypeClick('high')}
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
                onClick={() => handleConflictTypeClick('medium')}
                disabled={conflictCounts.medium === 0}
              >
                <div className="w-3 h-3 rounded-full bg-orange-500"></div>
                <span className="text-xs font-medium">
                  {conflictCounts.medium} Warning
                </span>
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                className={`h-16 flex flex-col items-center justify-center gap-1 ${
                  conflictCounts.low > 0 ? 'border-yellow-300 bg-yellow-50 hover:bg-yellow-100' : 'opacity-50'
                }`}
                onClick={() => handleConflictTypeClick('low')}
                disabled={conflictCounts.low === 0}
              >
                <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                <span className="text-xs font-medium">
                  {conflictCounts.low} Resolved
                </span>
              </Button>
            </div>

            {/* Recent Conflicts List */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-gray-600">Recent Conflicts</h4>
              {unresolvedConflicts.slice(0, 3).map((conflict: BookingConflict) => (
                <div
                  key={conflict.id}
                  className={`p-3 rounded-lg border ${
                    conflict.severity === 'high' ? 'border-red-200 bg-red-50' :
                    conflict.severity === 'medium' ? 'border-yellow-200 bg-yellow-50' :
                    'border-blue-200 bg-blue-50'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge 
                          variant={conflict.severity === 'high' ? 'destructive' : 'default'}
                          className="text-xs"
                        >
                          {conflict.severity.toUpperCase()}
                        </Badge>
                        <span className="text-sm font-medium">
                          {conflict.enquiry?.clientName}
                        </span>
                      </div>
                      <p className="text-xs text-gray-600 mb-2">
                        {conflict.message}
                      </p>
                      <div className="text-xs text-gray-500">
                        {conflict.enquiry?.eventDate && new Date(conflict.enquiry.eventDate).toLocaleDateString()}
                        {conflict.enquiry?.eventTime && ` at ${conflict.enquiry.eventTime}`}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            {unresolvedConflicts.length > 3 && (
              <div className="text-center">
                <Button variant="outline" size="sm">
                  View All {unresolvedConflicts.length} Conflicts
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}