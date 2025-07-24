import { useQuery } from "@tanstack/react-query";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface ConflictIndicatorProps {
  bookingId: number;
}

export default function ConflictIndicator({ bookingId }: ConflictIndicatorProps) {
  const { data: conflicts = [] } = useQuery({
    queryKey: ["/api/conflicts"],
    staleTime: 30000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
  });

  // Find conflicts for this specific booking
  const bookingConflicts = conflicts.filter((conflict: any) => 
    conflict.enquiryId === bookingId || conflict.conflictId === bookingId
  );

  if (bookingConflicts.length === 0) {
    return null;
  }

  // Determine conflict severity
  const hasHighSeverity = bookingConflicts.some((c: any) => c.severity === 'high');
  const hasMediumSeverity = bookingConflicts.some((c: any) => c.severity === 'medium');

  let conflictColor = '';
  let conflictType = '';
  let conflictMessage = '';

  if (hasHighSeverity) {
    conflictColor = 'bg-red-500';
    conflictType = 'Critical Conflict';
    conflictMessage = 'Hard time overlap detected';
  } else if (hasMediumSeverity) {
    conflictColor = 'bg-orange-500';
    conflictType = 'Soft Conflict';
    conflictMessage = 'Same-day booking exists';
  } else {
    conflictColor = 'bg-yellow-500';
    conflictType = 'Time Resolved';
    conflictMessage = 'No time clash - can coexist';
  }

  // Get conflicting booking details
  const conflictDetails = bookingConflicts.map((c: any) => {
    const other = c.enquiryId === bookingId ? c.conflictItem : c.enquiry;
    return `${other?.clientName} - ${other?.eventTime}`;
  }).join(', ');

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={`absolute top-2 right-2 w-3 h-3 rounded-full ${conflictColor} z-10 cursor-help`}></div>
        </TooltipTrigger>
        <TooltipContent>
          <div className="text-xs">
            <div className="font-medium">{conflictType}</div>
            <div className="text-gray-600">{conflictMessage}</div>
            {conflictDetails && (
              <div className="text-gray-500 mt-1">Clashes with: {conflictDetails}</div>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}