import React, { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Calendar, Search, Plus, Clock, User, PoundSterling, MapPin, Filter, ChevronDown, Settings, TrendingUp, AlertCircle, CheckCircle, XCircle } from "lucide-react";
import { useLocation, Link } from "wouter";
import Sidebar from "@/components/sidebar";
import MobileNav from "@/components/mobile-nav";
import { useResponsive } from "@/hooks/useResponsive";
import { useAuth } from "@/hooks/useAuth";
import type { Enquiry } from "@shared/schema";

export default function BookingsRedesigned() {
  const { user } = useAuth();
  const { isDesktop, isMobile } = useResponsive();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showFilters, setShowFilters] = useState(false);
  const { toast } = useToast();

  // Fetch bookings data
  const { data: bookings = [], isLoading } = useQuery({
    queryKey: ["/api/bookings"],
  });

  // Helper functions
  const getStatusColor = (status: string) => {
    switch (status) {
      case "new": return "bg-blue-100 text-blue-800 border-blue-200";
      case "in_progress": return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "client_confirms": return "bg-orange-100 text-orange-800 border-orange-200";
      case "confirmed": return "bg-green-100 text-green-800 border-green-200";
      case "completed": return "bg-gray-100 text-gray-800 border-gray-200";
      case "rejected": return "bg-red-100 text-red-800 border-red-200";
      default: return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "new": return <AlertCircle className="w-4 h-4" />;
      case "confirmed": return <CheckCircle className="w-4 h-4" />;
      case "rejected": return <XCircle className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "No date set";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-GB", {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatTime = (timeString: string) => {
    if (!timeString) return "Time TBC";
    return timeString;
  };

  // Filter bookings
  const filteredBookings = bookings.filter((booking: any) => {
    const matchesSearch = searchQuery === "" || 
      booking.clientName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      booking.venue?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      booking.title?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === "all" || booking.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  // Categorize bookings by urgency
  const today = new Date();
  const oneWeekFromNow = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
  const oneMonthFromNow = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);

  const categorizedBookings = {
    urgent: filteredBookings.filter((booking: any) => {
      const eventDate = new Date(booking.eventDate);
      return eventDate <= oneWeekFromNow && booking.status !== "completed" && booking.status !== "rejected";
    }),
    upcoming: filteredBookings.filter((booking: any) => {
      const eventDate = new Date(booking.eventDate);
      return eventDate > oneWeekFromNow && eventDate <= oneMonthFromNow && booking.status !== "completed" && booking.status !== "rejected";
    }),
    future: filteredBookings.filter((booking: any) => {
      const eventDate = new Date(booking.eventDate);
      return eventDate > oneMonthFromNow && booking.status !== "completed" && booking.status !== "rejected";
    }),
    completed: filteredBookings.filter((booking: any) => booking.status === "completed" || booking.status === "rejected")
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      {isDesktop && <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />}
      
      <div className={`flex-1 transition-all duration-300 ${isDesktop && sidebarOpen ? 'ml-64' : ''}`}>
        <div className="p-4 lg:p-8">
          
          {/* Hero Section */}
          <div className="mb-8">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Your Bookings</h1>
                <p className="text-gray-600 mt-1">Manage your events and client communications</p>
              </div>
              <Button asChild className="bg-primary hover:bg-primary/90 w-fit">
                <Link href="/new-booking">
                  <Plus className="w-4 h-4 mr-2" />
                  New Booking
                </Link>
              </Button>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-blue-100 text-sm">This Week</p>
                      <p className="text-2xl font-bold">{categorizedBookings.urgent.length}</p>
                    </div>
                    <AlertCircle className="w-8 h-8 text-blue-200" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-green-100 text-sm">Confirmed</p>
                      <p className="text-2xl font-bold">
                        {filteredBookings.filter((b: any) => b.status === "confirmed").length}
                      </p>
                    </div>
                    <CheckCircle className="w-8 h-8 text-green-200" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-r from-orange-500 to-orange-600 text-white">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-orange-100 text-sm">Pending</p>
                      <p className="text-2xl font-bold">
                        {filteredBookings.filter((b: any) => b.status === "in_progress" || b.status === "new").length}
                      </p>
                    </div>
                    <Clock className="w-8 h-8 text-orange-200" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-r from-purple-500 to-purple-600 text-white">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-purple-100 text-sm">Total Revenue</p>
                      <p className="text-2xl font-bold">
                        £{filteredBookings.reduce((sum: number, b: any) => sum + (parseFloat(b.fee) || 0), 0).toLocaleString()}
                      </p>
                    </div>
                    <TrendingUp className="w-8 h-8 text-purple-200" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Search and Filter Bar */}
            <div className="flex flex-col lg:flex-row gap-4 mb-6">
              <div className="flex-1">
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <Input
                    placeholder="Search bookings, clients, venues..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              
              <div className="flex gap-2">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="All Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="new">New</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="confirmed">Confirmed</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>

                <Button 
                  variant="outline" 
                  onClick={() => setShowFilters(!showFilters)}
                  className="px-3"
                >
                  <Filter className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Booking Sections */}
          <div className="space-y-8">
            
            {/* Urgent - This Week */}
            {categorizedBookings.urgent.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <AlertCircle className="w-5 h-5 text-red-500" />
                  <h2 className="text-xl font-semibold text-gray-900">Urgent - This Week</h2>
                  <Badge className="bg-red-100 text-red-800">{categorizedBookings.urgent.length}</Badge>
                </div>
                <div className="grid gap-4">
                  {categorizedBookings.urgent.map((booking: any) => (
                    <BookingCard key={booking.id} booking={booking} urgent={true} />
                  ))}
                </div>
              </div>
            )}

            {/* Upcoming - Next Month */}
            {categorizedBookings.upcoming.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <Calendar className="w-5 h-5 text-blue-500" />
                  <h2 className="text-xl font-semibold text-gray-900">Upcoming - Next Month</h2>
                  <Badge className="bg-blue-100 text-blue-800">{categorizedBookings.upcoming.length}</Badge>
                </div>
                <div className="grid gap-4">
                  {categorizedBookings.upcoming.map((booking: any) => (
                    <BookingCard key={booking.id} booking={booking} />
                  ))}
                </div>
              </div>
            )}

            {/* Future Bookings */}
            {categorizedBookings.future.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <Clock className="w-5 h-5 text-gray-500" />
                  <h2 className="text-xl font-semibold text-gray-900">Future Bookings</h2>
                  <Badge className="bg-gray-100 text-gray-800">{categorizedBookings.future.length}</Badge>
                </div>
                <div className="grid gap-4">
                  {categorizedBookings.future.map((booking: any) => (
                    <BookingCard key={booking.id} booking={booking} />
                  ))}
                </div>
              </div>
            )}

            {/* Completed/Rejected */}
            {categorizedBookings.completed.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <CheckCircle className="w-5 h-5 text-gray-400" />
                  <h2 className="text-xl font-semibold text-gray-900">Completed & Rejected</h2>
                  <Badge className="bg-gray-100 text-gray-800">{categorizedBookings.completed.length}</Badge>
                </div>
                <div className="grid gap-4">
                  {categorizedBookings.completed.map((booking: any) => (
                    <BookingCard key={booking.id} booking={booking} />
                  ))}
                </div>
              </div>
            )}

            {/* No Bookings State */}
            {filteredBookings.length === 0 && !isLoading && (
              <Card className="py-12">
                <CardContent className="text-center">
                  <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No bookings found</h3>
                  <p className="text-gray-600 mb-4">Get started by creating your first booking</p>
                  <Button asChild className="bg-primary hover:bg-primary/90">
                    <Link href="/new-booking">
                      <Plus className="w-4 h-4 mr-2" />
                      Create Booking
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
      {isMobile && <MobileNav />}
    </div>
  );
}

