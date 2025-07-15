import React, { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Search, Filter, MoreHorizontal, FileText, Calendar, DollarSign, User, Eye, Mail, Download, Trash2, Archive, FileDown, CheckSquare, Square, MapPin, Edit, RefreshCw } from "lucide-react";
import type { Contract, Enquiry } from "@shared/schema";
import { insertContractSchema } from "@shared/schema";
import { z } from "zod";
import Sidebar from "@/components/sidebar";
import MobileNav from "@/components/mobile-nav";
import { useResponsive } from "@/hooks/useResponsive";

const contractFormSchema = z.object({
  // Required fields (Musicians' Union minimum)
  contractNumber: z.string().min(1, "Contract number is required"),
  clientName: z.string().min(1, "Client name is required"),
  venue: z.string().min(1, "Venue is required"),
  eventDate: z.string().min(1, "Event date is required"),
  eventTime: z.string().min(1, "Start time is required"),
  eventEndTime: z.string().min(1, "Finish time is required"),
  fee: z.string().min(1, "Performance fee is required"),
  
  // Optional fields (can be filled by musician or marked as client-fillable)
  clientAddress: z.string().optional(),
  clientPhone: z.string().optional(),
  clientEmail: z.string().email("Valid email required").optional().or(z.literal("")),
  venueAddress: z.string().optional(),
  
  // Client-fillable field tracking
  clientFillableFields: z.array(z.string()).optional(),
  
  // System fields
  enquiryId: z.number().optional(),
  status: z.string().default("draft"),
  reminderEnabled: z.boolean().default(false),
  reminderDays: z.number().min(1).max(30).default(3),
});

