import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MessageCircle, FileText, Receipt, Clock, ArrowRight } from "lucide-react";
import { useLocation } from "wouter";

type Booking = {
  id: string;
  clientName: string;
  eventName: string;
  eventDate: string;
  status: string;
  hasContract: boolean;
  hasInvoice: boolean;
  contractSigned: boolean;
  invoiceStatus: string;
};

export default function BookingCTAButtons() {
  const [location, setLocation] = useLocation();

  const { data: bookings = [], isLoading } = useQuery<Booking[]>({
    queryKey: ["/api/bookings"],
  });

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

  // Filter bookings that need responses (enquiry status)
  const needsResponse = bookings.filter(
    (booking) => booking.status === "enquiry" || booking.status === "pending"
  );

  // Filter bookings that need contracts sent (confirmed but no contract or unsigned)
  const needsContract = bookings.filter(
    (booking) => 
      booking.status === "confirmed" && 
      (!booking.hasContract || !booking.contractSigned)
  );

  // Filter bookings that need invoices sent (have signed contract but no invoice or unpaid)
  const needsInvoice = bookings.filter(
    (booking) => 
      booking.contractSigned && 
      (!booking.hasInvoice || booking.invoiceStatus === "draft" || booking.invoiceStatus === "pending")
  );

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
      description: "Confirmed bookings without contracts",
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