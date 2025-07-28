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
            <Clock className="w-5 h-5 text-purple-600" />
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

  // Use contextual actions to determine what bookings need attention
  const needsResponse = bookings.filter(
    (booking) => booking.status === "new" || booking.responseNeeded
  );

  const needsContract = bookings.filter(booking => {
    const actions = getContextualActions(booking);
    return actions.some(action => action.id === 'create-contract' || action.id === 'send-contract');
  });

  const needsInvoice = bookings.filter(booking => {
    const actions = getContextualActions(booking);
    return actions.some(action => action.id === 'create-invoice' || action.id === 'send-invoice');
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
      description: "Enquiries waiting for your response",
      action: () => setLocation("/bookings"),
    },
    {
      title: "Contracts Need Sending",
      count: needsContract.length,
      color: "bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600",
      icon: FileText,
      description: "Negotiations ready for contracts",
      action: () => setLocation("/contracts"),
    },
    {
      title: "Invoices Need Sending",
      count: needsInvoice.length,
      color: "bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600",
      icon: Receipt,
      description: "Signed contracts ready for invoicing",
      action: () => setLocation("/invoices"),
    },
  ];

  // Don't show the component if there are no actionable items
  const totalActionable = needsResponse.length + needsContract.length + needsInvoice.length;
  
  // For testing purposes, always show at least one button
  const testMode = totalActionable === 0;
  if (testMode) {
    // Show test buttons with sample data
    return (
      <Card className="shadow-lg border-0 bg-gradient-to-br from-white to-gray-50 dark:from-slate-900 dark:to-slate-800">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Clock className="w-5 h-5 text-purple-600" />
            <span>Action Required</span>
            <Badge variant="secondary" className="ml-auto">
              {bookings.length} bookings
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button
            onClick={() => setLocation("/bookings")}
            className="w-full justify-between p-4 h-auto text-white shadow-md transition-all duration-200 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"
            variant="default"
          >
            <div className="flex items-center space-x-3">
              <MessageCircle className="w-5 h-5" />
              <div className="text-left">
                <div className="font-medium">Bookings Need Response</div>
                <div className="text-xs opacity-90">View all bookings to respond</div>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Badge variant="secondary" className="bg-white/20 text-white">
                {bookings.length}
              </Badge>
              <ArrowRight className="w-4 h-4" />
            </div>
          </Button>
          <Button
            onClick={() => setLocation("/contracts")}
            className="w-full justify-between p-4 h-auto text-white shadow-md transition-all duration-200 bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600"
            variant="default"
          >
            <div className="flex items-center space-x-3">
              <FileText className="w-5 h-5" />
              <div className="text-left">
                <div className="font-medium">Contracts Need Sending</div>
                <div className="text-xs opacity-90">View contracts to send</div>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Badge variant="secondary" className="bg-white/20 text-white">
                {contracts.length}
              </Badge>
              <ArrowRight className="w-4 h-4" />
            </div>
          </Button>
          <Button
            onClick={() => setLocation("/invoices")}
            className="w-full justify-between p-4 h-auto text-white shadow-md transition-all duration-200 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600"
            variant="default"
          >
            <div className="flex items-center space-x-3">
              <Receipt className="w-5 h-5" />
              <div className="text-left">
                <div className="font-medium">Invoices Need Sending</div>
                <div className="text-xs opacity-90">View invoices to send</div>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Badge variant="secondary" className="bg-white/20 text-white">
                {invoices.length}
              </Badge>
              <ArrowRight className="w-4 h-4" />
            </div>
          </Button>
        </CardContent>
      </Card>
    );
  }
  
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
              className={`w-full justify-between p-4 h-auto text-white shadow-md transition-all duration-200 ${button.color}`}
              variant="default"
            >
              <div className="flex items-center space-x-3">
                <Icon className="w-5 h-5" />
                <div className="text-left">
                  <div className="font-medium">{button.title}</div>
                  <div className="text-xs opacity-90">{button.description}</div>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Badge variant="secondary" className="bg-white/20 text-white">
                  {button.count}
                </Badge>
                <ArrowRight className="w-4 h-4" />
              </div>
            </Button>
          );
        })}
      </CardContent>
    </Card>
  );
}