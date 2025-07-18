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
  const hasContract = booking.contracts && booking.contracts.length > 0;
  const hasInvoice = booking.invoices && booking.invoices.length > 0;
  const hasSentContract = hasContract && booking.contracts.some(c => c.status === 'sent' || c.status === 'signed');
  const hasSignedContract = hasContract && booking.contracts.some(c => c.status === 'signed');
  const hasSentInvoice = hasInvoice && booking.invoices.some(i => i.status === 'sent' || i.status === 'paid');
  const isConfirmed = booking.status === 'confirmed' || hasSignedContract;
  const isCompleted = booking.status === 'completed';
  const isCancelled = booking.status === 'cancelled';

  const actions: ContextualAction[] = [
    {
      id: 'send-contract',
      label: 'Send Contract',
      icon: '📋',
      action: 'send-contract',
      available: !hasContract && !isCompleted && !isCancelled,
      reason: hasContract ? 'Contract already exists' : isCompleted ? 'Booking completed' : isCancelled ? 'Booking cancelled' : undefined
    },
    {
      id: 'create-contract',
      label: 'Create Contract',
      icon: '📝',
      action: 'create-contract',
      available: !hasContract && !isCompleted && !isCancelled,
      reason: hasContract ? 'Contract already exists' : isCompleted ? 'Booking completed' : isCancelled ? 'Booking cancelled' : undefined
    },
    {
      id: 'send-invoice',
      label: 'Send Invoice',
      icon: '💰',
      action: 'send-invoice',
      available: !hasInvoice && isConfirmed && !isCompleted && !isCancelled,
      reason: hasInvoice ? 'Invoice already exists' : !isConfirmed ? 'Contract not signed yet' : isCompleted ? 'Booking completed' : isCancelled ? 'Booking cancelled' : undefined
    },
    {
      id: 'create-invoice',
      label: 'Create Invoice',
      icon: '🧾',
      action: 'create-invoice',
      available: !hasInvoice && isConfirmed && !isCompleted && !isCancelled,
      reason: hasInvoice ? 'Invoice already exists' : !isConfirmed ? 'Contract not signed yet' : isCompleted ? 'Booking completed' : isCancelled ? 'Booking cancelled' : undefined
    },
    {
      id: 'mark-confirmed',
      label: 'Mark Confirmed',
      icon: '✅',
      action: 'mark-confirmed',
      available: !isConfirmed && !isCompleted && !isCancelled,
      reason: isConfirmed ? 'Already confirmed' : isCompleted ? 'Booking completed' : isCancelled ? 'Booking cancelled' : undefined
    },
    {
      id: 'mark-completed',
      label: 'Mark Completed',
      icon: '🎉',
      action: 'mark-completed',
      available: isConfirmed && !isCompleted && !isCancelled,
      reason: !isConfirmed ? 'Not confirmed yet' : isCompleted ? 'Already completed' : isCancelled ? 'Booking cancelled' : undefined
    }
  ];

  // Return only available actions
  return actions.filter(action => action.available);
}

export function getRespondActions(booking: BookingWithRelations): ContextualAction[] {
  const hasContract = booking.contracts && booking.contracts.length > 0;
  const hasInvoice = booking.invoices && booking.invoices.length > 0;
  const hasSentContract = hasContract && booking.contracts.some(c => c.status === 'sent' || c.status === 'signed');
  const hasSignedContract = hasContract && booking.contracts.some(c => c.status === 'signed');
  const hasSentInvoice = hasInvoice && booking.invoices.some(i => i.status === 'sent' || i.status === 'paid');
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