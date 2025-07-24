import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { Eye, User, Calendar, AlertTriangle, AlertCircle, Clock } from "lucide-react";
import type { Enquiry } from "@shared/schema";
// Removed conflict-ui import - using new conflict system
import { getDisplayStatus, mapOldStatusToStage } from "@/utils/workflow-system";
import React, { useEffect, useState } from "react";
import { getBorderAccent, getBadgeColors } from "@/utils/status-colors";

export default function ActionableEnquiries() {
  const { data: enquiries = [], isLoading } = useQuery({
    queryKey: ["/api/bookings"],
  });

  const { data: conflicts = [] } = useQuery({
    queryKey: ["/api/conflicts"],
    staleTime: 30000,
    gcTime: 5 * 60 * 1000,
  });

  // Track resolved conflicts using localStorage (same as events window)
  const [resolvedConflicts, setResolvedConflicts] = useState<Set<number>>(new Set());

  useEffect(() => {
    // Load resolved conflicts from localStorage
    const savedResolvedConflicts = localStorage.getItem('resolvedConflicts');
    if (savedResolvedConflicts) {
      try {
        const parsed = JSON.parse(savedResolvedConflicts);
        setResolvedConflicts(new Set(parsed));
      } catch (error) {
        console.error('Error parsing resolved conflicts:', error);
      }
    }
  }, []);

  // Debug logging - summary of all enquiries by status
  useEffect(() => {
    if (Array.isArray(enquiries) && enquiries.length > 0) {
      const statusCounts = (enquiries as any[]).reduce((acc: any, enquiry: any) => {
        acc[enquiry.status] = (acc[enquiry.status] || 0) + 1;
        return acc;
      }, {});
      console.log('📊 Enquiries by status:', statusCounts);
      
      // Log completed enquiries to understand the issue
      const completedEnquiries = (enquiries as any[]).filter((e: any) => e.status === 'completed');
      console.log('✅ Completed enquiries:', completedEnquiries.length, completedEnquiries.map((e: any) => ({
        id: e.id,
        title: e.title,
        eventDate: e.eventDate,
        createdAt: e.createdAt,
        status: e.status
      })));
    }
  }, [enquiries]);

  // Detect conflicts for an enquiry (same logic as events window)
  const detectConflicts = (enquiry: Enquiry) => {
    // Use the correct field names from the database: eventTime and eventEndTime
    if (!enquiry.eventDate || !enquiry.eventTime || !enquiry.eventEndTime) return [];
    
    const enquiryDate = new Date(enquiry.eventDate).toDateString();
    const enquiryStart = new Date(`${enquiry.eventDate}T${enquiry.eventTime}`);
    const enquiryEnd = new Date(`${enquiry.eventDate}T${enquiry.eventEndTime}`);
    
    return (enquiries as any[]).filter((other: Enquiry) => {
      if (other.id === enquiry.id) return false;
      if (!other.eventDate || !other.eventTime || !other.eventEndTime) return false;
      
      const otherDate = new Date(other.eventDate).toDateString();
      if (otherDate !== enquiryDate) return false;
      
      const otherStart = new Date(`${other.eventDate}T${other.eventTime}`);
      const otherEnd = new Date(`${other.eventDate}T${other.eventEndTime}`);
      
      // Check for time overlap
      const hasTimeOverlap = enquiryStart < otherEnd && enquiryEnd > otherStart;
      
      // Return the conflict object with the original enquiry data plus hasTimeOverlap
      return {
        ...other,
        type: 'booking',
        hasTimeOverlap
      };
    }).filter(Boolean);
  };

  const getEnquiryConflict = (enquiryId: number) => {
    return (conflicts as any[]).find((conflict: any) => 
      conflict.enquiryId === enquiryId && !conflict.resolved
    );
  };

  const formatDateBox = (dateString: string) => {
    if (!dateString) return { dayName: "", dayNum: "", monthYear: "" };
    const date = new Date(dateString);
    const dayName = date.toLocaleDateString("en-GB", { weekday: "short" }).toUpperCase();
    const dayNum = date.getDate().toString();
    const monthYear = date.toLocaleDateString("en-GB", { month: "short", year: "numeric" });
    return { dayName, dayNum, monthYear };
  };

  const needsResponse = (enquiry: Enquiry) => {
    return enquiry.status === "new" || enquiry.status === "booking_in_progress";
  };

  // Removed isCalendarImport function since we removed "This Week's Activity" column

  // Removed isThisWeek function since we removed "This Week's Activity" column

  // Filter enquiries that need action (excluding resolved conflicts and completed gigs)
  const actionableEnquiries = (enquiries as any[]).filter((enquiry: any) => {
    // Exclude completed and rejected gigs from action required
    if (enquiry.status === 'completed' || enquiry.status === 'rejected') {
      return false;
    }
    
    const conflicts = detectConflicts(enquiry);
    const isResolved = resolvedConflicts.has(enquiry.id);
    const hasUnresolvedConflicts = conflicts.length > 0 && !isResolved;
    
    return needsResponse(enquiry) || hasUnresolvedConflicts;
  });

  // Removed thisWeekEnquiries filtering since we removed the "This Week's Activity" column

  const renderEnquiryCard = (enquiry: any, showUrgent = false) => {
    const dateBox = formatDateBox(enquiry.eventDate?.toString() || '');
    const conflicts = detectConflicts(enquiry);
    const isResolved = resolvedConflicts.has(enquiry.id);
    
    // Enhanced conflict detection with booking status awareness
    const confirmedBookingConflicts = conflicts.filter((c: any) => c.type === 'booking');
    const unconfirmedEnquiryConflicts = conflicts.filter((c: any) => c.type === 'enquiry');
    
    // Check if any conflicts have time overlaps
    const hasTimeOverlap = conflicts.some((conflict: any) => conflict.hasTimeOverlap);
    
    // Simplified conflict analysis without external dependencies
    const conflictAnalysis = {
      hasTimeOverlap,
      sameVenue: false,
      sameClient: false,
      confirmedBooking: confirmedBookingConflicts.length > 0,
      unconfirmedEnquiry: unconfirmedEnquiryConflicts.length > 0,
      conflictCount: conflicts.length,
      conflictDetails: conflicts.length > 0 ? 
        `${confirmedBookingConflicts.length} confirmed booking(s), ${unconfirmedEnquiryConflicts.length} unconfirmed enquiry(ies)` 
        : 'No conflicts'
    };
    
    // Simple severity calculation
    const severity = hasTimeOverlap && confirmedBookingConflicts.length > 0 ? 'high' : 
                     conflicts.length > 0 ? 'medium' : 'low';
    const hasConflicts = conflicts.length > 0;
    
    // Debug logging for conflict detection (after variables are defined)
    if (enquiry.title?.includes('Saxophone')) {
      console.log('Debug - Saxophone enquiry:', {
        id: enquiry.id,
        title: enquiry.title,
        eventDate: enquiry.eventDate,
        eventTime: enquiry.eventTime,
        eventEndTime: enquiry.eventEndTime,
        conflicts: conflicts,
        isResolved: isResolved,
        severity: severity,
        hasConflicts: hasConflicts,
        needsResponse: needsResponse(enquiry)
      });
    }
    
    // Clean card styling - no color overlays, just left border (matching booking page)
    const getCardStyling = () => {
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
    
    // No conflict overlays - conflicts shown via badges only
    const getConflictOverlay = () => {
      return ''; // Always return empty - conflicts don't override card styling
    };
    
    // Determine the appropriate badge text and color
    const getBadgeInfo = () => {
      // Debug logging to check badge generation
      if (hasConflicts || needsResponse(enquiry)) {
        console.log('Badge generation debug:', {
          title: enquiry.title,
          hasConflicts,
          isResolved,
          severity,
          needsResponse: needsResponse(enquiry),
          conflictsLength: conflicts.length
        });
      }
      
      if (hasConflicts && isResolved) {
        return {
          text: "Conflict resolved",
          variant: "outline" as const,
          className: "text-green-700 border-green-500"
        };
      } else if (hasConflicts) {
        if (severity === 'high') {
          return {
            text: "⚠️ Time conflict",
            variant: "destructive" as const,
            className: "text-red-700 bg-red-100 border-red-300"
          };
        } else if (severity === 'medium') {
          return {
            text: "⚠️ Scheduling conflict",
            variant: "outline" as const,
            className: "text-amber-700 bg-amber-100 border-amber-300"
          };
        } else {
          return {
            text: "⚠️ Potential conflict",
            variant: "outline" as const,
            className: "text-yellow-700 bg-yellow-100 border-yellow-300"
          };
        }
      } else if (needsResponse(enquiry)) {
        return {
          text: "Needs response",
          variant: "secondary" as const,
          className: "text-blue-700 bg-blue-100 border-blue-300"
        };
      }
      return null;
    };
    
    const badgeInfo = getBadgeInfo();
    
    return (
      <Link key={enquiry.id} href={`/bookings?id=${enquiry.id}`}>
        <Card className={`hover:shadow-md transition-all duration-200 cursor-pointer bg-white border-l-4 ${
          getCardStyling()
        }`}>
          <CardContent className="p-4">
            <div className="space-y-3">
              {/* Header with title and date */}
              <div className="flex justify-between items-start gap-3">
                <div className="text-lg font-bold text-green-600 dark:text-green-400 line-clamp-2 flex-1 min-w-0">
                  {enquiry.title}
                </div>
                <div className="text-center bg-gray-50 dark:bg-gray-800 rounded-lg p-2 flex-shrink-0 w-16 sm:w-20">
                  <div className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide">{dateBox.dayName}</div>
                  <div className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">{dateBox.dayNum}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">{dateBox.monthYear}</div>
                </div>
              </div>
              
              {/* Price */}
              <div className="font-semibold text-gray-900 dark:text-gray-100">
                {enquiry.fee ? `£${enquiry.fee}` : "£TBC"}
              </div>
              
              {/* Client and venue */}
              <div className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
                <div className="flex items-center">
                  <User className="w-4 h-4 mr-2" />
                  <span>{enquiry.clientName}</span>
                </div>
                {enquiry.venue && (
                  <div className="flex items-center">
                    <Calendar className="w-4 h-4 mr-2" />
                    <span className="truncate">{enquiry.venue}</span>
                  </div>
                )}
                <div className="flex items-center">
                  <Clock className="w-4 h-4 mr-2" />
                  <span>
                    {enquiry.eventTime && enquiry.eventEndTime 
                      ? `${enquiry.eventTime} - ${enquiry.eventEndTime}`
                      : '00:00 - 23:59'
                    }
                  </span>
                </div>
              </div>
              
              {/* Status indicators */}
              <div className="flex flex-wrap gap-1">
                {/* Conflict badge */}
                {hasConflicts && (
                  <Badge variant="outline" className="text-xs text-red-700 bg-red-50 border-red-300">
                    ⚠️ Conflict
                  </Badge>
                )}
                
                {/* Response needed badge */}
                {!hasConflicts && needsResponse(enquiry) && (
                  <Badge variant="secondary" className="text-xs text-blue-700 bg-blue-100">
                    Needs Response
                  </Badge>
                )}
                
                {enquiry.applyNowLink && (
                  <Badge className="bg-green-100 text-green-800 text-xs">
                    🎯 ENCORE
                  </Badge>
                )}
                
                <Badge variant="outline" className="text-xs">
                  {enquiry.status.replace('_', ' ').toUpperCase()}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </Link>
    );
  };

  if (isLoading) {
    return (
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle>Action Required</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-1/4"></div>
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-32 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-6">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl font-semibold">Action Required</CardTitle>
          <div className="flex items-center space-x-2">
            <Link href="/bookings">
              <Button variant="outline" size="sm" className="h-9">
                <Eye className="w-4 h-4 mr-2" />
                View All
              </Button>
            </Link>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        {/* Single Column - Action Required Only */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-gray-900 dark:text-gray-100 flex items-center">
              <AlertCircle className="w-5 h-5 mr-2 text-orange-500" />
              Needs Response
            </h4>
            <Badge variant="outline" className="bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900 dark:text-orange-200">
              {actionableEnquiries.length}
            </Badge>
          </div>
          {/* Non-scrolling, dynamic grid layout */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {actionableEnquiries.map((enquiry: Enquiry) => 
              renderEnquiryCard(enquiry, true)
            )}
          </div>
          {actionableEnquiries.length === 0 && (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              <AlertCircle className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p className="text-sm">No enquiries need action</p>
              <p className="text-xs text-gray-400 mt-1">You're all caught up!</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}