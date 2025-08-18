import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { AlertTriangle, Shield, Activity, TrendingUp, ArrowUp, ArrowDown } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Textarea } from '@/components/ui/textarea';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';

interface ApiUsageData {
  userId: string;
  userName: string;
  totalRequests: number;
  totalCost: number;
  lastActivity: Date | null;
  isBlocked: boolean;
  riskScore: number;
  services: {
    [service: string]: {
      requests: number;
      cost: number;
      lastActivity: Date | null;
    };
  };
}

interface UsageStats {
  totalStats: {
    totalRequests: number;
    totalCost: number;
  };
  topUsers: Array<{
    userId: string;
    userName: string;
    requests: number;
    cost: number;
  }>;
  serviceBreakdown: {
    [service: string]: {
      requests: number;
      cost: number;
    };
  };
}

export function ApiUsageManager() {
  const [selectedUser, setSelectedUser] = useState<string>('');
  const [sortBy, setSortBy] = useState<string>('userName');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [blockReason, setBlockReason] = useState<string>('');
  const [showBlockDialog, setShowBlockDialog] = useState<boolean>(false);
  const [selectedUserToBlock, setSelectedUserToBlock] = useState<string>('');
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch usage statistics
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['/api/admin/api-usage-stats'],
    refetchInterval: 30000,
  });

  // Fetch user usage data with sorting
  const { data: usageData, isLoading: usageLoading } = useQuery({
    queryKey: ['/api/admin/api-usage-data', sortBy, sortOrder],
    queryFn: () => apiRequest(`/api/admin/api-usage-data?sortBy=${sortBy}&sortOrder=${sortOrder}`),
    refetchInterval: 30000,
  });

  // Update user limits
  const updateLimitsMutation = useMutation({
    mutationFn: (data: {
      userId: string;
      service: string;
      dailyLimit: number;
      monthlyLimit: number;
    }) => apiRequest('/api/admin/update-api-limits', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/api-usage-data'] });
    },
  });

  // Block/unblock user for security reasons
  const blockUserMutation = useMutation({
    mutationFn: (data: {
      userId: string;
      isBlocked: boolean;
      blockReason?: string;
    }) => apiRequest('/api/admin/block-user-security', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/api-usage-data'] });
      setShowBlockDialog(false);
      setBlockReason('');
      setSelectedUserToBlock('');
    },
  });

  // Reset usage counters
  const resetUsageMutation = useMutation({
    mutationFn: (data: {
      userId: string;
      service: string;
      resetDaily?: boolean;
      resetMonthly?: boolean;
    }) => apiRequest('/api/admin/reset-api-usage', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/api-usage-data'] });
    },
  });

  if (statsLoading || usageLoading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardContent className="p-6">
              <div className="animate-pulse">
                <div className="h-4 bg-gray-300 rounded w-3/4 mb-2"></div>
                <div className="h-8 bg-gray-300 rounded w-1/2"></div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="animate-pulse">
                <div className="h-4 bg-gray-300 rounded w-3/4 mb-2"></div>
                <div className="h-8 bg-gray-300 rounded w-1/2"></div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="animate-pulse">
                <div className="h-4 bg-gray-300 rounded w-3/4 mb-2"></div>
                <div className="h-8 bg-gray-300 rounded w-1/2"></div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const getUsageColor = (usage: number, limit: number) => {
    const percentage = (usage / limit) * 100;
    if (percentage >= 90) return 'text-red-600';
    if (percentage >= 75) return 'text-amber-600';
    return 'text-green-600';
  };

  const getUsagePercentage = (usage: number, limit: number) => {
    return Math.min((usage / limit) * 100, 100);
  };

  return (
    <div className="space-y-6">
      {/* Overview Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Activity className="h-4 w-4 text-blue-600" />
              <div className="ml-2">
                <p className="text-sm font-medium text-gray-600">Total API Calls</p>
                <p className="text-2xl font-bold">{stats?.totalStats?.totalRequests?.toLocaleString() || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <TrendingUp className="h-4 w-4 text-green-600" />
              <div className="ml-2">
                <p className="text-sm font-medium text-gray-600">Total Cost</p>
                <p className="text-2xl font-bold">${typeof stats?.totalStats?.totalCost === 'number' ? stats.totalStats.totalCost.toFixed(4) : '0.0000'}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Shield className="h-4 w-4 text-purple-600" />
              <div className="ml-2">
                <p className="text-sm font-medium text-gray-600">Active Users</p>
                <p className="text-2xl font-bold">{Array.isArray(usageData) ? usageData.length : 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <div className="ml-2">
                <p className="text-sm font-medium text-gray-600">Blocked Users</p>
                <p className="text-2xl font-bold">
                  {Array.isArray(usageData) ? usageData.filter((user: any) => user.isBlocked).length : 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* User Security Monitoring Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>User Security Monitoring</span>
            <div className="flex items-center gap-2">
              <Label htmlFor="sort-by" className="text-sm">Sort by:</Label>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="userName">Name</SelectItem>
                  <SelectItem value="totalRequests">Requests</SelectItem>
                  <SelectItem value="totalCost">Cost</SelectItem>
                  <SelectItem value="lastActivity">Activity</SelectItem>
                  <SelectItem value="riskScore">Risk Score</SelectItem>
                </SelectContent>
              </Select>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              >
                {sortOrder === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />}
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Object.entries(usageData || {}).map(([userId, userData]: [string, any]) => (
              <div key={userId} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-semibold">{userData.userName || userId}</h3>
                    <p className="text-sm text-gray-600">User ID: {userId}</p>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {Object.entries(userData.services || {}).map(([service, serviceData]: [string, any]) => (
                    <div key={service} className="border rounded p-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium capitalize">{service}</span>
                        {serviceData.isBlocked && (
                          <Badge variant="destructive">Blocked</Badge>
                        )}
                      </div>

                      {/* Daily Usage */}
                      <div className="mb-2">
                        <div className="flex justify-between text-sm mb-1">
                          <span>Daily</span>
                          <span className={getUsageColor(serviceData.dailyUsage, serviceData.dailyLimit)}>
                            {serviceData.dailyUsage}/{serviceData.dailyLimit}
                          </span>
                        </div>
                        <Progress 
                          value={getUsagePercentage(serviceData.dailyUsage, serviceData.dailyLimit)}
                          className="h-2"
                        />
                      </div>

                      {/* Monthly Usage */}
                      <div className="mb-3">
                        <div className="flex justify-between text-sm mb-1">
                          <span>Monthly</span>
                          <span className={getUsageColor(serviceData.monthlyUsage, serviceData.monthlyLimit)}>
                            {serviceData.monthlyUsage}/{serviceData.monthlyLimit}
                          </span>
                        </div>
                        <Progress 
                          value={getUsagePercentage(serviceData.monthlyUsage, serviceData.monthlyLimit)}
                          className="h-2"
                        />
                      </div>

                      {/* Cost & Actions */}
                      <div className="flex justify-between items-center text-sm">
                        <span>Cost: ${typeof serviceData.totalCost === 'number' ? serviceData.totalCost.toFixed(4) : '0.0000'}</span>
                        
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => {
                                setSelectedUser(userId);
                                setSelectedService(service);
                              }}
                            >
                              Manage
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Manage API Limits - {service}</DialogTitle>
                            </DialogHeader>
                            <UserApiLimitsDialog 
                              userId={userId}
                              userName={userData.userName}
                              service={service}
                              serviceData={serviceData}
                              onUpdateLimits={(data) => updateLimitsMutation.mutate(data)}
                              onBlockUser={(data) => blockUserMutation.mutate(data)}
                              onResetUsage={(data) => resetUsageMutation.mutate(data)}
                            />
                          </DialogContent>
                        </Dialog>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

interface UserApiLimitsDialogProps {
  userId: string;
  userName: string;
  service: string;
  serviceData: any;
  onUpdateLimits: (data: any) => void;
  onBlockUser: (data: any) => void;
  onResetUsage: (data: any) => void;
}

function UserApiLimitsDialog({ 
  userId, 
  userName, 
  service, 
  serviceData, 
  onUpdateLimits,
  onBlockUser,
  onResetUsage 
}: UserApiLimitsDialogProps) {
  const [dailyLimit, setDailyLimit] = useState(serviceData.dailyLimit);
  const [monthlyLimit, setMonthlyLimit] = useState(serviceData.monthlyLimit);
  const [isBlocked, setIsBlocked] = useState(serviceData.isBlocked);
  const [blockReason, setBlockReason] = useState(serviceData.blockReason || '');

  return (
    <div className="space-y-6">
      {/* Current Usage Stats */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <p className="text-sm text-gray-600">Daily Usage</p>
              <p className="text-2xl font-bold">{serviceData.dailyUsage}/{serviceData.dailyLimit}</p>
              <Progress value={getUsagePercentage(serviceData.dailyUsage, serviceData.dailyLimit)} className="mt-2" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <p className="text-sm text-gray-600">Monthly Usage</p>
              <p className="text-2xl font-bold">{serviceData.monthlyUsage}/{serviceData.monthlyLimit}</p>
              <Progress value={getUsagePercentage(serviceData.monthlyUsage, serviceData.monthlyLimit)} className="mt-2" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Update Limits */}
      <div className="space-y-4">
        <h4 className="font-semibold">Update Limits</h4>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <Label htmlFor="dailyLimit">Daily Limit</Label>
            <Input
              id="dailyLimit"
              type="number"
              value={dailyLimit}
              onChange={(e) => setDailyLimit(Number(e.target.value))}
            />
          </div>
          <div>
            <Label htmlFor="monthlyLimit">Monthly Limit</Label>
            <Input
              id="monthlyLimit"
              type="number"
              value={monthlyLimit}
              onChange={(e) => setMonthlyLimit(Number(e.target.value))}
            />
          </div>
        </div>
        <Button
          onClick={() => onUpdateLimits({
            userId,
            service,
            dailyLimit,
            monthlyLimit
          })}
          className="w-full"
        >
          Update Limits
        </Button>
      </div>

      {/* Block/Unblock User */}
      <div className="space-y-4 border-t pt-4">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-semibold">Block User</h4>
            <p className="text-sm text-gray-600">Prevent user from making API calls</p>
          </div>
          <Switch
            checked={isBlocked}
            onCheckedChange={setIsBlocked}
          />
        </div>
        
        {isBlocked && (
          <div>
            <Label htmlFor="blockReason">Block Reason</Label>
            <Textarea
              id="blockReason"
              placeholder="Reason for blocking user API access..."
              value={blockReason}
              onChange={(e) => setBlockReason(e.target.value)}
            />
          </div>
        )}
        
        <Button
          variant={isBlocked ? "destructive" : "default"}
          onClick={() => onBlockUser({
            userId,
            service,
            isBlocked,
            blockReason
          })}
          className="w-full"
        >
          {isBlocked ? 'Block User' : 'Unblock User'}
        </Button>
      </div>

      {/* Reset Usage */}
      <div className="space-y-4 border-t pt-4">
        <h4 className="font-semibold">Reset Usage Counters</h4>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => onResetUsage({
              userId,
              service,
              resetDaily: true
            })}
            className="flex-1"
          >
            Reset Daily
          </Button>
          <Button
            variant="outline"
            onClick={() => onResetUsage({
              userId,
              service,
              resetMonthly: true
            })}
            className="flex-1"
          >
            Reset Monthly
          </Button>
        </div>
      </div>
    </div>
  );
}

function getUsagePercentage(usage: number, limit: number) {
  return Math.min((usage / limit) * 100, 100);
}