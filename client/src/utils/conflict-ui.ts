export function getDateBox(eventDate: Date | null) {
  if (!eventDate) {
    return {
      dayName: 'TBD',
      dayNum: '--',
      monthYear: '--'
    };
  }

  const date = new Date(eventDate);
  const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
  const dayNum = date.getDate().toString().padStart(2, '0');
  const monthYear = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });

  return {
    dayName,
    dayNum,
    monthYear
  };
}

export function analyzeConflictSeverity(conflicts: any[]) {
  if (!conflicts || conflicts.length === 0) {
    return 'none';
  }

  // Check if any conflicts are on the same day
  const hasSameDayConflicts = conflicts.some(conflict => {
    // This would need to be implemented based on your conflict data structure
    return conflict.type === 'same_day' || conflict.severity === 'high';
  });

  if (hasSameDayConflicts) {
    return 'high';
  }

  return 'medium';
}

export function formatConflictMessage(conflicts: any[]) {
  if (!conflicts || conflicts.length === 0) {
    return '';
  }

  const count = conflicts.length;
  if (count === 1) {
    return '1 Conflict - Click to resolve';
  }
  
  return `${count} Conflicts - Click to resolve`;
}