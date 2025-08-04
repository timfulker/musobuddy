import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MessageCircle, FileText, Receipt, Clock, ArrowRight } from "lucide-react";
import { useLocation } from "wouter";
import { type BookingWithRelations } from "@shared/schema";
import { getContextualActions } from "@/utils/contextual-actions";
import { mapOldStatusToStage } from "@/utils/workflow-system";

type Booking = {
  id: number;
  clientName: string;
  title: string;
  eventDate: string;
  status: string;
  responseNeeded: boolean;
};

type Contract = {
  id: number;
  enquiryId: number;
  isSigned: boolean;
  status: string;
};

type Invoice = {
  id: number;
  contractId: number;
  status: string;
};

export default function BookingCTAButtons() {
  const [location, setLocation] = useLocation();

  const { data: bookings = [], isLoading: bookingsLoading } = useQuery<BookingWithRelations[]>({
    queryKey: ["/api/bookings"],
  });

  const isLoading = bookingsLoading;

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
          <div className="animate-pulse space-y-3">
            <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded"></div>
            <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded"></div>
            <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Debug logging removed for performance

  // Performance optimization: Debug logging removed

  // Use contextual actions to determine what bookings need attention
  // Only show bookings that genuinely need action and aren't completed or cancelled
  const needsResponse = bookings.filter(
    (booking) => {
      // Exclude actioned bookings with these statuses
      const excludeStatuses = [
        "completed", "cancelled", "confirmed", "contract_sent", 
        "in_progress", "awaiting_response", "client_confirms"
      ];
      
      if (excludeStatuses.includes(booking.status)) {
        return false;
      }
      
      // Only show truly new bookings that need responses
      return booking.status === "new";
    }
  );

  const needsContract = bookings.filter(booking => {
    // Exclude all actioned, completed, or resolved bookings
    const excludeStatuses = [
      "completed", "cancelled", "confirmed", "contract_sent"
    ];
    
    if (excludeStatuses.includes(booking.status)) {
      return false;
    }
    
    // Check if booking has existing contracts
    const contracts = booking.contracts || [];
    if (contracts.length > 0) {
      return false;
    }
    
    // Only show bookings in client_confirms status that genuinely need contracts
    const actions = getContextualActions(booking);
    return booking.status === "client_confirms" && 
           actions.some(action => action.id === 'create-contract');
  });

  const needsInvoice = bookings.filter(booking => {
    // Exclude completed or cancelled bookings
    const excludeStatuses = ["completed", "cancelled"];
    
    if (excludeStatuses.includes(booking.status)) {
      return false;
    }
    
    // Check if booking has existing invoices
    const invoices = booking.invoices || [];
    if (invoices.length > 0) {
      return false;
    }
    
    // Only show confirmed bookings that genuinely need invoices
    const actions = getContextualActions(booking);
    const needsInvoiceAction = booking.status === "confirmed" && 
           actions.some(action => action.id === 'create-invoice');
    
    // Removed excessive debug logging for performance
    
    return needsInvoiceAction;
  });

  // Define contracts and invoices arrays for the template
  const contracts = needsContract;
  const invoices = needsInvoice;

  // CTA counts calculated

  const ctaButtons = [
    {
      title: "Bookings Need Response",
      count: needsResponse.length,
      color: "bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600",
      icon: MessageCircle,
      action: () => setLocation("/bookings"),
    },
    {
      title: "Contracts Need Sending",
      count: needsContract.length,
      color: "bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600",
      icon: FileText,
      action: () => setLocation("/bookings"),
    },
    {
      title: "Invoices Need Sending",
      count: needsInvoice.length,
      color: "bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600",
      icon: Receipt,
      action: () => setLocation("/bookings"),
    },
  ];

  // Don't show the component if there are no actionable items
  const totalActionable = needsResponse.length + needsContract.length + needsInvoice.length;
  
  if (totalActionable === 0) {
    return null;
  }

  return (
    <Card className="shadow-lg border-0 bg-gradient-to-br from-white to-gray-50 dark:from-slate-900 dark:to-slate-800">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Clock className="w-5 h-5 text-purple-600" />
          <span>Action Required</span>
          <Badge variant="secondary" className="ml-auto">
            {totalActionable} items
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {ctaButtons.map((button, index) => {
          const Icon = button.icon;
          
          if (button.count === 0) return null;

          return (
            <Button
              key={index}
              onClick={button.action}
              className={`w-full justify-start p-3 h-auto text-white shadow-md transition-all duration-200 overflow-hidden ${button.color}`}
              variant="default"
            >
              <div className="flex items-center w-full min-w-0">
                <Icon className="w-4 h-4 flex-shrink-0 mr-2" />
                <span className="font-medium text-sm flex-1 text-left truncate mr-2">{button.title}</span>
                <span className="text-lg font-bold text-white flex-shrink-0 min-w-[24px] text-center">{button.count}</span>
              </div>
            </Button>
          );
        })}
      </CardContent>
    </Card>
  );
}