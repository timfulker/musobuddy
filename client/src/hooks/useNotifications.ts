import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';

interface NotificationCounts {
  newBookings: number;
  unparseableMessages: number;
  overdueInvoices: number;
  expiringDocuments: number;
  total: number;
}

export function useNotifications() {
  const [counts, setCounts] = useState<NotificationCounts>({
    newBookings: 0,
    unparseableMessages: 0,
    overdueInvoices: 0,
    expiringDocuments: 0,
    total: 0
  });

  // Real-time polling for notification counts
  const { data: notificationData } = useQuery({
    queryKey: ['/api/notifications/counts'],
    refetchInterval: 30000, // Poll every 30 seconds for real-time updates
    refetchIntervalInBackground: true, // Keep polling even when tab not active
    staleTime: 25000, // Consider data stale after 25 seconds
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