// Booking Status Mapping System
// This allows gradual migration from old complex statuses to new simplified ones

export interface BookingStatus {
  // Current system statuses
  oldStatus: string;
  
  // New simplified statuses (4-stage workflow)
  newStatus: 'enquiry' | 'negotiation' | 'contract_signed' | 'completed' | 'cancelled';
  
  // Progress tags
  tags: {
    contractSent?: boolean;
    contractSigned?: boolean;
    invoiceSent?: boolean;
    paidInFull?: boolean;
    depositPaid?: boolean;
  };
}

// Mapping from old status system to new simplified system
export const statusMapping: Record<string, BookingStatus> = {
  'new': {
    oldStatus: 'new',
    newStatus: 'enquiry',
    tags: {}
  },
  'booking_in_progress': {
    oldStatus: 'booking_in_progress',
    newStatus: 'negotiation',
    tags: {}
  },
  'client_confirms': {
    oldStatus: 'client_confirms',
    newStatus: 'negotiation',
    tags: {}
  },
  'contract_sent': {
    oldStatus: 'contract_sent',
    newStatus: 'negotiation',
    tags: { contractSent: true }
  },
  'contract_received': {
    oldStatus: 'contract_received',
    newStatus: 'negotiation',
    tags: { contractSent: true, contractSigned: true }
  },
  'confirmed': {
    oldStatus: 'confirmed',
    newStatus: 'contract_signed',
    tags: { contractSigned: true }
  },
  'completed': {
    oldStatus: 'completed',
    newStatus: 'completed',
    tags: { contractSigned: true, paidInFull: true }
  },
  'rejected': {
    oldStatus: 'rejected',
    newStatus: 'cancelled',
    tags: {}
  }
};

// Helper function to get new status from old status
export function mapToNewStatus(oldStatus: string): 'enquiry' | 'negotiation' | 'contract_signed' | 'completed' | 'cancelled' {
  const mapping = statusMapping[oldStatus];
  return mapping ? mapping.newStatus : 'enquiry';
}

// Helper function to get display status (with improved naming)
export function getDisplayStatus(oldStatus: string): string {
  const mapping = statusMapping[oldStatus];
  if (!mapping) return oldStatus;
  
  const displayNames: Record<string, string> = {
    'enquiry': 'Enquiry',
    'negotiation': 'Negotiation',
    'contract_signed': 'Contract Signed',
    'completed': 'Completed',
    'cancelled': 'Cancelled'
  };
  
  return displayNames[mapping.newStatus] || mapping.newStatus;
}

// Helper function to get progress tags from booking data
export function getProgressTags(booking: any): BookingStatus['tags'] {
  const mapping = statusMapping[booking.status];
  const baseTags = mapping ? mapping.tags : {};
  
  // Override with actual database values if available
  return {
    ...baseTags,
    contractSent: booking.contractSent || baseTags.contractSent,
    contractSigned: booking.contractSigned || baseTags.contractSigned,
    invoiceSent: booking.invoiceSent || baseTags.invoiceSent,
    paidInFull: booking.paidInFull || baseTags.paidInFull,
    depositPaid: booking.depositPaid || baseTags.depositPaid,
  };
}

// Helper function to check if booking needs attention
export function needsAttention(booking: any): {
  needsResponse: boolean;
  needsContract: boolean;
  needsInvoice: boolean;
} {
  const newStatus = mapToNewStatus(booking.status);
  const tags = getProgressTags(booking);
  
  return {
    needsResponse: newStatus === 'enquiry' || booking.responseNeeded,
    needsContract: newStatus === 'negotiation' && !tags.contractSent,
    needsInvoice: newStatus === 'contract_signed' && !tags.invoiceSent
  };
}

// Status color mapping for display - unified with booking page colors
export function getStatusColor(status: string): string {
  // Direct mapping to booking page left border color scheme
  switch(status?.toLowerCase()) {
    case 'new':
    case 'enquiry':
      return 'bg-sky-100 text-sky-800 border-sky-200';
    case 'awaiting_response':
    case 'in_progress':
    case 'booking_in_progress':
    case 'negotiation':
      return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'client_confirms':
      return 'bg-orange-100 text-orange-800 border-orange-200';
    case 'confirmed':
    case 'contract_signed':
      return 'bg-green-100 text-green-800 border-green-200';
    case 'completed':
      return 'bg-gray-100 text-gray-800 border-gray-200';
    case 'cancelled':
    case 'rejected':
      return 'bg-red-100 text-red-800 border-red-200';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
}

// Status icon mapping
export function getStatusIcon(status: string): string {
  const newStatus = mapToNewStatus(status);
  
  const icons: Record<string, string> = {
    'enquiry': '📧',
    'negotiation': '💬',
    'contract_signed': '✅',
    'completed': '🎉',
    'cancelled': '❌'
  };
  
  return icons[newStatus] || '📋';
}