// Conflict UI utility functions based on graduated conflict indicators strategy

export interface ConflictSeverity {
  level: 'none' | 'info' | 'warning' | 'critical';
  color: string;
  bgColor: string;
  borderColor: string;
  textColor: string;
  icon: string;
  message: string;
  canProceed: boolean;
}

export interface ConflictAnalysis {
  hasTimeOverlap: boolean;
  sameVenue: boolean;
  sameClient: boolean;
  confirmedBooking: boolean;
  unconfirmedEnquiry: boolean;
  conflictCount: number;
  conflictDetails: string;
}

export function analyzeConflictSeverity(
  enquiry: any,
  analysis: ConflictAnalysis
): ConflictSeverity {
  // IMPORTANT: Only show green checkmark if truly no conflicts exist
  // If there are multiple bookings on same date, always show warning icon
  if (analysis.conflictCount === 0) {
    return {
      level: 'none',
      color: 'green',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200',
      textColor: 'text-green-800',
      icon: '✅',
      message: 'No conflicts detected',
      canProceed: true
    };
  }
  
  // Warning conflicts - Same date as unconfirmed enquiry (potential scheduling conflict)
  if (analysis.unconfirmedEnquiry) {
    return {
      level: 'warning',
      color: 'amber',
      bgColor: 'bg-amber-50',
      borderColor: 'border-amber-300',
      textColor: 'text-amber-800',
      icon: '⚠️',
      message: 'Same date as unconfirmed enquiry - potential scheduling conflict',
      canProceed: true
    };
  }

  // Critical conflicts - Same date as confirmed booking (double booking risk)
  if (analysis.confirmedBooking) {
    return {
      level: 'critical',
      color: 'red',
      bgColor: 'bg-red-50',
      borderColor: 'border-red-300',
      textColor: 'text-red-800',
      icon: '🚫',
      message: 'CONFIRMED BOOKING CONFLICT - Double booking risk',
      canProceed: false
    };
  }

  // Warning conflicts - Use amber to avoid calendar's blue (in progress)
  if (analysis.hasTimeOverlap && !analysis.sameClient) {
    return {
      level: 'warning',
      color: 'amber',
      bgColor: 'bg-amber-50',
      borderColor: 'border-amber-300',
      textColor: 'text-amber-800',
      icon: '⚠️',
      message: 'Time overlap with other enquiries - review carefully',
      canProceed: true
    };
  }

  // Same venue conflicts between enquiries
  if (analysis.sameVenue && !analysis.sameClient) {
    return {
      level: 'warning',
      color: 'amber',
      bgColor: 'bg-amber-50',
      borderColor: 'border-amber-300',
      textColor: 'text-amber-800',
      icon: '📍',
      message: 'Same venue with other enquiries - check logistics',
      canProceed: true
    };
  }

  // Same client conflicts - Use teal to avoid calendar's blue
  if (analysis.sameClient) {
    return {
      level: 'info',
      color: 'teal',
      bgColor: 'bg-teal-50',
      borderColor: 'border-teal-300',
      textColor: 'text-teal-800',
      icon: '👤',
      message: 'Same client - multiple events possible',
      canProceed: true
    };
  }

  // Soft conflicts - Use slate for neutral same-day conflicts
  return {
    level: 'info',
    color: 'slate',
    bgColor: 'bg-slate-50',
    borderColor: 'border-slate-300',
    textColor: 'text-slate-800',
    icon: '📅',
    message: 'Same day as other enquiries - check timing',
    canProceed: true
  };
}

export function getConflictCardStyling(severity: ConflictSeverity): string {
  switch (severity.level) {
    case 'critical':
      return `border-l-4 border-l-red-500 ${severity.bgColor} shadow-md`;
    case 'warning':
      return `border-l-4 border-l-orange-500 ${severity.bgColor}`;
    case 'info':
      return `border-l-4 border-l-blue-500 ${severity.bgColor}`;
    default:
      return 'border-l-4 border-l-green-500 bg-white';
  }
}

export function getConflictBadge(severity: ConflictSeverity, conflictCount: number): string {
  if (severity.level === 'none') return '';
  
  const baseClasses = 'flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium';
  
  switch (severity.level) {
    case 'critical':
      return `${baseClasses} bg-rose-100 text-rose-800 border border-rose-200`;
    case 'warning':
      return `${baseClasses} bg-amber-100 text-amber-800 border border-amber-200`;
    case 'info':
      return `${baseClasses} ${severity.color === 'teal' ? 'bg-teal-100 text-teal-800 border border-teal-200' : 'bg-slate-100 text-slate-800 border border-slate-200'}`;
    default:
      return `${baseClasses} bg-slate-100 text-slate-800 border border-slate-200`;
  }
}

export function parseConflictAnalysis(enquiry: any): ConflictAnalysis {
  const conflictCount = parseInt(enquiry.conflictCount) || 0;
  const conflictDetails = enquiry.conflictDetails || '';
  
  // Parse conflict details for analysis
  const hasTimeOverlap = conflictDetails.includes('time overlap') || 
                        conflictDetails.includes('Time slots overlap');
  const sameVenue = conflictDetails.includes('same venue') || 
                   conflictDetails.includes('Same venue');
  const sameClient = conflictDetails.includes('same client') || 
                    conflictDetails.includes('Same client');
  const confirmedBooking = conflictDetails.includes('confirmed booking') || 
                          conflictDetails.includes('Confirmed booking');

  return {
    hasTimeOverlap,
    sameVenue,
    sameClient,
    confirmedBooking,
    conflictCount,
    conflictDetails
  };
}

export function getConflictActions(severity: ConflictSeverity): Array<{
  label: string;
  action: string;
  variant: 'default' | 'destructive' | 'outline' | 'secondary';
  icon: string;
}> {
  switch (severity.level) {
    case 'critical':
      // For confirmed booking conflicts - NO PROCEED option to prevent double booking
      return [
        { label: 'Decline Enquiry', action: 'decline', variant: 'destructive', icon: '❌' },
        { label: 'Reschedule Enquiry', action: 'reschedule', variant: 'default', icon: '📅' },
        { label: 'View Booking Details', action: 'review', variant: 'outline', icon: '🔍' }
      ];
    case 'warning':
      return [
        { label: 'Check Timing', action: 'timing', variant: 'default', icon: '⏰' },
        { label: 'Contact Client', action: 'contact', variant: 'outline', icon: '📞' },
        { label: 'Proceed Carefully', action: 'proceed', variant: 'secondary', icon: '⚠️' }
      ];
    case 'info':
      return [
        { label: 'Review', action: 'review', variant: 'outline', icon: '👀' },
        { label: 'Proceed', action: 'proceed', variant: 'default', icon: '✅' }
      ];
    default:
      return [];
  }
}

export function formatConflictTooltip(severity: ConflictSeverity, analysis: ConflictAnalysis): string {
  let details = [severity.message];
  
  if (analysis.hasTimeOverlap) details.push('• Time overlap detected');
  if (analysis.sameVenue) details.push('• Same venue');
  if (analysis.sameClient) details.push('• Same client');
  if (analysis.confirmedBooking) details.push('• Confirmed booking exists');
  
  return details.join('\n');
}