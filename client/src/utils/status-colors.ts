// Unified Status Color System
// This centralizes all booking status colors for consistency across the application

export type BookingStatus = 
  | 'new' 
  | 'awaiting_response' 
  | 'client_confirms' 
  | 'contract_sent' 
  | 'confirmed' 
  | 'cancelled' 
  | 'completed'
  | 'booking_in_progress'  // Legacy support
  | 'enquiry'             // Legacy support
  | 'negotiation'         // Legacy support
  | 'contract_signed'     // Legacy support
  | 'rejected';           // Legacy support

export interface StatusColorScheme {
  // Dashboard card backgrounds (subtle gradients)
  dashboardBg: string;
  
  // Badge/pill colors (more prominent)
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
  
  // Left border accent colors
  borderAccent: string;
  
  // Icon/emoji representation
  icon: string;
  
  // Display name
  displayName: string;
}

const statusColors: Record<string, StatusColorScheme> = {
  // === PRIMARY WORKFLOW STATUSES ===
  'new': {
    dashboardBg: 'bg-gradient-to-br from-amber-50 to-amber-100 border-amber-200',
    badgeBg: 'bg-amber-100',
    badgeText: 'text-amber-800',
    badgeBorder: 'border-amber-200',
    borderAccent: 'border-l-amber-500',
    icon: '📧',
    displayName: 'New Enquiry'
  },
  
  'awaiting_response': {
    dashboardBg: 'bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200',
    badgeBg: 'bg-orange-100',
    badgeText: 'text-orange-800',
    badgeBorder: 'border-orange-200',
    borderAccent: 'border-l-orange-500',
    icon: '💬',
    displayName: 'Awaiting Response'
  },
  
  'client_confirms': {
    dashboardBg: 'bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200',
    badgeBg: 'bg-blue-100',
    badgeText: 'text-blue-800',
    badgeBorder: 'border-blue-200',
    borderAccent: 'border-l-blue-500',
    icon: '⏳',
    displayName: 'Client Confirms'
  },
  
  'contract_sent': {
    dashboardBg: 'bg-gradient-to-br from-indigo-50 to-indigo-100 border-indigo-200',
    badgeBg: 'bg-indigo-100',
    badgeText: 'text-indigo-800',
    badgeBorder: 'border-indigo-200',
    borderAccent: 'border-l-indigo-500',
    icon: '📄',
    displayName: 'Contract Sent'
  },
  
  'confirmed': {
    dashboardBg: 'bg-gradient-to-br from-green-50 to-green-100 border-green-200',
    badgeBg: 'bg-green-100',
    badgeText: 'text-green-800',
    badgeBorder: 'border-green-200',
    borderAccent: 'border-l-green-500',
    icon: '✅',
    displayName: 'Confirmed'
  },
  
  'completed': {
    dashboardBg: 'bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200',
    badgeBg: 'bg-purple-100',
    badgeText: 'text-purple-800',
    badgeBorder: 'border-purple-200',
    borderAccent: 'border-l-purple-500',
    icon: '🎉',
    displayName: 'Completed'
  },
  
  'cancelled': {
    dashboardBg: 'bg-gradient-to-br from-red-50 to-red-100 border-red-200',
    badgeBg: 'bg-red-100',
    badgeText: 'text-red-800',
    badgeBorder: 'border-red-200',
    borderAccent: 'border-l-red-500',
    icon: '❌',
    displayName: 'Cancelled'
  },
  
  // === LEGACY STATUS MAPPINGS ===
  'booking_in_progress': {
    dashboardBg: 'bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200',
    badgeBg: 'bg-orange-100',
    badgeText: 'text-orange-800',
    badgeBorder: 'border-orange-200',
    borderAccent: 'border-l-orange-500',
    icon: '💬',
    displayName: 'In Progress'
  },
  
  'enquiry': {
    dashboardBg: 'bg-gradient-to-br from-amber-50 to-amber-100 border-amber-200',
    badgeBg: 'bg-amber-100',
    badgeText: 'text-amber-800',
    badgeBorder: 'border-amber-200',
    borderAccent: 'border-l-amber-500',
    icon: '📧',
    displayName: 'Enquiry'
  },
  
  'negotiation': {
    dashboardBg: 'bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200',
    badgeBg: 'bg-orange-100',
    badgeText: 'text-orange-800',
    badgeBorder: 'border-orange-200',
    borderAccent: 'border-l-orange-500',
    icon: '💬',
    displayName: 'Negotiation'
  },
  
  'contract_signed': {
    dashboardBg: 'bg-gradient-to-br from-green-50 to-green-100 border-green-200',
    badgeBg: 'bg-green-100',
    badgeText: 'text-green-800',
    badgeBorder: 'border-green-200',
    borderAccent: 'border-l-green-500',
    icon: '✅',
    displayName: 'Contract Signed'
  },
  
  'rejected': {
    dashboardBg: 'bg-gradient-to-br from-red-50 to-red-100 border-red-200',
    badgeBg: 'bg-red-100',
    badgeText: 'text-red-800',
    badgeBorder: 'border-red-200',
    borderAccent: 'border-l-red-500',
    icon: '❌',
    displayName: 'Rejected'
  }
};

// Helper functions for consistent color usage across the app
export function getStatusColors(status: string): StatusColorScheme {
  const normalizedStatus = status?.toLowerCase() || 'new';
  return statusColors[normalizedStatus] || statusColors['new'];
}

export function getDashboardBg(status: string): string {
  return getStatusColors(status).dashboardBg;
}

export function getBadgeColors(status: string): string {
  const colors = getStatusColors(status);
  return `${colors.badgeBg} ${colors.badgeText} ${colors.badgeBorder}`;
}

export function getBorderAccent(status: string): string {
  return getStatusColors(status).borderAccent;
}

export function getStatusIcon(status: string): string {
  return getStatusColors(status).icon;
}

export function getStatusDisplayName(status: string): string {
  return getStatusColors(status).displayName;
}

// Conflict severity colors (separate from status colors)
export const conflictColors = {
  high: 'border-red-500 bg-red-50 ring-2 ring-red-200',
  medium: 'border-amber-500 bg-amber-50 ring-2 ring-amber-200',
  low: '',
  resolved: 'border-gray-300 bg-gray-50'
};