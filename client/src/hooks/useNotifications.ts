import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';

interface NotificationCounts {
  newBookings: number;
  unparseableMessages: number;
  overdueInvoices: number;
  expiringDocuments: number;
  clientMessages: number;
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

  // Real-time polling for notification counts
  const { data: notificationData } = useQuery({
    queryKey: ['/api/notifications/counts'],
    refetchInterval: 30000, // Poll every 30 seconds for real-time updates
    refetchIntervalInBackground: true, // Keep polling even when tab not active
    staleTime: 25000, // Consider data stale after 25 seconds
  });

  useEffect(() => {
    if (notificationData?.counts) {
      console.log('🔍 [NOTIFICATIONS] Received counts:', notificationData.counts);
      console.log('🔍 [NOTIFICATIONS] Messages calculation:', 
        `${notificationData.counts.unparseableMessages || 0} + ${notificationData.counts.clientMessages || 0} = ${(notificationData.counts.unparseableMessages || 0) + (notificationData.counts.clientMessages || 0)}`);
      setCounts(notificationData.counts);
    }
  }, [notificationData]);

  return {
    counts,
    totalNotifications: counts.total
  };
}