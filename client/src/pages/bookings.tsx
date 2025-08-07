import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { Calendar, List, Menu, Plus, Clock, PoundSterling, MoreHorizontal, FileText, Receipt, Settings, MapPin } from "lucide-react";
import { Link } from "wouter";
import Sidebar from "@/components/sidebar";
import MobileNav from "@/components/mobile-nav";
import { useResponsive } from "@/hooks/useResponsive";
import { useAuth } from "@/hooks/useAuth";
import type { Enquiry } from "@shared/schema";

type ViewMode = 'list' | 'calendar';

export default function UnifiedBookings() {
  const { user } = useAuth();
  
  // Status color helper function
  const getStatusBorderColor = (status: string | undefined) => {
    switch (status) {
      case "new":
      case "enquiry":
        return "border-l-sky-400";
      case "in_progress":
      case "awaiting_response":
        return "border-l-blue-700";
      case "client_confirms":
        return "border-l-orange-500";
      case "confirmed":
        return "border-l-green-500";
      case "completed":
        return "border-l-gray-500";
      case "rejected":
      case "cancelled":
        return "border-l-red-500";
      default:
        return "border-l-gray-300";
    }
  };

  // State
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [searchQuery, setSearchQuery] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  
  const { isDesktop } = useResponsive();
  const { toast } = useToast();

  // Fetch bookings data
  const { data: bookings = [], isLoading: bookingsLoading } = useQuery<Enquiry[]>({
    queryKey: ["/api/bookings"],
    retry: 2,
  });

  // Filter bookings based on search and status
  const filteredBookings = bookings.filter(booking => {
    const matchesSearch = searchQuery === "" || 
      (booking.clientName?.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (booking.venue?.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (booking.eventType?.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesStatus = statusFilter === 'all' || booking.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Mobile Navigation */}
      {!isDesktop && (
        <MobileNav isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />
      )}

      {/* Sidebar */}
      <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />

      {/* Main Content */}
      <div className={`${isDesktop ? 'ml-64' : 'ml-0'} transition-all duration-300`}>
        {/* Header */}
        <div className="border-b bg-white dark:bg-gray-800 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              {!isDesktop && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSidebarOpen(true)}
                >
                  <Menu className="h-5 w-5" />
                </Button>
              )}
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Bookings</h1>
            </div>
            <div className="flex items-center space-x-4">
              {/* View Mode Toggle */}
              <div className="flex rounded-lg bg-gray-100 dark:bg-gray-700 p-1">
                <Button
                  variant={viewMode === 'list' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('list')}
                >
                  <List className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === 'calendar' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('calendar')}
                >
                  <Calendar className="h-4 w-4" />
                </Button>
              </div>
              
              <Link href="/bookings/new">
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  New Booking
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {bookingsLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Search and Filters */}
              <Card>
                <CardContent className="p-4">
                  <div className="flex flex-col sm:flex-row gap-4">
                    <div className="flex-1">
                      <Input
                        placeholder="Search bookings..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full"
                      />
                    </div>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger className="w-full sm:w-48">
                        <SelectValue placeholder="Filter by status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Statuses</SelectItem>
                        <SelectItem value="new">New</SelectItem>
                        <SelectItem value="in_progress">In Progress</SelectItem>
                        <SelectItem value="confirmed">Confirmed</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="rejected">Rejected</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>

              {/* Bookings List */}
              {filteredBookings.length === 0 ? (
                <Card>
                  <CardContent className="text-center py-8">
                    <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                      {searchQuery || statusFilter !== 'all' ? 'No bookings match your filters' : 'No bookings yet'}
                    </h3>
                    <p className="text-gray-500 dark:text-gray-400 mb-4">
                      {searchQuery || statusFilter !== 'all' ? 
                        'Try adjusting your search or filter criteria.' : 
                        'Get started by creating your first booking.'
                      }
                    </p>
                    {!(searchQuery || statusFilter !== 'all') && (
                      <Link href="/bookings/new">
                        <Button>
                          <Plus className="h-4 w-4 mr-2" />
                          Create First Booking
                        </Button>
                      </Link>
                    )}
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4">
                  {filteredBookings.map((booking) => (
                    <Card key={booking.id} className={`${getStatusBorderColor(booking.status)} border-l-4`}>
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between">
                          <div className="space-y-2">
                            <div className="flex items-center space-x-3">
                              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                                {booking.clientName || 'Unnamed Client'}
                              </h3>
                              <Badge variant="outline">
                                {booking.status?.replace('_', ' ') || 'New'}
                              </Badge>
                            </div>
                            <div className="text-sm text-gray-600 dark:text-gray-300 space-y-1">
                              {booking.venue && (
                                <div className="flex items-center space-x-2">
                                  <MapPin className="h-4 w-4" />
                                  <span>{booking.venue}</span>
                                </div>
                              )}
                              {booking.eventDate && (
                                <div className="flex items-center space-x-2">
                                  <Clock className="h-4 w-4" />
                                  <span>
                                    {new Date(booking.eventDate).toLocaleDateString()}
                                    {booking.eventTime && ` at ${booking.eventTime}`}
                                  </span>
                                </div>
                              )}
                              {booking.fee && (
                                <div className="flex items-center space-x-2">
                                  <PoundSterling className="h-4 w-4" />
                                  <span>£{booking.fee}</span>
                                </div>
                              )}
                            </div>
                          </div>
                          
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem>
                                <FileText className="h-4 w-4 mr-2" />
                                View Details
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <Receipt className="h-4 w-4 mr-2" />
                                Create Contract
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <Settings className="h-4 w-4 mr-2" />
                                Update Status
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}