export const getConflictColor = (hasConflicts: boolean, conflictCount: number) => {
  if (!hasConflicts) return 'border-l-blue-500';
  
  if (conflictCount >= 3) return 'border-l-red-500 bg-red-50';
  if (conflictCount >= 2) return 'border-l-amber-500 bg-amber-50';
  return 'border-l-green-500 bg-green-50';
};

export const getConflictIcon = (conflictCount: number) => {
  if (conflictCount >= 3) return 'AlertTriangle';
  if (conflictCount >= 2) return 'AlertTriangle';
  return 'AlertTriangle';
};

export const analyzeConflictSeverity = (enquiry: any, conflictAnalysis: any) => {
  const conflicts = conflictAnalysis?.conflicts || [];
  const conflictCount = conflicts.length;
  
  if (conflictCount === 0) {
    return {
      level: 'none',
      icon: '✓',
      message: 'No conflicts detected'
    };
  }
  
  if (conflictCount >= 3) {
    return {
      level: 'high',
      icon: '⚠️',
      message: `${conflictCount} conflicts detected`
    };
  }
  
  if (conflictCount >= 2) {
    return {
      level: 'medium',
      icon: '⚠️',
      message: `${conflictCount} conflicts detected`
    };
  }
  
  return {
    level: 'low',
    icon: '⚠️',
    message: `${conflictCount} conflict detected`
  };
};

export const getConflictCardStyling = (hasConflicts: boolean, conflictCount: number) => {
  if (!hasConflicts) return 'border-l-4 border-l-blue-500';
  
  if (conflictCount >= 3) return 'border-l-4 border-l-red-500 bg-red-50';
  if (conflictCount >= 2) return 'border-l-4 border-l-amber-500 bg-amber-50';
  return 'border-l-4 border-l-green-500 bg-green-50';
};

export const getConflictBadge = (severity: any, conflictCount: number) => {
  if (severity.level === 'none') return 'bg-green-100 text-green-800';
  if (severity.level === 'high') return 'bg-red-100 text-red-800';
  if (severity.level === 'medium') return 'bg-amber-100 text-amber-800';
  return 'bg-yellow-100 text-yellow-800';
};

export const parseConflictAnalysis = (conflicts: any) => {
  if (!conflicts || !Array.isArray(conflicts)) {
    return { conflicts: [] };
  }
  
  return {
    conflicts: conflicts.map((conflict: any) => ({
      type: conflict.type || 'unknown',
      message: conflict.message || 'Conflict detected',
      severity: conflict.severity || 'medium'
    }))
  };
};

export const getConflictActions = (enquiry: any, conflicts: any[]) => {
  if (!conflicts || conflicts.length === 0) {
    return [];
  }
  
  return [
    {
      label: 'View Details',
      action: 'view',
      variant: 'outline'
    },
    {
      label: 'Resolve',
      action: 'resolve',
      variant: 'default'
    }
  ];
};

export const formatConflictTooltip = (severity: any, conflictAnalysis: any) => {
  const conflicts = conflictAnalysis?.conflicts || [];
  
  if (conflicts.length === 0) {
    return 'No conflicts detected';
  }
  
  const messages = conflicts.map((conflict: any) => conflict.message || 'Conflict detected');
  return messages.join(', ');
};