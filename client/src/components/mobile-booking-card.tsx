import { format } from 'date-fns';
import { Calendar, MapPin, Clock, DollarSign, User, Phone, Mail, MessageSquare } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Link } from 'wouter';

interface MobileBookingCardProps {
  booking: any;
}

export default function MobileBookingCard({ booking }: MobileBookingCardProps) {
  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'confirmed': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'pending': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'completed': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'cancelled': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
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
    <Card className="hover:shadow-md transition-shadow">
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
          <Badge className={`ml-2 text-xs ${getStatusColor(booking.status)}`}>
            {booking.status || 'Pending'}
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

          {booking.fee && (
            <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
              <DollarSign className="w-4 h-4 mr-2 flex-shrink-0" />
              <span>£{booking.fee}</span>
            </div>
          )}
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
}