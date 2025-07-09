import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DollarSign, Clock, MoreHorizontal, Filter, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import type { Enquiry } from "@shared/schema";

export default function KanbanBoard() {
  const { data: enquiries = [], isLoading } = useQuery({
    queryKey: ["/api/enquiries"],
  });

  const groupedEnquiries = {
    new: enquiries.filter((e: Enquiry) => e.status === "new"),
    qualified: enquiries.filter((e: Enquiry) => e.status === "qualified"),
    contract_sent: enquiries.filter((e: Enquiry) => e.status === "contract_sent"),
    confirmed: enquiries.filter((e: Enquiry) => e.status === "confirmed"),
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "new": return "bg-gray-50 border-l-gray-300";
      case "qualified": return "bg-blue-50 border-l-blue-400";
      case "contract_sent": return "bg-purple-50 border-l-purple-400";
      case "confirmed": return "bg-green-50 border-l-green-400";
      default: return "bg-gray-50 border-l-gray-300";
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "new": return <Badge variant="secondary">NEW</Badge>;
      case "qualified": return <Badge className="bg-blue-100 text-blue-800">IN PROGRESS</Badge>;
      case "contract_sent": return <Badge className="bg-purple-100 text-purple-800">PENDING</Badge>;
      case "confirmed": return <Badge className="bg-green-100 text-green-800">CONFIRMED</Badge>;
      default: return <Badge variant="secondary">NEW</Badge>;
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
            <Link href="/enquiries">
              <Button variant="ghost" size="sm" className="h-8 w-8 md:h-10 md:w-10" title="View all enquiries">
                <Eye className="w-3 h-3 md:w-4 md:h-4" />
              </Button>
            </Link>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="overflow-x-auto">
          <div className="flex space-x-3 md:space-x-6 min-w-max">
            {/* New Enquiries Column */}
            <div className="w-64 md:w-80">
              <div className="flex items-center justify-between mb-2 md:mb-4">
                <h4 className="font-medium text-gray-900 text-sm md:text-base">New Enquiries</h4>
                <Badge variant="secondary">{groupedEnquiries.new.length}</Badge>
              </div>
              <div className="space-y-2 md:space-y-3">
                {groupedEnquiries.new.map((enquiry: Enquiry) => (
                  <Link key={enquiry.id} href="/enquiries">
                    <div className={`p-3 md:p-4 rounded-lg border-l-4 hover:shadow-md transition-shadow cursor-pointer ${getStatusColor(enquiry.status)}`}>
                      <div className="flex items-start justify-between mb-1 md:mb-2">
                        <h5 className="font-medium text-gray-900 text-sm md:text-base">{enquiry.title}</h5>
                        {getStatusBadge(enquiry.status)}
                      </div>
                      <p className="text-xs md:text-sm text-gray-600 mb-1 md:mb-2">{enquiry.clientName}</p>
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <span className="flex items-center">
                          <DollarSign className="w-3 h-3 mr-1" />
                          £{enquiry.estimatedValue || "TBC"}
                        </span>
                        <span className="flex items-center">
                          <Clock className="w-3 h-3 mr-1" />
                          {formatTime(enquiry.createdAt!)}
                        </span>
                      </div>
                    </div>
                  </Link>
                ))}
                {groupedEnquiries.new.length === 0 && (
                  <div className="text-center py-4 md:py-8 text-gray-500">
                    <p className="text-sm">No new enquiries</p>
                  </div>
                )}
              </div>
            </div>

            {/* In Progress Column */}
            <div className="w-80">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-medium text-gray-900">In Progress</h4>
                <Badge className="bg-blue-100 text-blue-600">{groupedEnquiries.qualified.length}</Badge>
              </div>
              <div className="space-y-3">
                {groupedEnquiries.qualified.map((enquiry: Enquiry) => (
                  <Link key={enquiry.id} href="/enquiries">
                    <div className={`p-4 rounded-lg border-l-4 hover:shadow-md transition-shadow cursor-pointer ${getStatusColor(enquiry.status)}`}>
                      <div className="flex items-start justify-between mb-2">
                        <h5 className="font-medium text-gray-900">{enquiry.title}</h5>
                        {getStatusBadge(enquiry.status)}
                      </div>
                      <p className="text-sm text-gray-600 mb-2">{enquiry.clientName}</p>
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <span className="flex items-center">
                          <DollarSign className="w-3 h-3 mr-1" />
                          £{enquiry.estimatedValue || "TBC"}
                        </span>
                        <span className="flex items-center">
                          <Clock className="w-3 h-3 mr-1" />
                          {formatTime(enquiry.createdAt!)}
                        </span>
                      </div>
                      {enquiry.eventDate && (
                        <div className="mt-2 text-xs text-blue-600">
                          Event: {formatDate(enquiry.eventDate)}
                        </div>
                      )}
                    </div>
                  </Link>
                ))}
                {groupedEnquiries.qualified.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <p>No enquiries in progress</p>
                  </div>
                )}
              </div>
            </div>

            {/* Contract Sent Column */}
            <div className="w-80">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-medium text-gray-900">Contract Sent</h4>
                <Badge className="bg-purple-100 text-purple-600">{groupedEnquiries.contract_sent.length}</Badge>
              </div>
              <div className="space-y-3">
                {groupedEnquiries.contract_sent.map((enquiry: Enquiry) => (
                  <Link key={enquiry.id} href="/enquiries">
                    <div className={`p-4 rounded-lg border-l-4 hover:shadow-md transition-shadow cursor-pointer ${getStatusColor(enquiry.status)}`}>
                      <div className="flex items-start justify-between mb-2">
                        <h5 className="font-medium text-gray-900">{enquiry.title}</h5>
                        {getStatusBadge(enquiry.status)}
                      </div>
                      <p className="text-sm text-gray-600 mb-2">{enquiry.clientName}</p>
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <span className="flex items-center">
                          <DollarSign className="w-3 h-3 mr-1" />
                          £{enquiry.estimatedValue || "TBC"}
                        </span>
                        <span className="flex items-center">
                          <Clock className="w-3 h-3 mr-1" />
                          {formatTime(enquiry.createdAt!)}
                        </span>
                      </div>
                      <div className="mt-2 text-xs text-purple-600">
                        Contract sent, awaiting signature
                      </div>
                    </div>
                  </Link>
                ))}
                {groupedEnquiries.contract_sent.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <p>No pending contracts</p>
                  </div>
                )}
              </div>
            </div>

            {/* Confirmed Column */}
            <div className="w-80">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-medium text-gray-900">Confirmed</h4>
                <Badge className="bg-green-100 text-green-600">{groupedEnquiries.confirmed.length}</Badge>
              </div>
              <div className="space-y-3">
                {groupedEnquiries.confirmed.map((enquiry: Enquiry) => (
                  <Link key={enquiry.id} href="/enquiries">
                    <div className={`p-4 rounded-lg border-l-4 hover:shadow-md transition-shadow cursor-pointer ${getStatusColor(enquiry.status)}`}>
                      <div className="flex items-start justify-between mb-2">
                        <h5 className="font-medium text-gray-900">{enquiry.title}</h5>
                        {getStatusBadge(enquiry.status)}
                      </div>
                      <p className="text-sm text-gray-600 mb-2">{enquiry.clientName}</p>
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <span className="flex items-center">
                          <DollarSign className="w-3 h-3 mr-1" />
                          £{enquiry.estimatedValue || "TBC"}
                        </span>
                        {enquiry.venue && (
                          <span className="flex items-center">
                            {enquiry.venue}
                          </span>
                        )}
                      </div>
                      <div className="mt-2 text-xs text-green-600">
                        All documents signed, ready to perform
                      </div>
                    </div>
                  </Link>
                ))}
                {groupedEnquiries.confirmed.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <p>No confirmed bookings</p>
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
