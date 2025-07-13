import React, { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertEnquirySchema, type Enquiry } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Plus, Search, Filter, DollarSign, Clock, Calendar, User, Edit, Trash2, Reply, AlertCircle, CheckCircle, UserPlus, ArrowUpDown, ArrowUp, ArrowDown, FileSignature } from "lucide-react";
import { z } from "zod";
import { insertClientSchema, type InsertClient } from "@shared/schema";
import { Link } from "wouter";
import Sidebar from "@/components/sidebar";
import MobileNav from "@/components/mobile-nav";
import { useResponsive } from "@/hooks/useResponsive";

const enquiryFormSchema = insertEnquirySchema.extend({
  eventDate: z.string().optional(),
}).omit({
  userId: true,
  title: true, // Remove title from validation since we auto-generate it
});

export default function Enquiries() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("newest"); // newest, oldest, eventDate, status
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [respondDialogOpen, setRespondDialogOpen] = useState(false);
  const [selectedEnquiry, setSelectedEnquiry] = useState<Enquiry | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // ALL HOOKS MUST BE CALLED BEFORE ANY CONDITIONAL LOGIC
  const { isDesktop } = useResponsive();
  const { toast } = useToast();

  // Check URL params to auto-open form dialog
  React.useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('action') === 'new') {
      setIsDialogOpen(true);
      // Clean up URL
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  const { data: enquiries = [], isLoading, error } = useQuery<Enquiry[]>({
    queryKey: ["/api/enquiries"],
  });

  const { data: templates = [] } = useQuery({
    queryKey: ["/api/templates"],
  });

  const { data: settings = {} } = useQuery({
    queryKey: ["/api/settings"],
  });

  // Parse gig types from settings - handle the specific format from database
  const gigTypes = React.useMemo(() => {
    if (!settings.gigTypes) return [];

    // Handle string format from database
    if (typeof settings.gigTypes === 'string') {
      // Remove outer quotes and parse comma-separated values
      const cleanString = settings.gigTypes.replace(/^["']|["']$/g, '');
      if (cleanString.includes(',')) {
        return cleanString.split(',').map(item => 
          item.replace(/^["'\\[\]]+|["'\\[\]]+$/g, '').replace(/\\"/g, '').replace(/"/g, '').trim()
        ).filter(item => item.length > 0);
      }
      return [cleanString.replace(/^["'\\[\]]+|["'\\[\]]+$/g, '').replace(/\\"/g, '').replace(/"/g, '').trim()];
    }

    // Handle array format
    if (Array.isArray(settings.gigTypes)) {
      return settings.gigTypes.map(item => 
        typeof item === 'string' ? item.replace(/^["'\\[\]]+|["'\\[\]]+$/g, '').replace(/\\"/g, '').replace(/"/g, '').trim() : item
      );
    }

    return [];
  }, [settings.gigTypes]);

  // Parse event types from settings
  const eventTypes = React.useMemo(() => {
    if (settings.eventTypes) {
      try {
        // First try to parse as JSON
        const parsed = JSON.parse(settings.eventTypes);
        if (Array.isArray(parsed)) {
          return parsed;
        }
        // If not array, treat as string and split
        return settings.eventTypes.split('\n').filter(Boolean);
      } catch (error) {
        // If JSON parsing fails, treat as newline-separated string
        return settings.eventTypes.split('\n').filter(Boolean);
      }
    }
    return ["Wedding", "Corporate Event", "Private Party", "Birthday Party", 
            "Anniversary", "Concert", "Festival", "Charity Event", "Christmas Party", "Other"];
  }, [settings.eventTypes]);

  const createEnquiryMutation = useMutation({
    mutationFn: async (data: z.infer<typeof enquiryFormSchema>) => {
      const enquiryData = {
        ...data,
        eventDate: data.eventDate ? new Date(data.eventDate).toISOString() : null,
      };

      const response = await fetch("/api/enquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(enquiryData),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/enquiries"] });
      setIsDialogOpen(false);
      form.reset();
      toast({
        title: "Success",
        description: "Enquiry created successfully!",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to create enquiry. Please try again.",
        variant: "destructive",
      });
    },
  });

  const deleteEnquiryMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest(`/api/enquiries/${id}`, {
        method: 'DELETE'
      });
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/enquiries'] });
      toast({
        title: "Success",
        description: "Enquiry deleted successfully!",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to delete enquiry. Please try again.",
        variant: "destructive",
      });
    },
  });

  const addToAddressBookMutation = useMutation({
    mutationFn: async (enquiry: Enquiry) => {
      const clientData: InsertClient = {
        name: enquiry.clientName,
        email: enquiry.clientEmail || "",
        phone: enquiry.clientPhone || "",
        address: "", // We don't have address from enquiry
        notes: `Added from enquiry: ${enquiry.title}${enquiry.venue ? ` at ${enquiry.venue}` : ''}`
      };
      return apiRequest("POST", "/api/clients", clientData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
      toast({
        title: "Success", 
        description: "Client added to address book successfully!",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add client to address book",
        variant: "destructive",
      });
    },
  });

  const updateEnquiryStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      const response = await apiRequest(`/api/enquiries/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/enquiries'] });
      queryClient.invalidateQueries({ queryKey: ['/api/bookings/upcoming'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/stats'] });
      toast({
        title: "Success",
        description: "Enquiry status updated successfully!",
      });
      setRespondDialogOpen(false);
      setSelectedEnquiry(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update enquiry status",
        variant: "destructive",
      });
    },
  });

  const form = useForm<z.infer<typeof enquiryFormSchema>>({
    resolver: zodResolver(enquiryFormSchema),
    defaultValues: {
      clientName: "",
      clientEmail: "",
      clientPhone: "",
      eventDate: "",
      eventTime: "",
      venue: "",
      eventType: "",
      gigType: "",
      estimatedValue: "",
      notes: "",
      status: "new",
    },
  });

  // Helper functions
  const handleDeleteEnquiry = (enquiry: Enquiry) => {
    if (window.confirm(`Are you sure you want to delete the enquiry "${enquiry.title}"? This action cannot be undone.`)) {
      deleteEnquiryMutation.mutate(enquiry.id);
    }
  };

  const handleQuickResponse = async (templateId: number) => {
    if (!selectedEnquiry?.clientEmail && !selectedEnquiry?.clientPhone) {
      toast({
        title: "Error",
        description: "This enquiry has no email address or phone number to respond to.",
        variant: "destructive",
      });
      return;
    }

    const template = templates.find(t => t.id === templateId);

    if (template) {
      // For now, send email. SMS functionality will be added later
      if (selectedEnquiry?.clientEmail) {
        try {
          await fetch('/api/enquiries/send-response', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              enquiryId: selectedEnquiry.id,
              to: selectedEnquiry.clientEmail,
              subject: template.subject,
              body: template.emailBody
            })
          });

          toast({
            title: "Success",
            description: "Email response sent successfully!",
          });

          setRespondDialogOpen(false);
          setSelectedEnquiry(null);
        } catch (error) {
          toast({
            title: "Error",
            description: "Failed to send response. Please try again.",
            variant: "destructive",
          });
        }
      } else {
        // Future SMS functionality
        toast({
          title: "SMS Coming Soon",
          description: "SMS responses will be available soon for enquiries with phone numbers.",
        });
      }
    } else {
      toast({
        title: "Error",
        description: "Template not found. Please try again.",
        variant: "destructive",
      });
    }
  };

  const onSubmit = (data: z.infer<typeof enquiryFormSchema>) => {
    // Auto-generate title from Event Type and Client Name
    const eventTypeDisplay = eventTypes.find(type => 
      type.toLowerCase().replace(/ /g, '_') === data.eventType
    ) || data.eventType;

    const autoGeneratedTitle = `${eventTypeDisplay} - ${data.clientName}`;

    createEnquiryMutation.mutate({
      ...data,
      title: autoGeneratedTitle
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "new": return "bg-gray-100 text-gray-800";
      case "qualified": return "bg-blue-100 text-blue-800";
      case "contract_sent": return "bg-purple-100 text-purple-800";
      case "confirmed": return "bg-green-100 text-green-800";
      case "rejected": return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "No date set";
    return new Date(dateString).toLocaleDateString("en-GB");
  };

  const formatDateBox = (dateString: string) => {
    if (!dateString) return { dayName: "TBC", dayNum: "-", monthYear: "" };
    const date = new Date(dateString);
    const dayName = date.toLocaleDateString("en-GB", { weekday: "long" });
    const dayNum = date.getDate().toString();
    const monthYear = date.toLocaleDateString("en-GB", { month: "short", year: "numeric" });
    return { dayName, dayNum, monthYear };
  };

  const formatTime = (dateString: string) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    const now = new Date();
    const diffHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));

    if (diffHours < 24) {
      return `${diffHours} hours ago`;
    } else {
      const diffDays = Math.floor(diffHours / 24);
      return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    }
  };

  const formatReceivedDate = (dateString: string) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  const filteredEnquiries = enquiries.filter((enquiry: Enquiry) => {
    const matchesSearch = searchQuery === "" || 
      enquiry.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      enquiry.clientName.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === "all" || enquiry.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  // Sort the filtered enquiries
  const sortedEnquiries = [...filteredEnquiries].sort((a, b) => {
    switch (sortBy) {
      case "newest":
        return new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime();
      case "oldest":
        return new Date(a.createdAt!).getTime() - new Date(b.createdAt!).getTime();
      case "eventDate":
        if (!a.eventDate && !b.eventDate) return 0;
        if (!a.eventDate) return 1;
        if (!b.eventDate) return -1;
        return new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime();
      case "status":
        const statusOrder = { "new": 0, "qualified": 1, "contract_sent": 2, "confirmed": 3, "rejected": 4 };
        return (statusOrder[a.status as keyof typeof statusOrder] || 99) - (statusOrder[b.status as keyof typeof statusOrder] || 99);
      default:
        return 0;
    }
  });

  // Helper function to determine if response is needed
  const needsResponse = (enquiry: Enquiry): boolean => {
    // Check if explicitly marked as needing response
    if (enquiry.responseNeeded) return true;

    // Check if it's a new enquiry with no contact for over 24 hours
    if (enquiry.status === "new" && !enquiry.lastContactedAt) {
      const hoursSinceCreated = (new Date().getTime() - new Date(enquiry.createdAt!).getTime()) / (1000 * 60 * 60);
      return hoursSinceCreated > 24;
    }

    // Check if last contact was over 72 hours ago for in-progress enquiries
    if (enquiry.status === "qualified" && enquiry.lastContactedAt) {
      const hoursSinceContact = (new Date().getTime() - new Date(enquiry.lastContactedAt).getTime()) / (1000 * 60 * 60);
      return hoursSinceContact > 72;
    }

    return false;
  };

  // NOW HANDLE LOADING AND ERROR STATES AFTER ALL HOOKS
  if (isLoading) {
    return (
      <div className="flex min-h-screen">
        {isDesktop && <Sidebar />}
        <div className={`flex-1 p-4 ${isDesktop ? 'ml-64' : ''}`}>
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2 text-gray-600">Loading enquiries...</p>
            </div>
          </div>
        </div>
        {!isDesktop && <MobileNav />}
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen">
        {isDesktop && <Sidebar />}
        <div className={`flex-1 p-4 ${isDesktop ? 'ml-64' : ''}`}>
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <p className="text-red-600">Error loading enquiries. Please try again.</p>
              <button 
                onClick={() => window.location.reload()} 
                className="mt-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Retry
              </button>
            </div>
          </div>
        </div>
        {!isDesktop && <MobileNav />}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile menu toggle */}
      {!isDesktop && (
        <div className="fixed top-4 left-4 z-50">
          <button
            onClick={() => setSidebarOpen(true)}
            className="bg-card p-2 rounded-lg shadow-lg"
          >
            <svg className="w-6 h-6 text-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>
      )}

      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main Content */}
      <div className={`min-h-screen ${isDesktop ? 'ml-64' : ''}`}>
        <div className="p-6">
          <div className="max-w-7xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Enquiries</h1>
                <p className="text-gray-600 dark:text-gray-400">Manage your client enquiries and track your pipeline</p>
              </div>

          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-purple-600 hover:bg-purple-700">
                <Plus className="w-4 h-4 mr-2" />
                New Enquiry
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Create New Enquiry</DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="eventType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Event Type</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select event type" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {eventTypes.map((type) => (
                                <SelectItem key={type} value={type.toLowerCase().replace(/ /g, '_')}>
                                  {type}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="gigType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Gig Type</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder={gigTypes.length > 0 ? "Select gig type" : "Configure gig types in settings"} />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {gigTypes.length > 0 ? (
                                gigTypes.map((type: string, index: number) => (
                                  <SelectItem key={`gig-${index}`} value={type}>
                                    {type}
                                  </SelectItem>
                                ))
                              ) : (
                                <SelectItem value="not_configured" disabled>
                                  No gig types configured
                                </SelectItem>
                              )}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <FormField
                      control={form.control}
                      name="clientName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Client Name</FormLabel>
                          <FormControl>
                            <Input placeholder="John Smith" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="clientEmail"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Client Email</FormLabel>
                          <FormControl>
                            <Input type="email" placeholder="john@example.com" {...field} value={field.value || ""} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="clientPhone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Client Phone</FormLabel>
                          <FormControl>
                            <Input placeholder="07123 456 789" {...field} value={field.value || ""} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <FormField
                      control={form.control}
                      name="eventDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Event Date</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="eventTime"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Event Time</FormLabel>
                          <FormControl>
                            <Input type="time" {...field} value={field.value || ""} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="estimatedValue"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Price Quoted (£)</FormLabel>
                          <FormControl>
                            <Input placeholder="500" {...field} value={field.value || ""} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="venue"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Venue</FormLabel>
                        <FormControl>
                          <Input placeholder="The Grand Hotel, London" {...field} value={field.value || ""} />
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
                          <Textarea placeholder="Additional details about the enquiry..." {...field} value={field.value || ""} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex justify-end space-x-3">
                    <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={createEnquiryMutation.isPending}>
                      {createEnquiryMutation.isPending ? "Creating..." : "Create Enquiry"}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>

          {/* Respond Dialog */}
          <Dialog open={respondDialogOpen} onOpenChange={setRespondDialogOpen}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Respond to {selectedEnquiry?.clientName}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-2">Enquiry Details</h4>
                  <p className="text-sm text-gray-600">{selectedEnquiry?.title}</p>
                  <p className="text-sm text-gray-600">Email: {selectedEnquiry?.clientEmail || 'No email provided'}</p>
                  <p className="text-sm text-gray-600">Phone: {selectedEnquiry?.clientPhone || 'No phone provided'}</p>

                  {selectedEnquiry?.clientPhone && (
                    <div className="mt-2 p-2 bg-blue-50 rounded text-xs text-blue-600">
                      💡 SMS responses will be available soon for phone enquiries
                    </div>
                  )}
                </div>

                {/* Add to Address Book Button */}
                <div className="flex justify-end">
                  <Button
                    onClick={() => selectedEnquiry && addToAddressBookMutation.mutate(selectedEnquiry)}
                    disabled={addToAddressBookMutation.isPending}
                    variant="outline"
                    size="sm"
                    className="flex items-center space-x-2"
                  >
                    <UserPlus className="w-4 h-4" />
                    <span>
                      {addToAddressBookMutation.isPending ? "Adding..." : "Add to Address Book"}
                    </span>
                  </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {templates.filter(t => t.isAutoRespond).map((template) => (
                    <Button 
                      key={template.id}
                      onClick={() => handleQuickResponse(template.id)}
                      variant="outline"
                      className="p-6 h-auto flex flex-col items-center space-y-2"
                    >
                      <span className="text-lg">📧</span>
                      <span className="font-medium">{template.name}</span>
                      <span className="text-xs text-gray-500 text-center">
                        Apply directly on Encore platform
                      </span>
                    </Button>
                  )}

                  {/* Create Contract Button */}
                  <Link href={`/contracts?action=new&enquiryId=${selectedEnquiry?.id}`}>
                    <Button 
                      variant="outline"
                      className="p-6 h-auto flex flex-col items-center space-y-2 border-purple-200 hover:border-purple-300 hover:bg-purple-50 w-full"
                    >
                      <FileSignature className="w-5 h-5 text-purple-600" />
                      <span className="font-medium">Create Contract</span>
                      <span className="text-xs text-gray-500 text-center">
                        Generate contract with enquiry details
                      </span>
                    </Button>
                  </Link>

                  {/* Mark as Confirmed Button */}
                  <Button 
                    onClick={() => selectedEnquiry && updateEnquiryStatusMutation.mutate({ 
                      id: selectedEnquiry.id, 
                      status: 'confirmed' 
                    })}
                    disabled={updateEnquiryStatusMutation.isPending}
                    variant="outline"
                    className="p-6 h-auto flex flex-col items-center space-y-2 border-green-200 hover:border-green-300 hover:bg-green-50"
                  >
                    <span className="text-lg">✅</span>
                    <span className="font-medium">Mark as Confirmed</span>
                    <span className="text-xs text-gray-500 text-center">
                      {updateEnquiryStatusMutation.isPending ? "Updating..." : "Update enquiry status to confirmed"}
                    </span>
                  </Button>

                  {templates.filter(t => t.isAutoRespond).length === 0 && (
                    <div className="col-span-full text-center py-8">
                      <p className="text-gray-500 mb-4">No auto-respond templates configured</p>
                      <Link href="/templates">
                        <Button variant="outline" size="sm">
                          Configure Templates
                        </Button>
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-4">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Search enquiries..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="new">New</SelectItem>
                  <SelectItem value="qualified">Qualified</SelectItem>
                  <SelectItem value="contract_sent">Contract Sent</SelectItem>
                  <SelectItem value="confirmed">Confirmed</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">
                    <div className="flex items-center space-x-2">
                      <ArrowDown className="w-4 h-4" />
                      <span>Newest First</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="oldest">
                    <div className="flex items-center space-x-2">
                      <ArrowUp className="w-4 h-4" />
                      <span>Oldest First</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="eventDate">
                    <div className="flex items-center space-x-2">
                      <Calendar className="w-4 h-4" />
                      <span>Event Date</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="status">
                    <div className="flex items-center space-x-2">
                      <ArrowUpDown className="w-4 h-4" />
                      <span>Status</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Enquiries List */}
        <div className="space-y-4">
          {sortedEnquiries.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <User className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 text-lg">No enquiries found</p>
                <p className="text-gray-400">Create your first enquiry to get started</p>
                <Button 
                  className="mt-4 bg-purple-600 hover:bg-purple-700"
                  onClick={() => setIsDialogOpen(true)}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create Enquiry
                </Button>
              </CardContent>
            </Card>
          ) : (
            sortedEnquiries.map((enquiry: Enquiry) => {
              const dateBox = formatDateBox(enquiry.eventDate!);
              return (
                <Card key={enquiry.id} className="hover:shadow-md transition-shadow bg-white">
                  <CardContent className="p-6">
                    <div className="relative">
                      <div className="absolute top-0 right-0">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteEnquiry(enquiry)}
                          className="text-red-500 hover:text-red-700 hover:bg-red-50 h-8 w-8 p-0"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>

                      <div className="pr-12 flex gap-6">
                        {/* Date Box - Encore Style */}
                        <div className="flex-shrink-0 w-20 h-20 border-2 border-gray-200 rounded-lg flex flex-col items-center justify-center bg-white">
                          <div className="text-xs text-red-500 font-medium">{dateBox.dayName}</div>
                          <div className="text-2xl font-bold text-gray-900">{dateBox.dayNum}</div>
                          <div className="text-xs text-gray-500">{dateBox.monthYear}</div>
                        </div>

                        {/* Main Content */}
                        <div className="flex-1">
                          {/* Price and Status Row */}
                          <div className="flex items-center justify-between mb-2">
                            <div className="text-2xl font-bold text-green-600">
                              {enquiry.estimatedValue ? `£${enquiry.estimatedValue}` : "Price TBC"}
                            </div>
                            <div className="flex items-center space-x-2">
                              {needsResponse(enquiry) && (
                                <div className="flex items-center space-x-1 bg-red-100 text-red-700 px-2 py-1 rounded-full text-xs">
                                  <AlertCircle className="w-3 h-3" />
                                  <span>Response needed</span>
                                </div>
                              )}
                              {enquiry.applyNowLink && (
                                <Badge className="bg-green-100 text-green-800 hover:bg-green-200">
                                  🎯 ENCORE
                                </Badge>
                              )}
                              <Badge className={getStatusColor(enquiry.status)}>
                                {enquiry.status.replace('_', ' ').toUpperCase()}
                              </Badge>
                            </div>
                          </div>

                          {/* Event Title */}
                          <h3 className="text-xl font-semibold text-gray-900 mb-4">{enquiry.title}</h3>

                          {/* Event Details with Icons */}
                          <div className="space-y-2 mb-4">
                            <div className="flex items-center text-gray-600">
                              <User className="w-4 h-4 mr-2" />
                              <span className="font-medium">{enquiry.clientName}</span>
                              {enquiry.clientEmail && <span className="text-sm ml-2">• {enquiry.clientEmail}</span>}
                            </div>

                            {enquiry.eventTime && (
                              <div className="flex items-center text-gray-600">
                                <Clock className="w-4 h-4 mr-2" />
                                <span>{enquiry.eventTime}</span>
                              </div>
                            )}

                            {enquiry.venue && (
                              <div className="flex items-center text-gray-600">
                                <Calendar className="w-4 h-4 mr-2" />
                                <span>{enquiry.venue}</span>
                              </div>
                            )}

                            {enquiry.gigType && (
                              <div className="flex items-center text-gray-600">
                                <DollarSign className="w-4 h-4 mr-2" />
                                <span>{enquiry.gigType}</span>
                              </div>
                            )}

                            {/* Received Date */}
                            <div className="flex items-center text-gray-500 text-sm mt-2 pt-2 border-t border-gray-100">
                              <Clock className="w-3 h-3 mr-2" />
                              <span>Received: {formatReceivedDate(enquiry.createdAt!)}</span>
                            </div>
                          </div>

                          {/* Notes Section */}
                          {enquiry.notes && (
                            <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                              {(() => {
                                const notes = enquiry.notes || '';

                                // Handle both old and new format
                                let mainNotes = notes;
                                let metadata = '';

                                // Check for old format with "--- Contact Details ---"
                                if (notes.includes('--- Contact Details ---')) {
                                  const sourceMatch = notes.match(/Source: ([^\n]+)/);
                                  const contactMatch = notes.match(/Contact Method: ([^\n]+)/);
                                  mainNotes = notes.replace(/\n*--- Contact Details ---[\s\S]*$/, '').trim();

                                  if (contactMatch) {
                                    metadata = `Contact Method - ${contactMatch[1]}`;
                                  }
                                }
                                // Check for new "Contact Method - Phone" format
                                else if (notes.includes('Contact Method -')) {
                                  const contactMatch = notes.match(/Contact Method - ([^\n]+)/);
                                  mainNotes = notes.replace(/\n\nContact Method -.*$/, '').trim();

                                  if (contactMatch) {
                                    metadata = `Contact Method - ${contactMatch[1]}`;
                                  }
                                }
                                // Check for simple "Source:" format without header
                                else if (notes.includes('Source:')) {
                                  const sourceMatch = notes.match(/Source: ([^\n•]+)/);
                                  const contactMatch = notes.match(/Contact: ([^\n]+)/);
                                  mainNotes = notes.replace(/\n\nSource:.*$/, '').trim();

                                  if (contactMatch) {
                                    metadata = `Contact Method - ${contactMatch[1]}`;
                                  }
                                }
                                // Check for new simple format (just "Email • Phone")
                                else {
                                  const parts = notes.split('\n\n');
                                  if (parts.length > 1) {
                                    const lastPart = parts[parts.length - 1];
                                    if (lastPart.includes('•')) {
                                      mainNotes = parts.slice(0, -1).join('\n\n').trim();
                                      metadata = lastPart;
                                    }
                                  } else if (notes.includes('•') && !notes.includes('\n')) {
                                    // If it's just metadata without main notes
                                    mainNotes = '';
                                    metadata = notes;
                                  }
                                }

                                return (
                                  <div className="space-y-2">
                                    {mainNotes && (
                                      <p className="text-sm text-gray-700">{mainNotes}</p>
                                    )}
                                    {metadata && (
                                      <div className="text-xs text-gray-500 border-t pt-2">
                                        <span>{metadata}</span>
                                      </div>
                                    )}
                                  </div>
                                );
                              })()}
                            </div>
                          )}

                          {/* Response Button */}
                          <div className="mt-4 flex justify-end">
                            <Button
                              onClick={() => {
                                setSelectedEnquiry(enquiry);
                                setRespondDialogOpen(true);
                              }}
                              className="bg-blue-600 hover:bg-blue-700 text-white"
                            >
                              <Reply className="w-4 h-4 mr-2" />
                              Respond
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
          </div>
        </div>
      </div>

      <MobileNav />
    </div>
  );
}{template.subject}</span>
                    </Button>
                  ))}

                  {/* Apply Now Button - Only show for Encore enquiries */}
                  {selectedEnquiry?.applyNowLink && (
                    <Button 
                      onClick={() => selectedEnquiry?.applyNowLink && window.open(selectedEnquiry.applyNowLink, '_blank')}
                      variant="outline"
                      className="p-6 h-auto flex flex-col items-center space-y-2 border-green-200 hover:border-green-300 hover:bg-green-50"
                    >
                      <span className="text-lg">🎯</span>
                      <span className="font-medium">Apply Now</span>
                      <span className="text-xs text-gray-500 text-center">