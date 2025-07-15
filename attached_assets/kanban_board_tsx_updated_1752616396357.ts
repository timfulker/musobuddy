import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DollarSign, Clock, MoreHorizontal, Filter, Eye, User, Calendar, AlertCircle, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import type { Booking } from "@shared/schema";

export default function KanbanBoard() {
  const { data: bookings = [], isLoading } = useQuery({
    queryKey: ["/api/bookings"],
  });

  const { data: conflicts = [] } = useQuery({
    queryKey: ["/api/conflicts"],
    staleTime: 30000, // 30 seconds
    cacheTime: 5 * 60 * 1000, // 5 minutes
  });

  const groupedBookings = {
    new: bookings.filter((b: Booking) => b.status === "new"),
    booking_in_progress: bookings.filter((b: Booking) => b.status === "booking_in_progress"),
    contract_sent: bookings.filter((b: Booking) => b.status === "contract_sent"),
    confirmed: bookings.filter((b: Booking) => b.status === "confirmed"),
  };

  const getBookingConflict = (bookingId: number) => {
    return conflicts.find((conflict: any) => 
      conflict.enquiryId === bookingId && !conflict.resolved
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

  const needsResponse = (booking: Booking) => {
    return booking.status === "new" || booking.status === "booking_in_progress";
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Booking Pipeline</CardTitle>
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
          <CardTitle className="text-base md:text-lg">Booking Pipeline</CardTitle>
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
            {/* New Bookings Column */}
            <div className="w-96">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-medium text-gray-900">New Bookings</h4>
                <Badge variant="secondary">{groupedBookings.new.length}</Badge>
              </div>
              <div className="h-96 overflow-y-auto border rounded-lg bg-gray-50 p-2">
                <div className="space-y-3">
                  {groupedBookings.new.map((booking: Booking) => {
                    const dateBox = formatDateBox(booking.eventDate!);
                    return (
                      <Link key={booking.id} href="/bookings">
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
                                    {booking.estimatedValue ? `£${booking.estimatedValue}` : "Price TBC"}
                                  </div>
                                  <div className="flex items-center space-x-2">
                                    {(() => {
                                      const conflict = getBookingConflict(booking.id);
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
                                    {needsResponse(booking) && (
                                      <div className="flex items-center space-x-1 bg-red-100 text-red-700 px-2 py-1 rounded-full text-xs">
                                        <AlertCircle className="w-3 h-3" />
                                        <span>Response needed</span>
                                      </div>
                                    )}
                                    {booking.applyNowLink && (
                                      <Badge className="bg-green-100 text-green-800 hover:bg-green-200 text-xs">
                                        🎯 ENCORE
                                      </Badge>
                                    )}
                                    <Badge className={getStatusColor(booking.status)} variant="secondary">
                                      {booking.status.replace('_', ' ').toUpperCase()}
                                    </Badge>
                                  </div>
                                </div>
                                
                                {/* Event Title */}
                                <h3 className="text-sm font-semibold text-gray-900 mb-2">{booking.title}</h3>
                                
                                {/* Event Details */}
                                <div className="space-y-1 text-xs text-gray-600">
                                  <div className="flex items-center">
                                    <User className="w-3 h-3 mr-1" />
                                    <span>{booking.clientName}</span>
                                  </div>
                                  {booking.eventTime && (
                                    <div className="flex items-center">
                                      <Clock className="w-3 h-3 mr-1" />
                                      <span>{booking.eventTime}</span>
                                    </div>
                                  )}
                                  {booking.venue && (
                                    <div className="flex items-center">
                                      <Calendar className="w-3 h-3 mr-1" />
                                      <span>{booking.venue}</span>
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
                  {groupedBookings.new.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      <p className="text-sm">No new bookings</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* In Progress Column */}
            <div className="w-96">
              <div className="flex items-center justify-