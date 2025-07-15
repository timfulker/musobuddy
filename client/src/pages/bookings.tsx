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
import { insertBookingSchema, type Booking } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Plus, Search, Filter, DollarSign, Clock, Calendar, User, Edit, Trash2, Reply, AlertCircle, CheckCircle, UserPlus, ArrowUpDown, ArrowUp, ArrowDown, FileSignature, Info, FileText } from "lucide-react";
import { z } from "zod";
import { insertClientSchema, type InsertClient } from "@shared/schema";
import { Link } from "wouter";
import Sidebar from "@/components/sidebar";
import MobileNav from "@/components/mobile-nav";
import { useResponsive } from "@/hooks/useResponsive";
import BookingStatusDialog from "@/components/BookingStatusDialog";
import { BookingDetailsDialog } from "@/components/BookingDetailsDialog";
import { SendComplianceDialog } from "@/components/SendComplianceDialog";
import { 
  analyzeConflictSeverity, 
  getConflictCardStyling, 
  getConflictBadge, 
  parseConflictAnalysis, 
  getConflictActions, 
  formatConflictTooltip 
} from "@/utils/conflict-ui";

const bookingFormSchema = insertBookingSchema.extend({
  eventDate: z.string().optional(),
}).omit({
  userId: true,
  title: true, // Remove title from validation since we auto-generate it
});

export default function Bookings() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("newest"); // newest, oldest, eventDate, status
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [respondDialogOpen, setRespondDialogOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [bookingStatusDialogOpen, setBookingStatusDialogOpen] = useState(false);
  const [selectedBookingForUpdate, setSelectedBookingForUpdate] = useState<any>(null);
  const [bookingDetailsDialogOpen, setBookingDetailsDialogOpen] = useState(false);
  const [selectedBookingForDetails, setSelectedBookingForDetails] = useState<any>(null);
  const [complianceDialogOpen, setComplianceDialogOpen] = useState(false);
  const [selectedBookingForCompliance, setSelectedBookingForCompliance] = useState<any>(null);
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

  const { data: bookings = [], isLoading, error } = useQuery<Booking[]>({
    queryKey: ["/api/bookings"],
  });

  const { data: templates = [] } = useQuery({
    queryKey: ["/api/templates"],
  });

  const { data: settings = {} } = useQuery({
    queryKey: ["/api/settings"],
  });

