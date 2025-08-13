import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useParams } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Bot, MessageSquare, CheckCircle, ExternalLink, AlertCircle } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";

const widgetFormSchema = z.object({
  messageText: z.string().min(10, "Message must be at least 10 characters long"),
  clientContact: z.string().min(1, "Please specify who this message is from"),
  clientAddress: z.string().optional(),
});

type WidgetFormData = z.infer<typeof widgetFormSchema>;

export default function QuickAddWidget() {
  const { token } = useParams();
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [tokenValid, setTokenValid] = useState<boolean | null>(null);
  const [userName, setUserName] = useState<string>("");
  const { toast } = useToast();

  const form = useForm<WidgetFormData>({
    resolver: zodResolver(widgetFormSchema),
    defaultValues: {
      messageText: "",
      clientContact: "",
      clientAddress: "",
    },
  });

  // Verify token on page load
  useEffect(() => {
    if (!token) {
      setTokenValid(false);
      return;
    }

    const verifyToken = async () => {
      try {
        const response = await apiRequest(`/api/widget/verify/${token}`, {
          method: 'GET',
        });
        const data = await response.json();
        
        if (data.valid) {
          setTokenValid(true);
          setUserName(data.userName || "User");
        } else {
          setTokenValid(false);
        }
      } catch (error) {
        console.error("Token verification failed:", error);
        setTokenValid(false);
      }
    };

    verifyToken();
  }, [token]);

  const parseMessageMutation = useMutation({
    mutationFn: async (data: WidgetFormData) => {
      setIsParsing(true);
      
      // Extract client name from contact info
      const clientName = data.clientContact.includes('@') 
        ? data.clientContact.split('@')[0] 
        : data.clientContact.split(' ')[0] || data.clientContact;
      
      const parseData = {
        messageText: data.messageText,
        clientName: clientName,
        clientContact: data.clientContact,
        eventDate: null, // Let AI extract from messageText
        venue: null, // Let AI extract from messageText
        token: token
      };
      
      const response = await apiRequest('/api/widget/hybrid-submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parseData)
      });
      return await response.json();
    },
    onSuccess: (parsedBooking) => {
      setIsSubmitted(true);
      setIsParsing(false);
      toast({
        title: "Success!",
        description: "Message parsed and booking created successfully",
      });
    },
    onError: (error) => {
      console.error("Widget Parse Error:", error);
      setIsParsing(false);
      toast({
        title: "Error",
        description: "Failed to parse message. Please check the text and try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: WidgetFormData) => {
    parseMessageMutation.mutate(data);
  };

  const handleParseAnother = () => {
    setIsSubmitted(false);
    form.reset();
  };

  // Loading state while verifying token
  if (tokenValid === null) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Verifying access...</p>
        </div>
      </div>
    );
  }

  // Invalid token
  if (tokenValid === false) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                <AlertCircle className="w-8 h-8 text-red-600" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900">Invalid Access</h2>
              <p className="text-gray-600">
                This booking widget link is not valid or has expired.
              </p>
              <p className="text-sm text-gray-500">
                Please contact the musician to get a valid booking link.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Success page
  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900">Booking Request Sent!</h2>
              <p className="text-gray-600">
                Your message has been received by {userName}. They will review your booking request and get back to you soon.
              </p>
              <div className="space-y-2">
                <Button onClick={handleParseAnother} className="w-full">
                  <Bot className="w-4 h-4 mr-2" />
                  Send Another Message
                </Button>
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

  // Main widget form
  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Send Booking Request to {userName}</h1>
          <p className="text-gray-600">Share your event details, and they'll get back to you with availability and pricing</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5" />
              Event Details & Message
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="messageText"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Your Message</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Tell us about your event - date and rough area/venue would be helpful..."
                          className="min-h-[120px]"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="clientContact"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Your Name & Contact</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Your name (email or phone number)"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="clientAddress"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Event Location (Optional)</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="City or venue address"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  disabled={isParsing}
                  className="w-full"
                >
                  {isParsing ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                      Processing Request...
                    </>
                  ) : (
                    <>
                      <Bot className="w-4 h-4 mr-2" />
                      Send Booking Request
                    </>
                  )}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>

        <div className="text-center mt-6">
          <p className="text-sm text-gray-500">
            Powered by{" "}
            <a 
              href="https://musobuddy.com" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-800 inline-flex items-center gap-1"
            >
              MusoBuddy <ExternalLink className="w-3 h-3" />
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}