import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { Eye, User, Calendar, AlertTriangle, AlertCircle } from "lucide-react";
import type { Enquiry } from "@shared/schema";

export default function KanbanBoard() {
  const { data: enquiries = [], isLoading } = useQuery({
    queryKey: ["/api/bookings"],
  });

  const { data: conflicts = [] } = useQuery({
    queryKey: ["/api/conflicts"],
    staleTime: 30000,
    cacheTime: 5 * 60 * 1000,
  });

  const groupedEnquiries = {
    new: enquiries.filter((e: Enquiry) => e.status === "new"),
    booking_in_progress: enquiries.filter((e: Enquiry) => e.status === "booking_in_progress"),
    contract_sent: enquiries.filter((e: Enquiry) => e.status === "contract_sent"),
    confirmed: enquiries.filter((e: Enquiry) => e.status === "confirmed"),
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

  const renderEnquiryCard = (enquiry: Enquiry, borderColor: string, bgGradient: string) => {
    const dateBox = formatDateBox(enquiry.eventDate!);
    const conflict = getEnquiryConflict(enquiry.id);
    
    return (
      <Link key={enquiry.id} href="/bookings">
        <Card className={`hover:shadow-md transition-all duration-200 cursor-pointer border-l-4 ${borderColor} ${bgGradient}`}>
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
          <CardTitle>Enquiry Pipeline</CardTitle>
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
          <CardTitle className="text-xl font-semibold">Enquiry Pipeline</CardTitle>
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
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
          {/* New Enquiries Column */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-gray-900 dark:text-gray-100">New Enquiries</h4>
              <Badge variant="secondary" className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                {groupedEnquiries.new.length}
              </Badge>
            </div>
            <div className="space-y-3 min-h-[300px]">
              {groupedEnquiries.new.map((enquiry: Enquiry) => 
                renderEnquiryCard(enquiry, "border-l-blue-500", "bg-gradient-to-r from-blue-50 to-white dark:from-blue-950 dark:to-gray-900")
              )}
              {groupedEnquiries.new.length === 0 && (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  <p className="text-sm">No new enquiries</p>
                </div>
              )}
            </div>
          </div>

          {/* In Progress Column */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-gray-900 dark:text-gray-100">In Progress</h4>
              <Badge variant="secondary" className="bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200">
                {groupedEnquiries.booking_in_progress.length}
              </Badge>
            </div>
            <div className="space-y-3 min-h-[300px]">
              {groupedEnquiries.booking_in_progress.map((enquiry: Enquiry) => 
                renderEnquiryCard(enquiry, "border-l-amber-500", "bg-gradient-to-r from-amber-50 to-white dark:from-amber-950 dark:to-gray-900")
              )}
              {groupedEnquiries.booking_in_progress.length === 0 && (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  <p className="text-sm">No enquiries in progress</p>
                </div>
              )}
            </div>
          </div>

          {/* Contract Sent Column */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-gray-900 dark:text-gray-100">Contract Sent</h4>
              <Badge variant="secondary" className="bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">
                {groupedEnquiries.contract_sent.length}
              </Badge>
            </div>
            <div className="space-y-3 min-h-[300px]">
              {groupedEnquiries.contract_sent.map((enquiry: Enquiry) => 
                renderEnquiryCard(enquiry, "border-l-purple-500", "bg-gradient-to-r from-purple-50 to-white dark:from-purple-950 dark:to-gray-900")
              )}
              {groupedEnquiries.contract_sent.length === 0 && (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  <p className="text-sm">No pending contracts</p>
                </div>
              )}
            </div>
          </div>

          {/* Confirmed Column */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-gray-900 dark:text-gray-100">Confirmed</h4>
              <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                {groupedEnquiries.confirmed.length}
              </Badge>
            </div>
            <div className="space-y-3 min-h-[300px]">
              {groupedEnquiries.confirmed.map((enquiry: Enquiry) => 
                renderEnquiryCard(enquiry, "border-l-green-500", "bg-gradient-to-r from-green-50 to-white dark:from-green-950 dark:to-gray-900")
              )}
              {groupedEnquiries.confirmed.length === 0 && (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  <p className="text-sm">No confirmed bookings</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}