import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuthContext } from '@/contexts/AuthContext';

interface NotificationCounts {
  newBookings: number;
  unparseableMessages: number;
  overdueInvoices: number;
  expiringDocuments: number;
  clientMessages: number;
  reviewMessages?: number;
  totalMessages?: number;
  total: number;
}

export function useNotifications() {
  const [counts, setCounts] = useState<NotificationCounts>({
    newBookings: 0,
    unparseableMessages: 0,
    overdueInvoices: 0,
    expiringDocuments: 0,
    clientMessages: 0,
    total: 0
  });

  const { isAuthenticated } = useAuthContext();

  // Only poll when authenticated to prevent 401 errors
  const { data: notificationData } = useQuery({
    queryKey: ['/api/notifications/counts'],
    enabled: isAuthenticated, // Only run when authenticated
    refetchInterval: isAuthenticated ? 30000 : false, // Only poll when authenticated
    refetchIntervalInBackground: true,
    staleTime: 25000,
    retry: (failureCount, error: any) => {
      // Don't retry on auth errors to prevent infinite loops
      if (error?.message?.includes('401')) {
        return false;
      }
      return failureCount < 3;
    }
  });

  useEffect(() => {
    if (notificationData?.counts) {
      setCounts(notificationData.counts);
    }
  }, [notificationData]);

  return {
    counts,
    totalNotifications: counts.total
  };
}