import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DollarSign, Clock, MoreHorizontal, Filter, Eye, User, Calendar, AlertCircle, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import type { Enquiry } from "@shared/schema";

export default function KanbanBoard() {
  // Phase 3: Read from main bookings table (renamed from bookings_new)
  const { data: enquiries = [], isLoading } = useQuery({
    queryKey: ["/api/bookings"],
  });

  const { data: conflicts = [] } = useQuery({
    queryKey: ["/api/conflicts"],
    staleTime: 30000, // 30 seconds
    cacheTime: 5 * 60 * 1000, // 5 minutes
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

  const getConflictSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'text-red-600 bg-red-50';
      case 'medium': return 'text-yellow-600 bg-yellow-50';
      case 'low': return 'text-blue-600 bg-blue-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };



  const formatDate = (dateString: string) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  };

  const formatTime = (dateString: string) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    const now = new Date();
    const diffHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffHours < 24) {
      return `${diffHours} hours ago`;
    } else {
      const diffDays = Math.floor(diffHours / 24);
      return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    }
  };

  const formatDateBox = (dateString: string) => {
    if (!dateString) return { dayName: "", dayNum: "", monthYear: "" };
    const date = new Date(dateString);
    const dayName = date.toLocaleDateString("en-GB", { weekday: "short" }).toUpperCase();
    const dayNum = date.getDate().toString();
    const monthYear = date.toLocaleDateString("en-GB", { month: "short", year: "2-digit" });
    return { dayName, dayNum, monthYear };
  };

  const formatReceivedDate = (dateString: string) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    const now = new Date();
    const diffHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffHours < 1) {
      return "Just now";
    } else if (diffHours < 24) {
      return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    } else {
      const diffDays = Math.floor(diffHours / 24);
      return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "new": return "bg-gray-100 text-gray-800";
      case "booking_in_progress": return "bg-blue-100 text-blue-800";
      case "contract_sent": return "bg-purple-100 text-purple-800";
      case "confirmed": return "bg-green-100 text-green-800";
      case "rejected": return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const needsResponse = (enquiry: Enquiry) => {
    return enquiry.status === "new" || enquiry.status === "booking_in_progress";
  };

  if (isLoading) {
    return (
      <Card>
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
    <Card>
      <CardHeader className="pb-3 md:pb-6">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base md:text-lg">Enquiry Pipeline</CardTitle>
          <div className="flex items-center space-x-1 md:space-x-2">
            <Link href="/bookings">
              <Button variant="ghost" size="sm" className="h-8 w-8 md:h-10 md:w-10" title="View all bookings">
                <Eye className="w-3 h-3 md:w-4 md:h-4" />
              </Button>
            </Link>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="overflow-x-auto">
          <div className="flex space-x-6 min-w-max">
            {/* New Enquiries Column */}
            <div className="w-96">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-medium text-gray-900">New Enquiries</h4>
                <Badge variant="secondary">{groupedEnquiries.new.length}</Badge>
              </div>
              <div className="h-96 overflow-y-auto border rounded-lg bg-gray-50 p-2">
                <div className="space-y-3">
                  {groupedEnquiries.new.map((enquiry: Enquiry) => {
                    const dateBox = formatDateBox(enquiry.eventDate!);
                    return (
                      <Link key={enquiry.id} href="/bookings">
                        <Card className="hover:shadow-md transition-shadow bg-white cursor-pointer">
                          <CardContent className="p-4">
                            <div className="flex gap-4">
                              {/* Date Box */}
                              <div className="flex-shrink-0 w-16 h-16 border-2 border-gray-200 rounded-lg flex flex-col items-center justify-center bg-white">
                                <div className="text-xs text-red-500 font-medium">{dateBox.dayName}</div>
                                <div className="text-lg font-bold text-gray-900">{dateBox.dayNum}</div>
                                <div className="text-xs text-gray-500">{dateBox.monthYear}</div>
                              </div>
                              
                              {/* Main Content */}
                              <div className="flex-1">
                                {/* Price and Status Row */}
                                <div className="flex items-center justify-between mb-1">
                                  <div className="text-lg font-bold text-green-600">
                                    {enquiry.estimatedValue ? `£${enquiry.estimatedValue}` : "Price TBC"}
                                  </div>
                                  <div className="flex items-center space-x-2">
                                    {(() => {
                                      const conflict = getEnquiryConflict(enquiry.id);
                                      if (conflict) {
                                        return (
                                          <div className={`flex items-center space-x-1 px-2 py-1 rounded-full text-xs ${getConflictSeverityColor(conflict.severity)}`}>
                                            <AlertTriangle className="w-3 h-3" />
                                            <span>CONFLICT</span>
                                          </div>
                                        );
                                      }
                                      return null;
                                    })()}
                                    {needsResponse(enquiry) && (
                                      <div className="flex items-center space-x-1 bg-red-100 text-red-700 px-2 py-1 rounded-full text-xs">
                                        <AlertCircle className="w-3 h-3" />
                                        <span>Response needed</span>
                                      </div>
                                    )}
                                    {enquiry.applyNowLink && (
                                      <Badge className="bg-green-100 text-green-800 hover:bg-green-200 text-xs">
                                        🎯 ENCORE
                                      </Badge>
                                    )}
                                    <Badge className={getStatusColor(enquiry.status)} variant="secondary">
                                      {enquiry.status.replace('_', ' ').toUpperCase()}
                                    </Badge>
                                  </div>
                                </div>
                                
                                {/* Event Title */}
                                <h3 className="text-sm font-semibold text-gray-900 mb-2">{enquiry.title}</h3>
                                
                                {/* Event Details */}
                                <div className="space-y-1 text-xs text-gray-600">
                                  <div className="flex items-center">
                                    <User className="w-3 h-3 mr-1" />
                                    <span>{enquiry.clientName}</span>
                                  </div>
                                  {enquiry.eventTime && (
                                    <div className="flex items-center">
                                      <Clock className="w-3 h-3 mr-1" />
                                      <span>{enquiry.eventTime}</span>
                                    </div>
                                  )}
                                  {enquiry.venue && (
                                    <div className="flex items-center">
                                      <Calendar className="w-3 h-3 mr-1" />
                                      <span>{enquiry.venue}</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </Link>
                    );
                  })}
                  {groupedEnquiries.new.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      <p className="text-sm">No new enquiries</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* In Progress Column */}
            <div className="w-96">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-medium text-gray-900">In Progress</h4>
                <Badge className="bg-blue-100 text-blue-600">{groupedEnquiries.booking_in_progress.length}</Badge>
              </div>
              <div className="space-y-3">
                {groupedEnquiries.booking_in_progress.map((enquiry: Enquiry) => {
                  const dateBox = formatDateBox(enquiry.eventDate!);
                  const conflict = getEnquiryConflict(enquiry.id);
                  
                  return (
                    <Link key={enquiry.id} href="/bookings">
                      <Card className="hover:shadow-md transition-shadow bg-white cursor-pointer">
                        <CardContent className="p-4">
                          <div className="flex gap-4">
                            {/* Date Box */}
                            <div className="flex-shrink-0 w-16 h-16 border-2 border-gray-200 rounded-lg flex flex-col items-center justify-center bg-white">
                              <div className="text-xs text-red-500 font-medium">{dateBox.dayName}</div>
                              <div className="text-lg font-bold text-gray-900">{dateBox.dayNum}</div>
                              <div className="text-xs text-gray-500">{dateBox.monthYear}</div>
                            </div>
                            
                            {/* Main Content */}
                            <div className="flex-1">
                              {/* Price and Status Row */}
                              <div className="flex items-center justify-between mb-1">
                                <div className="text-lg font-bold text-green-600">
                                  {enquiry.estimatedValue ? `£${enquiry.estimatedValue}` : "Price TBC"}
                                </div>
                                <div className="flex items-center space-x-2">
                                  {conflict && (
                                    <div className={`flex items-center space-x-1 px-2 py-1 rounded-full text-xs ${getConflictSeverityColor(conflict.severity)}`}>
                                      <AlertTriangle className="w-3 h-3" />
                                      <span>CONFLICT</span>
                                    </div>
                                  )}
                                  <Badge className="bg-blue-100 text-blue-800" variant="secondary">
                                    IN PROGRESS
                                  </Badge>
                                </div>
                              </div>
                              
                              {/* Event Title */}
                              <h3 className="text-sm font-semibold text-gray-900 mb-2">{enquiry.title}</h3>
                              
                              {/* Event Details */}
                              <div className="space-y-1 text-xs text-gray-600">
                                <div className="flex items-center">
                                  <User className="w-3 h-3 mr-1" />
                                  <span>{enquiry.clientName}</span>
                                </div>
                                {enquiry.eventTime && (
                                  <div className="flex items-center">
                                    <Clock className="w-3 h-3 mr-1" />
                                    <span>{enquiry.eventTime}</span>
                                  </div>
                                )}
                                {enquiry.venue && (
                                  <div className="flex items-center">
                                    <Calendar className="w-3 h-3 mr-1" />
                                    <span>{enquiry.venue}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  );
                })}
                {groupedEnquiries.booking_in_progress.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <p className="text-sm">No enquiries in progress</p>
                  </div>
                )}
              </div>
            </div>

            {/* Contract Sent Column */}
            <div className="w-96">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-medium text-gray-900">Contract Sent</h4>
                <Badge className="bg-purple-100 text-purple-600">{groupedEnquiries.contract_sent.length}</Badge>
              </div>
              <div className="space-y-3">
                {groupedEnquiries.contract_sent.map((enquiry: Enquiry) => {
                  const dateBox = formatDateBox(enquiry.eventDate!);
                  const conflict = getEnquiryConflict(enquiry.id);
                  
                  return (
                    <Link key={enquiry.id} href="/bookings">
                      <Card className="hover:shadow-md transition-shadow bg-white cursor-pointer">
                        <CardContent className="p-4">
                          <div className="flex gap-4">
                            {/* Date Box */}
                            <div className="flex-shrink-0 w-16 h-16 border-2 border-gray-200 rounded-lg flex flex-col items-center justify-center bg-white">
                              <div className="text-xs text-red-500 font-medium">{dateBox.dayName}</div>
                              <div className="text-lg font-bold text-gray-900">{dateBox.dayNum}</div>
                              <div className="text-xs text-gray-500">{dateBox.monthYear}</div>
                            </div>
                            
                            {/* Main Content */}
                            <div className="flex-1">
                              {/* Price and Status Row */}
                              <div className="flex items-center justify-between mb-1">
                                <div className="text-lg font-bold text-green-600">
                                  {enquiry.estimatedValue ? `£${enquiry.estimatedValue}` : "Price TBC"}
                                </div>
                                <div className="flex items-center space-x-2">
                                  {conflict && (
                                    <div className={`flex items-center space-x-1 px-2 py-1 rounded-full text-xs ${getConflictSeverityColor(conflict.severity)}`}>
                                      <AlertTriangle className="w-3 h-3" />
                                      <span>CONFLICT</span>
                                    </div>
                                  )}
                                  <Badge className="bg-purple-100 text-purple-800" variant="secondary">
                                    PENDING
                                  </Badge>
                                </div>
                              </div>
                              
                              {/* Event Title */}
                              <h3 className="text-sm font-semibold text-gray-900 mb-2">{enquiry.title}</h3>
                              
                              {/* Event Details */}
                              <div className="space-y-1 text-xs text-gray-600">
                                <div className="flex items-center">
                                  <User className="w-3 h-3 mr-1" />
                                  <span>{enquiry.clientName}</span>
                                </div>
                                {enquiry.eventTime && (
                                  <div className="flex items-center">
                                    <Clock className="w-3 h-3 mr-1" />
                                    <span>{enquiry.eventTime}</span>
                                  </div>
                                )}
                                {enquiry.venue && (
                                  <div className="flex items-center">
                                    <Calendar className="w-3 h-3 mr-1" />
                                    <span>{enquiry.venue}</span>
                                  </div>
                                )}
                              </div>
                              
                              {/* Status Message */}
                              <div className="mt-2 text-xs text-purple-600 font-medium">
                                Contract sent, awaiting signature
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  );
                })}
                {groupedEnquiries.contract_sent.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <p className="text-sm">No pending contracts</p>
                  </div>
                )}
              </div>
            </div>

            {/* Confirmed Column */}
            <div className="w-96">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-medium text-gray-900">Confirmed</h4>
                <Badge className="bg-green-100 text-green-600">{groupedEnquiries.confirmed.length}</Badge>
              </div>
              <div className="space-y-3">
                {groupedEnquiries.confirmed.map((enquiry: Enquiry) => {
                  const dateBox = formatDateBox(enquiry.eventDate!);
                  const conflict = getEnquiryConflict(enquiry.id);
                  
                  return (
                    <Link key={enquiry.id} href="/bookings">
                      <Card className="hover:shadow-md transition-shadow bg-white cursor-pointer">
                        <CardContent className="p-4">
                          <div className="flex gap-4">
                            {/* Date Box */}
                            <div className="flex-shrink-0 w-16 h-16 border-2 border-gray-200 rounded-lg flex flex-col items-center justify-center bg-white">
                              <div className="text-xs text-red-500 font-medium">{dateBox.dayName}</div>
                              <div className="text-lg font-bold text-gray-900">{dateBox.dayNum}</div>
                              <div className="text-xs text-gray-500">{dateBox.monthYear}</div>
                            </div>
                            
                            {/* Main Content */}
                            <div className="flex-1">
                              {/* Price and Status Row */}
                              <div className="flex items-center justify-between mb-1">
                                <div className="text-lg font-bold text-green-600">
                                  {enquiry.estimatedValue ? `£${enquiry.estimatedValue}` : "Price TBC"}
                                </div>
                                <div className="flex items-center space-x-2">
                                  {conflict && (
                                    <div className={`flex items-center space-x-1 px-2 py-1 rounded-full text-xs ${getConflictSeverityColor(conflict.severity)}`}>
                                      <AlertTriangle className="w-3 h-3" />
                                      <span>CONFLICT</span>
                                    </div>
                                  )}
                                  <Badge className="bg-green-100 text-green-800" variant="secondary">
                                    CONFIRMED
                                  </Badge>
                                </div>
                              </div>
                              
                              {/* Event Title */}
                              <h3 className="text-sm font-semibold text-gray-900 mb-2">{enquiry.title}</h3>
                              
                              {/* Event Details */}
                              <div className="space-y-1 text-xs text-gray-600">
                                <div className="flex items-center">
                                  <User className="w-3 h-3 mr-1" />
                                  <span>{enquiry.clientName}</span>
                                </div>
                                {enquiry.eventTime && (
                                  <div className="flex items-center">
                                    <Clock className="w-3 h-3 mr-1" />
                                    <span>{enquiry.eventTime}</span>
                                  </div>
                                )}
                                {enquiry.venue && (
                                  <div className="flex items-center">
                                    <Calendar className="w-3 h-3 mr-1" />
                                    <span>{enquiry.venue}</span>
                                  </div>
                                )}
                              </div>
                              
                              {/* Status Message */}
                              <div className="mt-2 text-xs text-green-600 font-medium">
                                Ready to perform
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  );
                })}
                {groupedEnquiries.confirmed.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <p className="text-sm">No confirmed bookings</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
