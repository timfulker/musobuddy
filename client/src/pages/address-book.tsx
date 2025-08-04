import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertClientSchema, type InsertClient, type Client } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Users, Plus, Mail, Phone, MapPin, Search, Edit, Trash2, Calendar, DollarSign, Grid, List, Filter, SortAsc, ChevronLeft, ChevronRight, ArrowLeft, AlertTriangle, UserPlus, Download, Edit2, Eye } from "lucide-react";
import Sidebar from "@/components/sidebar";
import MobileNav from "@/components/mobile-nav";
import { useAuth } from "@/hooks/useAuth";
import { Link } from "wouter";

export default function AddressBook() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
  const [sortBy, setSortBy] = useState<'name' | 'bookings' | 'revenue' | 'created'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);
  const [clientFilter, setClientFilter] = useState<'all' | 'inquired' | 'booked' | 'both' | 'needs_review'>('all');
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  


  const { data: clients = [], isLoading } = useQuery<Client[]>({
    queryKey: ["/api/clients"],
  });

  const createClientMutation = useMutation({
    mutationFn: (data: InsertClient) => {
      
      return apiRequest("/api/clients", {
        method: "POST",
        body: JSON.stringify(data)
      });
    },
    onSuccess: (response) => {
      
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
      setIsCreateOpen(false);
      form.reset();
      toast({
        title: "Success",
        description: "Client added to address book",
      });
    },
    onError: (error: any) => {
      console.error("Error creating client:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to add client",
        variant: "destructive",
      });
    },
  });

  const updateClientMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<InsertClient> }) => 
      apiRequest(`/api/clients/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data)
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
      setEditingClient(null);
      toast({
        title: "Success",
        description: "Client updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update client",
        variant: "destructive",
      });
    },
  });

  const deleteClientMutation = useMutation({
    mutationFn: (id: number) => apiRequest(`/api/clients/${id}`, {
      method: "DELETE"
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
      toast({
        title: "Success",
        description: "Client removed from address book",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to remove client",
        variant: "destructive",
      });
    },
  });

  const form = useForm<InsertClient>({
    resolver: zodResolver(insertClientSchema.omit({ 
      totalBookings: true, 
      totalRevenue: true,
      bookingIds: true
    })),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      address: "",
      notes: "",
    },
  });

  const populateFromBookingsMutation = useMutation({
    mutationFn: () => apiRequest("/api/clients/populate-from-bookings", {
      method: "POST",
      body: JSON.stringify({})
    }),
    onSuccess: (response: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
      toast({
        title: "Success",
        description: response.message || "Address book populated from bookings",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error", 
        description: error.message || "Failed to populate address book",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (data: InsertClient) => {
    
    
    
    if (editingClient) {
      
      updateClientMutation.mutate({ id: editingClient.id, data });
    } else {
      
      createClientMutation.mutate(data);
    }
  };

  const handleEdit = (client: Client) => {
    setEditingClient(client);
    form.reset({
      name: client.name,
      email: client.email || "",
      phone: client.phone || "",
      address: client.address || "",
      notes: client.notes || "",
    });
  };

  const handleDelete = (id: number) => {
    if (confirm("Are you sure you want to remove this client from your address book?")) {
      deleteClientMutation.mutate(id);
    }
  };

  // Filter and sort clients
  const filteredAndSortedClients = clients
    .filter((client: Client) => {
      // Search filter
      const matchesSearch = client.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        client.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        client.phone?.includes(searchQuery);
      
      if (!matchesSearch) return false;
      
      // Client type filter based on booking data
      if (clientFilter !== 'all') {
        const bookingIds = client.bookingIds ? JSON.parse(client.bookingIds) : [];
        const hasAnyContact = bookingIds.length > 0;
        
        switch (clientFilter) {
          case 'inquired':
            // Clients who have made initial contact (1-2 bookings, likely inquiries)
            return hasAnyContact && (client.totalBookings || 0) <= 2;
          case 'booked':
            // Clients who have actually booked events (3+ bookings, showing repeat business)
            return hasAnyContact && (client.totalBookings || 0) >= 3;
          case 'both':
            // Any client with contact history
            return hasAnyContact;
          case 'needs_review':
            // Clients that might be event titles rather than proper names
            const mightBeEventTitle = client.name.toLowerCase().includes('wedding') ||
              client.name.toLowerCase().includes('birthday') ||
              client.name.toLowerCase().includes('party') ||
              client.name.toLowerCase().includes('corporate') ||
              client.name.toLowerCase().includes('christmas') ||
              client.name.toLowerCase().includes('anniversary') ||
              client.name.toLowerCase().includes('celebration') ||
              client.name.includes('&') ||
              client.name.includes(' - ') ||
              !client.email; // No email suggests it might be a calendar title
            return mightBeEventTitle;
          default:
            return true;
        }
      }
      
      return true;
    })
    .sort((a: Client, b: Client) => {
      let aValue: any, bValue: any;
      
      switch (sortBy) {
        case 'name':
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case 'bookings':
          aValue = a.totalBookings || 0;
          bValue = b.totalBookings || 0;
          break;
        case 'revenue':
          aValue = parseFloat(a.totalRevenue || "0");
          bValue = parseFloat(b.totalRevenue || "0");
          break;
        case 'created':
          aValue = new Date(a.createdAt || 0);
          bValue = new Date(b.createdAt || 0);
          break;
        default:
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
      }
      
      if (sortOrder === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });

  // Pagination
  const totalPages = Math.ceil(filteredAndSortedClients.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedClients = filteredAndSortedClients.slice(startIndex, startIndex + itemsPerPage);
  
  // Reset page when search changes
  const handleSearch = (query: string) => {
    setSearchQuery(query);
    setCurrentPage(1);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile menu toggle */}
      <div className="md:hidden fixed top-4 left-4 z-50">
        <button
          onClick={() => setSidebarOpen(true)}
          className="bg-card p-2 rounded-lg shadow-lg"
        >
          <svg className="w-6 h-6 text-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </div>

      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      
      <div className="md:ml-64">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <Link href="/">
                <Button variant="ghost" size="sm" className="p-2 hover:bg-accent">
                  <ArrowLeft className="w-4 h-4" />
                </Button>
              </Link>
              <Users className="w-8 h-8 text-primary" />
              <div>
                <h1 className="text-2xl font-bold text-foreground ml-12 md:ml-0">Address Book</h1>
                <p className="text-sm text-muted-foreground">Manage your client contacts</p>
              </div>
            </div>
            
            <Dialog open={isCreateOpen || !!editingClient} onOpenChange={(open) => {
              if (!open) {
                setIsCreateOpen(false);
                setEditingClient(null);
                form.reset();
              }
            }}>
              <DialogTrigger asChild>
                <Button className="bg-purple-600 hover:bg-purple-700" onClick={() => setIsCreateOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Client
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle>
                    {editingClient ? "Edit Client" : "Add New Client"}
                  </DialogTitle>
                </DialogHeader>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Name *</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Client name" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input {...field} type="email" placeholder="client@example.com" value={field.value || ""} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Phone</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Phone number" value={field.value || ""} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="address"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Address</FormLabel>
                          <FormControl>
                            <Textarea {...field} placeholder="Client address" rows={3} value={field.value || ""} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="notes"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Notes</FormLabel>
                          <FormControl>
                            <Textarea {...field} placeholder="Additional notes..." rows={3} value={field.value || ""} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="flex justify-end space-x-2 pt-4">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setIsCreateOpen(false);
                          setEditingClient(null);
                          form.reset();
                        }}
                      >
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        disabled={createClientMutation.isPending || updateClientMutation.isPending}
                        className="bg-purple-600 hover:bg-purple-700"
                      >
                        {editingClient ? "Update Client" : "Add Client"}
                      </Button>
                    </div>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>

          {/* Search and Controls */}
          <div className="mb-6">
            <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
              {/* Search */}
              <div className="relative max-w-md">
                <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Search clients..."
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              {/* Controls */}
              <div className="flex gap-2 items-center">
                {/* Client Filter */}
                <Select value={clientFilter} onValueChange={(value: any) => setClientFilter(value)}>
                  <SelectTrigger className="w-36">
                    <SelectValue placeholder="Filter clients" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Clients</SelectItem>
                    <SelectItem value="inquired">Initial Inquiries (1-2 contacts)</SelectItem>
                    <SelectItem value="booked">Repeat Clients (3+ bookings)</SelectItem>
                    <SelectItem value="both">Has Contact History</SelectItem>
                    <SelectItem value="needs_review">⚠️ Needs Review (Event Titles)</SelectItem>
                  </SelectContent>
                </Select>
                
                {/* Populate from Bookings Button */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => populateFromBookingsMutation.mutate()}
                  disabled={populateFromBookingsMutation.isPending}
                  className="px-3"
                >
                  {populateFromBookingsMutation.isPending ? "Populating..." : "Import from Bookings"}
                </Button>
                {/* View Mode Toggle */}
                <div className="flex border rounded-lg p-1">
                  <Button
                    variant={viewMode === 'cards' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setViewMode('cards')}
                    className="px-3"
                  >
                    <Grid className="w-4 h-4" />
                  </Button>
                  <Button
                    variant={viewMode === 'table' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setViewMode('table')}
                    className="px-3"
                  >
                    <List className="w-4 h-4" />
                  </Button>
                </div>
                
                {/* Sort By */}
                <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="name">Name</SelectItem>
                    <SelectItem value="bookings">Bookings</SelectItem>
                    <SelectItem value="revenue">Revenue</SelectItem>
                    <SelectItem value="created">Date Added</SelectItem>
                  </SelectContent>
                </Select>
                
                {/* Sort Order */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                  className="px-3"
                >
                  <SortAsc className={`w-4 h-4 ${sortOrder === 'desc' ? 'rotate-180' : ''}`} />
                </Button>
                
                {/* Items per page */}
                <Select value={itemsPerPage.toString()} onValueChange={(value) => setItemsPerPage(Number(value))}>
                  <SelectTrigger className="w-20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="25">25</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                    <SelectItem value="100">100</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Total Clients</p>
                    <p className="text-2xl font-bold text-gray-900">{clients.length}</p>
                  </div>
                  <Users className="w-8 h-8 text-purple-600" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Need Review</p>
                    <p className="text-2xl font-bold text-amber-600">
                      {clients.filter(client => {
                        const mightBeEventTitle = client.name.toLowerCase().includes('wedding') ||
                          client.name.toLowerCase().includes('birthday') ||
                          client.name.toLowerCase().includes('party') ||
                          client.name.toLowerCase().includes('corporate') ||
                          client.name.toLowerCase().includes('christmas') ||
                          client.name.toLowerCase().includes('anniversary') ||
                          client.name.toLowerCase().includes('celebration') ||
                          client.name.includes('&') ||
                          client.name.includes(' - ') ||
                          !client.email;
                        return mightBeEventTitle;
                      }).length}
                    </p>
                  </div>
                  <AlertTriangle className="w-8 h-8 text-amber-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Total Bookings</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {clients.reduce((sum: number, client: Client) => sum + (client.totalBookings || 0), 0)}
                    </p>
                  </div>
                  <Calendar className="w-8 h-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Total Revenue</p>
                    <p className="text-2xl font-bold text-gray-900">
                      £{clients.reduce((sum: number, client: Client) => sum + parseFloat(client.totalRevenue || "0"), 0).toFixed(2)}
                    </p>
                  </div>
                  <DollarSign className="w-8 h-8 text-green-600" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Clients List */}
          {isLoading ? (
            <div className="text-center py-8">
              <div className="animate-pulse">Loading clients...</div>
            </div>
          ) : filteredAndSortedClients.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  {searchQuery ? "No clients found" : "No clients yet"}
                </h3>
                <p className="text-gray-600 mb-4">
                  {searchQuery 
                    ? `No clients found matching "${searchQuery}". Try adjusting your search or filter.`
                    : clientFilter !== 'all' 
                      ? `No clients found in the "${clientFilter === 'needs_review' ? 'Needs Review' : clientFilter}" category. Try changing the filter or importing from bookings.`
                      : "Your address book will populate automatically as you receive enquiries, or you can add clients manually."
                  }
                </p>
                {!searchQuery && (
                  <Button onClick={() => setIsCreateOpen(true)} className="bg-purple-600 hover:bg-purple-700">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Your First Client
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Results Info */}
              <div className="flex items-center justify-between text-sm text-gray-600 mb-4">
                <span>
                  Showing {startIndex + 1}-{Math.min(startIndex + itemsPerPage, filteredAndSortedClients.length)} of {filteredAndSortedClients.length} clients
                </span>
                <span>
                  Page {currentPage} of {totalPages}
                </span>
              </div>

              {/* Table View */}
              {viewMode === 'table' ? (
                <Card>
                  <CardContent className="p-0">
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-50 border-b">
                          <tr>
                            <th className="text-left p-4 font-medium text-gray-900">Name</th>
                            <th className="text-left p-4 font-medium text-gray-900">Email</th>
                            <th className="text-left p-4 font-medium text-gray-900">Phone</th>
                            <th className="text-left p-4 font-medium text-gray-900">Bookings</th>
                            <th className="text-left p-4 font-medium text-gray-900">Revenue</th>
                            <th className="text-left p-4 font-medium text-gray-900">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {paginatedClients.map((client: Client) => (
                            <tr key={client.id} className="border-b hover:bg-gray-50">
                              <td className="p-4">
                                <div className="font-medium text-gray-900">{client.name}</div>
                                {client.notes && (
                                  <div className="text-sm text-gray-600 truncate max-w-xs">
                                    {client.notes}
                                  </div>
                                )}
                              </td>
                              <td className="p-4 text-sm text-gray-600">
                                {client.email ? (
                                  <div className="flex items-center space-x-2">
                                    <Mail className="w-4 h-4" />
                                    <span>{client.email}</span>
                                  </div>
                                ) : (
                                  <span className="text-gray-400">-</span>
                                )}
                              </td>
                              <td className="p-4 text-sm text-gray-600">
                                {client.phone ? (
                                  <div className="flex items-center space-x-2">
                                    <Phone className="w-4 h-4" />
                                    <span>{client.phone}</span>
                                  </div>
                                ) : (
                                  <span className="text-gray-400">-</span>
                                )}
                              </td>
                              <td className="p-4 text-sm text-gray-600">
                                <div className="flex items-center space-x-2">
                                  <Calendar className="w-4 h-4" />
                                  <span>{client.totalBookings || 0}</span>
                                </div>
                              </td>
                              <td className="p-4 text-sm text-gray-600">
                                <div className="flex items-center space-x-2">
                                  <DollarSign className="w-4 h-4" />
                                  <span>£{parseFloat(client.totalRevenue || "0").toFixed(2)}</span>
                                </div>
                              </td>
                              <td className="p-4">
                                <div className="flex space-x-1">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleEdit(client)}
                                    className="h-8 w-8 p-0"
                                  >
                                    <Edit className="w-4 h-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleDelete(client.id)}
                                    className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                /* Card View */
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {paginatedClients.map((client: Client) => (
                    <Card key={client.id} className="hover:shadow-lg transition-shadow">
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-lg">{client.name}</CardTitle>
                          <div className="flex space-x-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEdit(client)}
                              className="h-8 w-8 p-0"
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(client.id)}
                              className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <div className="space-y-2">
                          {client.email && (
                            <div className="flex items-center space-x-2 text-sm text-gray-600">
                              <Mail className="w-4 h-4" />
                              <span>{client.email}</span>
                            </div>
                          )}
                          {client.phone && (
                            <div className="flex items-center space-x-2 text-sm text-gray-600">
                              <Phone className="w-4 h-4" />
                              <span>{client.phone}</span>
                            </div>
                          )}
                          {client.address && (
                            <div className="flex items-center space-x-2 text-sm text-gray-600">
                              <MapPin className="w-4 h-4" />
                              <span className="truncate">{client.address}</span>
                            </div>
                          )}
                        </div>

                        <div className="flex items-center justify-between mt-4 pt-4 border-t">
                          <div className="flex space-x-2">
                            <Badge variant="secondary">
                              {client.totalBookings || 0} bookings
                            </Badge>
                          </div>
                          <div className="text-sm font-medium text-green-600">
                            £{parseFloat(client.totalRevenue || "0").toFixed(2)}
                          </div>
                        </div>

                        {client.notes && (
                          <div className="mt-3 p-2 bg-gray-50 rounded text-sm text-gray-600">
                            {client.notes}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </>
          )}
          
          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-6">
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(currentPage - 1)}
                >
                  <ChevronLeft className="w-4 h-4 mr-1" />
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(currentPage + 1)}
                >
                  Next
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
              
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-600">Go to page:</span>
                <Input
                  type="number"
                  min="1"
                  max={totalPages}
                  value={currentPage}
                  onChange={(e) => {
                    const page = parseInt(e.target.value);
                    if (page >= 1 && page <= totalPages) {
                      setCurrentPage(page);
                    }
                  }}
                  className="w-16 text-center"
                />
                <span className="text-sm text-gray-600">of {totalPages}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Navigation */}
      <MobileNav />
    </div>
  );
}