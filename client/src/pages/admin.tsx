import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Layout } from "@/components/layout";
import { Crown, Users, Calendar, TrendingUp, Shield } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

interface AdminStats {
  totalUsers: number;
  activeUsers: number;
  totalBookings: number;
  revenueThisMonth: number;
}

interface AdminUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  tier: string;
  isAdmin: boolean;
  createdAt: string;
  bookingCount: number;
  lastLogin: string;
}

interface AdminBooking {
  id: number;
  clientName: string;
  eventDate: string;
  serviceType: string;
  userName: string;
  userEmail: string;
}

export default function Admin() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedUser, setSelectedUser] = useState<string>("");
  const [newTier, setNewTier] = useState<string>("");

  // Redirect non-admin users
  if (!user?.isAdmin) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <Shield className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              Access Denied
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              You don't have permission to access this page.
            </p>
          </div>
        </div>
      </Layout>
    );
  }

  // Fetch admin stats
  const { data: stats, isLoading: statsLoading } = useQuery<AdminStats>({
    queryKey: ['/api/admin/stats'],
    queryFn: async () => {
      const response = await fetch('/api/admin/stats');
      if (!response.ok) throw new Error('Failed to fetch stats');
      return response.json();
    },
  });

  // Fetch admin users
  const { data: users, isLoading: usersLoading } = useQuery<AdminUser[]>({
    queryKey: ['/api/admin/users'],
    queryFn: async () => {
      const response = await fetch('/api/admin/users');
      if (!response.ok) throw new Error('Failed to fetch users');
      return response.json();
    },
  });

  // Fetch admin bookings
  const { data: bookings, isLoading: bookingsLoading } = useQuery<AdminBooking[]>({
    queryKey: ['/api/admin/bookings'],
    queryFn: async () => {
      const response = await fetch('/api/admin/bookings');
      if (!response.ok) throw new Error('Failed to fetch bookings');
      return response.json();
    },
  });

  // Update user tier mutation
  const updateTierMutation = useMutation({
    mutationFn: async ({ userId, tier }: { userId: string; tier: string }) => {
      const response = await fetch(`/api/admin/users/${userId}/tier`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ tier }),
      });
      if (!response.ok) throw new Error('Failed to update tier');
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "User tier updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update user tier",
        variant: "destructive",
      });
    },
  });

  // Toggle admin mutation
  const toggleAdminMutation = useMutation({
    mutationFn: async (userId: string) => {
      const response = await fetch(`/api/admin/users/${userId}/toggle-admin`, {
        method: 'PATCH',
      });
      if (!response.ok) throw new Error('Failed to toggle admin');
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Admin status updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to toggle admin status",
        variant: "destructive",
      });
    },
  });

  const handleUpdateTier = () => {
    if (selectedUser && newTier) {
      updateTierMutation.mutate({ userId: selectedUser, tier: newTier });
      setSelectedUser("");
      setNewTier("");
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center space-x-3">
          <Crown className="h-8 w-8 text-purple-600" />
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Admin Dashboard
          </h1>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {statsLoading ? "..." : stats?.totalUsers || 0}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Users</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {statsLoading ? "..." : stats?.activeUsers || 0}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Bookings</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {statsLoading ? "..." : stats?.totalBookings || 0}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Revenue This Month</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                £{statsLoading ? "..." : stats?.revenueThisMonth || 0}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* User Management */}
        <Card>
          <CardHeader>
            <CardTitle>User Management</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* User Tier Update */}
              <div className="flex space-x-4">
                <Select value={selectedUser} onValueChange={setSelectedUser}>
                  <SelectTrigger className="w-[300px]">
                    <SelectValue placeholder="Select user" />
                  </SelectTrigger>
                  <SelectContent>
                    {users?.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.firstName} {user.lastName} ({user.email})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={newTier} onValueChange={setNewTier}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="New tier" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="free">Free</SelectItem>
                    <SelectItem value="pro">Pro</SelectItem>
                    <SelectItem value="enterprise">Enterprise</SelectItem>
                  </SelectContent>
                </Select>

                <Button 
                  onClick={handleUpdateTier} 
                  disabled={!selectedUser || !newTier || updateTierMutation.isPending}
                >
                  Update Tier
                </Button>
              </div>

              {/* Users List */}
              <div className="space-y-2">
                {usersLoading ? (
                  <p>Loading users...</p>
                ) : (
                  users?.map((user) => (
                    <div key={user.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-800 rounded-lg">
                      <div>
                        <div className="font-medium">
                          {user.firstName} {user.lastName}
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          {user.email}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge variant="secondary">{user.tier}</Badge>
                        {user.isAdmin && (
                          <Badge variant="destructive">Admin</Badge>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => toggleAdminMutation.mutate(user.id)}
                          disabled={toggleAdminMutation.isPending}
                        >
                          {user.isAdmin ? "Remove Admin" : "Make Admin"}
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Recent Bookings */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Bookings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {bookingsLoading ? (
                <p>Loading bookings...</p>
              ) : (
                bookings?.map((booking) => (
                  <div key={booking.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-800 rounded-lg">
                    <div>
                      <div className="font-medium">{booking.clientName}</div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        {booking.serviceType} • {new Date(booking.eventDate).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      {booking.userName} ({booking.userEmail})
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}