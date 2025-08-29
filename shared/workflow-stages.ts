// Workflow Stage Management System
// Tracks booking progression through business workflow stages

export type WorkflowStage = 'initial' | 'negotiating' | 'client_confirmed' | 'contract' | 'confirmed' | 'performed' | 'complete';

export interface StageDefinition {
  id: WorkflowStage;
  label: string;
  icon: string;
  description: string;
  autoAdvanceConditions?: string[];
}

export const WORKFLOW_STAGES: StageDefinition[] = [
  {
    id: 'initial',
    label: 'Initial',
    icon: '📝',
    description: 'New inquiry, needs response',
    autoAdvanceConditions: ['first_response_sent']
  },
  {
    id: 'negotiating',
    label: 'Negotiating',
    icon: '💬',
    description: 'Back-and-forth conversations',
    autoAdvanceConditions: ['client_verbally_confirmed']
  },
  {
    id: 'client_confirmed',
    label: 'Client Confirmed',
    icon: '✨',
    description: 'Client verbally confirms booking',
    autoAdvanceConditions: ['contract_sent']
  },
  {
    id: 'contract',
    label: 'Contract',
    icon: '📋',
    description: 'Contract sent, awaiting signature',
    autoAdvanceConditions: ['contract_signed']
  },
  {
    id: 'confirmed',
    label: 'Confirmed',
    icon: '✅',
    description: 'Contract signed, booking confirmed',
    autoAdvanceConditions: ['event_date_passed']
  },
  {
    id: 'performed',
    label: 'Performed',
    icon: '🎵',
    description: 'Event completed',
    autoAdvanceConditions: ['invoice_sent', 'payment_received']
  },
  {
    id: 'complete',
    label: 'Complete',
    icon: '✔️',
    description: 'All admin finished',
    autoAdvanceConditions: []
  }
];

export function getStageIndex(stage: WorkflowStage): number {
  return WORKFLOW_STAGES.findIndex(s => s.id === stage);
}

export function getStageDefinition(stage: WorkflowStage): StageDefinition | undefined {
  return WORKFLOW_STAGES.find(s => s.id === stage);
}

export function getNextStage(currentStage: WorkflowStage): WorkflowStage | null {
  const currentIndex = getStageIndex(currentStage);
  if (currentIndex === -1 || currentIndex >= WORKFLOW_STAGES.length - 1) {
    return null;
  }
  return WORKFLOW_STAGES[currentIndex + 1].id;
}

export function canAdvanceStage(currentStage: WorkflowStage, conditions: string[]): boolean {
  const stage = getStageDefinition(currentStage);
  if (!stage || !stage.autoAdvanceConditions) return false;
  
  return stage.autoAdvanceConditions.some(condition => conditions.includes(condition));
}

export function getStageProgress(stage: WorkflowStage): number {
  const index = getStageIndex(stage);
  if (index === -1) return 0;
  return Math.round(((index + 1) / WORKFLOW_STAGES.length) * 100);
}

export function getStageColor(stage: WorkflowStage): string {
  switch (stage) {
    case 'initial': return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'negotiating': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case 'contract': return 'bg-orange-100 text-orange-800 border-orange-200';
    case 'confirmed': return 'bg-green-100 text-green-800 border-green-200';
    case 'performed': return 'bg-purple-100 text-purple-800 border-purple-200';
    case 'complete': return 'bg-gray-100 text-gray-800 border-gray-200';
    default: return 'bg-blue-100 text-blue-800 border-blue-200';
  }
}

// Auto-advancement logic
export function shouldAdvanceToNegotiating(booking: any): boolean {
  // Advance to negotiating when there's been communication back and forth
  return booking.lastContactedAt !== null;
}

export function shouldAdvanceToContract(booking: any): boolean {
  // Advance to contract when contract has been sent
  return booking.contractSent === true;
}

export function shouldAdvanceToConfirmed(booking: any): boolean {
  // Advance to confirmed when contract has been signed
  return booking.contractSigned === true;
}

export function shouldAdvanceToPerformed(booking: any): boolean {
  // Advance to performed when event date has passed
  if (!booking.eventDate) return false;
  const eventDate = new Date(booking.eventDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return eventDate < today;
}

export function shouldAdvanceToComplete(booking: any): boolean {
  // Advance to complete when invoice sent and payment received
  return booking.invoiceSent === true && booking.paidInFull === true;
}

export function determineCurrentStage(booking: any): WorkflowStage {
  // If a manual workflow stage is set, use that
  if (booking.workflowStage && booking.workflowStage !== 'initial') {
    return booking.workflowStage as WorkflowStage;
  }
  
  // Otherwise, determine based on booking data
  // Check conditions in reverse order (most advanced first)
  if (shouldAdvanceToComplete(booking)) return 'complete';
  if (shouldAdvanceToPerformed(booking)) return 'performed';
  if (shouldAdvanceToConfirmed(booking)) return 'confirmed';
  if (shouldAdvanceToContract(booking)) return 'contract';
  if (shouldAdvanceToNegotiating(booking)) return 'negotiating';
  return 'initial';
}