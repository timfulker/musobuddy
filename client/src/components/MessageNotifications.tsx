import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Bell, MessageCircle, Trash2, Check, Eye } from "lucide-react";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface MessageNotification {
  id: number;
  userId: string;
  bookingId: number;
  senderEmail: string;
  subject: string;
  messageUrl: string;
  isRead: boolean;
  createdAt: string;
}

interface MessageNotificationsProps {
  userId: string;
}

export function MessageNotifications({ userId }: MessageNotificationsProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedNotification, setSelectedNotification] = useState<MessageNotification | null>(null);

  // Fetch message notifications
  const { data: notificationsData, isLoading, error } = useQuery({
    queryKey: ['notifications', 'messages', userId],
    queryFn: () => apiRequest(`/api/notifications/messages`),
  });

  // Ensure notifications is always an array
  const notifications: MessageNotification[] = Array.isArray(notificationsData) ? notificationsData : [];

  // Mark as read mutation
  const markAsReadMutation = useMutation({
    mutationFn: (id: number) => apiRequest(`/api/notifications/messages/${id}/read`, {
      method: 'PATCH'
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications', 'messages'] });
      toast({
        title: "Message marked as read",
        description: "The notification has been marked as read.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: "Failed to mark message as read.",
        variant: "destructive",
      });
    },
  });

  // Delete notification mutation  
  const deleteNotificationMutation = useMutation({
    mutationFn: (id: number) => apiRequest(`/api/notifications/messages/${id}`, {
      method: 'DELETE'
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications', 'messages'] });
      toast({
        title: "Notification deleted",
        description: "The notification has been removed.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error", 
        description: "Failed to delete notification.",
        variant: "destructive",
      });
    },
  });

  const handleViewMessage = async (notification: MessageNotification) => {
    // Mark as read if not already read
    if (!notification.isRead) {
      markAsReadMutation.mutate(notification.id);
    }
    
    // Open the message in a new tab (stored in cloud storage)
    const messageUrl = `https://pub-446248abf8164fb99bee2fc3dc3c513c.r2.dev/${notification.messageUrl}`;
    window.open(messageUrl, '_blank');
  };

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <MessageCircle className="h-5 w-5" />
          <h3 className="text-lg font-semibold">Client Messages</h3>
        </div>
        <p className="text-muted-foreground">Loading messages...</p>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <MessageCircle className="h-5 w-5" />
          <h3 className="text-lg font-semibold">Client Messages</h3>
          {unreadCount > 0 && (
            <Badge variant="destructive" className="h-5 text-xs">
              {unreadCount}
            </Badge>
          )}
        </div>
        {unreadCount > 0 && (
          <Badge variant="outline" className="text-xs">
            {unreadCount} unread
          </Badge>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <MessageCircle className="h-12 w-12 mx-auto mb-3 opacity-50" />
          <p>No messages received yet</p>
          <p className="text-sm">Client replies to your emails will appear here</p>
        </div>
      ) : (
        <div className="space-y-3">
          {notifications.map((notification) => (
            <div
              key={notification.id}
              className={`p-4 border rounded-lg ${
                notification.isRead 
                  ? 'bg-background border-border' 
                  : 'bg-blue-50 border-blue-200 dark:bg-blue-950 dark:border-blue-800'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-medium text-sm truncate">
                      {notification.subject}
                    </p>
                    {!notification.isRead && (
                      <Badge variant="default" className="h-4 text-xs">New</Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mb-1">
                    From: {notification.senderEmail}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Booking #{notification.bookingId} • {new Date(notification.createdAt).toLocaleDateString('en-GB', { timeZone: 'UTC' })} UTC
                  </p>
                </div>
                
                <div className="flex items-center gap-1 ml-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleViewMessage(notification)}
                    className="h-8 px-2"
                  >
                    <Eye className="h-3 w-3" />
                  </Button>
                  
                  {!notification.isRead && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => markAsReadMutation.mutate(notification.id)}
                      disabled={markAsReadMutation.isPending}
                      className="h-8 px-2"
                    >
                      <Check className="h-3 w-3" />
                    </Button>
                  )}
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => deleteNotificationMutation.mutate(notification.id)}
                    disabled={deleteNotificationMutation.isPending}
                    className="h-8 px-2 text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}