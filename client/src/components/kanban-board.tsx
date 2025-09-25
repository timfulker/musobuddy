import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Link, useLocation } from "wouter";
import { Eye, User, Calendar, AlertTriangle, AlertCircle, Clock, X, Trash2, MessageSquare, ChevronDown } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Enquiry } from "@shared/schema";
import { getDisplayStatus, mapOldStatusToStage } from "@/utils/workflow-system";
import React, { useEffect, useState } from "react";
import { getBorderAccent, getBadgeColors } from "@/utils/status-colors";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import ConflictIndicator from "@/components/ConflictIndicator";

export default function ActionableEnquiries() {
  const [location, setLocation] = useLocation();
  const { toast } = useToast();
  const [sortBy, setSortBy] = useState<string>('createdAt');
  
  // Mutation for rejecting bookings
  const rejectBookingMutation = useMutation({
    mutationFn: async (bookingId: number) => {
      return apiRequest(`/api/bookings/${bookingId}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'rejected' }),
        headers: { 'Content-Type': 'application/json' }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bookings"] });
      toast({
        title: "Booking Rejected",
        description: "The booking has been rejected and removed from your dashboard",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to reject booking",
        variant: "destructive",
      });
    },
  });

  // Mutation for deleting bookings
  const deleteBookingMutation = useMutation({
    mutationFn: async (bookingId: number) => {
      return apiRequest(`/api/bookings/${bookingId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bookings"] });
      toast({
        title: "Booking Deleted",
        description: "The booking has been permanently deleted",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete booking",
        variant: "destructive",
      });
    },
  });

  // Mutation for toggling Encore booking application status
  const markAppliedMutation = useMutation({
    mutationFn: async ({ bookingId, status }: { bookingId: number, status: string }) => {
      return apiRequest(`/api/bookings/${bookingId}`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
        headers: { 'Content-Type': 'application/json' }
      });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/bookings"] });
      toast({
        title: variables.status === 'in_progress' ? "Application Recorded" : "Application Removed",
        description: variables.status === 'in_progress' 
          ? "The Encore booking has been marked as applied and moved to In Progress"
          : "The Encore booking has been moved back to New status",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update booking status",
        variant: "destructive",
      });
    },
  });

  const { data: enquiries = [], isLoading, error } = useQuery({
    queryKey: ["/api/bookings"],
    refetchInterval: 60000, // Auto-refresh every 60 seconds for dashboard responsiveness
    staleTime: 30000, // Consider data stale after 30 seconds
  });

  // Get user's bands for color coding
  const { data: bands = [] } = useQuery({
    queryKey: ['/api/bands'],
  });

  // Fetch conflicts data for conflict indicators
  const { data: conflicts = [] } = useQuery({
    queryKey: ['/api/conflicts'],
    enabled: !isLoading && (enquiries as any[]).length > 0,
  });

  // Create a mapping of conflicts by booking ID for quick lookup
  const conflictsByBookingId = React.useMemo(() => {
    if (!conflicts || conflicts.length === 0) return {};
    
    const conflictMap: { [bookingId: number]: any[] } = {};
    conflicts.forEach((conflict: any) => {
      const { bookingId, withBookingId, clientName, time, severity, message } = conflict;
      
      // Add conflict info for this booking
      if (!conflictMap[bookingId]) conflictMap[bookingId] = [];
      conflictMap[bookingId].push({
        conflictingBookingId: withBookingId,
        clientName,
        time,
        severity,
        message
      });
    });
    return conflictMap;
  }, [conflicts]);

  const formatDateBox = (dateString: string) => {
    if (!dateString) return { dayName: "", dayNum: "", monthYear: "" };
    const date = new Date(dateString);
    const dayName = date.toLocaleDateString("en-GB", { weekday: "short" }).toUpperCase();
    const dayNum = date.getDate().toString();
    const monthYear = date.toLocaleDateString("en-GB", { month: "short", year: "numeric" });
    return { dayName, dayNum, monthYear };
  };

  const formatReceivedTime = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diffHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    const diffMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffMinutes < 60) {
      return diffMinutes < 1 ? 'Just now' : `${diffMinutes}m ago`;
    } else if (diffHours < 24) {
      return `${diffHours}h ago`;
    } else {
      return date.toLocaleDateString("en-GB", { 
        day: "numeric", 
        month: "short",
        hour: "2-digit",
        minute: "2-digit"
      });
    }
  };

  const needsResponse = (enquiry: Enquiry) => {
    // Only truly new enquiries need responses
    return enquiry.status === "new";
  };

  // Sort function for enquiries
  const sortEnquiries = (enquiries: any[], sortBy: string) => {
    return [...enquiries].sort((a, b) => {
      switch (sortBy) {
        case 'eventDate':
          const dateA = new Date(a.eventDate || 0);
          const dateB = new Date(b.eventDate || 0);
          return dateA.getTime() - dateB.getTime();
        
        case 'createdAt':
          const createdA = new Date(a.createdAt || 0);
          const createdB = new Date(b.createdAt || 0);
          return createdB.getTime() - createdA.getTime(); // Most recent first
        
        case 'clientName':
          const nameA = (a.clientName || '').toLowerCase();
          const nameB = (b.clientName || '').toLowerCase();
          return nameA.localeCompare(nameB);
        
        case 'fee':
          const feeA = typeof a.fee === 'string' ? (a.fee === 'TBC' ? 0 : parseInt(a.fee) || 0) : (a.fee || 0);
          const feeB = typeof b.fee === 'string' ? (b.fee === 'TBC' ? 0 : parseInt(b.fee) || 0) : (b.fee || 0);
          return feeB - feeA; // Highest first
        
        case 'status':
          const statusA = (a.status || '').toLowerCase();
          const statusB = (b.status || '').toLowerCase();
          return statusA.localeCompare(statusB);
        
        default:
          return 0;
      }
    });
  };

  // Filter enquiries that need action (excluding resolved conflicts and completed gigs)
  const filteredEnquiries = (enquiries as any[]).filter((enquiry: any) => {
    // Exclude all actioned statuses from action required
    const excludeStatuses = [
      'completed', 'rejected', 'cancelled', 'confirmed', 
      'contract_sent', 'in_progress', 'awaiting_response', 
      'client_confirms'
    ];
    
    if (excludeStatuses.includes(enquiry.status)) {
      return false;
    }
    
    // Check if enquiry has existing contracts or invoices (means it's been actioned)
    const contracts = enquiry.contracts || [];
    const invoices = enquiry.invoices || [];
    
    if (contracts.length > 0 || invoices.length > 0) {
      return false;
    }
    
    // Only show truly new enquiries that haven't been acted upon
    // Only include new status bookings that need responses
    return (enquiry.status === 'new');
  });

  // Apply sorting to the filtered enquiries
  const actionableEnquiries = sortEnquiries(filteredEnquiries, sortBy);

  const renderEnquiryCard = (enquiry: any, showUrgent = false) => {
    const dateBox = formatDateBox(enquiry.eventDate?.toString() || '');

    // Helper to get band by ID
    const getBandById = (bandId: number | null) => {
      if (!bandId) return null;
      return bands.find((band: any) => band.id === bandId);
    };

    // Clean card styling - band colors take priority over status colors
    const getCardStyling = () => {
      // If enquiry has a band, use band color for the border
      if (enquiry.bandId) {
        const band = getBandById(enquiry.bandId);
        if (band) {
          return 'border-l-4'; // Use 4px border for band colors
        }
      }

      // Fall back to status colors
      switch(enquiry.status?.toLowerCase()) {
        case 'new':
        case 'enquiry':
          return 'border-l-sky-400';
        case 'awaiting_response':
        case 'in_progress':
        case 'booking_in_progress':
          return 'border-l-blue-700';
        case 'client_confirms':
          return 'border-l-orange-500';
        case 'confirmed':
        case 'contract_signed':
          return 'border-l-green-500';
        case 'completed':
          return 'border-l-gray-500';
        case 'cancelled':
        case 'rejected':
          return 'border-l-red-500';
        default:
          return 'border-l-gray-300';
      }
    };

    // Get band border style
    const getBandBorderStyle = () => {
      if (enquiry.bandId) {
        const band = getBandById(enquiry.bandId);
        if (band) {
          return { borderLeftColor: band.color };
        }
      }
      return {};
    };
    
    // Get conflicts for this enquiry
    const enquiryConflicts = conflictsByBookingId[enquiry.id] || [];

    return (
      <Card
        key={enquiry.id}
        className={`bg-white shadow-sm hover:shadow-lg transition-all duration-200 border-l-4 ${getCardStyling()} cursor-pointer relative backdrop-blur-sm`}
        style={getBandBorderStyle()}
        onClick={() => setLocation(`/bookings?view=list&highlight=${enquiry.id}`)}
        onDoubleClick={() => setLocation(`/new-booking?edit=${enquiry.id}`)}
      >
        {/* Conflict Indicator */}
        {enquiryConflicts.length > 0 && (
          <ConflictIndicator
            bookingId={enquiry.id}
            conflicts={enquiryConflicts}
          />
        )}
        
        <CardContent className="p-4">
          <div className="flex items-start space-x-4">
            {/* Date Box */}
            <div className="flex-shrink-0 bg-gray-100 rounded-lg p-2 min-w-[60px] text-center">
              <div className="text-xs font-medium text-gray-600">{dateBox.dayName}</div>
              <div className="text-2xl font-bold text-gray-900">{dateBox.dayNum}</div>
              <div className="text-xs text-gray-500">{dateBox.monthYear}</div>
            </div>
            
            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between">
                <div className="min-w-0 flex-1">
                  <h4 className="text-lg font-medium text-green-600 leading-tight">
                    {enquiry.title || enquiry.eventType || 'Untitled Event'}
                  </h4>
                  
                  <div className="text-sm text-gray-600 mt-1 space-y-1">
                    {enquiry.clientName && (
                      <div className="flex items-center">
                        <User className="w-3 h-3 mr-1 flex-shrink-0" />
                        <span className="truncate">{enquiry.clientName}</span>
                        {enquiry.bandId && (() => {
                          const band = getBandById(enquiry.bandId);
                          return band ? (
                            <span className="ml-2 inline-flex items-center gap-1 text-xs bg-gray-100 text-gray-700 px-1.5 py-0.5 rounded">
                              <div
                                className="w-2 h-2 rounded-full"
                                style={{ backgroundColor: band.color }}
                              />
                              {band.name}
                            </span>
                          ) : null;
                        })()}
                      </div>
                    )}
                    
                    {(enquiry.venue || enquiry.venueAddress) && (
                      <div className="flex items-center">
                        <Calendar className="w-3 h-3 mr-1 flex-shrink-0" />
                        <span className="truncate">
                          {/* Always prefer venue name, fall back to address if no venue */}
                          {enquiry.venue || enquiry.venueAddress}
                        </span>
                      </div>
                    )}
                    
                    {enquiry.eventTime && (
                      <div className="text-xs text-gray-500">
                        Time: {enquiry.eventTime}
                        {enquiry.eventEndTime && ` - ${enquiry.eventEndTime}`}
                      </div>
                    )}
                    
                    {enquiry.createdAt && (
                      <div className="flex items-center text-xs text-gray-400">
                        <Clock className="w-3 h-3 mr-1 flex-shrink-0" />
                        Received {formatReceivedTime(enquiry.createdAt)}
                      </div>
                    )}
                    
                    {enquiry.applyNowLink && (
                      <div className="flex items-center gap-2 mt-2 flex-wrap">
                        <Badge variant="outline" className="text-xs bg-purple-50 text-purple-700 border-purple-300">
                          🎵 ENCORE
                        </Badge>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            window.open(enquiry.applyNowLink, '_blank');
                          }}
                          className="text-xs bg-purple-50 text-purple-700 border-purple-300 hover:bg-purple-100"
                        >
                          Apply on Encore
                        </Button>
                        <div className="flex items-center gap-2 text-xs">
                          <span className="text-gray-600">Applied:</span>
                          <Switch
                            checked={enquiry.status === 'in_progress' || enquiry.status === 'confirmed' || enquiry.status === 'completed'}
                            onCheckedChange={(checked) => {
                              const newStatus = checked ? 'in_progress' : 'new';
                              markAppliedMutation.mutate({ bookingId: enquiry.id, status: newStatus });
                            }}
                            disabled={markAppliedMutation.isPending}
                            className="data-[state=checked]:bg-green-600"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="flex flex-col items-end space-y-2 ml-2">
                  {enquiry.fee && (
                    <div className="text-right">
                      <div className="text-sm font-medium text-gray-900">
                        {(() => {
                          // Extract and display fee range for Encore bookings
                          if (enquiry.applyNowLink && enquiry.title) {
                            const feeRangeMatch = enquiry.title.match(/£(\d+)-(?:£)?(\d+)/);
                            if (feeRangeMatch) {
                              return `£${feeRangeMatch[1]}-${feeRangeMatch[2]}`;
                            }
                          }
                          return enquiry.fee === "TBC" ? "£TBC" : `£${enquiry.fee}`;
                        })()}
                      </div>
                    </div>
                  )}
                  
                  <div className="flex items-center space-x-2">
                    <Badge variant="secondary" className={getBadgeColors(enquiry.status)}>
                      {getDisplayStatus(enquiry.status)}
                    </Badge>
                    
                    <div className="flex items-center space-x-1">
                      {/* Respond Button - Primary Action */}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setLocation(`/conversation/${enquiry.id}`);
                        }}
                        className="text-blue-600 hover:bg-blue-50 border-blue-200"
                        title="Respond to client"
                      >
                        <MessageSquare className="w-3 h-3 mr-1" />
                        Respond
                      </Button>
                      
                      <Link href={`/new-booking?edit=${enquiry.id}`}>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Eye className="w-3 h-3 mr-1" />
                          Edit
                        </Button>
                      </Link>

                      <Link href={`/bookings?view=calendar&highlight=${enquiry.id}`}>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => e.stopPropagation()}
                          title="View in calendar"
                        >
                          <Calendar className="w-3 h-3 mr-1" />
                          Calendar
                        </Button>
                      </Link>
                      
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          rejectBookingMutation.mutate(enquiry.id);
                        }}
                        disabled={rejectBookingMutation.isPending}
                        className="text-orange-600 hover:text-orange-700 hover:bg-orange-50 border-orange-200"
                        title="Reject booking"
                      >
                        <X className="w-3 h-3" />
                      </Button>
                      
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm('Are you sure you want to permanently delete this booking? This action cannot be undone.')) {
                            deleteBookingMutation.mutate(enquiry.id);
                          }
                        }}
                        disabled={deleteBookingMutation.isPending}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                        title="Delete booking permanently"
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  if (isLoading) {
    return (
      <Card className="shadow-lg border-0 bg-gradient-to-br from-white to-gray-50 dark:from-slate-900 dark:to-slate-800">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Clock className="w-5 h-5 text-primary" />
            <span>Action Required</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full mx-auto mb-2"></div>
            <p className="text-gray-600">Loading enquiries...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="shadow-lg border-0 bg-gradient-to-br from-white to-gray-50 dark:from-slate-900 dark:to-slate-800">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <AlertTriangle className="w-5 h-5 text-red-600" />
            <span>Error Loading</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-red-600">Failed to load enquiries. Please try refreshing the page.</p>
        </CardContent>
      </Card>
    );
  }

  if (actionableEnquiries.length === 0) {
    return null; // Don't show the component if there are no actionable items
  }

  return (
    <Card className="shadow-lg border-0 bg-gradient-to-br from-white to-gray-50 dark:from-slate-900 dark:to-slate-800">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center space-x-2">
            <Clock className="w-5 h-5 text-primary" />
            <span>Action Required</span>
            <Badge variant="secondary">
              {actionableEnquiries.length} items
            </Badge>
          </CardTitle>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Sort by..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="eventDate">Event Date</SelectItem>
              <SelectItem value="createdAt">Date Received</SelectItem>
              <SelectItem value="clientName">Client Name</SelectItem>
              <SelectItem value="fee">Fee (High to Low)</SelectItem>
              <SelectItem value="status">Status</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {actionableEnquiries.map((enquiry) => renderEnquiryCard(enquiry))}
      </CardContent>
    </Card>
  );
}