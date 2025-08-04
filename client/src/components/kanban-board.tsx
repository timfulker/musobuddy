import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { Eye, User, Calendar, AlertTriangle, AlertCircle, Clock } from "lucide-react";
import type { Enquiry } from "@shared/schema";
import { getDisplayStatus, mapOldStatusToStage } from "@/utils/workflow-system";
import React, { useEffect, useState } from "react";
import { getBorderAccent, getBadgeColors } from "@/utils/status-colors";

export default function ActionableEnquiries() {
  const { data: enquiries = [], isLoading, error } = useQuery({
    queryKey: ["/api/bookings"],
    queryFn: async () => {
      const response = await fetch('/api/bookings', {
        credentials: 'include'
      });
      
      if (!response.ok) {
        console.error('❌ Bookings API error:', response.status, response.statusText);
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      return data;
    }
  });

  const formatDateBox = (dateString: string) => {
    if (!dateString) return { dayName: "", dayNum: "", monthYear: "" };
    const date = new Date(dateString);
    const dayName = date.toLocaleDateString("en-GB", { weekday: "short" }).toUpperCase();
    const dayNum = date.getDate().toString();
    const monthYear = date.toLocaleDateString("en-GB", { month: "short", year: "numeric" });
    return { dayName, dayNum, monthYear };
  };

  const needsResponse = (enquiry: Enquiry) => {
    // Only truly new enquiries need responses
    return enquiry.status === "new";
  };

  // Filter enquiries that need action (excluding resolved conflicts and completed gigs)
  const actionableEnquiries = (enquiries as any[]).filter((enquiry: any) => {
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

  const renderEnquiryCard = (enquiry: any, showUrgent = false) => {
    const dateBox = formatDateBox(enquiry.eventDate?.toString() || '');
    
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
    
    return (
      <Card key={enquiry.id} className={`bg-white hover:shadow-md transition-shadow border-l-4 ${getCardStyling()}`}>
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
                      </div>
                    )}
                    
                    {enquiry.venue && (
                      <div className="flex items-center">
                        <Calendar className="w-3 h-3 mr-1 flex-shrink-0" />
                        <span className="truncate">{enquiry.venue}</span>
                      </div>
                    )}
                    
                    {enquiry.eventTime && (
                      <div className="text-xs text-gray-500">
                        Time: {enquiry.eventTime}
                        {enquiry.eventEndTime && ` - ${enquiry.eventEndTime}`}
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="flex flex-col items-end space-y-2 ml-2">
                  {enquiry.fee && (
                    <div className="text-right">
                      <div className="text-sm font-medium text-gray-900">
                        {enquiry.fee === "TBC" ? "£TBC" : `£${enquiry.fee}`}
                      </div>
                    </div>
                  )}
                  
                  <div className="flex items-center space-x-2">
                    <Badge variant="secondary" className={getBadgeColors(enquiry.status)}>
                      {getDisplayStatus(enquiry.status)}
                    </Badge>
                    
                    <Link href={`/bookings?id=${enquiry.id}`}>
                      <Button variant="outline" size="sm">
                        <Eye className="w-3 h-3 mr-1" />
                        View
                      </Button>
                    </Link>
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
        <CardTitle className="flex items-center space-x-2">
          <Clock className="w-5 h-5 text-primary" />
          <span>Action Required</span>
          <Badge variant="secondary" className="ml-auto">
            {actionableEnquiries.length} items
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {actionableEnquiries.map((enquiry) => renderEnquiryCard(enquiry))}
      </CardContent>
    </Card>
  );
}