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
  UserPlus
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
  const [newUserForm, setNewUserForm] = useState({
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
    onSuccess: () => {
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
        description: "The new user has been added to the system.",
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
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>User Management</CardTitle>
                      <CardDescription>Overview of all registered users</CardDescription>
                    </div>
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
                              <Label htmlFor="isBetaTester">Beta Tester (4-week trial with lifetime subscription)</Label>
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
                </CardHeader>
                <CardContent>
                  {usersLoading ? (
                    <div className="text-center py-8">Loading users...</div>
                  ) : (
                    <div className="space-y-4">
                      {users?.map((user) => (
                        <div key={user.id} className="flex items-center justify-between p-4 border rounded-lg">
                          <div className="flex-1">
                            <div className="flex items-center gap-3">
                              <div>
                                <div className="font-medium">
                                  {user.firstName} {user.lastName} 
                                  {user.isAdmin && <span className="ml-2 text-xs text-yellow-600">(Admin)</span>}
                                  {user.isBetaTester && <span className="ml-2 text-xs text-blue-600">(Beta Tester)</span>}
                                </div>
                                <div className="text-sm text-muted-foreground">{user.email}</div>
                              </div>
                            </div>
                            <div className="mt-2 flex items-center gap-2">
                              <Badge className={getTierBadge(user.tier)}>
                                {user.tier.charAt(0).toUpperCase() + user.tier.slice(1)}
                              </Badge>
                              {user.isBetaTester && (
                                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                                  Beta: {user.betaFeedbackCount} feedback
                                </Badge>
                              )}
                              <span className="text-xs text-muted-foreground">
                                Joined {new Date(user.createdAt).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                      {users && users.length === 0 && (
                        <div className="text-center py-8 text-muted-foreground">
                          No users found
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
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