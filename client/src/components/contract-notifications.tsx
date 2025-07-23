import React, { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Bell, CheckCircle, Clock, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import type { Contract } from '@shared/schema';

interface ContractNotification {
  id: number;
  contractId: number;
  contractNumber: string;
  clientName: string;
  type: 'signed' | 'sent' | 'reminder_due';
  timestamp: Date;
  read: boolean;
}

export function ContractNotifications() {
  const [notifications, setNotifications] = useState<ContractNotification[]>([]);
  const [lastCheck, setLastCheck] = useState<Date>(new Date());
  const { toast } = useToast();

  // Poll for contract updates every 30 seconds
  const { data: contracts = [] } = useQuery<Contract[]>({
    queryKey: ['/api/contracts'],
    refetchInterval: 30000, // Check every 30 seconds for updates
  });

  // Check for newly signed contracts
  useEffect(() => {
    if (!contracts.length) return;

    const newlySignedContracts = contracts.filter(contract => 
      contract.status === 'signed' && 
      contract.signedAt && 
      new Date(contract.signedAt) > lastCheck
    );

    newlySignedContracts.forEach(contract => {
      // Add notification
      const notification: ContractNotification = {
        id: Date.now() + contract.id,
        contractId: contract.id,
        contractNumber: contract.contractNumber,
        clientName: contract.clientName,
        type: 'signed',
        timestamp: new Date(contract.signedAt!),
        read: false
      };

      setNotifications(prev => [notification, ...prev]);

      // Show toast notification
      toast({
        title: "🎉 Contract Signed!",
        description: `${contract.clientName} has signed contract ${contract.contractNumber}`,
        duration: 8000,
      });
    });

    setLastCheck(new Date());
  }, [contracts, lastCheck, toast]);

  // Mark notification as read
  const markAsRead = (notificationId: number) => {
    setNotifications(prev => 
      prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
    );
  };

  // Clear all notifications
  const clearAll = () => {
    setNotifications([]);
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  if (notifications.length === 0) return null;

  return (
    <Card className="mb-6 border-blue-200 bg-blue-50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Bell className="h-5 w-5 text-blue-600" />
            Contract Notifications
            {unreadCount > 0 && (
              <Badge variant="destructive" className="ml-2">
                {unreadCount}
              </Badge>
            )}
          </CardTitle>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={clearAll}
            className="text-xs"
          >
            Clear All
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {notifications.slice(0, 10).map((notification) => (
            <div
              key={notification.id}
              className={`flex items-start gap-3 p-3 rounded-lg border transition-all duration-200 ${
                notification.read 
                  ? 'bg-gray-50 border-gray-200' 
                  : 'bg-white border-blue-200 shadow-sm'
              }`}
            >
              <div className="flex-shrink-0 mt-1">
                {notification.type === 'signed' && (
                  <CheckCircle className="h-5 w-5 text-green-600" />
                )}
                {notification.type === 'sent' && (
                  <FileText className="h-5 w-5 text-blue-600" />
                )}
                {notification.type === 'reminder_due' && (
                  <Clock className="h-5 w-5 text-orange-600" />
                )}
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className={`text-sm font-medium ${
                    notification.read ? 'text-gray-600' : 'text-gray-900'
                  }`}>
                    {notification.type === 'signed' && '✅ Contract Signed'}
                    {notification.type === 'sent' && '📧 Contract Sent'}
                    {notification.type === 'reminder_due' && '⏰ Reminder Due'}
                  </p>
                  {!notification.read && (
                    <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                  )}
                </div>
                
                <p className={`text-sm ${
                  notification.read ? 'text-gray-500' : 'text-gray-700'
                }`}>
                  <span className="font-medium">{notification.clientName}</span>
                  {' • '}
                  <span>{notification.contractNumber}</span>
                </p>
                
                <p className="text-xs text-gray-400 mt-1">
                  {new Date(notification.timestamp).toLocaleString()}
                </p>
              </div>
              
              {!notification.read && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => markAsRead(notification.id)}
                  className="text-xs px-2 py-1 h-auto"
                >
                  Mark Read
                </Button>
              )}
            </div>
          ))}
        </div>
        
        {notifications.length > 10 && (
          <p className="text-xs text-gray-500 text-center mt-3">
            Showing latest 10 notifications • {notifications.length} total
          </p>
        )}
      </CardContent>
    </Card>
  );
}

// Real-time contract status checker hook
export function useContractStatusMonitor() {
  const [signedContracts, setSignedContracts] = useState<Set<number>>(new Set());
  const { toast } = useToast();

  const { data: contracts = [] } = useQuery<Contract[]>({
    queryKey: ['/api/contracts'],
    refetchInterval: 15000, // Check every 15 seconds
  });

  useEffect(() => {
    contracts.forEach(contract => {
      // Check if this contract was just signed (not seen before)
      if (contract.status === 'signed' && 
          contract.signedAt && 
          !signedContracts.has(contract.id)) {
        
        // Add to signed contracts set
        setSignedContracts(prev => new Set(prev).add(contract.id));
        
        // Show immediate toast notification
        toast({
          title: "🎉 Contract Signed!",
          description: `${contract.clientName} signed ${contract.contractNumber}`,
          duration: 10000,
        });
      }
    });
  }, [contracts, signedContracts, toast]);

  return {
    signedContracts: Array.from(signedContracts),
    totalSigned: signedContracts.size
  };
}