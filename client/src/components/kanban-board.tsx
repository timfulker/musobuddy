import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { Eye, User, Calendar, AlertTriangle, AlertCircle, Clock } from "lucide-react";
import { useState } from "react";

// Type definitions for the enquiry/booking data
interface Booking {
  id: string;
  title: string;
  clientName: string;
  eventDate: string;
  eventTime?: string;
  eventEndTime?: string;
  venue?: string;
  status: string;
  conflictSeverity?: 'none' | 'warning' | 'critical';
  conflictAnalysis?: string;
  sourceType?: string;
}

interface Conflict {
  id: string;
  title: string;
  eventDate: string;
  clientName: string;
  status: string;
}

export default function ActionableEnquiries() {
  const [conflictResolutionDialogOpen, setConflictResolutionDialogOpen] = useState(false);
  const [selectedConflictEnquiry, setSelectedConflictEnquiry] = useState<Booking | null>(null);
  const [selectedConflicts, setSelectedConflicts] = useState<Conflict[]>([]);

  const { data: enquiries = [], isLoading } = useQuery<Booking[]>({
    queryKey: ["/api/bookings"],
  });

  const { data: upcomingBookings = [] } = useQuery<Booking[]>({
    queryKey: ["/api/bookings/upcoming"],
  });

  const { data: conflicts = [] } = useQuery<Conflict[]>({
    queryKey: ["/api/conflicts"],
    staleTime: 30000,
    gcTime: 5 * 60 * 1000,
  });

  // Check if enquiry needs response (new or in-progress status)
  const needsResponse = (enquiry: Booking) => {
    return enquiry.status === 'new' || enquiry.status === 'booking_in_progress';
  };

  // Check if enquiry is from calendar import
  const isCalendarImport = (enquiry: Booking) => {
    return enquiry.sourceType === 'calendar_import' || 
           (!enquiry.clientName && !enquiry.venue);
  };

  // Filter enquiries that need action
  const actionableEnquiries = enquiries.filter((enquiry: Booking) => {
    const hasConflicts = enquiry.conflictSeverity && enquiry.conflictSeverity !== 'none';
    const needsAction = needsResponse(enquiry) || hasConflicts;
    const notCalendarImport = !isCalendarImport(enquiry);
    
    return needsAction && notCalendarImport;
  });

  // Filter this week's enquiries (excluding calendar imports)
  const thisWeekEnquiries = enquiries.filter((enquiry: Booking) => {
    const enquiryDate = new Date(enquiry.eventDate);
    const today = new Date();
    const oneWeekFromNow = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
    
    return enquiryDate >= today && 
           enquiryDate <= oneWeekFromNow && 
           !isCalendarImport(enquiry);
  });

  // Handle conflict resolution dialog
  const handleConflictClick = (enquiry: Booking) => {
    setSelectedConflictEnquiry(enquiry);
    // Find related conflicts for this enquiry
    const relatedConflicts = conflicts.filter(conflict => 
      conflict.eventDate === enquiry.eventDate
    );
    setSelectedConflicts(relatedConflicts);
    setConflictResolutionDialogOpen(true);
  };

  // Render enquiry card
  const renderEnquiryCard = (enquiry: Booking, showUrgent = false) => {
    const hasConflicts = enquiry.conflictSeverity && enquiry.conflictSeverity !== 'none';
    const isUrgent = showUrgent && (needsResponse(enquiry) || hasConflicts);
    
    // Format date
    const eventDate = new Date(enquiry.eventDate);
    const dayName = eventDate.toLocaleDateString('en-US', { weekday: 'short' });
    const dayNum = eventDate.getDate().toString();
    const monthYear = eventDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });

    return (
      <Card 
        key={enquiry.id}
        className={`mb-3 transition-all duration-200 hover:shadow-md ${
          isUrgent ? 'border-red-500 bg-red-50' : 'border-gray-200'
        }`}
      >
        <CardContent className="p-4">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              {/* Date box */}
              <div className="flex items-center gap-3 mb-2">
                <div className="flex flex-col items-center justify-center w-12 h-12 bg-gray-100 rounded-lg">
                  <div className="text-xs font-medium text-gray-600">{dayName}</div>
                  <div className="text-sm font-bold text-gray-900">{dayNum}</div>
                  <div className="text-xs text-gray-500">{monthYear}</div>
                </div>
                
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 mb-1">{enquiry.title}</h3>
                  
                  <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
                    <User className="w-4 h-4" />
                    <span>{enquiry.clientName || 'Unknown Client'}</span>
                  </div>
                  
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Calendar className="w-4 h-4" />
                    <span>{enquiry.venue || 'Venue TBD'}</span>
                  </div>
                </div>
              </div>
              
              {/* Conflict indicators */}
              {hasConflicts && (
                <div className="mt-2">
                  {enquiry.conflictSeverity === 'critical' && (
                    <Badge 
                      variant="destructive" 
                      className="cursor-pointer hover:bg-red-600"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleConflictClick(enquiry);
                      }}
                    >
                      <AlertTriangle className="w-3 h-3 mr-1" />
                      {conflicts.length} Conflict{conflicts.length > 1 ? 's' : ''} - Click to resolve
                    </Badge>
                  )}
                  
                  {enquiry.conflictSeverity === 'warning' && (
                    <Badge 
                      variant="outline" 
                      className="cursor-pointer hover:bg-yellow-50"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleConflictClick(enquiry);
                      }}
                    >
                      <AlertCircle className="w-3 h-3 mr-1" />
                      {conflicts.length} Same day - Click to resolve
                    </Badge>
                  )}
                </div>
              )}
              
              {/* Response needed indicator */}
              {needsResponse(enquiry) && !hasConflicts && (
                <Badge variant="outline" className="mt-2">
                  <AlertCircle className="w-3 h-3 mr-1" />
                  Response needed
                </Badge>
              )}
              
              {/* Encore indicator */}
              {enquiry.sourceType === 'ENCORE' && (
                <Badge variant="secondary" className="mt-2">
                  ENCORE
                </Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading enquiries...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Action Required Column */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h4 className="font-semibold text-gray-900">
              <AlertCircle className="w-5 h-5 inline mr-2" />
              Action Required
            </h4>
            <Badge variant="secondary" className="bg-red-100 text-red-700">
              {actionableEnquiries.length} enquir{actionableEnquiries.length === 1 ? 'y' : 'ies'}
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/bookings">
              <Button variant="outline" size="sm" className="text-sm">
                <Eye className="w-4 h-4 mr-1" />
                View All
              </Button>
            </Link>
          </div>
        </div>

        <div className="space-y-3">
          {actionableEnquiries.length > 0 ? (
            actionableEnquiries.map((enquiry: Booking) => 
              renderEnquiryCard(enquiry, true)
            )
          ) : (
            <div className="text-center py-8 text-gray-500">
              <AlertCircle className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p className="text-sm font-medium">No enquiries need action</p>
              <p className="text-xs text-gray-400">You're all caught up!</p>
            </div>
          )}
        </div>
      </div>

      {/* This Week's Activity Column */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h4 className="font-semibold text-gray-900">
              <Clock className="w-5 h-5 inline mr-2" />
              This Week's Activity
            </h4>
            <Badge variant="secondary" className="bg-blue-100 text-blue-700">
              {thisWeekEnquiries.length} enquir{thisWeekEnquiries.length === 1 ? 'y' : 'ies'}
            </Badge>
          </div>
        </div>

        <div className="space-y-3">
          {thisWeekEnquiries.length > 0 ? (
            thisWeekEnquiries.map((enquiry: Booking) => 
              renderEnquiryCard(enquiry, false)
            )
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Clock className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p className="text-sm font-medium">No enquiries this week</p>
              <p className="text-xs text-gray-400">Check back later for activity</p>
            </div>
          )}
        </div>
      </div>

      {/* Conflict Resolution Dialog Placeholder */}
      {conflictResolutionDialogOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4">
            <h2 className="text-lg font-semibold mb-4">Conflict Resolution</h2>
            <p className="text-gray-600 mb-4">
              ConflictResolutionDialog component will be implemented here.
            </p>
            <div className="flex justify-end">
              <Button 
                onClick={() => setConflictResolutionDialogOpen(false)}
                variant="outline"
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}