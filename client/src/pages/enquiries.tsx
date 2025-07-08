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
import { Plus, Search, Filter, DollarSign, Clock, Calendar, ArrowLeft, User, Edit, Trash2, Reply } from "lucide-react";
import { z } from "zod";
import { Link } from "wouter";

const enquiryFormSchema = insertEnquirySchema.extend({
  eventDate: z.string().optional(),
}).omit({
  userId: true,
});

export default function Enquiries() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [respondDialogOpen, setRespondDialogOpen] = useState(false);
  const [selectedEnquiry, setSelectedEnquiry] = useState<Enquiry | null>(null);
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

  const { data: enquiries = [], isLoading } = useQuery<Enquiry[]>({
    queryKey: ["/api/enquiries"],
  });

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
      const response = await apiRequest('DELETE', `/api/enquiries/${id}`);
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

  const handleDeleteEnquiry = (enquiry: Enquiry) => {
    if (window.confirm(`Are you sure you want to delete the enquiry "${enquiry.title}"? This action cannot be undone.`)) {
      deleteEnquiryMutation.mutate(enquiry.id);
    }
  };

  const handleQuickResponse = async (templateType: string) => {
    if (!selectedEnquiry?.clientEmail && !selectedEnquiry?.clientPhone) {
      toast({
        title: "Error",
        description: "This enquiry has no email address or phone number to respond to.",
        variant: "destructive",
      });
      return;
    }

    // Get user settings for signature
    const userSettings = await fetch('/api/user/settings').then(res => res.json());
    const userName = userSettings?.emailFromName || userSettings?.businessName || "MusoBuddy User";
    
    // Default templates
    const templates = {
      decline: {
        subject: "Re: Your Enquiry - Unfortunately Not Available",
        body: `Dear ${selectedEnquiry.clientName},\n\nThank you for your enquiry regarding ${selectedEnquiry.title}.\n\nI appreciate you thinking of me for your event. Unfortunately, I am not available for your requested date.\n\nI hope you find a fantastic musician for your event, and I wish you all the best.\n\nKind regards,\n${userName}`,
        smsBody: `Hi ${selectedEnquiry.clientName}, thanks for your enquiry. Unfortunately I'm not available for your requested date. Hope you find someone great for your event!`
      },
      more_info: {
        subject: "Re: Your Enquiry - Need More Information",
        body: `Dear ${selectedEnquiry.clientName},\n\nThank you for your enquiry regarding ${selectedEnquiry.title}.\n\nI'd be delighted to help make your event special! To provide you with an accurate quote and ensure I can meet your needs, could you please provide:\n\n• Event date and time\n• Venue location\n• Number of guests expected\n• Specific music requirements\n• Duration of performance needed\n\nI look forward to hearing from you soon.\n\nBest regards,\n${userName}`,
        smsBody: `Hi ${selectedEnquiry.clientName}, thanks for your enquiry! I'd love to help with your event. Could you send me: date/time, venue, guest count, and music requirements? Thanks!`
      },
      available: {
        subject: "Re: Your Enquiry - Available and Interested!",
        body: `Dear ${selectedEnquiry.clientName},\n\nThank you for your enquiry regarding ${selectedEnquiry.title}.\n\nI'm pleased to confirm that I am available for your event and would be delighted to perform for you.\n\nTo proceed with a formal quote, I'll need a few more details:\n\n• Exact venue address\n• Performance duration required\n• Any specific music requests\n• Setup requirements\n\nI look forward to discussing your event further.\n\nBest regards,\n${userName}`,
        smsBody: `Hi ${selectedEnquiry.clientName}, great news - I'm available for your event! I'd love to perform for you. Can you send venue address, duration needed, and any music requests? Thanks!`
      }
    };

    const template = templates[templateType as keyof typeof templates];
    
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
              body: template.body
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
      // Handle custom response - could open a compose dialog
      toast({
        title: "Coming Soon",
        description: "Custom response editor will be available soon.",
      });
    }
  };

  const form = useForm<z.infer<typeof enquiryFormSchema>>({
    resolver: zodResolver(enquiryFormSchema),
    defaultValues: {
      title: "",
      clientName: "",
      clientEmail: "",
      clientPhone: "",
      eventDate: "",
      eventTime: "",
      venue: "",
      eventType: "",
      estimatedValue: "",
      notes: "",
      status: "new",
    },
  });

  const onSubmit = (data: z.infer<typeof enquiryFormSchema>) => {
    createEnquiryMutation.mutate(data);
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

  const filteredEnquiries = enquiries.filter((enquiry: Enquiry) => {
    const matchesSearch = searchQuery === "" || 
      enquiry.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      enquiry.clientName.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || enquiry.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link href="/">
              <Button variant="outline" size="sm" className="bg-white border-purple-200 text-purple-700 hover:bg-purple-50 hover:border-purple-300">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Dashboard
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Enquiries</h1>
              <p className="text-gray-600">Manage your client enquiries and track your pipeline</p>
            </div>
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
                      name="title"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Event Title</FormLabel>
                          <FormControl>
                            <Input placeholder="Wedding reception, Corporate event..." {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
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
                              <SelectItem value="wedding">Wedding</SelectItem>
                              <SelectItem value="corporate">Corporate</SelectItem>
                              <SelectItem value="private_party">Private Party</SelectItem>
                              <SelectItem value="concert">Concert</SelectItem>
                              <SelectItem value="other">Other</SelectItem>
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
                            <Input placeholder="7:00 PM" {...field} value={field.value || ""} />
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
                          <FormLabel>Estimated Value (£)</FormLabel>
                          <FormControl>
                            <Input type="number" placeholder="500" {...field} value={field.value || ""} />
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
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Button 
                    onClick={() => handleQuickResponse('decline')}
                    variant="outline"
                    className="p-6 h-auto flex flex-col items-center space-y-2"
                  >
                    <span className="text-lg">📧</span>
                    <span className="font-medium">Polite Decline</span>
                    <span className="text-xs text-gray-500">Send a professional decline email</span>
                  </Button>
                  
                  <Button 
                    onClick={() => handleQuickResponse('more_info')}
                    variant="outline"
                    className="p-6 h-auto flex flex-col items-center space-y-2"
                  >
                    <span className="text-lg">❓</span>
                    <span className="font-medium">Request More Info</span>
                    <span className="text-xs text-gray-500">Ask for additional details</span>
                  </Button>
                  
                  <Button 
                    onClick={() => handleQuickResponse('available')}
                    variant="outline"
                    className="p-6 h-auto flex flex-col items-center space-y-2"
                  >
                    <span className="text-lg">✅</span>
                    <span className="font-medium">Confirm Available</span>
                    <span className="text-xs text-gray-500">Confirm availability & request details</span>
                  </Button>
                  
                  <Button 
                    onClick={() => handleQuickResponse('custom')}
                    variant="outline"
                    className="p-6 h-auto flex flex-col items-center space-y-2"
                  >
                    <span className="text-lg">✏️</span>
                    <span className="font-medium">Custom Reply</span>
                    <span className="text-xs text-gray-500">Write a custom response</span>
                  </Button>
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
            </div>
          </CardContent>
        </Card>

        {/* Enquiries List */}
        <div className="space-y-4">
          {filteredEnquiries.length === 0 ? (
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
            filteredEnquiries.map((enquiry: Enquiry) => (
              <Card key={enquiry.id} className="hover:shadow-md transition-shadow">
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
                    
                    <div className="pr-12">
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900">{enquiry.title}</h3>
                        <Badge className={getStatusColor(enquiry.status)}>
                          {enquiry.status.replace('_', ' ').toUpperCase()}
                        </Badge>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm text-gray-600">
                        <div>
                          <p className="font-medium">Client</p>
                          <p>{enquiry.clientName}</p>
                          {enquiry.clientEmail && <p className="text-xs">{enquiry.clientEmail}</p>}
                          {enquiry.clientPhone && <p className="text-xs">{enquiry.clientPhone}</p>}
                        </div>
                        
                        <div>
                          <p className="font-medium">Event Date</p>
                          <p className="flex items-center">
                            <Calendar className="w-3 h-3 mr-1" />
                            {formatDate(enquiry.eventDate!)}
                          </p>
                          {enquiry.eventTime && <p className="text-xs">{enquiry.eventTime}</p>}
                        </div>
                        
                        <div>
                          <p className="font-medium">Price quoted</p>
                          <p className="flex items-center">
                            <DollarSign className="w-3 h-3 mr-1" />
                            £{enquiry.estimatedValue || "TBC"}
                          </p>
                          {enquiry.venue && <p className="text-xs">{enquiry.venue}</p>}
                        </div>
                        
                        <div>
                          <p className="font-medium">Created</p>
                          <p className="flex items-center">
                            <Clock className="w-3 h-3 mr-1" />
                            {formatTime(enquiry.createdAt!)}
                          </p>
                        </div>
                      </div>
                      
                      {enquiry.notes && (
                        <div className="mt-3 p-3 bg-gray-50 rounded-lg">
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
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
}