// Simplified contract form component
const ContractForm = ({ form, onSubmit, editingContract }: any) => {
  const [clientFillableFields, setClientFillableFields] = useState<string[]>([]);

  const handleClientFillableChange = (fieldName: string, checked: boolean) => {
    if (checked) {
      setClientFillableFields(prev => [...prev, fieldName]);
    } else {
      setClientFillableFields(prev => prev.filter(name => name !== fieldName));
    }
    form.setValue('clientFillableFields', clientFillableFields);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 pt-4">
        
        {/* Essential Contract Details */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-900">Essential Details</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField
              control={form.control}
              name="contractNumber"
              render={({ field }) => (
                <FormItem className="space-y-2">
                  <FormLabel>Contract Number</FormLabel>
                  <FormControl>
                    <Input placeholder="CT-2024-001" {...field} value={field.value || ""} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="clientName"
              render={({ field }) => (
                <FormItem className="space-y-2">
                  <FormLabel>Client Name</FormLabel>
                  <FormControl>
                    <Input placeholder="John Smith" {...field} value={field.value || ""} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField
              control={form.control}
              name="venue"
              render={({ field }) => (
                <FormItem className="space-y-2">
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
              name="eventDate"
              render={({ field }) => (
                <FormItem className="space-y-2">
                  <FormLabel>Event Date</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} value={field.value || ""} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <FormField
              control={form.control}
              name="eventTime"
              render={({ field }) => (
                <FormItem className="space-y-2">
                  <FormLabel>Start Time</FormLabel>
                  <FormControl>
                    <Input placeholder="7:00 PM" {...field} value={field.value || ""} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="eventEndTime"
              render={({ field }) => (
                <FormItem className="space-y-2">
                  <FormLabel>Finish Time</FormLabel>
                  <FormControl>
                    <Input placeholder="11:00 PM" {...field} value={field.value || ""} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="fee"
              render={({ field }) => (
                <FormItem className="space-y-2">
                  <FormLabel>Performance Fee (£)</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="1500" {...field} value={field.value || ""} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* Optional Client Details */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-900">Client Details</h3>
          <p className="text-sm text-gray-600">Fill these now or mark them as client-fillable for the client to complete during signing.</p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <FormField
                control={form.control}
                name="clientEmail"
                render={({ field }) => (
                  <FormItem className="space-y-2">
                    <FormLabel>Client Email</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="client@example.com" {...field} value={field.value || ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="clientEmail-fillable"
                  checked={clientFillableFields.includes('clientEmail')}
                  onCheckedChange={(checked) => handleClientFillableChange('clientEmail', checked as boolean)}
                />
                <label htmlFor="clientEmail-fillable" className="text-sm text-gray-600">
                  Client must fill this field
                </label>
              </div>
            </div>

            <div className="space-y-2">
              <FormField
                control={form.control}
                name="clientPhone"
                render={({ field }) => (
                  <FormItem className="space-y-2">
                    <FormLabel>Client Phone</FormLabel>
                    <FormControl>
                      <Input placeholder="07123 456789" {...field} value={field.value || ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="clientPhone-fillable"
                  checked={clientFillableFields.includes('clientPhone')}
                  onCheckedChange={(checked) => handleClientFillableChange('clientPhone', checked as boolean)}
                />
                <label htmlFor="clientPhone-fillable" className="text-sm text-gray-600">
                  Client must fill this field
                </label>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <FormField
              control={form.control}
              name="clientAddress"
              render={({ field }) => (
                <FormItem className="space-y-2">
                  <FormLabel>Client Address</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Client's full address" 
                      {...field} 
                      value={field.value || ""} 
                      rows={2}
                      className="min-h-[60px]"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex items-center space-x-2">
              <Checkbox
                id="clientAddress-fillable"
                checked={clientFillableFields.includes('clientAddress')}
                onCheckedChange={(checked) => handleClientFillableChange('clientAddress', checked as boolean)}
              />
              <label htmlFor="clientAddress-fillable" className="text-sm text-gray-600">
                Client must fill this field
              </label>
            </div>
          </div>

          <div className="space-y-2">
            <FormField
              control={form.control}
              name="venueAddress"
              render={({ field }) => (
                <FormItem className="space-y-2">
                  <FormLabel>Venue Address</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Full venue address" 
                      {...field} 
                      value={field.value || ""} 
                      rows={2}
                      className="min-h-[60px]"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex items-center space-x-2">
              <Checkbox
                id="venueAddress-fillable"
                checked={clientFillableFields.includes('venueAddress')}
                onCheckedChange={(checked) => handleClientFillableChange('venueAddress', checked as boolean)}
              />
              <label htmlFor="venueAddress-fillable" className="text-sm text-gray-600">
                Client must fill this field
              </label>
            </div>
          </div>
        </div>

        {/* Automatic Reminders */}
        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <FormField
              control={form.control}
              name="reminderEnabled"
              render={({ field }) => (
                <FormItem className="flex items-center space-x-2">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <FormLabel className="text-sm font-normal">
                    Enable automatic reminders if contract is not signed
                  </FormLabel>
                </FormItem>
              )}
            />
          </div>
          
          {form.watch('reminderEnabled') && (
            <FormField
              control={form.control}
              name="reminderDays"
              render={({ field }) => (
                <FormItem className="space-y-2">
                  <FormLabel>Reminder Frequency</FormLabel>
                  <FormControl>
                    <Select value={field.value.toString()} onValueChange={(value) => field.onChange(parseInt(value))}>
                      <SelectTrigger className="w-48">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">Daily</SelectItem>
                        <SelectItem value="3">Every 3 days</SelectItem>
                        <SelectItem value="5">Every 5 days</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}
        </div>

        <div className="flex justify-end space-x-2 pt-4">
          <Button type="button" variant="outline" onClick={() => window.location.reload()}>
            Cancel
          </Button>
          <Button type="submit" className="bg-purple-600 hover:bg-purple-700">
            {editingContract ? 'Update Contract' : 'Generate Contract'}
          </Button>
        </div>
      </form>
    </Form>
  );
};

export default ContractForm;