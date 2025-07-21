// Updated 6-stage workflow system for booking management
export type WorkflowStage = 
  | 'new'               // New - Client has enquired, no response sent yet
  | 'in_progress'       // In Progress - You've responded, working with client
  | 'client_confirms'   // Client Confirms - Client says "yes" but not yet under contract
  | 'confirmed'         // Confirmed - Contract signed, booking locked in
  | 'completed'         // Completed - Gig is finished (past date)
  | 'rejected';         // Rejected - Booking was rejected or cancelled

export interface WorkflowConfig {
  stage: WorkflowStage;
  displayName: string;
  color: string;
  bgColor: string;
  borderColor: string;
  icon: string;
  description: string;
  contextualActions: {
    label: string;
    action: string;
    icon: string;
    color: string;
  }[];
}

export const workflowStages: Record<WorkflowStage, WorkflowConfig> = {
  new: {
    stage: 'new',
    displayName: 'New Enquiry',
    color: 'text-white',
    bgColor: 'bg-blue-500',
    borderColor: 'border-blue-500',
    icon: '📧',
    description: 'Client has emailed you - no response sent yet',
    contextualActions: [
      {
        label: 'Reply to Enquiry',
        action: 'reply_enquiry',
        icon: '💬',
        color: 'bg-blue-600 hover:bg-blue-700'
      }
    ]
  },
  in_progress: {
    stage: 'in_progress',
    displayName: 'In Progress',
    color: 'text-yellow-900',
    bgColor: 'bg-yellow-400',
    borderColor: 'border-yellow-400',
    icon: '⏳',
    description: "You've responded - working with client",
    contextualActions: [
      {
        label: 'Send Follow-Up',
        action: 'send_followup',
        icon: '📞',
        color: 'bg-yellow-600 hover:bg-yellow-700'
      },
      {
        label: 'Mark as Client Confirmed',
        action: 'client_confirms',
        icon: '👍',
        color: 'bg-orange-600 hover:bg-orange-700'
      }
    ]
  },
  client_confirms: {
    stage: 'client_confirms',
    displayName: 'Client Confirms',
    color: 'text-white',
    bgColor: 'bg-orange-500',
    borderColor: 'border-orange-500',
    icon: '👍',
    description: 'Client says "yes" - not yet under contract',
    contextualActions: [
      {
        label: 'Send Contract',
        action: 'send_contract',
        icon: '📋',
        color: 'bg-purple-600 hover:bg-purple-700'
      }
    ]
  },

  confirmed: {
    stage: 'confirmed',
    displayName: 'Confirmed',
    color: 'text-white',
    bgColor: 'bg-green-500',
    borderColor: 'border-green-500',
    icon: '✅',
    description: 'Signed contract returned - booking locked in',
    contextualActions: [
      {
        label: 'Send Invoice',
        action: 'send_invoice',
        icon: '💰',
        color: 'bg-blue-600 hover:bg-blue-700'
      },
      {
        label: 'Mark as Paid',
        action: 'mark_paid',
        icon: '💳',
        color: 'bg-green-600 hover:bg-green-700'
      }
    ]
  },
  rejected: {
    stage: 'rejected',
    displayName: 'Rejected',
    color: 'text-white',
    bgColor: 'bg-red-500',
    borderColor: 'border-red-500',
    icon: '❌',
    description: 'Booking was rejected or cancelled',
    contextualActions: []
  },
  completed: {
    stage: 'completed',
    displayName: 'Completed',
    color: 'text-gray-800',
    bgColor: 'bg-gray-400',
    borderColor: 'border-gray-400',
    icon: '🎉',
    description: 'Gig is finished',
    contextualActions: []
  }
};

// Helper function to get stage config
export function getStageConfig(stage: WorkflowStage): WorkflowConfig {
  return workflowStages[stage];
}

// Helper function to get display status
export function getDisplayStatus(status: string): string {
  const stage = mapOldStatusToStage(status);
  return getStageConfig(stage).displayName;
}

// Helper function to get next stage
export function getNextStage(currentStage: WorkflowStage): WorkflowStage | null {
  const stageOrder: WorkflowStage[] = [
    'new', 'in_progress', 'client_confirms', 'confirmed', 'completed', 'rejected'
  ];
  
  const currentIndex = stageOrder.indexOf(currentStage);
  if (currentIndex >= 0 && currentIndex < stageOrder.length - 1) {
    return stageOrder[currentIndex + 1];
  }
  return null;
}

// Helper function to map old statuses to new stages
export function mapOldStatusToStage(oldStatus: string): WorkflowStage {
  const statusMapping: Record<string, WorkflowStage> = {
    'new': 'new',
    'awaiting_response': 'in_progress', // Map old to new system
    'booking_in_progress': 'in_progress',
    'in_progress': 'in_progress',
    'client_confirms': 'client_confirms',
    'contract_sent': 'confirmed', // Simplify workflow
    'confirmed': 'confirmed',
    'cancelled': 'rejected',
    'rejected': 'rejected',
    'completed': 'completed'
  };
  
  return statusMapping[oldStatus] || 'new';
}

// Helper function to get stage-specific filtering
export function getStageFilters(bookings: any[]) {
  const counts = bookings.reduce((acc, booking) => {
    const stage = mapOldStatusToStage(booking.status);
    acc[stage] = (acc[stage] || 0) + 1;
    return acc;
  }, {} as Record<WorkflowStage, number>);
  
  return {
    needsResponse: counts.new || 0,
    needsFollowUp: counts.in_progress || 0,
    needsContract: counts.client_confirms || 0,
    needsSignature: 0, // Removed contract_sent status
    needsInvoice: bookings.filter(b => 
      mapOldStatusToStage(b.status) === 'confirmed' && !b.invoiceSent
    ).length,
    needsPayment: bookings.filter(b => 
      mapOldStatusToStage(b.status) === 'confirmed' && !b.paidInFull
    ).length,
    total: bookings.length
  };
}

// Helper function to execute contextual actions
export function executeContextualAction(
  action: string, 
  bookingId: number, 
  updateBookingStatus: (id: number, status: string) => void
) {
  switch (action) {
    case 'reply_enquiry':
      // Move to in progress
      updateBookingStatus(bookingId, 'in_progress');
      break;
    case 'send_followup':
      // Stay in awaiting response but update last contacted
      break;
    case 'client_confirms':
      // Move to client confirms
      updateBookingStatus(bookingId, 'client_confirms');
      break;
    case 'send_contract':
      // Move to contract sent
      updateBookingStatus(bookingId, 'contract_sent');
      break;
    case 'mark_confirmed':
      // Move to confirmed
      updateBookingStatus(bookingId, 'confirmed');
      break;
    case 'send_invoice':
      // Mark invoice as sent
      break;
    case 'mark_paid':
      // Mark as paid in full
      break;
  }
}