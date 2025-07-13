import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertTriangle, Calendar, Clock, MapPin, User, CheckCircle } from "lucide-react";
import { useState } from "react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

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

export default function ConflictsWidget() {
  const [selectedConflict, setSelectedConflict] = useState<BookingConflict | null>(null);
  const { toast } = useToast();

  const { data: conflicts = [], isLoading } = useQuery({
    queryKey: ["/api/conflicts"],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const unresolvedConflicts = conflicts.filter((c: BookingConflict) => !c.resolved);

  const resolveConflict = async (conflictId: number) => {
    try {
      await apiRequest(`/api/conflicts/${conflictId}/resolve`, {
        method: "POST",
        body: JSON.stringify({ resolution: "manual", notes: "Resolved by user" }),
      });
      
      toast({
        title: "Conflict resolved",
        description: "The scheduling conflict has been marked as resolved.",
      });
      
      // Refresh the conflicts list
      window.location.reload();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to resolve conflict. Please try again.",
        variant: "destructive",
      });
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
          <div className="space-y-3">
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
                    <p className="text-sm text-muted-foreground mb-2">
                      {conflict.message}
                    </p>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {conflict.enquiry?.eventDate ? 
                          new Date(conflict.enquiry.eventDate).toLocaleDateString() : 
                          'No date'
                        }
                      </div>
                      {conflict.enquiry?.eventTime && (
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {conflict.enquiry.eventTime}
                        </div>
                      )}
                      {conflict.enquiry?.venue && (
                        <div className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {conflict.enquiry.venue}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => setSelectedConflict(conflict)}
                        >
                          View Details
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-md">
                        <DialogHeader>
                          <DialogTitle>Scheduling Conflict Details</DialogTitle>
                        </DialogHeader>
                        {selectedConflict && (
                          <div className="space-y-4">
                            <div className="p-3 bg-gray-50 rounded-lg">
                              <h4 className="font-medium mb-2">New Enquiry</h4>
                              <div className="space-y-1 text-sm">
                                <div className="flex items-center gap-2">
                                  <User className="h-4 w-4" />
                                  {selectedConflict.enquiry?.clientName}
                                </div>
                                <div className="flex items-center gap-2">
                                  <Calendar className="h-4 w-4" />
                                  {selectedConflict.enquiry?.eventDate ? 
                                    new Date(selectedConflict.enquiry.eventDate).toLocaleDateString() : 
                                    'No date'
                                  }
                                </div>
                                {selectedConflict.enquiry?.eventTime && (
                                  <div className="flex items-center gap-2">
                                    <Clock className="h-4 w-4" />
                                    {selectedConflict.enquiry.eventTime}
                                  </div>
                                )}
                                {selectedConflict.enquiry?.venue && (
                                  <div className="flex items-center gap-2">
                                    <MapPin className="h-4 w-4" />
                                    {selectedConflict.enquiry.venue}
                                  </div>
                                )}
                              </div>
                            </div>
                            
                            <div className="p-3 bg-red-50 rounded-lg">
                              <h4 className="font-medium mb-2">Conflicts With</h4>
                              <div className="space-y-1 text-sm">
                                <div className="flex items-center gap-2">
                                  <User className="h-4 w-4" />
                                  {selectedConflict.conflictItem?.clientName}
                                </div>
                                <div className="flex items-center gap-2">
                                  <Calendar className="h-4 w-4" />
                                  {selectedConflict.conflictItem?.eventDate ? 
                                    new Date(selectedConflict.conflictItem.eventDate).toLocaleDateString() : 
                                    'No date'
                                  }
                                </div>
                                {selectedConflict.conflictItem?.eventTime && (
                                  <div className="flex items-center gap-2">
                                    <Clock className="h-4 w-4" />
                                    {selectedConflict.conflictItem.eventTime}
                                  </div>
                                )}
                                {selectedConflict.conflictItem?.venue && (
                                  <div className="flex items-center gap-2">
                                    <MapPin className="h-4 w-4" />
                                    {selectedConflict.conflictItem.venue}
                                  </div>
                                )}
                              </div>
                            </div>
                            
                            <div className="p-3 bg-yellow-50 rounded-lg">
                              <h4 className="font-medium mb-2">Analysis</h4>
                              <p className="text-sm">{selectedConflict.message}</p>
                            </div>
                            
                            <div className="flex justify-end gap-2">
                              <Button 
                                variant="outline"
                                onClick={() => setSelectedConflict(null)}
                              >
                                Close
                              </Button>
                              <Button 
                                onClick={() => resolveConflict(selectedConflict.id)}
                                className="bg-green-600 hover:bg-green-700"
                              >
                                Mark as Resolved
                              </Button>
                            </div>
                          </div>
                        )}
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>
              </div>
            ))}
            
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