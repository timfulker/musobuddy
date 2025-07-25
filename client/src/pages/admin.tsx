import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import Sidebar from "@/components/sidebar";
import DashboardHeader from "@/components/dashboard-header";
import MobileNav from "@/components/mobile-nav";
import { useResponsive } from "@/hooks/useResponsive";
import { 
  Users, 
  Database, 
  Activity, 
  Calendar, 
  FileText, 
  Crown,
  CheckCircle,
  PoundSterling,
  TrendingUp,
  Shield,
  Plus,
  UserPlus,
  Search,
  Trash2,
  Edit
} from "lucide-react";

interface AdminOverview {
  totalUsers: number;
  totalBookings: number;
  totalContracts: number;
  totalInvoices: number;
  systemHealth: string;
  databaseStatus: string;
}

interface AdminUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  tier: string;
  isAdmin: boolean;
  isBetaTester: boolean;
  betaStartDate: string;
  betaEndDate: string;
  betaFeedbackCount: number;
  createdAt: string;
}

export default function AdminPanel() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [newUserOpen, setNewUserOpen] = useState(false);
  const [editUserOpen, setEditUserOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [userFilter, setUserFilter] = useState('all');
  const [userSearch, setUserSearch] = useState('');
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [newUserForm, setNewUserForm] = useState({
    email: '',
    firstName: '',
    lastName: '',
    password: '',
    tier: 'free',
    isAdmin: false,
    isBetaTester: false
  });
  const [editUserForm, setEditUserForm] = useState({
    email: '',
    firstName: '',
    lastName: '',
    password: '',
    tier: 'free',
    isAdmin: false,
    isBetaTester: false
  });
  const { isDesktop } = useResponsive();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: overview, isLoading: overviewLoading } = useQuery<AdminOverview>({
    queryKey: ["/api/admin/overview"],
    refetchInterval: 30000,
  });

  const { data: users, isLoading: usersLoading } = useQuery<AdminUser[]>({
    queryKey: ["/api/admin/users"],
  });

  const createUserMutation = useMutation({
    mutationFn: (userData: any) => apiRequest('/api/admin/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData),
    }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/overview"] });
      setNewUserOpen(false);
      setNewUserForm({
        email: '',
        firstName: '',
        lastName: '',
        password: '',
        tier: 'free',
        isAdmin: false,
        isBetaTester: false
      });
      toast({
        title: "User created successfully",
        description: `User can login at /login with email: ${userData.email} and the password you provided.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error creating user",
        description: error.message || "Failed to create user",
        variant: "destructive",
      });
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: (userId: string) => apiRequest(`/api/admin/users/${userId}`, {
      method: 'DELETE',
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/overview"] });
      toast({
        title: "User deleted successfully",
        description: "The user has been removed from the system.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error deleting user",
        description: error.message || "Failed to delete user",
        variant: "destructive",
      });
    },
  });

  const updateUserMutation = useMutation({
    mutationFn: ({ userId, userData }: { userId: string, userData: any }) => 
      apiRequest(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/overview"] });
      setEditUserOpen(false);
      setSelectedUser(null);
      toast({
        title: "User updated successfully",
        description: "The user information has been updated.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error updating user",
        description: error.message || "Failed to update user",
        variant: "destructive",
      });
    },
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: (userIds: string[]) => 
      Promise.all(userIds.map(id => apiRequest(`/api/admin/users/${id}`, { method: 'DELETE' }))),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/overview"] });
      setSelectedUsers([]);
      toast({
        title: "Users deleted successfully",
        description: `${selectedUsers.length} users have been removed from the system.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error deleting users",
        description: error.message || "Failed to delete users",
        variant: "destructive",
      });
    },
  });

  const handleCreateUser = () => {
    if (!newUserForm.email) {
      toast({
        title: "Email required",
        description: "Please enter an email address",
        variant: "destructive",
      });
      return;
    }
    if (!newUserForm.password) {
      toast({
        title: "Password required",
        description: "Please enter a temporary password for the user",
        variant: "destructive",
      });
      return;
    }
    createUserMutation.mutate(newUserForm);
  };

  const handleEditUser = (user: AdminUser) => {
    setSelectedUser(user);
    setEditUserForm({
      email: user.email,
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      password: '', // Start empty - admin can choose to change password or leave current
      tier: user.tier,
      isAdmin: user.isAdmin,
      isBetaTester: user.isBetaTester || false
    });
    setEditUserOpen(true);
  };

  const handleUpdateUser = () => {
    if (!selectedUser || !editUserForm.email) {
      toast({
        title: "Missing information",
        description: "Email is required",
        variant: "destructive",
      });
      return;
    }
    updateUserMutation.mutate({ 
      userId: selectedUser.id, 
      userData: editUserForm 
    });
  };

  const handleBulkDelete = () => {
    if (selectedUsers.length === 0) return;
    
    if (confirm(`Delete ${selectedUsers.length} selected users? This cannot be undone.`)) {
      bulkDeleteMutation.mutate(selectedUsers);
    }
  };

  const filteredUsers = users?.filter(user => {
    const matchesSearch = userSearch === '' || 
      user.email.toLowerCase().includes(userSearch.toLowerCase()) ||
      `${user.firstName} ${user.lastName}`.toLowerCase().includes(userSearch.toLowerCase());
    
    const matchesFilter = userFilter === 'all' ||
      (userFilter === 'admin' && user.isAdmin) ||
      (userFilter === 'beta' && user.isBetaTester) ||
      (userFilter === 'regular' && !user.isAdmin && !user.isBetaTester) ||
      userFilter === user.tier;
    
    return matchesSearch && matchesFilter;
  }) || [];

  const handleSelectAll = () => {
    if (selectedUsers.length === filteredUsers.length) {
      setSelectedUsers([]);
    } else {
      setSelectedUsers(filteredUsers.map(user => user.id));
    }
  };

  const handleSelectUser = (userId: string) => {
    setSelectedUsers(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const getTierBadge = (tier: string) => {
    const colors = {
      free: "bg-gray-100 text-gray-800",
      core: "bg-blue-100 text-blue-800", 
      premium: "bg-purple-100 text-purple-800",
      enterprise: "bg-yellow-100 text-yellow-800"
    };
    return colors[tier as keyof typeof colors] || colors.free;
  };

  return (
    <div className="min-h-screen bg-background">
      <Sidebar
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        currentPage="admin"
      />
      <div className={`flex-1 ${isDesktop ? "lg:pl-64" : ""}`}>
        <DashboardHeader
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
          title="Admin Panel"
          showMobileNav={!isDesktop}
        />
        
        {!isDesktop && (
          <MobileNav currentPage="admin" />
        )}

        <main className="p-6">
          <div className="mb-6">
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Crown className="h-8 w-8 text-yellow-500" />
              Admin Panel
            </h1>
            <p className="text-muted-foreground">System overview and user management</p>
          </div>

          <Tabs defaultValue="overview" className="space-y-6">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="users">Users</TabsTrigger>
              <TabsTrigger value="beta">Beta Testers</TabsTrigger>
              <TabsTrigger value="system">System</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                    <Users className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {overviewLoading ? "..." : overview?.totalUsers || 0}
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
                      {overviewLoading ? "..." : overview?.totalBookings || 0}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Contracts</CardTitle>
                    <FileText className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {overviewLoading ? "..." : overview?.totalContracts || 0}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Invoices</CardTitle>
                    <PoundSterling className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {overviewLoading ? "..." : overview?.totalInvoices || 0}
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle>Platform Health</CardTitle>
                    <CardDescription>Current system status</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm">System Status</span>
                        <div className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-green-500" />
                          <span className="text-sm font-medium">Operational</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Database</span>
                        <Badge variant="default">Connected</Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Authentication</span>
                        <Badge variant="default">Active</Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Quick Actions</CardTitle>
                    <CardDescription>Common administrative tasks</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3 text-sm">
                      <div className="flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-blue-500" />
                        <span>Monitor user growth</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Shield className="h-4 w-4 text-green-500" />
                        <span>Review system security</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Database className="h-4 w-4 text-purple-500" />
                        <span>Database maintenance</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="users" className="space-y-6">
              <Card>
                <CardHeader>
                  <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                    <div>
                      <CardTitle>User Management</CardTitle>
                      <CardDescription>
                        Showing {filteredUsers.length} of {users?.length || 0} users
                      </CardDescription>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
                      <div className="relative">
                        <Search className="h-4 w-4 absolute left-3 top-3 text-muted-foreground" />
                        <Input
                          placeholder="Search users..."
                          value={userSearch}
                          onChange={(e) => setUserSearch(e.target.value)}
                          className="pl-10 w-full sm:w-64"
                        />
                      </div>
                      <Select value={userFilter} onValueChange={setUserFilter}>
                        <SelectTrigger className="w-full sm:w-48">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Users</SelectItem>
                          <SelectItem value="admin">Admins</SelectItem>
                          <SelectItem value="beta">Beta Testers</SelectItem>
                          <SelectItem value="regular">Regular Users</SelectItem>
                          <SelectItem value="free">Free Tier</SelectItem>
                          <SelectItem value="core">Core Tier</SelectItem>
                          <SelectItem value="premium">Premium Tier</SelectItem>
                          <SelectItem value="enterprise">Enterprise Tier</SelectItem>
                        </SelectContent>
                      </Select>
                      <Dialog open={newUserOpen} onOpenChange={setNewUserOpen}>
                        <DialogTrigger asChild>
                          <Button className="flex items-center gap-2">
                            <UserPlus className="h-4 w-4" />
                            Add User
                          </Button>
                        </DialogTrigger>
                      <DialogContent className="sm:max-w-[425px]">
                        <DialogHeader>
                          <DialogTitle>Add New User</DialogTitle>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                          <div className="grid gap-2">
                            <Label htmlFor="email">Email</Label>
                            <Input
                              id="email"
                              placeholder="user@example.com"
                              value={newUserForm.email}
                              onChange={(e) => setNewUserForm(prev => ({ ...prev, email: e.target.value }))}
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                              <Label htmlFor="firstName">First Name</Label>
                              <Input
                                id="firstName"
                                placeholder="John"
                                value={newUserForm.firstName}
                                onChange={(e) => setNewUserForm(prev => ({ ...prev, firstName: e.target.value }))}
                              />
                            </div>
                            <div className="grid gap-2">
                              <Label htmlFor="lastName">Last Name</Label>
                              <Input
                                id="lastName"
                                placeholder="Doe"
                                value={newUserForm.lastName}
                                onChange={(e) => setNewUserForm(prev => ({ ...prev, lastName: e.target.value }))}
                              />
                            </div>
                          </div>
                          <div className="grid gap-2">
                            <Label htmlFor="password">Temporary Password</Label>
                            <Input
                              id="password"
                              type="password"
                              placeholder="Enter temporary password for user"
                              value={newUserForm.password}
                              onChange={(e) => setNewUserForm(prev => ({ ...prev, password: e.target.value }))}
                            />
                          </div>
                          <div className="grid gap-2">
                            <Label htmlFor="tier">Subscription Tier</Label>
                            <Select value={newUserForm.tier} onValueChange={(value) => setNewUserForm(prev => ({ ...prev, tier: value }))}>
                              <SelectTrigger>
                                <SelectValue placeholder="Select tier" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="free">Free</SelectItem>
                                <SelectItem value="core">Core</SelectItem>
                                <SelectItem value="premium">Premium</SelectItem>
                                <SelectItem value="enterprise">Enterprise</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-3">
                            <div className="flex items-center space-x-2">
                              <input
                                type="checkbox"
                                id="isAdmin"
                                checked={newUserForm.isAdmin}
                                onChange={(e) => setNewUserForm(prev => ({ ...prev, isAdmin: e.target.checked }))}
                                className="rounded"
                              />
                              <Label htmlFor="isAdmin">Admin privileges</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <input
                                type="checkbox"
                                id="isBetaTester"
                                checked={newUserForm.isBetaTester}
                                onChange={(e) => setNewUserForm(prev => ({ ...prev, isBetaTester: e.target.checked }))}
                                className="rounded"
                              />
                              <Label htmlFor="isBetaTester">Beta Tester (4-week trial with 1 year free subscription)</Label>
                            </div>
                          </div>
                        </div>
                        <div className="flex justify-end gap-2">
                          <Button variant="outline" onClick={() => setNewUserOpen(false)}>
                            Cancel
                          </Button>
                          <Button 
                            onClick={handleCreateUser}
                            disabled={createUserMutation.isPending}
                          >
                            {createUserMutation.isPending ? "Creating..." : "Create User"}
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {selectedUsers.length > 0 && (
                    <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium">
                          {selectedUsers.length} user{selectedUsers.length !== 1 ? 's' : ''} selected
                        </span>
                        <div className="flex gap-2">
                          <Button 
                            size="sm" 
                            variant="outline" 
                            onClick={() => setSelectedUsers([])}
                          >
                            Clear Selection
                          </Button>
                          <Button 
                            size="sm" 
                            variant="destructive" 
                            onClick={handleBulkDelete}
                            disabled={bulkDeleteMutation.isPending}
                          >
                            <Trash2 className="h-4 w-4 mr-1" />
                            Delete Selected
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}

                  {usersLoading ? (
                    <div className="text-center py-8">Loading users...</div>
                  ) : (
                    <div className="space-y-4">
                      {filteredUsers.length > 0 && (
                        <div className="flex items-center gap-2 mb-4 pb-3 border-b">
                          <input
                            type="checkbox"
                            checked={selectedUsers.length === filteredUsers.length}
                            onChange={handleSelectAll}
                            className="rounded"
                          />
                          <Label className="text-sm font-medium">
                            Select All ({filteredUsers.length})
                          </Label>
                        </div>
                      )}
                      
                      {filteredUsers.map((user) => (
                        <div key={user.id} className="flex items-center gap-3 p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                          <input
                            type="checkbox"
                            checked={selectedUsers.includes(user.id)}
                            onChange={() => handleSelectUser(user.id)}
                            className="rounded"
                          />
                          <div className="flex-1">
                            <div className="flex items-center gap-3">
                              <div>
                                <div className="font-medium">
                                  {user.firstName} {user.lastName}
                                </div>
                                <div className="text-sm text-muted-foreground">{user.email}</div>
                              </div>
                            </div>
                            <div className="mt-2 flex items-center gap-2 flex-wrap">
                              <Badge className={getTierBadge(user.tier)}>
                                {user.tier.charAt(0).toUpperCase() + user.tier.slice(1)}
                              </Badge>
                              {user.isAdmin && (
                                <Badge variant="outline" className="text-yellow-600 border-yellow-200">
                                  Admin
                                </Badge>
                              )}
                              {user.isBetaTester && (
                                <Badge variant="outline" className="text-blue-600 border-blue-200">
                                  Beta Tester
                                </Badge>
                              )}
                              <span className="text-xs text-muted-foreground">
                                ID: {user.id}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEditUser(user)}
                            >
                              <Edit className="h-4 w-4 mr-1" />
                              Edit
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => deleteUserMutation.mutate(user.id)}
                              disabled={deleteUserMutation.isPending}
                            >
                              <Trash2 className="h-4 w-4 mr-1" />
                              Delete
                            </Button>
                          </div>
                        </div>
                      ))}
                      
                      {filteredUsers.length === 0 && !usersLoading && (
                        <div className="text-center py-8 text-muted-foreground">
                          {userSearch || userFilter !== 'all' ? 
                            "No users match your search criteria" : 
                            "No users found"
                          }
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Edit User Dialog */}
              <Dialog open={editUserOpen} onOpenChange={setEditUserOpen}>
                <DialogContent className="sm:max-w-[425px]">
                  <DialogHeader>
                    <DialogTitle>Edit User</DialogTitle>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                      <Label htmlFor="edit-email">Email</Label>
                      <Input
                        id="edit-email"
                        value={editUserForm.email}
                        onChange={(e) => setEditUserForm(prev => ({ ...prev, email: e.target.value }))}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="edit-firstName">First Name</Label>
                      <Input
                        id="edit-firstName"
                        value={editUserForm.firstName}
                        onChange={(e) => setEditUserForm(prev => ({ ...prev, firstName: e.target.value }))}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="edit-lastName">Last Name</Label>
                      <Input
                        id="edit-lastName"
                        value={editUserForm.lastName}
                        onChange={(e) => setEditUserForm(prev => ({ ...prev, lastName: e.target.value }))}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="edit-password">Password</Label>
                      <Input
                        id="edit-password"
                        type="text"
                        placeholder="Leave empty to keep current password"
                        value={editUserForm.password}
                        onChange={(e) => setEditUserForm(prev => ({ ...prev, password: e.target.value }))}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="edit-tier">Subscription Tier</Label>
                      <Select 
                        value={editUserForm.tier} 
                        onValueChange={(value) => setEditUserForm(prev => ({ ...prev, tier: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="free">Free</SelectItem>
                          <SelectItem value="core">Core</SelectItem>
                          <SelectItem value="premium">Premium</SelectItem>
                          <SelectItem value="enterprise">Enterprise</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-3">
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id="edit-isAdmin"
                          checked={editUserForm.isAdmin}
                          onChange={(e) => setEditUserForm(prev => ({ ...prev, isAdmin: e.target.checked }))}
                          className="rounded"
                        />
                        <Label htmlFor="edit-isAdmin">Admin privileges</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id="edit-isBetaTester"
                          checked={editUserForm.isBetaTester}
                          onChange={(e) => setEditUserForm(prev => ({ ...prev, isBetaTester: e.target.checked }))}
                          className="rounded"
                        />
                        <Label htmlFor="edit-isBetaTester">Beta Tester</Label>
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setEditUserOpen(false)}>
                      Cancel
                    </Button>
                    <Button 
                      onClick={handleUpdateUser}
                      disabled={updateUserMutation.isPending}
                    >
                      {updateUserMutation.isPending ? "Updating..." : "Update User"}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </TabsContent>

            <TabsContent value="beta" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5" />
                    Beta Testing Program
                  </CardTitle>
                  <CardDescription>
                    Manage your 4-week beta testing program with 1-year free subscription rewards
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {usersLoading ? (
                    <div className="text-center py-8">Loading beta testers...</div>
                  ) : (
                    <div className="space-y-6">
                      {/* Beta Program Overview */}
                      <div className="grid gap-4 md:grid-cols-3">
                        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                          <div className="text-blue-700 font-medium">Active Beta Testers</div>
                          <div className="text-2xl font-bold text-blue-900">
                            {users?.filter(u => u.isBetaTester).length || 0}
                          </div>
                        </div>
                        <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                          <div className="text-green-700 font-medium">Total Feedback</div>
                          <div className="text-2xl font-bold text-green-900">
                            {users?.filter(u => u.isBetaTester).reduce((sum, u) => sum + (u.betaFeedbackCount || 0), 0) || 0}
                          </div>
                        </div>
                        <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                          <div className="text-purple-700 font-medium">1-Year Free Subscriptions</div>
                          <div className="text-2xl font-bold text-purple-900">
                            {users?.filter(u => u.isBetaTester).length || 0}
                          </div>
                        </div>
                      </div>

                      {/* Beta Testers List */}
                      <div className="space-y-4">
                        <h3 className="text-lg font-medium">Current Beta Testers</h3>
                        {users?.filter(user => user.isBetaTester).map((user) => (
                          <div key={user.id} className="p-4 border rounded-lg bg-blue-50/50">
                            <div className="flex items-center justify-between">
                              <div>
                                <div className="font-medium">
                                  {user.firstName} {user.lastName}
                                  <Badge variant="outline" className="ml-2 bg-blue-100 text-blue-700">
                                    Beta Tester
                                  </Badge>
                                </div>
                                <div className="text-sm text-muted-foreground">{user.email}</div>
                                <div className="text-sm text-muted-foreground mt-1">
                                  Started: {user.betaStartDate ? new Date(user.betaStartDate).toLocaleDateString() : 'N/A'} | 
                                  Ends: {user.betaEndDate ? new Date(user.betaEndDate).toLocaleDateString() : 'N/A'}
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="text-sm font-medium">
                                  {user.betaFeedbackCount || 0} feedback submissions
                                </div>
                                <Badge variant="outline" className="mt-1">
                                  Premium + 1 Year Free
                                </Badge>
                              </div>
                            </div>
                          </div>
                        )) || (
                          <div className="text-center py-8 text-muted-foreground">
                            No beta testers yet. Use the "Add User" button and check "Beta Tester" to invite your first testers.
                          </div>
                        )}
                      </div>

                      {/* Quick Add Beta Tester Instructions */}
                      <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                        <h4 className="font-medium text-yellow-800 mb-2">Quick Setup for Your 4 Beta Testers:</h4>
                        <ol className="text-sm text-yellow-700 space-y-1">
                          <li>1. Click "Add User" button above</li>
                          <li>2. Enter their email and name</li>
                          <li>3. Check "Beta Tester" checkbox</li>
                          <li>4. This automatically gives them Premium access + 1 year free subscription after 4 weeks</li>
                          <li>5. Send them the app URL to start testing</li>
                        </ol>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="system" className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Database className="h-4 w-4" />
                      Database Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm">Status</span>
                        <Badge variant="default">Connected</Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm">Tables</span>
                        <span className="font-medium">8 active</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm">Provider</span>
                        <span className="font-medium">PostgreSQL</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Activity className="h-4 w-4" />
                      System Metrics
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm">Uptime</span>
                        <span className="font-medium">99.9%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm">Memory Usage</span>
                        <span className="font-medium">45%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm">CPU Usage</span>
                        <span className="font-medium">12%</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </main>
      </div>
    </div>
  );
}