// Individual Booking Card Component
function BookingCard({ booking, urgent = false }: { booking: any; urgent?: boolean }) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case "new": return "bg-blue-100 text-blue-800 border-blue-200";
      case "in_progress": return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "client_confirms": return "bg-orange-100 text-orange-800 border-orange-200";
      case "confirmed": return "bg-green-100 text-green-800 border-green-200";
      case "completed": return "bg-gray-100 text-gray-800 border-gray-200";
      case "rejected": return "bg-red-100 text-red-800 border-red-200";
      default: return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "new": return <AlertCircle className="w-4 h-4" />;
      case "confirmed": return <CheckCircle className="w-4 h-4" />;
      case "rejected": return <XCircle className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "No date set";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-GB", {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <Card className={`hover:shadow-lg transition-all duration-200 ${urgent ? 'border-l-4 border-l-red-500 bg-red-50' : 'hover:shadow-md'}`}>
      <CardContent className="p-6">
        <div className="flex flex-col lg:flex-row lg:items-center gap-4">
          
          {/* Main Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 mb-1">
                  {booking.title || booking.clientName || 'Untitled Booking'}
                </h3>
                <div className="flex items-center gap-2 mb-2">
                  <Badge className={`${getStatusColor(booking.status)} text-xs font-medium flex items-center gap-1`}>
                    {getStatusIcon(booking.status)}
                    {booking.status?.replace('_', ' ').toUpperCase() || 'NEW'}
                  </Badge>
                  {urgent && (
                    <Badge className="bg-red-100 text-red-800 text-xs">
                      URGENT
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            {/* Key Details Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-gray-400" />
                <span className="text-gray-600">Client:</span>
                <span className="font-medium text-gray-900">{booking.clientName || 'No client set'}</span>
              </div>
              
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-gray-400" />
                <span className="text-gray-600">Date:</span>
                <span className="font-medium text-gray-900">{formatDate(booking.eventDate)}</span>
              </div>
              
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-gray-400" />
                <span className="text-gray-600">Time:</span>
                <span className="font-medium text-gray-900">{booking.eventTime || 'TBC'}</span>
              </div>
              
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-gray-400" />
                <span className="text-gray-600">Venue:</span>
                <span className="font-medium text-gray-900 truncate">{booking.venue || 'Venue TBC'}</span>
              </div>
              
              <div className="flex items-center gap-2">
                <PoundSterling className="w-4 h-4 text-gray-400" />
                <span className="text-gray-600">Fee:</span>
                <span className="font-medium text-gray-900">£{booking.fee || '0'}</span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-2 lg:flex-col lg:w-auto lg:flex-shrink-0">
            <Button size="sm" variant="outline" className="text-xs">
              View Details
            </Button>
            <Button size="sm" className="text-xs bg-primary hover:bg-primary/90">
              Respond
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}