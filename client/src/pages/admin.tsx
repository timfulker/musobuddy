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
import { Crown, Users, Calendar, TrendingUp, Shield, Edit, Trash2, Mail } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Plus, UserPlus, BarChart3, Users as UsersIcon, Database } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import AdminAnalytics from "@/components/admin-analytics";
import SystemHealthMonitor from "@/components/system-health-monitor";

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

interface AdminBookingStats {
  status: string;
  count: number;
  avgValue: number;
  date: string;
}

export default function Admin() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedUser, setSelectedUser] = useState<string>("");
  const [newTier, setNewTier] = useState<string>("");
  const [createUserDialogOpen, setCreateUserDialogOpen] = useState(false);
  const [editUserDialogOpen, setEditUserDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
  const [createUserForm, setCreateUserForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    tier: "free",
    isAdmin: false
  });
  const [editUserForm, setEditUserForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    tier: "free",
    isAdmin: false
  });

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
      const response = await fetch('/api/admin/stats', {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch stats');
      return response.json();
    },
  });

  // Fetch admin users
  const { data: users, isLoading: usersLoading } = useQuery<AdminUser[]>({
    queryKey: ['/api/admin/users'],
    queryFn: async () => {
      const response = await fetch('/api/admin/users', {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch users');
      return response.json();
    },
  });

  // Fetch admin bookings
  const { data: bookings, isLoading: bookingsLoading } = useQuery<AdminBooking[]>({
    queryKey: ['/api/admin/bookings'],
    queryFn: async () => {
      const response = await fetch('/api/admin/bookings', {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch bookings');
      return response.json();
    },
  });

  // Fetch feedback
  const { data: feedback, isLoading: feedbackLoading } = useQuery({
    queryKey: ['/api/feedback'],
    queryFn: async () => {
      const response = await fetch('/api/feedback', {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch feedback');
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
        credentials: 'include',
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
        credentials: 'include',
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

  // Create user mutation
  const createUserMutation = useMutation({
    mutationFn: async (userData: typeof createUserForm) => {
      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(userData),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create user');
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "User created successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/stats'] });
      setCreateUserDialogOpen(false);
      setCreateUserForm({
        firstName: "",
        lastName: "",
        email: "",
        password: "",
        tier: "free",
        isAdmin: false
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create user",
        variant: "destructive",
      });
    },
  });

  // Edit user mutation
  const editUserMutation = useMutation({
    mutationFn: async (userData: { userId: string; updates: any }) => {
      const response = await fetch(`/api/admin/users/${userData.userId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(userData.updates),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to update user');
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "User updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      setEditUserDialogOpen(false);
      setEditingUser(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update user",
        variant: "destructive",
      });
    },
  });

  // Send credentials mutation
  const sendCredentialsMutation = useMutation({
    mutationFn: async ({ userId, password }: { userId: string; password: string }) => {
      const response = await fetch(`/api/admin/users/${userId}/send-credentials`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ password }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to send credentials');
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Credentials sent successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to send credentials",
        variant: "destructive",
      });
    },
  });

  // Delete user mutation
  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete user');
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "User deleted successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/stats'] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete user",
        variant: "destructive",
      });
    },
  });

  // Update feedback status mutation
  const updateFeedbackMutation = useMutation({
    mutationFn: async ({ id, status, adminNotes }: { id: string; status: string; adminNotes?: string }) => {
      const response = await fetch(`/api/feedback/${id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status, adminNotes }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to update feedback status');
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Feedback status updated",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/feedback'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update feedback status",
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

  const handleCreateUser = () => {
    if (createUserForm.firstName && createUserForm.lastName && createUserForm.email && createUserForm.password) {
      createUserMutation.mutate(createUserForm);
    }
  };

  const handleSendCredentials = (user: AdminUser) => {
    const password = window.prompt(`Enter the password to send to ${user.firstName} ${user.lastName}:`);
    if (password) {
      sendCredentialsMutation.mutate({ userId: user.id, password });
    }
  };

  const handleEditUser = (user: AdminUser) => {
    setEditingUser(user);
    setEditUserForm({
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      password: "", // Leave blank for no password change
      tier: user.tier,
      isAdmin: user.isAdmin
    });
    setEditUserDialogOpen(true);
  };

  const handleUpdateUser = () => {
    if (editingUser && editUserForm.firstName && editUserForm.lastName && editUserForm.email) {
      const updates = {
        firstName: editUserForm.firstName,
        lastName: editUserForm.lastName,
        email: editUserForm.email,
        tier: editUserForm.tier,
        isAdmin: editUserForm.isAdmin
      };
      
      // Only include password if it's not empty
      if (editUserForm.password.trim()) {
        updates.password = editUserForm.password;
      }
      
      editUserMutation.mutate({ userId: editingUser.id, updates });
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

        {/* Admin Tabs */}
        <Tabs defaultValue="analytics" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="analytics" className="flex items-center space-x-2">
              <BarChart3 className="h-4 w-4" />
              <span>Analytics</span>
            </TabsTrigger>
            <TabsTrigger value="users" className="flex items-center space-x-2">
              <UsersIcon className="h-4 w-4" />
              <span>Users</span>
            </TabsTrigger>
            <TabsTrigger value="system" className="flex items-center space-x-2">
              <Database className="h-4 w-4" />
              <span>System</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="analytics" className="space-y-6">
            <AdminAnalytics />
          </TabsContent>

          <TabsContent value="users" className="space-y-6">
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
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>User Management</CardTitle>
            <Dialog open={createUserDialogOpen} onOpenChange={setCreateUserDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-purple-600 hover:bg-purple-700">
                  <UserPlus className="w-4 h-4 mr-2" />
                  Create User
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New User</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="firstName">First Name</Label>
                    <Input
                      id="firstName"
                      value={createUserForm.firstName}
                      onChange={(e) => setCreateUserForm({...createUserForm, firstName: e.target.value})}
                      placeholder="Enter first name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input
                      id="lastName"
                      value={createUserForm.lastName}
                      onChange={(e) => setCreateUserForm({...createUserForm, lastName: e.target.value})}
                      placeholder="Enter last name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={createUserForm.email}
                      onChange={(e) => setCreateUserForm({...createUserForm, email: e.target.value})}
                      placeholder="Enter email address"
                    />
                  </div>
                  <div>
                    <Label htmlFor="password">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      value={createUserForm.password}
                      onChange={(e) => setCreateUserForm({...createUserForm, password: e.target.value})}
                      placeholder="Enter password"
                    />
                  </div>
                  <div>
                    <Label htmlFor="tier">Tier</Label>
                    <Select value={createUserForm.tier} onValueChange={(value) => setCreateUserForm({...createUserForm, tier: value})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select tier" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="free">Free</SelectItem>
                        <SelectItem value="pro">Pro</SelectItem>
                        <SelectItem value="enterprise">Enterprise</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="isAdmin"
                      checked={createUserForm.isAdmin}
                      onChange={(e) => setCreateUserForm({...createUserForm, isAdmin: e.target.checked})}
                      className="rounded border-gray-300"
                    />
                    <Label htmlFor="isAdmin">Admin privileges</Label>
                  </div>
                  <Button 
                    onClick={handleCreateUser}
                    disabled={!createUserForm.firstName || !createUserForm.lastName || !createUserForm.email || !createUserForm.password || createUserMutation.isPending}
                    className="w-full bg-purple-600 hover:bg-purple-700"
                  >
                    {createUserMutation.isPending ? "Creating..." : "Create User"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
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
                          onClick={() => handleEditUser(user)}
                        >
                          <Edit className="h-4 w-4 mr-1" />
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleSendCredentials(user)}
                          disabled={sendCredentialsMutation.isPending}
                        >
                          <Mail className="h-4 w-4 mr-1" />
                          Send Details
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => toggleAdminMutation.mutate(user.id)}
                          disabled={toggleAdminMutation.isPending}
                        >
                          {user.isAdmin ? "Remove Admin" : "Make Admin"}
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => {
                            if (window.confirm(`Are you sure you want to delete ${user.firstName} ${user.lastName}? This action cannot be undone.`)) {
                              deleteUserMutation.mutate(user.id);
                            }
                          }}
                          disabled={deleteUserMutation.isPending}
                        >
                          <Trash2 className="h-4 w-4 mr-1" />
                          Delete
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Edit User Dialog */}
        <Dialog open={editUserDialogOpen} onOpenChange={setEditUserDialogOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Edit User</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-firstName">First Name</Label>
                  <Input
                    id="edit-firstName"
                    value={editUserForm.firstName}
                    onChange={(e) => setEditUserForm({...editUserForm, firstName: e.target.value})}
                    placeholder="First name"
                  />
                </div>
                <div>
                  <Label htmlFor="edit-lastName">Last Name</Label>
                  <Input
                    id="edit-lastName"
                    value={editUserForm.lastName}
                    onChange={(e) => setEditUserForm({...editUserForm, lastName: e.target.value})}
                    placeholder="Last name"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="edit-email">Email</Label>
                <Input
                  id="edit-email"
                  type="email"
                  value={editUserForm.email}
                  onChange={(e) => setEditUserForm({...editUserForm, email: e.target.value})}
                  placeholder="Email address"
                />
              </div>
              <div>
                <Label htmlFor="edit-password">New Password (leave blank to keep current)</Label>
                <Input
                  id="edit-password"
                  type="password"
                  value={editUserForm.password}
                  onChange={(e) => setEditUserForm({...editUserForm, password: e.target.value})}
                  placeholder="New password (optional)"
                />
              </div>
              <div>
                <Label htmlFor="edit-tier">Tier</Label>
                <Select value={editUserForm.tier} onValueChange={(value) => setEditUserForm({...editUserForm, tier: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select tier" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="free">Free</SelectItem>
                    <SelectItem value="premium">Premium</SelectItem>
                    <SelectItem value="enterprise">Enterprise</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="edit-isAdmin"
                  checked={editUserForm.isAdmin}
                  onCheckedChange={(checked) => setEditUserForm({...editUserForm, isAdmin: checked as boolean})}
                />
                <Label htmlFor="edit-isAdmin">Admin user</Label>
              </div>
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setEditUserDialogOpen(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleUpdateUser}
                disabled={!editUserForm.firstName || !editUserForm.lastName || !editUserForm.email || editUserMutation.isPending}
                className="bg-purple-600 hover:bg-purple-700"
              >
                {editUserMutation.isPending ? "Updating..." : "Update User"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

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

        {/* Feedback Management */}
        <Card>
          <CardHeader>
            <CardTitle>Beta Feedback</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {feedbackLoading ? (
                <p>Loading feedback...</p>
              ) : !feedback || feedback.length === 0 ? (
                <p className="text-gray-500 text-center py-8">
                  No feedback submitted yet.
                </p>
              ) : (
                feedback?.map((item) => (
                  <div key={item.id} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="flex items-center space-x-2">
                          <Badge variant={item.type === 'bug' ? 'destructive' : item.type === 'feature' ? 'secondary' : 'outline'}>
                            {item.type}
                          </Badge>
                          <Badge variant={item.priority === 'critical' ? 'destructive' : item.priority === 'high' ? 'secondary' : 'outline'}>
                            {item.priority}
                          </Badge>
                        </div>
                        <h4 className="font-medium">{item.title}</h4>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Select
                          value={item.status}
                          onValueChange={(status) => updateFeedbackMutation.mutate({ id: item.id, status })}
                        >
                          <SelectTrigger className="w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="open">Open</SelectItem>
                            <SelectItem value="in-progress">In Progress</SelectItem>
                            <SelectItem value="resolved">Resolved</SelectItem>
                            <SelectItem value="closed">Closed</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    
                    <p className="text-gray-600 dark:text-gray-400">
                      {item.description}
                    </p>
                    
                    <div className="flex items-center justify-between text-sm text-gray-500">
                      <span>
                        {item.userName} ({item.userEmail}) • {new Date(item.createdAt).toLocaleDateString()}
                      </span>
                      {item.page && (
                        <span>Page: {item.page}</span>
                      )}
                    </div>
                    
                    {item.adminNotes && (
                      <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
                        <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
                          Admin Notes: {item.adminNotes}
                        </p>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
          </TabsContent>

          <TabsContent value="system" className="space-y-6">
            <SystemHealthMonitor />
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}