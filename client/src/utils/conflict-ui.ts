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