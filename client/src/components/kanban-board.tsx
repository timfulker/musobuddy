import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { Eye, User, Calendar, AlertTriangle, AlertCircle, Clock } from "lucide-react";
import type { Enquiry } from "@shared/schema";

export default function ActionableEnquiries() {
  const { data: enquiries = [], isLoading } = useQuery({
    queryKey: ["/api/bookings"],
  });

  const { data: conflicts = [] } = useQuery({
    queryKey: ["/api/conflicts"],
    staleTime: 30000,
    cacheTime: 5 * 60 * 1000,
  });

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

  const isThisWeek = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay());
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    return date >= startOfWeek && date <= endOfWeek;
  };

  // Filter enquiries that need action
  const actionableEnquiries = enquiries.filter((enquiry: Enquiry) => 
    needsResponse(enquiry) || getEnquiryConflict(enquiry.id)
  );

  // Filter enquiries from this week, excluding calendar imports
  const thisWeekEnquiries = enquiries.filter((enquiry: Enquiry) => 
    enquiry.createdAt && 
    isThisWeek(enquiry.createdAt) && 
    !isCalendarImport(enquiry)
  );

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
           (!enquiry.estimatedValue || enquiry.estimatedValue === "");
  };

  const renderEnquiryCard = (enquiry: Enquiry, showUrgent = false) => {
    const dateBox = formatDateBox(enquiry.eventDate!);
    const conflict = getEnquiryConflict(enquiry.id);
    const urgent = needsResponse(enquiry) || conflict;
    
    return (
      <Link key={enquiry.id} href="/bookings">
        <Card className={`hover:shadow-md transition-all duration-200 cursor-pointer border-l-4 ${
          urgent ? 'border-l-red-500 bg-gradient-to-r from-red-50 to-white dark:from-red-950 dark:to-gray-900' : 
          'border-l-blue-500 bg-gradient-to-r from-blue-50 to-white dark:from-blue-950 dark:to-gray-900'
        }`}>
          <CardContent className="p-4">
            <div className="space-y-3">
              {/* Header with price and date */}
              <div className="flex justify-between items-start">
                <div className="text-lg font-bold text-green-600 dark:text-green-400">
                  {enquiry.estimatedValue ? `£${enquiry.estimatedValue}` : "Price TBC"}
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
              </div>
              
              {/* Status indicators */}
              <div className="flex flex-wrap gap-1">
                {conflict && (
                  <Badge variant="destructive" className="text-xs">
                    <AlertTriangle className="w-3 h-3 mr-1" />
                    Conflict
                  </Badge>
                )}
                {needsResponse(enquiry) && (
                  <Badge variant="secondary" className="bg-red-100 text-red-700 text-xs">
                    <AlertCircle className="w-3 h-3 mr-1" />
                    Response needed
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
                <AlertCircle className="w-5 h-5 mr-2 text-red-500" />
                Needs Response
              </h4>
              <Badge variant="destructive" className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
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