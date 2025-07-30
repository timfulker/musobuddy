import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Calendar, MessageSquare, Plus, CheckCircle, Home, Crown } from "lucide-react";
import { Link } from "wouter";
import { insertEnquirySchema } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { COMMON_GIG_TYPES } from "@shared/gig-types";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";

const quickAddFormSchema = z.object({
  clientName: z.string().optional(),
  clientEmail: z.string().email().optional().or(z.literal("")),
  clientPhone: z.string().optional(),
  eventDate: z.string().optional(),
  venue: z.string().optional(),
  estimatedValue: z.string().optional(),
  notes: z.string().optional(),
  source: z.string().optional(),
  contactMethod: z.string().optional(),
  gigType: z.string().optional(),
});

type QuickAddFormData = z.infer<typeof quickAddFormSchema>;

export default function QuickAddPage() {
  const [isSubmitted, setIsSubmitted] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();
  
  // Get existing bookings for context
  const { data: bookings = [] } = useQuery({
    queryKey: ['/api/bookings'],
  });
  
  const bookingsArray = Array.isArray(bookings) ? bookings : [];

  const form = useForm<QuickAddFormData>({
    resolver: zodResolver(quickAddFormSchema),
    defaultValues: {
      clientName: "",
      clientEmail: "",
      clientPhone: "",
      eventDate: "",
      venue: "",
      estimatedValue: "",
      notes: "",
      source: "",
      contactMethod: "",
      gigType: "",
    },
  });

  const createEnquiryMutation = useMutation({
    mutationFn: async (data: QuickAddFormData) => {
      const enquiryData = {
        title: `Enquiry from ${data.clientName}`,
        clientName: data.clientName,
        clientEmail: data.clientEmail || null,
        clientPhone: data.clientPhone || null,
        eventDate: data.eventDate ? new Date(data.eventDate) : new Date(),
        venue: data.venue || null,
        estimatedValue: data.estimatedValue ? parseFloat(data.estimatedValue) : null,
        notes: data.notes ? `${data.notes}\n\nContact Method - ${data.contactMethod || 'Not specified'}` : `Contact Method - ${data.contactMethod || 'Not specified'}`,
        status: "new" as const,
      };
      const response = await apiRequest('POST', '/api/enquiries/quick-add', enquiryData);
      return await response.json();
    },
    onSuccess: () => {
      setIsSubmitted(true);
      toast({
        title: "Success!",
        description: "Enquiry has been added to your system",
      });
    },
    onError: (error) => {
      console.error("Quick Add Error:", error);
      toast({
        title: "Error",
        description: "Failed to add enquiry. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: QuickAddFormData) => {
    createEnquiryMutation.mutate(data);
  };

  const handleAddAnother = () => {
    setIsSubmitted(false);
    form.reset();
  };

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900">Enquiry Added!</h2>
              <p className="text-gray-600">
                Your booking enquiry has been successfully added to MusoBuddy.
              </p>
              <div className="space-y-2">
                <Button onClick={handleAddAnother} className="w-full">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Another Enquiry
                </Button>
                <Link href="/">
                  <Button variant="outline" className="w-full">
                    <Home className="w-4 h-4 mr-2" />
                    Go to Dashboard
                  </Button>
                </Link>
                <Button 
                  variant="ghost" 
                  onClick={() => window.close()} 
                  className="w-full text-gray-500"
                >
                  Close
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Quick Add Enquiry</h1>
          <p className="text-gray-600">Add a new booking enquiry to your MusoBuddy system</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5" />
              Enquiry Details
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="clientName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Client Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter client name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="source"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Source</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Where did this enquiry come from?" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="WhatsApp">WhatsApp</SelectItem>
                            <SelectItem value="SMS">SMS</SelectItem>
                            <SelectItem value="Phone Call">Phone Call</SelectItem>
                            <SelectItem value="Email">Email</SelectItem>
                            <SelectItem value="In Person">In Person</SelectItem>
                            <SelectItem value="Social Media">Social Media</SelectItem>
                            <SelectItem value="Website">Website</SelectItem>
                            <SelectItem value="Referral">Referral</SelectItem>
                            <SelectItem value="Other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="contactMethod"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Contact Method</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="How to contact them?" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Phone">Phone</SelectItem>
                            <SelectItem value="WhatsApp">WhatsApp</SelectItem>
                            <SelectItem value="Email">Email</SelectItem>
                            <SelectItem value="SMS">SMS</SelectItem>
                            <SelectItem value="Social Media">Social Media</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="clientPhone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone Number</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter phone number" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="clientEmail"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email Address</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="Enter email address" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="gigType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Type of Gig</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="What type of performance?" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {COMMON_GIG_TYPES.map((gigType, index) => (
                              <SelectItem key={index} value={gigType}>
                                {gigType}
                              </SelectItem>
                            ))}
                            <SelectItem value="Other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                    name="venue"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Venue</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter venue name" {...field} />
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
                        <FormLabel>Price Quoted</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            placeholder="£0" 
                            step="0.01"
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Message / Notes</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Enter the original enquiry message or any additional notes..." 
                          className="min-h-[100px]"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button 
                  type="submit" 
                  className="w-full" 
                  disabled={createEnquiryMutation.isPending}
                >
                  {createEnquiryMutation.isPending ? "Adding Enquiry..." : "Add Enquiry"}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>

        <div className="mt-6 p-4 bg-blue-50 rounded-lg">
          <h3 className="font-semibold text-blue-900 mb-2">💡 Pro Tip</h3>
          <p className="text-blue-800 text-sm">
            Save this page as a home screen shortcut for quick access when you receive enquiries on the go!
          </p>
        </div>
      </div>
    </div>
  );
}