import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";
import { useLuminanceAware } from "@/hooks/use-luminance-aware";

// Luminance-aware Button component for the resolve button
function LuminanceAwareButton({ children, className, ...props }: React.ComponentProps<typeof Button>) {
  const ref = useLuminanceAware();

  return (
    <Button
      ref={ref as any}
      className={className}
      {...props}
    >
      {children}
    </Button>
  );
}
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import ConflictResolutionDialog from "./ConflictResolutionDialog";
import { apiRequest } from "@/lib/queryClient";

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
  const [, setLocation] = useLocation();
  

  // Clean up any leftover localStorage from previous functionality
  useEffect(() => {
    localStorage.removeItem('openConflictForBooking');
  }, []);

  // Handle editing a booking - navigate to the edit form
  const handleEditBooking = (booking: any) => {
    // Store the booking ID so we can return to it later
    localStorage.setItem('bookingReturnToId', booking.id.toString());
    setLocation(`/new-booking?edit=${booking.id}`);
  };

  // Fetch the current booking data for the resolution modal - optimized caching
  const { data: currentBooking, refetch: refetchBooking } = useQuery({
    queryKey: [`/api/bookings/${bookingId}`],
    enabled: showResolutionModal,
    staleTime: 60000, // Cache for 1 minute instead of always fresh
    gcTime: 300000, // Keep in cache for 5 minutes
  });

  // Get ALL bookings in the conflict group (including the current booking)
  // This ensures we show all conflicted bookings in the resolution modal, not just direct conflicts
  const allConflictedBookingIds = React.useMemo(() => {
    const allIds = new Set([bookingId]); // Start with current booking
    const directConflictIds = conflicts.map(c => c.withBookingId);
    directConflictIds.forEach(id => allIds.add(id));

    console.log('🔍 [ConflictIndicator] Calculated all conflicted booking IDs:', {
      bookingId,
      directConflicts: directConflictIds,
      totalBookingsInGroup: Array.from(allIds).length,
      allBookingIds: Array.from(allIds)
    });

    return Array.from(allIds);
  }, [bookingId, conflicts]);

  // Fetch ALL bookings in the conflict group in batch for better performance
  const { data: allConflictedBookings = [], isLoading: isLoadingConflictingBookings, error: conflictingBookingsError } = useQuery({
    queryKey: [`/api/bookings/batch/conflict-group`, allConflictedBookingIds.sort().join(',')],
    queryFn: async () => {
      if (!allConflictedBookingIds.length) return [];

      console.log('🔍 [ConflictIndicator] Fetching ALL bookings in conflict group:', {
        bookingId,
        allConflictedBookingIds,
        groupSize: allConflictedBookingIds.length
      });

      try {
        // First try batch endpoint for efficiency - single request for entire conflict group
        const response = await apiRequest('/api/bookings/batch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ bookingIds: allConflictedBookingIds })
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error('❌ [ConflictIndicator] Batch fetch failed:', response.status, errorText);
          throw new Error(`Batch fetch failed: ${response.status} - ${errorText}`);
        }

        const result = await response.json();
        console.log('✅ [ConflictIndicator] Fetched entire conflict group via batch:', {
          requestedIds: allConflictedBookingIds,
          fetchedCount: result.length,
          fetchedBookings: result.map((b: any) => ({ id: b.id, clientName: b.clientName }))
        });

        return result;
      } catch (batchError) {
        console.warn('⚠️ [ConflictIndicator] Batch fetch failed, falling back to individual fetches:', batchError);

        // Fallback: fetch each booking individually
        const individualFetches = allConflictedBookingIds.map(async (id) => {
          try {
            const response = await apiRequest(`/api/bookings/${id}`);
            if (!response.ok) {
              console.error(`❌ [ConflictIndicator] Failed to fetch booking ${id}:`, response.status);
              return null;
            }
            return await response.json();
          } catch (error) {
            console.error(`❌ [ConflictIndicator] Error fetching booking ${id}:`, error);
            return null;
          }
        });

        const individualResults = await Promise.all(individualFetches);
        const validBookings = individualResults.filter(Boolean);

        console.log('✅ [ConflictIndicator] Fetched conflict group via individual calls:', {
          requestedIds: allConflictedBookingIds,
          fetchedCount: validBookings.length,
          fetchedBookings: validBookings.map((b: any) => ({ id: b.id, clientName: b.clientName }))
        });

        return validBookings;
      }
    },
    enabled: showResolutionModal && allConflictedBookingIds.length > 0,
    staleTime: 300000, // Cache for 5 minutes - conflicts don't change that often
    gcTime: 600000, // Keep in cache for 10 minutes
  });

  // Open modal without refetching - data is already cached
  const handleResolveClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShowResolutionModal(true);
    // Removed refetchBooking() - use cached data for performance
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
      <button
        className="absolute top-20 right-2 h-8 px-3 border-0 shadow-md z-20 rounded-md text-sm font-medium inline-flex items-center justify-center"
        style={{
          backgroundColor: severity === 'hard' ? '#ef4444' : severity === 'soft' ? '#f97316' : '#eab308',
          color: '#000000'
        }}
        title={getTooltipText()}
        onClick={handleResolveClick}
        onMouseDown={(e) => e.stopPropagation()}
        onMouseUp={(e) => e.stopPropagation()}
      >
        <span className="text-xs font-medium">Resolve</span>
      </button>
      
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
        conflictingBookings={(() => {
          // Use the complete conflict group instead of separate current + conflicting bookings
          const completeConflictGroup = allConflictedBookings.filter(Boolean);
          console.log('🔍 [ConflictIndicator] Passing COMPLETE conflict group to ConflictResolutionDialog:', {
            bookingId,
            totalBookingsInGroup: completeConflictGroup.length,
            allBookingsInGroup: completeConflictGroup.map((b: any) => ({ id: b.id, clientName: b.clientName })),
            isLoadingConflictingBookings,
            conflictingBookingsError: conflictingBookingsError?.message,
            originalConflictsCount: conflicts.length
          });
          return completeConflictGroup;
        })()}
        onEditBooking={handleEditBooking}
      />
    </>
  );
}