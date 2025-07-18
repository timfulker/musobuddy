import { BookingWithRelations } from "@shared/schema";

export type ContextualAction = {
  id: string;
  label: string;
  icon: string;
  action: string;
  available: boolean;
  reason?: string;
};

export function getContextualActions(booking: BookingWithRelations): ContextualAction[] {
  // Ensure contracts and invoices are arrays, default to empty arrays if undefined
  const contracts = booking.contracts || [];
  const invoices = booking.invoices || [];
  
  const hasContract = contracts.length > 0;
  const hasInvoice = invoices.length > 0;
  const hasSentContract = hasContract && contracts.some(c => c.status === 'sent' || c.status === 'signed');
  const hasSignedContract = hasContract && contracts.some(c => c.status === 'signed');
  const hasSentInvoice = hasInvoice && invoices.some(i => i.status === 'sent' || i.status === 'paid');
  const isConfirmed = booking.status === 'confirmed' || hasSignedContract;
  const isCompleted = booking.status === 'completed';
  const isCancelled = booking.status === 'cancelled';

  const actions: ContextualAction[] = [];

  // Only show contract actions for early stage bookings that need contracts
  if (booking.status === 'new' || booking.status === 'awaiting_response' || booking.status === 'client_confirms') {
    if (!hasContract && !isCompleted && !isCancelled) {
      actions.push({
        id: 'create-contract',
        label: 'Create Contract',
        icon: '📝',
        action: 'create-contract',
        available: true
      });
    }
  }

  // Only show invoice actions for confirmed bookings
  if (booking.status === 'confirmed' || isConfirmed) {
    if (!hasInvoice && !isCompleted && !isCancelled) {
      actions.push({
        id: 'create-invoice',
        label: 'Create Invoice',
        icon: '🧾',
        action: 'create-invoice',
        available: true
      });
    }
  }

  // Only show completion action for confirmed bookings
  if (isConfirmed && !isCompleted && !isCancelled) {
    actions.push({
      id: 'mark-completed',
      label: 'Mark Completed',
      icon: '🎉',
      action: 'mark-completed',
      available: true
    });
  }

  // Only show confirmation action for bookings that aren't already confirmed
  if (!isConfirmed && !isCompleted && !isCancelled && 
      (booking.status === 'client_confirms' || booking.status === 'contract_sent')) {
    actions.push({
      id: 'mark-confirmed',
      label: 'Mark Confirmed',
      icon: '✅',
      action: 'mark-confirmed',
      available: true
    });
  }

  // Return only available actions
  return actions.filter(action => action.available);
}

export function getRespondActions(booking: BookingWithRelations): ContextualAction[] {
  // Ensure contracts and invoices are arrays, default to empty arrays if undefined
  const contracts = booking.contracts || [];
  const invoices = booking.invoices || [];
  
  const hasContract = contracts.length > 0;
  const hasInvoice = invoices.length > 0;
  const hasSentContract = hasContract && contracts.some(c => c.status === 'sent' || c.status === 'signed');
  const hasSignedContract = hasContract && contracts.some(c => c.status === 'signed');
  const hasSentInvoice = hasInvoice && invoices.some(i => i.status === 'sent' || i.status === 'paid');
  const isConfirmed = booking.status === 'confirmed' || hasSignedContract;
  const isCompleted = booking.status === 'completed';
  const isCancelled = booking.status === 'cancelled';

  const actions: ContextualAction[] = [
    {
      id: 'respond-basic',
      label: 'Send Response',
      icon: '📧',
      action: 'respond-basic',
      available: true
    },
    {
      id: 'respond-with-contract',
      label: 'Send Contract',
      icon: '📋',
      action: 'respond-with-contract',
      available: !hasContract && !isCompleted && !isCancelled,
      reason: hasContract ? 'Contract already sent' : isCompleted ? 'Booking completed' : isCancelled ? 'Booking cancelled' : undefined
    },
    {
      id: 'respond-with-invoice',
      label: 'Send Invoice',
      icon: '💰',
      action: 'respond-with-invoice',
      available: !hasInvoice && isConfirmed && !isCompleted && !isCancelled,
      reason: hasInvoice ? 'Invoice already sent' : !isConfirmed ? 'Contract not signed yet' : isCompleted ? 'Booking completed' : isCancelled ? 'Booking cancelled' : undefined
    }
  ];

  return actions.filter(action => action.available);
}