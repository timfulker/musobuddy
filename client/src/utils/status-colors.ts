// Simplified Status Color System - Based on Booking Page Left Border Colors
// Single source of truth for all booking status colors across the application

export type BookingStatus = 
  | 'new' | 'enquiry'                    // Sky blue
  | 'awaiting_response' | 'in_progress'  // Dark blue  
  | 'client_confirms'                    // Orange
  | 'confirmed'                          // Green
  | 'completed'                          // Gray
  | 'cancelled' | 'rejected';            // Red

export interface StatusColorScheme {
  // Left border accent (definitive color - matches booking page)
  borderAccent: string;
  
  // Dashboard backgrounds (subtle, derived from border color)
  dashboardBg: string;
  
  // Badge colors (medium intensity)
  badgeColors: string;
  
  // Display name
  displayName: string;
}

const statusColors: Record<string, StatusColorScheme> = {
  // === SKY BLUE GROUP (New enquiries) ===
  'new': {
    borderAccent: 'border-l-sky-400',
    dashboardBg: 'bg-gradient-to-br from-sky-50 to-sky-100 border-sky-200',
    badgeColors: 'bg-sky-100 text-sky-800 border-sky-200',
    displayName: 'New Enquiry'
  },
  'enquiry': {
    borderAccent: 'border-l-sky-400',
    dashboardBg: 'bg-gradient-to-br from-sky-50 to-sky-100 border-sky-200',
    badgeColors: 'bg-sky-100 text-sky-800 border-sky-200',
    displayName: 'Enquiry'
  },
  
  // === DARK BLUE GROUP (In progress) ===
  'awaiting_response': {
    borderAccent: 'border-l-blue-700',
    dashboardBg: 'bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200',
    badgeColors: 'bg-blue-100 text-blue-800 border-blue-200',
    displayName: 'Awaiting Response'
  },
  'in_progress': {
    borderAccent: 'border-l-blue-700',
    dashboardBg: 'bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200',
    badgeColors: 'bg-blue-100 text-blue-800 border-blue-200',
    displayName: 'In Progress'
  },
  'booking_in_progress': {
    borderAccent: 'border-l-blue-700',
    dashboardBg: 'bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200',
    badgeColors: 'bg-blue-100 text-blue-800 border-blue-200',
    displayName: 'In Progress'
  },
  
  // === ORANGE GROUP (Client confirms) ===
  'client_confirms': {
    borderAccent: 'border-l-orange-500',
    dashboardBg: 'bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200',
    badgeColors: 'bg-orange-100 text-orange-800 border-orange-200',
    displayName: 'Client Confirms'
  },
  
  // === GREEN GROUP (Confirmed) ===
  'confirmed': {
    borderAccent: 'border-l-green-500',
    dashboardBg: 'bg-gradient-to-br from-green-50 to-green-100 border-green-200',
    badgeColors: 'bg-green-100 text-green-800 border-green-200',
    displayName: 'Confirmed'
  },
  'contract_signed': {
    borderAccent: 'border-l-green-500',
    dashboardBg: 'bg-gradient-to-br from-green-50 to-green-100 border-green-200',
    badgeColors: 'bg-green-100 text-green-800 border-green-200',
    displayName: 'Contract Signed'
  },
  
  // === GRAY GROUP (Completed) ===
  'completed': {
    borderAccent: 'border-l-gray-500',
    dashboardBg: 'bg-gradient-to-br from-gray-50 to-gray-100 border-gray-200',
    badgeColors: 'bg-gray-100 text-gray-800 border-gray-200',
    displayName: 'Completed'
  },
  
  // === RED GROUP (Cancelled) ===
  'cancelled': {
    borderAccent: 'border-l-red-500',
    dashboardBg: 'bg-gradient-to-br from-red-50 to-red-100 border-red-200',
    badgeColors: 'bg-red-100 text-red-800 border-red-200',
    displayName: 'Cancelled'
  },
  'rejected': {
    borderAccent: 'border-l-red-500',
    dashboardBg: 'bg-gradient-to-br from-red-50 to-red-100 border-red-200',
    badgeColors: 'bg-red-100 text-red-800 border-red-200',
    displayName: 'Rejected'
  }
};

// Helper functions for consistent color usage
export function getStatusColors(status: string): StatusColorScheme {
  const normalizedStatus = status?.toLowerCase() || 'new';
  return statusColors[normalizedStatus] || statusColors['new'];
}

export function getBorderAccent(status: string): string {
  return getStatusColors(status).borderAccent;
}

export function getDashboardBg(status: string): string {
  return getStatusColors(status).dashboardBg;
}

export function getBadgeColors(status: string): string {
  return getStatusColors(status).badgeColors;
}

export function getDisplayName(status: string): string {
  return getStatusColors(status).displayName;
}

// CONFLICT SYSTEM - Simple red/yellow/amber dot system (separate from status colors)
export const conflictSeverity = {
  high: {
    dot: 'bg-red-500',
    description: 'Critical conflict - immediate attention required'
  },
  medium: {
    dot: 'bg-yellow-500', 
    description: 'Warning - potential scheduling conflict'
  },
  low: {
    dot: 'bg-amber-500',
    description: 'Minor overlap - review recommended'
  },
  resolved: {
    dot: 'bg-gray-400',
    description: 'Conflict resolved'
  }
};