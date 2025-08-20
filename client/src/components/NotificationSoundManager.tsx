import { useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { notificationSounds } from '@/utils/notificationSounds';

interface NotificationCounts {
  newBookings: number;
  reviewMessages: number;
  unreadClientMessages: number;
  totalMessages: number;
  overdueInvoices: number;
  expiringDocuments: number;
}

export function NotificationSoundManager() {
  const previousCounts = useRef<NotificationCounts | null>(null);

  // Poll for notification counts
  const { data: notificationCounts } = useQuery<NotificationCounts>({
    queryKey: ['/api/notifications/counts'],
    refetchInterval: 10000, // Check every 10 seconds
    staleTime: 5000,
  });

  useEffect(() => {
    if (!notificationCounts) return;

    // Check if this is the first load or if counts have changed
    if (previousCounts.current) {
      const prev = previousCounts.current;
      const curr = notificationCounts;

      // Play cash register sound for new bookings
      if (curr.newBookings > prev.newBookings) {
        console.log('🎵 New booking detected! Playing cash register sound...');
        notificationSounds.play('booking');
      }

      // Play message sound for new messages
      if (curr.totalMessages > prev.totalMessages || 
          curr.unreadClientMessages > prev.unreadClientMessages ||
          curr.reviewMessages > prev.reviewMessages) {
        console.log('🎵 New message detected! Playing notification sound...');
        notificationSounds.play('message');
      }

      // Play alert sound for overdue invoices or expiring documents
      if (curr.overdueInvoices > prev.overdueInvoices || 
          curr.expiringDocuments > prev.expiringDocuments) {
        console.log('🎵 Alert detected! Playing alert sound...');
        notificationSounds.play('alert');
      }
    }

    // Update previous counts
    previousCounts.current = notificationCounts;
  }, [notificationCounts]);

  return null; // This component doesn't render anything
}