import { format } from 'date-fns';
import { Calendar, MapPin, Clock, DollarSign, User, Phone, Mail, MessageSquare, CreditCard } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Link } from 'wouter';
import ConflictIndicator from '@/components/ConflictIndicator';
import { useQuery } from '@tanstack/react-query';
import { memo, useMemo } from 'react';
import { determineCurrentStage, getStageDefinition, getStageColor } from '../../../shared/workflow-stages';

interface MobileBookingCardProps {
  booking: any;
  conflicts?: any[];
}

const MobileBookingCard = memo(function MobileBookingCard({ booking, conflicts = [] }: MobileBookingCardProps) {
  // Fetch invoices data to show invoice status - optimized with caching
  const { data: invoices = [] } = useQuery({
    queryKey: ["/api/invoices"],
    staleTime: 300000, // Cache for 5 minutes
    retry: 2,
  });

  // Invoice status helper - memoized for performance
  const invoiceStatusIcon = useMemo(() => {
    return getInvoiceStatusIcon(booking.id);
  }, [invoices, booking.id]);

  // Determine the current workflow stage based on booking data - memoized for performance
  const currentWorkflowStage = useMemo(() => {
    return booking.workflowStage || determineCurrentStage(booking);
  }, [booking.workflowStage, booking.contractSigned, booking.contractSent, booking.lastContactedAt, booking.invoiceSent, booking.paidInFull, booking.eventDate]);

  // Get stage definition for display
  const stageDefinition = useMemo(() => {
    return getStageDefinition(currentWorkflowStage);
  }, [currentWorkflowStage]);

  const getInvoiceStatusIcon = (bookingId: number) => {
    const invoice = invoices.find((inv: any) => inv.bookingId === bookingId);
    
    if (!invoice || invoice.status === 'draft') {
      return null; // Don't show if no invoice or still draft
    }

    if (invoice.status === 'paid') {
      return (
        <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-300">
          <CreditCard className="w-3 h-3 mr-1" />
          Invoice Paid
        </Badge>
      );
    }

    if (invoice.status === 'sent' || invoice.status === 'overdue') {
      return (
        <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-300">
          <Mail className="w-3 h-3 mr-1" />
          Invoice Sent
        </Badge>
      );
    }

    return null;
  };


  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'EEE, MMM d');
    } catch {
      return 'TBC';
    }
  };

  const formatTime = (timeString: string) => {
    if (!timeString || timeString === 'TBC') return 'Time TBC';
    try {
      const [hours, minutes] = timeString.split(':');
      const date = new Date();
      date.setHours(parseInt(hours), parseInt(minutes));
      return format(date, 'h:mm a');
    } catch {
      return timeString;
    }
  };

  return (
    <Card className="hover:shadow-md transition-shadow relative">
      {/* Conflict Indicator */}
      {conflicts.length > 0 && (
        <ConflictIndicator
          bookingId={booking.id}
          conflicts={conflicts}
        />
      )}
      
      <CardContent className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-lg truncate">
              {booking.clientName || 'Unnamed Client'}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
              {booking.eventType || 'Music Performance'}
            </p>
          </div>
          <Badge className={`ml-2 text-xs ${getStageColor(currentWorkflowStage)}`}>
            {stageDefinition?.icon} {stageDefinition?.label || 'Pending'}
          </Badge>
        </div>

        {/* Event Details */}
        <div className="space-y-2 mb-4">
          <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
            <Calendar className="w-4 h-4 mr-2 flex-shrink-0" />
            <span>{formatDate(booking.eventDate)}</span>
          </div>
          
          <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
            <Clock className="w-4 h-4 mr-2 flex-shrink-0" />
            <span>{formatTime(booking.eventTime)}</span>
          </div>

          {booking.venue && (
            <div className="flex items-start text-sm text-gray-600 dark:text-gray-400">
              <MapPin className="w-4 h-4 mr-2 flex-shrink-0 mt-0.5" />
              <span className="line-clamp-2">{booking.venue}</span>
            </div>
          )}

          <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
            {booking.fee && (
              <div className="flex items-center">
                <DollarSign className="w-4 h-4 mr-2 flex-shrink-0" />
                <span>£{booking.fee}</span>
              </div>
            )}
            {/* Invoice Status Badge */}
            {invoiceStatusIcon}
          </div>
        </div>

        {/* Client Contact */}
        <div className="border-t pt-3 mb-4">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center text-gray-600 dark:text-gray-400">
              <User className="w-4 h-4 mr-2" />
              <span className="truncate">{booking.clientEmail}</span>
            </div>
          </div>
          
          {booking.clientPhone && (
            <div className="flex items-center text-sm text-gray-600 dark:text-gray-400 mt-1">
              <Phone className="w-4 h-4 mr-2" />
              <span>{booking.clientPhone}</span>
            </div>
          )}
        </div>

        {/* Mobile Actions */}
        <div className="flex gap-2">
          <Link href={`/conversation?bookingId=${booking.id}`} className="flex-1">
            <Button variant="outline" size="sm" className="w-full">
              <MessageSquare className="w-4 h-4 mr-2" />
              Message
            </Button>
          </Link>
          
          <Link href={`/bookings?id=${booking.id}`} className="flex-1">
            <Button variant="default" size="sm" className="w-full">
              View Details
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
});

export default MobileBookingCard;