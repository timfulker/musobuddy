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
  conflictCount: number;
  conflictDetails: string;
}

export function analyzeConflictSeverity(
  enquiry: any,
  analysis: ConflictAnalysis
): ConflictSeverity {
  // No conflicts
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

  // Critical conflicts (Red + Block Action) - Confirmed booking conflicts
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

  // Warning conflicts (Orange + Proceed with Caution) - Time/venue overlaps between enquiries
  if (analysis.hasTimeOverlap && !analysis.sameClient) {
    return {
      level: 'warning',
      color: 'orange',
      bgColor: 'bg-orange-50',
      borderColor: 'border-orange-300',
      textColor: 'text-orange-800',
      icon: '⚠️',
      message: 'Time overlap with other enquiries - review carefully',
      canProceed: true
    };
  }

  // Same venue conflicts between enquiries
  if (analysis.sameVenue && !analysis.sameClient) {
    return {
      level: 'warning',
      color: 'orange',
      bgColor: 'bg-orange-50',
      borderColor: 'border-orange-300',
      textColor: 'text-orange-800',
      icon: '📍',
      message: 'Same venue with other enquiries - check logistics',
      canProceed: true
    };
  }

  // Same client conflicts (Blue - often resolvable)
  if (analysis.sameClient) {
    return {
      level: 'info',
      color: 'blue',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-300',
      textColor: 'text-blue-800',
      icon: '👤',
      message: 'Same client - multiple events possible',
      canProceed: true
    };
  }

  // Soft conflicts (Yellow/Amber - same day between enquiries)
  return {
    level: 'info',
    color: 'amber',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-300',
    textColor: 'text-amber-800',
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
      return `${baseClasses} bg-red-100 text-red-800 border border-red-200`;
    case 'warning':
      return `${baseClasses} bg-orange-100 text-orange-800 border border-orange-200`;
    case 'info':
      return `${baseClasses} bg-blue-100 text-blue-800 border border-blue-200`;
    default:
      return `${baseClasses} bg-amber-100 text-amber-800 border border-amber-200`;
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
      return [
        { label: 'Reschedule', action: 'reschedule', variant: 'default', icon: '📅' },
        { label: 'Decline', action: 'decline', variant: 'destructive', icon: '❌' },
        { label: 'Review Details', action: 'review', variant: 'outline', icon: '🔍' }
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