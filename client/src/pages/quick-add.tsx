import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Bot, MessageSquare, CheckCircle, Home, Sparkles } from "lucide-react";
import { Link } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { z } from "zod";

const textParseFormSchema = z.object({
  messageText: z.string().min(10, "Message must be at least 10 characters long"),
  clientContact: z.string().min(1, "Please specify who this message is from"),
  clientAddress: z.string().optional(),
});

type TextParseFormData = z.infer<typeof textParseFormSchema>;

export default function QuickAddPage() {
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  const form = useForm<TextParseFormData>({
    resolver: zodResolver(textParseFormSchema),
    defaultValues: {
      messageText: "",
      clientContact: "",
      clientAddress: "",
    },
  });

  const parseMessageMutation = useMutation({
    mutationFn: async (data: TextParseFormData) => {
      setIsParsing(true);
      
      // Use the existing email parsing API to extract booking details
      const parseData = {
        emailContent: data.messageText,
        fromEmail: data.clientContact,
        clientAddress: data.clientAddress || null
      };
      
      const response = await apiRequest('POST', '/api/bookings/parse-text', parseData);
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
      console.error("Text Parse Error:", error);
      setIsParsing(false);
      toast({
        title: "Error",
        description: "Failed to parse message. Please check the text and try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: TextParseFormData) => {
    parseMessageMutation.mutate(data);
  };

  const handleParseAnother = () => {
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
              <h2 className="text-xl font-semibold text-gray-900">Booking Created!</h2>
              <p className="text-gray-600">
                Your message has been parsed and a booking created successfully.
              </p>
              <div className="space-y-2">
                <Button onClick={handleParseAnother} className="w-full">
                  <Bot className="w-4 h-4 mr-2" />
                  Parse Another Message
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
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Parse Message to Booking</h1>
          <p className="text-gray-600">Paste WhatsApp messages, emails, or text enquiries to automatically create bookings</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5" />
              AI Message Parser
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
                      <FormLabel>Message to Parse</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Paste WhatsApp message, email, or text enquiry here...

Example:
'Hi Tim, we'd love to book you for our wedding on June 15th at The Manor House. Looking for ceremony music from 2-4pm. What would be your fee? Thanks, Sarah & John (07123 456789)'"
                          className="min-h-[200px]"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="clientContact"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Who is this message from?</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="e.g., Sarah & John, wedding@venue.com, +447123456789"
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
                        <FormLabel>Client Address (Optional)</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Client's address if known"
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <Button 
                  type="submit" 
                  className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700" 
                  disabled={isParsing || parseMessageMutation.isPending}
                >
                  {isParsing ? (
                    <>
                      <Bot className="w-4 h-4 mr-2 animate-spin" />
                      Parsing Message...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" />
                      Parse & Create Booking
                    </>
                  )}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>

        <div className="mt-6 p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
          <h3 className="font-semibold text-purple-900 dark:text-purple-100 mb-2">✨ How It Works</h3>
          <p className="text-purple-800 dark:text-purple-200 text-sm">
            Our AI will extract client details, dates, venues, and requirements from your message to automatically create a structured booking.
          </p>
        </div>
      </div>
    </div>
  );
}