// New 6-stage workflow system for booking management
export type WorkflowStage = 
  | 'new'               // New Enquiry - Client has emailed, no response sent yet
  | 'awaiting_response' // Awaiting Response - You've replied, waiting to hear back
  | 'client_confirms'   // Client Confirms - Client says "yes" but not yet under contract
  | 'contract_sent'     // Contract Sent - You've sent the contract, awaiting signature
  | 'confirmed'         // Confirmed - Signed contract returned, booking locked in
  | 'cancelled'         // Cancelled/Rejected - Booking was cancelled or rejected
  | 'completed';        // Completed - Gig is finished (past date)

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
    color: 'text-blue-800',
    bgColor: 'bg-blue-100',
    borderColor: 'border-blue-200',
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
  awaiting_response: {
    stage: 'awaiting_response',
    displayName: 'Awaiting Response',
    color: 'text-yellow-800',
    bgColor: 'bg-yellow-100',
    borderColor: 'border-yellow-200',
    icon: '⏳',
    description: "You've replied - waiting to hear back",
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
    color: 'text-orange-800',
    bgColor: 'bg-orange-100',
    borderColor: 'border-orange-200',
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
  contract_sent: {
    stage: 'contract_sent',
    displayName: 'Contract Sent',
    color: 'text-purple-800',
    bgColor: 'bg-purple-100',
    borderColor: 'border-purple-200',
    icon: '📋',
    description: "You've sent the contract - awaiting signature",
    contextualActions: [
      {
        label: 'Mark as Confirmed',
        action: 'mark_confirmed',
        icon: '✅',
        color: 'bg-green-600 hover:bg-green-700'
      }
    ]
  },
  confirmed: {
    stage: 'confirmed',
    displayName: 'Confirmed',
    color: 'text-green-800',
    bgColor: 'bg-green-100',
    borderColor: 'border-green-200',
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
  cancelled: {
    stage: 'cancelled',
    displayName: 'Cancelled',
    color: 'text-red-800',
    bgColor: 'bg-red-100',
    borderColor: 'border-red-200',
    icon: '❌',
    description: 'Booking was cancelled or rejected',
    contextualActions: []
  },
  completed: {
    stage: 'completed',
    displayName: 'Completed',
    color: 'text-gray-800',
    bgColor: 'bg-gray-100',
    borderColor: 'border-gray-200',
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
    'new', 'awaiting_response', 'client_confirms', 'contract_sent', 'confirmed', 'completed'
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
    'booking_in_progress': 'awaiting_response',
    'contract_sent': 'contract_sent',
    'confirmed': 'confirmed',
    'rejected': 'cancelled',
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
    needsFollowUp: counts.awaiting_response || 0,
    needsContract: counts.client_confirms || 0,
    needsSignature: counts.contract_sent || 0,
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
      // Move to awaiting response
      updateBookingStatus(bookingId, 'awaiting_response');
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