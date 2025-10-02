import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
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
  Edit,
  Mail,
  RotateCcw,
  DollarSign,
  Ticket
} from "lucide-react";
import APICostMonitor from "@/components/api-cost-monitor";
import { ApiUsageManager } from "@/components/api-usage-manager";
import DatabaseAdmin from "@/components/database-admin";
import { useAuthContext } from "@/contexts/AuthContext";

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
  isAdmin: boolean;
  isAssigned: boolean;
  isBetaTester: boolean;
  hasPaid: boolean;
  trialEndsAt: string | null;
  accountNotes: string | null;
  createdAt: string;
}

interface BetaInviteCode {
  id: number;
  code: string;
  maxUses: number;
  currentUses: number;
  trialDays: number;
  description: string | null;
  status: string;
  createdAt: string;
  createdBy: string;
  expiresAt: string | null;
  lastUsedAt: string | null;
  lastUsedBy: string | null;
}

export default function AdminPanel() {
  const { user, isLoading: authLoading } = useAuthContext();
  const [, navigate] = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [newUserOpen, setNewUserOpen] = useState(false);
  const [editUserOpen, setEditUserOpen] = useState(false);
  const [inviteUserOpen, setInviteUserOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [userFilter, setUserFilter] = useState('all');
  const [userSearch, setUserSearch] = useState('');
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [newUserForm, setNewUserForm] = useState({
    email: '',
    firstName: '',
    lastName: '',
    password: '',
    isAdmin: false,
    isAssigned: false,
    isBetaTester: false,
    bypassPayment: false,
    forceTestMode: false
  });
  const [editUserForm, setEditUserForm] = useState({
    email: '',
    firstName: '',
    lastName: '',
    password: '',
    isAdmin: false,
    isAssigned: false,
    isBetaTester: false,
    accountNotes: ''
  });
  const [inviteForm, setInviteForm] = useState({
    email: '',
    firstName: '',
    lastName: '',
    isAdmin: false,
    isAssigned: false,
    isBetaTester: false,
    personalMessage: ''
  });

  // Beta codes state
  const [betaCodeDialogOpen, setBetaCodeDialogOpen] = useState(false);
  const [betaCodeForm, setBetaCodeForm] = useState({
    code: '',
    maxUses: 1,
    trialDays: 365,
    description: '',
    expiresAt: ''
  });

  // Beta email state
  const [betaEmailDialogOpen, setBetaEmailDialogOpen] = useState(false);
  const [emailTemplateDialogOpen, setEmailTemplateDialogOpen] = useState(false);
  const [betaEmailForm, setBetaEmailForm] = useState({
    email: '',
    firstName: '',
    customCode: '',
    subject: '',
    message: ''
  });
  const [emailTemplateForm, setEmailTemplateForm] = useState({
    subject: '',
    textBody: ''
  });
  const { isDesktop } = useResponsive();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Admin protection - redirect non-admin users
  useEffect(() => {
    if (!authLoading && (!user || !user.isAdmin)) {
      console.log('🚨 SECURITY: Non-admin user attempted to access admin panel:', user?.email);
      navigate('/dashboard');
    }
  }, [user, authLoading, navigate]);

  const { data: overview, isLoading: overviewLoading } = useQuery<AdminOverview>({
    queryKey: ["/api/admin/overview"],
    refetchInterval: 30000,
  });

  const { data: users, isLoading: usersLoading, error: usersError } = useQuery<AdminUser[]>({
    queryKey: ["/api/admin/users"],
    retry: 3,
    staleTime: 30000,
  });

  const { data: betaCodes, isLoading: betaCodesLoading } = useQuery<{
    success: boolean;
    betaCodes: BetaInviteCode[];
  }>({
    queryKey: ["/api/admin/beta-codes"],
    retry: 3,
    staleTime: 30000,
  });

  const { data: activeTemplate } = useQuery<{
    success: boolean;
    template: any;
  }>({
    queryKey: ["/api/admin/beta-email-templates/active"],
    retry: 3,
    staleTime: 30000,
  });

  // Users loaded - no debug logging needed

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
        isAdmin: false,
        isBetaTester: false,
        bypassPayment: false,
        forceTestMode: false
      });
      toast({
        title: "User created successfully", 
        description: `User can login at /login with the email and password you provided.`,
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

  const inviteUserMutation = useMutation({
    mutationFn: (inviteData: any) => apiRequest('/api/admin/invite-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(inviteData),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/overview"] });
      setInviteUserOpen(false);
      setInviteForm({
        email: '',
        firstName: '',
        lastName: '',
        tier: 'free',
        isAdmin: false,
        isBetaTester: false,
        personalMessage: ''
      });
      toast({
        title: "Invitation sent successfully",
        description: "The user will receive an email invitation to join MusoBuddy.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error sending invitation",
        description: error.message || "Failed to send invitation",
        variant: "destructive",
      });
    },
  });

  const resetWidgetMutation = useMutation({
    mutationFn: (userId: string) => apiRequest('/api/admin/reset-user-widget', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId }),
    }),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({
        title: "Widget reset successfully",
        description: data.message || "User widget has been reset.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error resetting widget",
        description: error.message || "Failed to reset user widget",
        variant: "destructive",
      });
    },
  });

  // Beta code mutations
  const createBetaCodeMutation = useMutation({
    mutationFn: (codeData: any) => apiRequest('/api/admin/beta-codes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(codeData),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/beta-codes"] });
      setBetaCodeDialogOpen(false);
      setBetaCodeForm({
        code: '',
        maxUses: 1,
        trialDays: 365,
        description: '',
        expiresAt: ''
      });
      toast({
        title: "Beta code created",
        description: "New invite code has been generated successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error creating beta code",
        description: error.message || "Failed to create beta code",
        variant: "destructive",
      });
    },
  });

  const updateBetaCodeMutation = useMutation({
    mutationFn: ({ id, updates }: { id: number, updates: any }) => 
      apiRequest(`/api/admin/beta-codes/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/beta-codes"] });
      toast({
        title: "Beta code updated",
        description: "Code settings have been updated successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error updating beta code",
        description: error.message || "Failed to update beta code",
        variant: "destructive",
      });
    },
  });

  const deleteBetaCodeMutation = useMutation({
    mutationFn: (id: number) => apiRequest(`/api/admin/beta-codes/${id}`, {
      method: 'DELETE',
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/beta-codes"] });
      toast({
        title: "Beta code deleted",
        description: "Invite code has been removed successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error deleting beta code",
        description: error.message || "Failed to delete beta code",
        variant: "destructive",
      });
    },
  });

  const handleCreateBetaCode = () => {
    if (!betaCodeForm.code) {
      toast({
        title: "Code required",
        description: "Please enter a beta invite code",
        variant: "destructive",
      });
      return;
    }
    
    const codeData = {
      ...betaCodeForm,
      expiresAt: betaCodeForm.expiresAt || null
    };
    
    createBetaCodeMutation.mutate(codeData);
  };

  // Send beta email mutation
  const sendBetaEmailMutation = useMutation({
    mutationFn: (emailData: any) => apiRequest('/api/admin/send-beta-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(emailData),
    }),
    onSuccess: (data) => {
      setBetaEmailDialogOpen(false);
      setBetaEmailForm({
        email: '',
        firstName: '',
        customCode: '',
        subject: '',
        message: ''
      });
      toast({
        title: "Beta email sent!",
        description: `Invitation successfully sent to ${data.recipient}`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error sending email",
        description: error.message || "Failed to send beta invitation",
        variant: "destructive",
      });
    },
  });

  const handleSendBetaEmail = () => {
    if (!betaEmailForm.email || !betaEmailForm.firstName || !betaEmailForm.customCode) {
      toast({
        title: "Required fields missing",
        description: "Please fill in email, first name, and custom code",
        variant: "destructive",
      });
      return;
    }

    sendBetaEmailMutation.mutate(betaEmailForm);
  };

  // Update email template mutation
  const updateEmailTemplateMutation = useMutation({
    mutationFn: (data: any) => apiRequest(`/api/admin/beta-email-templates/${data.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data.updates),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/beta-email-templates/active"] });
      setEmailTemplateDialogOpen(false);
      toast({
        title: "Email template updated",
        description: "The beta email template has been updated successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error updating template",
        description: error.message || "Failed to update email template",
        variant: "destructive",
      });
    },
  });

  const handleSaveEmailTemplate = () => {
    if (!activeTemplate?.template) {
      toast({
        title: "No template found",
        description: "Please create a template first",
        variant: "destructive",
      });
      return;
    }

    updateEmailTemplateMutation.mutate({
      id: activeTemplate.template.id,
      updates: emailTemplateForm
    });
  };

  const generateRandomCode = () => {
    const prefix = 'BETA';
    const randomPart = Math.random().toString(36).substring(2, 6).toUpperCase();
    const year = new Date().getFullYear();
    const code = `${prefix}-${randomPart}-${year}`;
    
    setBetaCodeForm(prev => ({ ...prev, code }));
  };

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

  const handleInviteUser = () => {
    if (!inviteForm.email) {
      toast({
        title: "Email required",
        description: "Please enter an email address for the invitation",
        variant: "destructive",
      });
      return;
    }
    inviteUserMutation.mutate(inviteForm);
  };

  const handleEditUser = (user: AdminUser) => {
    setSelectedUser(user);
    setEditUserForm({
      email: user.email,
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      password: '', // Start empty - admin can choose to change password or leave current
      isAdmin: user.isAdmin,
      isAssigned: user.isAssigned || false,
      isBetaTester: user.isBetaTester || false,
      accountNotes: user.accountNotes || ''
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

  const filteredUsers = (users || []).filter((user: AdminUser) => {
    const matchesSearch = userSearch === '' || 
      (user.email || '').toLowerCase().includes(userSearch.toLowerCase()) ||
      `${user.firstName || ''} ${user.lastName || ''}`.toLowerCase().includes(userSearch.toLowerCase());
    
    const matchesFilter = userFilter === 'all' ||
      (userFilter === 'admin' && user.isAdmin === true) ||
      (userFilter === 'beta' && user.isBetaTester === true) ||
      (userFilter === 'assigned' && user.isAssigned === true) ||
      (userFilter === 'paid' && user.hasPaid === true) ||
      (userFilter === 'trial' && user.trialEndsAt && new Date(user.trialEndsAt) > new Date()) ||
      (userFilter === 'regular' && !user.isAdmin && !user.isBetaTester && !user.isAssigned);
    
    return matchesSearch && matchesFilter;
  });

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

  const getAccessBadge = (user: AdminUser) => {
    if (user.isAdmin) return { color: "bg-purple-100 text-purple-800", label: "Admin" };
    if (user.isAssigned) return { color: "bg-green-100 text-green-800", label: "Assigned" };
    if (user.hasPaid) return { color: "bg-blue-100 text-blue-800", label: "Paid" };
    if (user.trialEndsAt && new Date(user.trialEndsAt) > new Date()) {
      return { color: "bg-yellow-100 text-yellow-800", label: "Trial" };
    }
    return { color: "bg-gray-100 text-gray-800", label: "Expired" };
  };

  // Show loading state while checking authentication
  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Verifying admin access...</p>
        </div>
      </div>
    );
  }

  // Don't render anything if not admin (will be redirected)
  if (!user || !user.isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background admin-panel">
      <Sidebar 
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />
      <div className={`flex-1 min-w-0 ${isDesktop ? "lg:pl-64" : ""}`}>
        <DashboardHeader />
        
        {!isDesktop && (
          <MobileNav />
        )}

        <main className="p-3 sm:p-6 max-w-full overflow-x-hidden">
          <div className="mb-6">
            <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2 text-foreground">
              <Crown className="h-6 w-6 sm:h-8 sm:w-8 text-yellow-500" />
              Admin Panel
            </h1>
            <p className="text-muted-foreground text-sm sm:text-base">System overview and user management</p>
          </div>

          <Tabs defaultValue="overview" className="space-y-6">
            <TabsList className="grid w-full grid-cols-2 sm:grid-cols-9 h-auto">
              <TabsTrigger value="overview" className="text-xs sm:text-sm">Overview</TabsTrigger>
              <TabsTrigger value="users" className="text-xs sm:text-sm">Users</TabsTrigger>
              <TabsTrigger value="beta-codes" className="text-xs sm:text-sm flex items-center gap-1">
                <Ticket className="h-3 w-3" />
                Beta Codes
              </TabsTrigger>
              <TabsTrigger value="beta-emails" className="text-xs sm:text-sm flex items-center gap-1">
                <Mail className="h-3 w-3" />
                Beta Emails
              </TabsTrigger>
              <TabsTrigger value="api-costs" className="text-xs sm:text-sm flex items-center gap-1">
                <DollarSign className="h-3 w-3" />
                API Costs
              </TabsTrigger>
              <TabsTrigger value="api-usage" className="text-xs sm:text-sm flex items-center gap-1">
                <Shield className="h-3 w-3" />
                API Usage
              </TabsTrigger>
              <TabsTrigger value="database" className="text-xs sm:text-sm flex items-center gap-1">
                <Database className="h-3 w-3" />
                Database
              </TabsTrigger>
              <TabsTrigger value="beta" className="text-xs sm:text-sm">Beta Testers</TabsTrigger>
              <TabsTrigger value="system" className="text-xs sm:text-sm">System</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-foreground">Total Users</CardTitle>
                    <Users className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-foreground">
                      {overviewLoading ? "..." : overview?.totalUsers || 0}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-foreground">Total Bookings</CardTitle>
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-foreground">
                      {overviewLoading ? "..." : overview?.totalBookings || 0}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-foreground">Total Contracts</CardTitle>
                    <FileText className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-foreground">
                      {overviewLoading ? "..." : overview?.totalContracts || 0}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-foreground">Total Invoices</CardTitle>
                    <PoundSterling className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-foreground">
                      {overviewLoading ? "..." : overview?.totalInvoices || 0}
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-foreground">Platform Health</CardTitle>
                    <CardDescription className="text-muted-foreground">Current system status</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-foreground">System Status</span>
                        <div className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-green-500" />
                          <span className="text-sm font-medium text-foreground">Operational</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-foreground">Database</span>
                        <Badge variant="default">Connected</Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-foreground">Authentication</span>
                        <Badge variant="default">Active</Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-foreground">Quick Actions</CardTitle>
                    <CardDescription className="text-muted-foreground">Common administrative tasks</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3 text-sm">
                      <div className="flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-blue-500" />
                        <span className="text-foreground">Monitor user growth</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Shield className="h-4 w-4 text-green-500" />
                        <span className="text-foreground">Review system security</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Database className="h-4 w-4 text-primary/50" />
                        <span className="text-foreground">Database maintenance</span>
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
                      <CardTitle className="text-foreground">User Management</CardTitle>
                      <CardDescription className="text-muted-foreground">
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
                      <div className="flex gap-2">
                        <Dialog open={inviteUserOpen} onOpenChange={setInviteUserOpen}>
                          <DialogTrigger asChild>
                            <Button variant="outline" className="flex items-center gap-2">
                              <Mail className="h-4 w-4" />
                              Send Invite
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="sm:max-w-[425px]">
                            <DialogHeader>
                              <DialogTitle>Send User Invitation</DialogTitle>
                            </DialogHeader>
                            <div className="grid gap-4 py-4">
                              <div className="grid gap-2">
                                <Label htmlFor="invite-email">Email</Label>
                                <Input
                                  id="invite-email"
                                  placeholder="user@example.com"
                                  value={inviteForm.email}
                                  onChange={(e) => setInviteForm(prev => ({ ...prev, email: e.target.value }))}
                                />
                              </div>
                              <div className="grid grid-cols-2 gap-4">
                                <div className="grid gap-2">
                                  <Label htmlFor="invite-firstName">First Name (Optional)</Label>
                                  <Input
                                    id="invite-firstName"
                                    placeholder="John"
                                    value={inviteForm.firstName}
                                    onChange={(e) => setInviteForm(prev => ({ ...prev, firstName: e.target.value }))}
                                  />
                                </div>
                                <div className="grid gap-2">
                                  <Label htmlFor="invite-lastName">Last Name (Optional)</Label>
                                  <Input
                                    id="invite-lastName"
                                    placeholder="Doe"
                                    value={inviteForm.lastName}
                                    onChange={(e) => setInviteForm(prev => ({ ...prev, lastName: e.target.value }))}
                                  />
                                </div>
                              </div>
                              <div className="space-y-3">
                                <div className="flex items-center space-x-2">
                                  <input
                                    type="checkbox"
                                    id="invite-isAdmin"
                                    checked={inviteForm.isAdmin}
                                    onChange={(e) => setInviteForm(prev => ({ ...prev, isAdmin: e.target.checked }))}
                                    className="rounded"
                                  />
                                  <Label htmlFor="invite-isAdmin">Admin privileges</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <input
                                    type="checkbox"
                                    id="invite-isBetaTester"
                                    checked={inviteForm.isBetaTester}
                                    onChange={(e) => setInviteForm(prev => ({ ...prev, isBetaTester: e.target.checked }))}
                                    className="rounded"
                                  />
                                  <Label htmlFor="invite-isBetaTester">Beta tester access</Label>
                                </div>
                              </div>
                              <div className="grid gap-2">
                                <Label htmlFor="invite-message">Personal Message (Optional)</Label>
                                <Input
                                  id="invite-message"
                                  placeholder="Welcome to MusoBuddy! You've been invited to..."
                                  value={inviteForm.personalMessage}
                                  onChange={(e) => setInviteForm(prev => ({ ...prev, personalMessage: e.target.value }))}
                                />
                              </div>
                            </div>
                            <div className="flex justify-end gap-2">
                              <Button variant="outline" onClick={() => setInviteUserOpen(false)}>
                                Cancel
                              </Button>
                              <Button onClick={handleInviteUser} disabled={inviteUserMutation.isPending}>
                                {inviteUserMutation.isPending ? 'Sending...' : 'Send Invitation'}
                              </Button>
                            </div>
                          </DialogContent>
                        </Dialog>
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
                                <div className="flex items-center space-x-2">
                                  <input
                                    type="checkbox"
                                    id="forceTestMode"
                                    checked={newUserForm.forceTestMode}
                                    onChange={(e) => setNewUserForm(prev => ({ ...prev, forceTestMode: e.target.checked }))}
                                    className="rounded"
                                  />
                                  <Label htmlFor="forceTestMode">Force Test Mode (use test Stripe even in production)</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <input
                                    type="checkbox"
                                    id="bypassPayment"
                                    checked={newUserForm.bypassPayment}
                                    onChange={(e) => setNewUserForm(prev => ({ ...prev, bypassPayment: e.target.checked }))}
                                    className="rounded"
                                  />
                                  <Label htmlFor="bypassPayment">Bypass Payment (grant full access without Stripe subscription)</Label>
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
                  </div>
                </CardHeader>
                <CardContent>
                  {selectedUsers.length > 0 && (
                    <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                        <span className="text-sm font-medium">
                          {selectedUsers.length} user{selectedUsers.length !== 1 ? 's' : ''} selected
                        </span>
                        <div className="flex gap-2 w-full sm:w-auto">
                          <Button 
                            size="sm" 
                            variant="outline" 
                            onClick={() => setSelectedUsers([])}
                            className="flex-1 sm:flex-none"
                          >
                            Clear Selection
                          </Button>
                          <Button 
                            size="sm" 
                            variant="destructive" 
                            onClick={handleBulkDelete}
                            disabled={bulkDeleteMutation.isPending}
                            className="flex-1 sm:flex-none"
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
                        <div key={user.id} className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                          <div className="flex items-center gap-3 flex-1">
                            <input
                              type="checkbox"
                              checked={selectedUsers.includes(user.id)}
                              onChange={() => handleSelectUser(user.id)}
                              className="rounded flex-shrink-0"
                            />
                            <div className="flex-1 min-w-0">
                              <div className="font-medium truncate">
                                {user.firstName || 'Unknown'} {user.lastName || 'User'}
                              </div>
                              <div className="text-sm text-muted-foreground truncate">{user.email}</div>
                              <div className="mt-2 flex items-center gap-2 flex-wrap">
                                <Badge className={getAccessBadge(user).color}>
                                  {getAccessBadge(user).label}
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
                                <span className="text-xs text-muted-foreground hidden sm:inline">
                                  ID: {user.id}
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 justify-end sm:justify-start flex-shrink-0">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEditUser(user)}
                              className="text-xs sm:text-sm"
                            >
                              <Edit className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                              <span className="hidden sm:inline">Edit</span>
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                if (confirm(`Reset widget for ${user.firstName} ${user.lastName} (${user.email})? This will clear their widget URL and QR code.`)) {
                                  resetWidgetMutation.mutate(user.id);
                                }
                              }}
                              disabled={resetWidgetMutation.isPending}
                              className="text-xs sm:text-sm text-orange-600 border-orange-200 hover:bg-orange-50"
                            >
                              <RotateCcw className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                              <span className="hidden sm:inline">Reset Widget</span>
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => deleteUserMutation.mutate(user.id)}
                              disabled={deleteUserMutation.isPending}
                              className="text-xs sm:text-sm"
                            >
                              <Trash2 className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                              <span className="hidden sm:inline">Delete</span>
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
                      <Label htmlFor="edit-notes">Account Notes</Label>
                      <Input
                        id="edit-notes"
                        type="text"
                        placeholder="Optional notes about this account"
                        value={editUserForm.accountNotes}
                        onChange={(e) => setEditUserForm(prev => ({ ...prev, accountNotes: e.target.value }))}
                      />
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
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id="edit-forceTestMode"
                          checked={editUserForm.forceTestMode}
                          onChange={(e) => setEditUserForm(prev => ({ ...prev, forceTestMode: e.target.checked }))}
                          className="rounded"
                        />
                        <Label htmlFor="edit-forceTestMode">Force Test Mode (use Stripe test environment in production)</Label>
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
                        <div className="bg-primary/5 p-4 rounded-lg border border-yellow-200">
                          <div className="text-primary/90 font-medium">1-Year Free Subscriptions</div>
                          <div className="text-2xl font-bold text-yellow-900">
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

            <TabsContent value="beta-codes" className="space-y-6">
              <Card>
                <CardHeader>
                  <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                    <div>
                      <CardTitle className="text-foreground">Beta Invite Codes</CardTitle>
                      <CardDescription className="text-muted-foreground">
                        Manage dynamic beta invite codes for secure access control
                      </CardDescription>
                    </div>
                    <Dialog open={betaCodeDialogOpen} onOpenChange={setBetaCodeDialogOpen}>
                      <DialogTrigger asChild>
                        <Button className="flex items-center gap-2">
                          <Plus className="h-4 w-4" />
                          Create Code
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-[500px]">
                        <DialogHeader>
                          <DialogTitle>Create Beta Invite Code</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div className="flex gap-2">
                            <div className="flex-1">
                              <Label htmlFor="code">Invite Code</Label>
                              <Input
                                id="code"
                                value={betaCodeForm.code}
                                onChange={(e) => setBetaCodeForm(prev => ({ ...prev, code: e.target.value.toUpperCase() }))}
                                placeholder="BETA-XXXX-2025"
                                className="font-mono"
                              />
                            </div>
                            <div className="flex items-end">
                              <Button 
                                type="button" 
                                variant="outline" 
                                onClick={generateRandomCode}
                                className="px-3"
                              >
                                Generate
                              </Button>
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <Label htmlFor="maxUses">Max Uses</Label>
                              <Input
                                id="maxUses"
                                type="number"
                                value={betaCodeForm.maxUses}
                                onChange={(e) => setBetaCodeForm(prev => ({ ...prev, maxUses: parseInt(e.target.value) || 1 }))}
                                min="1"
                              />
                            </div>
                            <div>
                              <Label htmlFor="trialDays">Trial Days</Label>
                              <Input
                                id="trialDays"
                                type="number"
                                value={betaCodeForm.trialDays}
                                onChange={(e) => setBetaCodeForm(prev => ({ ...prev, trialDays: parseInt(e.target.value) || 365 }))}
                                min="1"
                              />
                            </div>
                          </div>
                          
                          <div>
                            <Label htmlFor="description">Description (Optional)</Label>
                            <Input
                              id="description"
                              value={betaCodeForm.description}
                              onChange={(e) => setBetaCodeForm(prev => ({ ...prev, description: e.target.value }))}
                              placeholder="e.g., Early access for musicians"
                            />
                          </div>
                          
                          <div>
                            <Label htmlFor="expiresAt">Expires At (Optional)</Label>
                            <Input
                              id="expiresAt"
                              type="date"
                              value={betaCodeForm.expiresAt}
                              onChange={(e) => setBetaCodeForm(prev => ({ ...prev, expiresAt: e.target.value }))}
                            />
                          </div>

                          <div className="flex justify-end gap-3">
                            <Button 
                              type="button" 
                              variant="outline" 
                              onClick={() => setBetaCodeDialogOpen(false)}
                            >
                              Cancel
                            </Button>
                            <Button 
                              onClick={handleCreateBetaCode}
                              disabled={createBetaCodeMutation.isPending}
                            >
                              {createBetaCodeMutation.isPending ? "Creating..." : "Create Code"}
                            </Button>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </CardHeader>
                <CardContent>
                  {betaCodesLoading ? (
                    <div className="text-center py-8">Loading beta codes...</div>
                  ) : (
                    <div className="space-y-4">
                      {betaCodes?.betaCodes?.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                          <Ticket className="h-12 w-12 mx-auto mb-4 opacity-50" />
                          <p>No beta invite codes created yet</p>
                          <p className="text-sm">Create your first dynamic invite code above</p>
                        </div>
                      ) : (
                        <div className="grid gap-4">
                          {betaCodes?.betaCodes?.map((code) => (
                            <div key={code.id} className="p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                                <div className="space-y-2 flex-1">
                                  <div className="flex items-center gap-3">
                                    <code className="text-lg font-mono font-bold bg-muted px-2 py-1 rounded">
                                      {code.code}
                                    </code>
                                    <Badge variant={code.status === 'active' ? 'default' : 'secondary'}>
                                      {code.status}
                                    </Badge>
                                    {code.expiresAt && new Date(code.expiresAt) < new Date() && (
                                      <Badge variant="destructive">Expired</Badge>
                                    )}
                                  </div>
                                  
                                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-sm text-muted-foreground">
                                    <div>
                                      <span className="font-medium">Uses:</span> {code.currentUses}/{code.maxUses}
                                    </div>
                                    <div>
                                      <span className="font-medium">Trial:</span> {code.trialDays} days
                                    </div>
                                    <div>
                                      <span className="font-medium">Created:</span> {new Date(code.createdAt).toLocaleDateString()}
                                    </div>
                                    {code.expiresAt && (
                                      <div>
                                        <span className="font-medium">Expires:</span> {new Date(code.expiresAt).toLocaleDateString()}
                                      </div>
                                    )}
                                  </div>
                                  
                                  {code.description && (
                                    <p className="text-sm text-muted-foreground italic">
                                      {code.description}
                                    </p>
                                  )}
                                  
                                  {code.lastUsedAt && (
                                    <p className="text-xs text-muted-foreground">
                                      Last used: {new Date(code.lastUsedAt).toLocaleString()}
                                    </p>
                                  )}
                                </div>
                                
                                <div className="flex gap-2 lg:flex-col">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                      const updates = { status: code.status === 'active' ? 'disabled' : 'active' };
                                      updateBetaCodeMutation.mutate({ id: code.id, updates });
                                    }}
                                    disabled={updateBetaCodeMutation.isPending}
                                    className="flex-1 lg:flex-none"
                                  >
                                    {code.status === 'active' ? 'Disable' : 'Enable'}
                                  </Button>
                                  
                                  <Button
                                    size="sm"
                                    variant="destructive"
                                    onClick={() => {
                                      if (confirm(`Delete beta code ${code.code}? This cannot be undone.`)) {
                                        deleteBetaCodeMutation.mutate(code.id);
                                      }
                                    }}
                                    disabled={deleteBetaCodeMutation.isPending}
                                    className="flex-1 lg:flex-none"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="beta-emails" className="space-y-6">
              <Card>
                <CardHeader>
                  <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                    <div>
                      <CardTitle className="text-foreground">Send Beta Invitations</CardTitle>
                      <CardDescription className="text-muted-foreground">
                        Send professionally styled beta invitation emails with custom codes
                      </CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <Dialog open={emailTemplateDialogOpen} onOpenChange={(open) => {
                        setEmailTemplateDialogOpen(open);
                        if (open && activeTemplate?.template) {
                          setEmailTemplateForm({
                            subject: activeTemplate.template.subject || '',
                            textBody: activeTemplate.template.textBody || ''
                          });
                        }
                      }}>
                        <DialogTrigger asChild>
                          <Button
                            variant="outline"
                            className="flex items-center gap-2"
                          >
                            <Edit className="h-4 w-4" />
                            Edit Email Template
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
                          <DialogHeader>
                            <DialogTitle>Edit Beta Email Template</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-md border border-blue-200 dark:border-blue-800">
                              <p className="text-sm text-blue-700 dark:text-blue-300">
                                <strong>Available variables:</strong> {{firstName}}, {{customCode}}, {{currentYear}}, {{message}}
                              </p>
                            </div>

                            <div>
                              <Label htmlFor="template-subject">Email Subject</Label>
                              <Input
                                id="template-subject"
                                value={emailTemplateForm.subject}
                                onChange={(e) => setEmailTemplateForm(prev => ({ ...prev, subject: e.target.value }))}
                                placeholder="Welcome to MusoBuddy Beta - Code: {{customCode}}"
                              />
                            </div>

                            <div>
                              <Label htmlFor="template-text">Plain Text Content</Label>
                              <p className="text-sm text-muted-foreground mb-2">
                                This is the text version of your email (HTML editing coming soon)
                              </p>
                              <textarea
                                id="template-text"
                                value={emailTemplateForm.textBody}
                                onChange={(e) => setEmailTemplateForm(prev => ({ ...prev, textBody: e.target.value }))}
                                className="w-full px-3 py-2 border border-input rounded-md bg-background text-sm font-mono ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 min-h-[400px] resize-y"
                                placeholder="Welcome to the MusoBuddy Beta!..."
                              />
                            </div>

                            <div className="flex justify-end gap-3">
                              <Button
                                type="button"
                                variant="outline"
                                onClick={() => setEmailTemplateDialogOpen(false)}
                              >
                                Cancel
                              </Button>
                              <Button
                                onClick={handleSaveEmailTemplate}
                                disabled={updateEmailTemplateMutation.isPending}
                              >
                                {updateEmailTemplateMutation.isPending ? "Saving..." : "Save Template"}
                              </Button>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
                      <Dialog open={betaEmailDialogOpen} onOpenChange={setBetaEmailDialogOpen}>
                        <DialogTrigger asChild>
                          <Button className="flex items-center gap-2">
                            <Mail className="h-4 w-4" />
                            Send Beta Email
                          </Button>
                        </DialogTrigger>
                      <DialogContent className="sm:max-w-[600px]">
                        <DialogHeader>
                          <DialogTitle>Send Beta Invitation Email</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <Label htmlFor="email">Email Address *</Label>
                              <Input
                                id="email"
                                type="email"
                                value={betaEmailForm.email}
                                onChange={(e) => setBetaEmailForm(prev => ({ ...prev, email: e.target.value }))}
                                placeholder="beta.tester@example.com"
                              />
                            </div>
                            <div>
                              <Label htmlFor="firstName">First Name *</Label>
                              <Input
                                id="firstName"
                                value={betaEmailForm.firstName}
                                onChange={(e) => setBetaEmailForm(prev => ({ ...prev, firstName: e.target.value }))}
                                placeholder="John"
                              />
                            </div>
                          </div>

                          <div>
                            <Label htmlFor="customCode">Beta Code *</Label>
                            <Input
                              id="customCode"
                              value={betaEmailForm.customCode}
                              onChange={(e) => setBetaEmailForm(prev => ({ ...prev, customCode: e.target.value.toUpperCase() }))}
                              placeholder="BETA-XXXX-2025"
                              className="font-mono"
                            />
                          </div>

                          <div>
                            <Label htmlFor="subject">Email Subject (Optional)</Label>
                            <Input
                              id="subject"
                              value={betaEmailForm.subject}
                              onChange={(e) => setBetaEmailForm(prev => ({ ...prev, subject: e.target.value }))}
                              placeholder="Welcome to MusoBuddy Beta - Code: {customCode}"
                            />
                          </div>

                          <div>
                            <Label htmlFor="message">Personal Message (Optional)</Label>
                            <textarea
                              id="message"
                              value={betaEmailForm.message}
                              onChange={(e) => setBetaEmailForm(prev => ({ ...prev, message: e.target.value }))}
                              placeholder="Add a personal message that will appear in the email..."
                              className="w-full px-3 py-2 border border-input rounded-md bg-background text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 min-h-[100px] resize-y"
                            />
                          </div>

                          <div className="flex justify-end gap-3">
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => setBetaEmailDialogOpen(false)}
                            >
                              Cancel
                            </Button>
                            <Button
                              onClick={handleSendBetaEmail}
                              disabled={sendBetaEmailMutation.isPending}
                            >
                              {sendBetaEmailMutation.isPending ? "Sending..." : "Send Email"}
                            </Button>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                      <h3 className="font-semibold text-blue-800 dark:text-blue-200 mb-2 flex items-center">
                        <Mail className="h-4 w-4 mr-2" />
                        Email Template Features
                      </h3>
                      <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
                        <li>• Professional HTML styling with dark mode support</li>
                        <li>• Mobile-responsive design</li>
                        <li>• Includes beta testing guidelines</li>
                        <li>• Personalized with recipient's name and custom code</li>
                        <li>• Clear call-to-action buttons</li>
                        <li>• Optional personal message section</li>
                      </ul>
                    </div>

                    <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg border border-yellow-200 dark:border-yellow-800">
                      <h3 className="font-semibold text-yellow-800 dark:text-yellow-200 mb-2">
                        ⚠️ Before Sending
                      </h3>
                      <ul className="text-sm text-yellow-700 dark:text-yellow-300 space-y-1">
                        <li>• Make sure the beta code exists and is active</li>
                        <li>• Verify the recipient's email address</li>
                        <li>• Check that Mailgun is properly configured</li>
                        <li>• Consider testing with your own email first</li>
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="api-costs" className="space-y-6">
              <APICostMonitor />
            </TabsContent>

            <TabsContent value="api-usage" className="space-y-6">
              <div className="mb-4">
                <h2 className="text-xl font-semibold text-foreground">API Usage & Limits Management</h2>
                <p className="text-muted-foreground">Monitor and manage individual user API usage limits to prevent abuse and control costs.</p>
              </div>
              <ApiUsageManager />
            </TabsContent>

            <TabsContent value="database" className="space-y-6">
              <DatabaseAdmin />
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