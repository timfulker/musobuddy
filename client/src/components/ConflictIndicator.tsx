import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ConflictResolutionDialog } from "./ConflictResolutionDialog";

interface Conflict {
  withBookingId: number;
  severity: 'hard' | 'soft' | 'resolved';
  clientName: string;
  status: string;
  time: string;
  canEdit: boolean;
  canReject: boolean;
  type: string;
  message: string;
  overlapMinutes?: number;
}

interface ConflictIndicatorProps {
  bookingId: number;
  conflicts: Conflict[];
  onOpenModal?: () => void;
  onEditBooking?: (booking: any) => void;
}

export default function ConflictIndicator({ bookingId, conflicts, onOpenModal, onEditBooking }: ConflictIndicatorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showResolutionModal, setShowResolutionModal] = useState(false);

  // Fetch the current booking data for the resolution modal
  const { data: currentBooking, refetch: refetchBooking } = useQuery({
    queryKey: [`/api/bookings/${bookingId}`],
    enabled: showResolutionModal,
    staleTime: 0, // Always fetch fresh data
    gcTime: 0, // Don't cache (v5 property name)
  });

  // Refetch when modal opens to ensure fresh data
  const handleResolveClick = () => {
    setShowResolutionModal(true);
    refetchBooking(); // Force fresh data fetch
  };

  if (!conflicts || conflicts.length === 0) {
    return null;
  }

  // Determine the highest severity level
  const hasHard = conflicts.some(c => c.severity === 'hard');
  const hasSoft = conflicts.some(c => c.severity === 'soft');
  
  const severity = hasHard ? 'hard' : hasSoft ? 'soft' : 'resolved';
  
  // Get color based on severity
  const getIndicatorColor = (severity: string) => {
    switch (severity) {
      case 'hard':
        return 'bg-red-500';
      case 'soft':
        return 'bg-orange-500';
      case 'resolved':
        return 'bg-yellow-500';
      default:
        return 'bg-gray-400';
    }
  };

  const getTooltipText = () => {
    if (conflicts.length === 1) {
      const conflict = conflicts[0];
      if (conflict.severity === 'hard') {
        return `⚠️ Clashes with ${conflict.clientName} ${conflict.time}`;
      } else if (conflict.severity === 'soft') {
        return `⚠️ Another enquiry exists`;
      } else {
        return `✅ Same-day, no overlap`;
      }
    } else {
      return `⚠️ ${conflicts.length} conflicts detected`;
    }
  };

  const handleClick = () => {
    if (onOpenModal) {
      onOpenModal();
    } else {
      // Skip simple modal and go directly to full resolution modal
      handleResolveClick();
    }
  };

  return (
    <>
      {/* Conflict Indicator Button */}
      <Button
        size="sm"
        className={`absolute top-2 right-2 h-8 px-3 text-white border-0 shadow-md z-10 ${
          severity === 'hard' ? 'bg-red-500 hover:bg-red-600' : 
          severity === 'soft' ? 'bg-orange-500 hover:bg-orange-600' : 
          'bg-yellow-500 hover:bg-yellow-600'
        }`}
        title={getTooltipText()}
        onClick={handleResolveClick}
      >
        <span className="text-xs font-medium">Resolve</span>
      </Button>
      
      {/* Simple Modal for showing conflicts */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Booking Conflicts</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              This booking conflicts with {conflicts.length} other booking{conflicts.length > 1 ? 's' : ''}:
            </p>
            
            {conflicts.map((conflict, index) => (
              <div
                key={index}
                className={`p-4 rounded-lg border ${
                  conflict.severity === 'hard' ? 'border-red-200 bg-red-50' :
                  conflict.severity === 'soft' ? 'border-orange-200 bg-orange-50' :
                  'border-yellow-200 bg-yellow-50'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge 
                        variant={conflict.severity === 'hard' ? 'destructive' : 'default'}
                        className="text-xs"
                      >
                        {conflict.severity === 'hard' ? 'CRITICAL' : 
                         conflict.severity === 'soft' ? 'WARNING' : 'RESOLVED'}
                      </Badge>
                      <span className="font-medium">{conflict.clientName}</span>
                      <span className="text-sm text-muted-foreground">({conflict.status})</span>
                    </div>
                    <p className="text-sm text-gray-600 mb-1">{conflict.message}</p>
                    <p className="text-xs text-gray-500">Time: {conflict.time}</p>
                    {conflict.overlapMinutes && (
                      <p className="text-xs text-red-600 mt-1">
                        Overlap: {conflict.overlapMinutes} minutes
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm">
                      View Booking
                    </Button>
                  </div>
                </div>
              </div>
            ))}
            
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setIsOpen(false)}>
                Close
              </Button>
              <Button onClick={() => {
                setIsOpen(false);
                setShowResolutionModal(true);
              }}>
                Resolve Conflicts
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Full Conflict Resolution Modal */}
      <ConflictResolutionDialog
        isOpen={showResolutionModal}
        onClose={() => setShowResolutionModal(false)}
        selectedBooking={currentBooking}
        conflicts={conflicts || []}
        onEditBooking={onEditBooking}
      />
    </>
  );
}