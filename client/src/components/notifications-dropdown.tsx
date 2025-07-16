import { useState, useEffect } from "react";
import { Bell, AlertTriangle, Calendar, DollarSign, FileText, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

interface Notification {
  id: number;
  type: 'overdue_invoice' | 'contract_expiry' | 'compliance_alert' | 'new_enquiry';
  title: string;
  message: string;
  timestamp: Date;
  isRead: boolean;
  actionUrl?: string;
  priority: 'high' | 'medium' | 'low';
}

export default function NotificationsDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      
      // Fetch overdue invoices
      const invoicesResponse = await fetch('/api/invoices', {
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' }
      });
      
      const invoices = await invoicesResponse.json();
      const overdueInvoices = invoices.filter((invoice: any) => 
        invoice.status === 'overdue' || 
        (invoice.status === 'sent' && new Date(invoice.dueDate) < new Date())
      );

      // Phase 2: Fetch recent enquiries from new bookings table
      const enquiriesResponse = await fetch('/api/bookings', {
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' }
      });
      
      const enquiries = await enquiriesResponse.json();
      const recentEnquiries = enquiries.filter((enquiry: any) => 
        enquiry.status === 'new' && 
        new Date(enquiry.createdAt) > new Date(Date.now() - 24 * 60 * 60 * 1000)
      );

      // Create notifications
      const notificationsList: Notification[] = [
        ...overdueInvoices.map((invoice: any, index: number) => ({
          id: index + 1,
          type: 'overdue_invoice' as const,
          title: 'Overdue Invoice',
          message: `Invoice ${invoice.invoiceNumber} is overdue (${invoice.clientName})`,
          timestamp: new Date(invoice.dueDate),
          isRead: false,
          actionUrl: `/invoices`,
          priority: 'high' as const
        })),
        ...recentEnquiries.slice(0, 3).map((enquiry: any, index: number) => ({
          id: overdueInvoices.length + index + 1,
          type: 'new_enquiry' as const,
          title: 'New Enquiry',
          message: `New enquiry from ${enquiry.clientName}`,
          timestamp: new Date(enquiry.createdAt),
          isRead: false,
          actionUrl: `/enquiries`,
          priority: 'medium' as const
        }))
      ];

      setNotifications(notificationsList);
    } catch (error) {
      console.error('Error fetching notifications:', error);
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const getIcon = (type: Notification['type']) => {
    switch (type) {
      case 'overdue_invoice':
        return <DollarSign className="w-4 h-4 text-red-500" />;
      case 'contract_expiry':
        return <FileText className="w-4 h-4 text-orange-500" />;
      case 'compliance_alert':
        return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
      case 'new_enquiry':
        return <Calendar className="w-4 h-4 text-blue-500" />;
      default:
        return <Bell className="w-4 h-4 text-gray-500" />;
    }
  };

  const getPriorityColor = (priority: Notification['priority']) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'low':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const markAsRead = (id: number) => {
    setNotifications(prev => 
      prev.map(n => n.id === id ? { ...n, isRead: true } : n)
    );
  };

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
  };

  const formatTimestamp = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (minutes < 60) {
      return `${minutes}m ago`;
    } else if (hours < 24) {
      return `${hours}h ago`;
    } else {
      return `${days}d ago`;
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    markAsRead(notification.id);
    if (notification.actionUrl) {
      window.location.href = notification.actionUrl;
    }
    setIsOpen(false);
  };

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="icon"
        className="relative"
        onClick={() => setIsOpen(!isOpen)}
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <Badge
            variant="destructive"
            className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0 text-xs"
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </Badge>
        )}
      </Button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 z-50">
          <Card className="shadow-lg border">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Notifications</CardTitle>
                <div className="flex items-center space-x-2">
                  {unreadCount > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={markAllAsRead}
                      className="text-xs"
                    >
                      Mark all read
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setIsOpen(false)}
                    className="h-6 w-6"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="max-h-96 overflow-y-auto">
                {loading ? (
                  <div className="p-4 text-center text-gray-500">
                    Loading notifications...
                  </div>
                ) : notifications.length === 0 ? (
                  <div className="p-4 text-center text-gray-500">
                    <Bell className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                    <p>No notifications</p>
                  </div>
                ) : (
                  <div className="divide-y">
                    {notifications.map((notification) => (
                      <div
                        key={notification.id}
                        className={`p-4 hover:bg-gray-50 cursor-pointer transition-colors ${
                          !notification.isRead ? 'bg-blue-50' : ''
                        }`}
                        onClick={() => handleNotificationClick(notification)}
                      >
                        <div className="flex items-start space-x-3">
                          <div className="flex-shrink-0 mt-1">
                            {getIcon(notification.type)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <p className="text-sm font-medium text-gray-900">
                                {notification.title}
                              </p>
                              <Badge 
                                variant="secondary" 
                                className={`${getPriorityColor(notification.priority)} text-xs`}
                              >
                                {notification.priority}
                              </Badge>
                            </div>
                            <p className="text-sm text-gray-600 mt-1">
                              {notification.message}
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                              {formatTimestamp(notification.timestamp)}
                            </p>
                          </div>
                          {!notification.isRead && (
                            <div className="flex-shrink-0">
                              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              {notifications.length > 0 && (
                <>
                  <Separator />
                  <div className="p-3 bg-gray-50">
                    <Button 
                      variant="ghost" 
                      className="w-full text-sm text-center"
                      onClick={() => {
                        setIsOpen(false);
                        window.location.href = '/dashboard';
                      }}
                    >
                      View all notifications
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}