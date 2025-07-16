import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertTriangle, AlertCircle, User, Calendar, Clock, Eye } from 'lucide-react';
import { Link } from 'wouter';
import { getDateBox, analyzeConflictSeverity, formatConflictMessage } from '@/utils/conflict-ui';
import ConflictResolutionDialog, { 
  ConflictResolutionDialogProps, 
  Booking 
} from '@/components/ConflictResolutionDialog';

// Use the exported Booking interface and create an Enquiry interface that extends it
interface Enquiry extends Booking {}

export default function ActionableEnquiries() {
  const [isConflictDialogOpen, setIsConflictDialogOpen] = useState(false);
  const [selectedEnquiry, setSelectedEnquiry] = useState<Enquiry | null>(null);
  const [conflictingBookings, setConflictingBookings] = useState<Booking[]>([]);

  const { data: enquiries, isLoading } = useQuery({
    queryKey: ['/api/enquiries'],
  });

  const { data: bookings } = useQuery({
    queryKey: ['/api/bookings'],
  });

  const getEnquiryConflicts = (enquiry: Enquiry) => {
    if (!enquiry.conflictDetected || !enquiry.detectedConflicts) return [];
    
    const conflictingBookings: Booking[] = [];
    
    // Convert detected conflicts to full booking objects
    for (const conflict of enquiry.detectedConflicts) {
      const booking = Array.isArray(bookings) ? bookings.find((b: any) => b.id === conflict.bookingId) : null;
      if (booking) {
        conflictingBookings.push({
          id: booking.id,
          title: booking.title,
          eventDate: booking.eventDate,
          venue: booking.venue,
          clientName: booking.clientName,
          eventTime: booking.eventTime,
          eventEndTime: booking.eventEndTime,
          status: booking.status,
          conflictDetected: false,
          detectedConflicts: []
        });
      }
    }
    
    return conflictingBookings;
  };

  const isCalendarImport = (enquiry: Enquiry) => {
    return !enquiry.clientName || 
           enquiry.clientName === 'Unknown' || 
           enquiry.clientName === 'Calendar Import' ||
           enquiry.title?.includes('Calendar Import');
  };

  const needsResponse = (enquiry: Enquiry) => {
    return enquiry.status === 'new' || enquiry.status === 'booking_in_progress';
  };

  const handleConflictClick = (enquiry: Enquiry) => {
    setSelectedEnquiry(enquiry);
    setConflictingBookings(getEnquiryConflicts(enquiry));
    setIsConflictDialogOpen(true);
  };

  const handleResolveConflict = (enquiryId: number, bookingId: number, newTime: { startTime: string; endTime: string }) => {
    // Handle conflict resolution
    console.log('Resolving conflict:', { enquiryId, bookingId, newTime });
    setIsConflictDialogOpen(false);
  };

  const actionableEnquiries = Array.isArray(enquiries) ? enquiries.filter((enquiry: Enquiry) => {
    if (isCalendarImport(enquiry)) return false;
    return needsResponse(enquiry) || enquiry.conflictDetected;
  }) : [];

  const thisWeekEnquiries = Array.isArray(enquiries) ? enquiries.filter((enquiry: Enquiry) => {
    if (isCalendarImport(enquiry)) return false;
    
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);
    
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);
    
    return enquiry.eventDate && 
           new Date(enquiry.eventDate) >= startOfWeek && 
           new Date(enquiry.eventDate) <= endOfWeek;
  }) : [];

  const renderEnquiryCard = (enquiry: Enquiry, showUrgent = false) => {
    const dateBox = getDateBox(enquiry.eventDate);
    const hasConflicts = enquiry.conflictDetected && enquiry.detectedConflicts && enquiry.detectedConflicts.length > 0;
    const needsAction = needsResponse(enquiry);
    
    return (
      <Link key={enquiry.id} href={`/bookings?enquiry=${enquiry.id}`}>
        <Card className={`mb-3 cursor-pointer hover:shadow-md transition-shadow ${showUrgent && (needsAction || hasConflicts) ? 'border-red-200 bg-red-50' : ''}`}>
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 bg-purple-100 rounded-lg flex flex-col items-center justify-center text-xs">
                      <div className="font-semibold text-purple-800">{dateBox.dayName}</div>
                      <div className="text-lg font-bold text-purple-900">{dateBox.dayNum}</div>
                      <div className="text-xs text-purple-600">{dateBox.monthYear}</div>
                    </div>
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 mb-1">{enquiry.title}</h3>
                    
                    <div className="space-y-1 mb-2">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <User className="h-4 w-4" />
                        <span>{enquiry.clientName}</span>
                      </div>
                      
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Calendar className="h-4 w-4" />
                        <span className="truncate">{enquiry.venue || 'Venue TBD'}</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 flex-wrap">
                      {hasConflicts && (
                        <div className="flex items-center gap-1">
                          {analyzeConflictSeverity(enquiry.detectedConflicts) === 'high' ? (
                            <Button
                              variant="destructive"
                              size="sm"
                              className="h-6 px-2 text-xs"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                handleConflictClick(enquiry);
                              }}
                            >
                              <AlertTriangle className="h-3 w-3 mr-1" />
                              {formatConflictMessage(enquiry.detectedConflicts)} - Click to resolve
                            </Button>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-6 px-2 text-xs border-yellow-300 text-yellow-700 hover:bg-yellow-50"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                handleConflictClick(enquiry);
                              }}
                            >
                              <AlertCircle className="h-3 w-3 mr-1" />
                              {formatConflictMessage(enquiry.detectedConflicts)} - Same day - Click to resolve
                            </Button>
                          )}
                        </div>
                      )}
                      
                      {needsResponse(enquiry) && !hasConflicts && (
                        <Button variant="outline" size="sm" className="h-6 px-2 text-xs">
                          <AlertCircle className="h-3 w-3 mr-1" />
                          Response needed
                        </Button>
                      )}
                      
                      {enquiry.title?.includes('ENCORE') && (
                        <Badge variant="secondary" className="text-xs">
                          ENCORE
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </Link>
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="text-center py-8">
          <div className="text-gray-500">Loading enquiries...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Action Required Column */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2">
            <h4 className="font-semibold text-gray-900">
              <AlertCircle className="h-5 w-5 text-red-500 inline mr-2" />
              Action Required
            </h4>
            <Badge variant="secondary" className="text-xs">
              {actionableEnquiries.length} enquiries
            </Badge>
          </div>
        </div>
        
        <div className="space-y-3">
          {actionableEnquiries.map((enquiry: Enquiry) => 
            renderEnquiryCard(enquiry, true)
          )}
        </div>
        
        {actionableEnquiries.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <AlertCircle className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <p className="text-sm">No enquiries need action</p>
            <p className="text-xs mt-1">You're up to date!</p>
          </div>
        )}
      </div>
      
      {/* This Week's Activity Column */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2">
            <h4 className="font-semibold text-gray-900">
              <Clock className="h-5 w-5 text-blue-500 inline mr-2" />
              This Week's Activity
            </h4>
            <Badge variant="secondary" className="text-xs">
              {thisWeekEnquiries.length} enquiries
            </Badge>
          </div>
        </div>
        
        <div className="space-y-3">
          {thisWeekEnquiries.map((enquiry: Enquiry) => 
            renderEnquiryCard(enquiry, false)
          )}
        </div>
        
        {thisWeekEnquiries.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <Clock className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <p className="text-sm">No enquiries this week</p>
            <p className="text-xs mt-1">Check back later for activity</p>
          </div>
        )}
      </div>
      
      <div className="border-t pt-4">
        <div className="flex justify-center">
          <div className="flex items-center gap-2">
            <Link href="/bookings">
              <Button variant="outline" size="sm" className="gap-2">
                <Eye className="h-4 w-4" />
                View All Bookings
              </Button>
            </Link>
          </div>
        </div>
      </div>
      
      {selectedEnquiry && (
        <ConflictResolutionDialog
          isOpen={isConflictDialogOpen}
          onClose={() => setIsConflictDialogOpen(false)}
          enquiry={selectedEnquiry}
          conflictingBookings={conflictingBookings}
          onResolve={handleResolveConflict}
        />
      )}
    </div>
  );
}