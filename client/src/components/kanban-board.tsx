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
    
    return enquiries.filter((other: Enquiry) => {
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
    return conflicts.find((conflict: any) => 
      conflict.enquiryId === enquiryId && !conflict.resolved
    );
  };

  const formatDateBox = (dateString: string) => {
    if (!dateString) return { dayName: "", dayNum: "", monthYear: "" };
    const date = new Date(dateString);
    const dayName = date.toLocaleDateString("en-GB", { weekday: "short" }).toUpperCase();
    const dayNum = date.getDate().toString();
    const monthYear = date.toLocaleDateString("en-GB", { month: "short", year: "2-digit" });
    return { dayName, dayNum, monthYear };
  };

  const needsResponse = (enquiry: Enquiry) => {
    return enquiry.status === "new" || enquiry.status === "booking_in_progress";
  };

  // Detect if an enquiry was likely created from calendar import
  const isCalendarImport = (enquiry: Enquiry) => {
    // Calendar imports typically have:
    // - No client email or phone
    // - No original email content
    // - No apply now link
    // - Often just basic title and date
    return !enquiry.clientEmail && 
           !enquiry.clientPhone && 
           !enquiry.originalEmailContent && 
           !enquiry.applyNowLink &&
           (!enquiry.fee || enquiry.fee === "");
  };

  const isThisWeek = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    
    // Get start of current week (Monday)
    const startOfWeek = new Date(today);
    const dayOfWeek = today.getDay();
    const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Sunday is 0, so 6 days from Monday
    startOfWeek.setDate(today.getDate() - daysFromMonday);
    startOfWeek.setHours(0, 0, 0, 0);
    
    // Get end of current week (Sunday)
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);
    
    return date >= startOfWeek && date <= endOfWeek;
  };

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

  // Filter enquiries from this week, excluding calendar imports
  const thisWeekEnquiries = (enquiries as any[]).filter((enquiry: any) => {
    const isThisWeekEnquiry = enquiry.createdAt && isThisWeek(enquiry.createdAt.toString());
    const isImport = isCalendarImport(enquiry);
    
    // Debug logging removed to prevent console spam
    
    return isThisWeekEnquiry && !isImport;
  });

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
    
    // Status-based styling with new workflow color scheme
    const getStatusOverlay = () => {
      const stage = mapOldStatusToStage(enquiry.status);
      switch(enquiry.status) {
        case 'new': return "bg-gradient-to-br from-amber-50 to-amber-100 border-amber-200";
        case 'awaiting_response': return "bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200"; 
        case 'client_confirms': return "bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200";
        case 'contract_sent': return "bg-gradient-to-br from-indigo-50 to-indigo-100 border-indigo-200";
        case 'confirmed': return "bg-gradient-to-br from-green-50 to-green-100 border-green-200";
        case 'cancelled': return "bg-gradient-to-br from-red-50 to-red-100 border-red-200";
        case 'completed': return "bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200";
        default: return "bg-gradient-to-br from-gray-50 to-gray-100 border-gray-200";
      }
    };
    
    // Conflict overlay styling
    const getConflictOverlay = () => {
      if (severity === 'high') {
        return 'border-red-500 bg-red-50 ring-2 ring-red-200';
      } else if (severity === 'medium') {
        return 'border-amber-500 bg-amber-50 ring-2 ring-amber-200';
      }
      return '';
    };
    
    // Determine the appropriate badge text and color
    const getBadgeInfo = () => {
      if (hasConflicts && isResolved) {
        return {
          text: "One of two bookings on same day",
          variant: "outline" as const,
          className: "text-amber-700 border-amber-500"
        };
      } else if (hasConflicts) {
        if (severity === 'high') {
          return {
            text: "Needs immediate attention",
            variant: "destructive" as const,
            className: "text-red-700 bg-red-100 border-red-300"
          };
        } else if (severity === 'medium') {
          return {
            text: "Needs immediate attention",
            variant: "outline" as const,
            className: "text-amber-700 bg-amber-100 border-amber-300"
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
        <Card className={`hover:shadow-md transition-all duration-200 cursor-pointer ${
          getStatusOverlay()
        } ${hasConflicts ? getConflictOverlay() : ''}`}>
          <CardContent className="p-4">
            <div className="space-y-3">
              {/* Header with price and date */}
              <div className="flex justify-between items-start">
                <div className="text-lg font-bold text-green-600 dark:text-green-400">
                  {enquiry.fee ? `£${enquiry.fee}` : "Price TBC"}
                </div>
                <div className="text-right">
                  <div className="text-xs text-gray-500 dark:text-gray-400">{dateBox.dayName}</div>
                  <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">{dateBox.dayNum}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">{dateBox.monthYear}</div>
                </div>
              </div>
              
              {/* Event title */}
              <h3 className="font-semibold text-gray-900 dark:text-gray-100 line-clamp-2">{enquiry.title}</h3>
              
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
                {badgeInfo && (
                  <Badge variant={badgeInfo.variant} className={`text-xs ${badgeInfo.className}`}>
                    {severity === 'high' ? (
                      <AlertTriangle className="w-3 h-3 mr-1 text-red-700" />
                    ) : severity === 'medium' ? (
                      <AlertCircle className="w-3 h-3 mr-1 text-amber-700" />
                    ) : (
                      <Clock className="w-3 h-3 mr-1 text-blue-700" />
                    )}
                    {badgeInfo.text}
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
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Action Required Column */}
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
            <div className="space-y-3 min-h-[350px] max-h-[400px] overflow-y-auto">
              {actionableEnquiries.map((enquiry: Enquiry) => 
                renderEnquiryCard(enquiry, true)
              )}
              {actionableEnquiries.length === 0 && (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  <AlertCircle className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p className="text-sm">No enquiries need action</p>
                  <p className="text-xs text-gray-400 mt-1">You're all caught up!</p>
                </div>
              )}
            </div>
          </div>

          {/* This Week Column */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-gray-900 dark:text-gray-100 flex items-center">
                <Clock className="w-5 h-5 mr-2 text-blue-500" />
                This Week's Activity
              </h4>
              <Badge variant="secondary" className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                {thisWeekEnquiries.length}
              </Badge>
            </div>
            <div className="space-y-3 min-h-[350px] max-h-[400px] overflow-y-auto">
              {thisWeekEnquiries.map((enquiry: Enquiry) => 
                renderEnquiryCard(enquiry, false)
              )}
              {thisWeekEnquiries.length === 0 && (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  <Clock className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p className="text-sm">No enquiries this week</p>
                  <p className="text-xs text-gray-400 mt-1">Check back for new activity</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}