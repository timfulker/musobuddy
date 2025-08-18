import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  MapPin, 
  Calendar, 
  Clock, 
  User, 
  Phone, 
  Mail, 
  DollarSign, 
  FileText, 
  Navigation,
  Printer,
  ArrowLeft
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { useState } from "react";

interface BookingData {
  id: string;
  clientName?: string;
  clientEmail?: string;
  clientPhone?: string;
  venue?: string;
  venueAddress?: string;
  eventDate?: string;
  eventTime?: string;
  actualPerformanceTime?: string;
  endTime?: string;
  eventType?: string;
  fee?: number;
  paymentTerms?: string;
  status?: string;
  notes?: string;
  clientNotes?: string;
  specialRequirements?: string;
  travelDistance?: number;
  travelTime?: string;
  what3words?: string;
  setupTime?: string;
  packDownTime?: string;
  duration?: string;
  additionalInfo?: string;
  bookingSource?: string;
}

export default function BookingSummary() {
  const { bookingId } = useParams();
  const [showMap, setShowMap] = useState(false);

  const { data: booking, isLoading } = useQuery({
    queryKey: [`/api/bookings/${bookingId}`],
    enabled: !!bookingId,
  }) as { data: BookingData | undefined; isLoading: boolean };

  const handlePrint = () => {
    window.print();
  };

  const handleGoBack = () => {
    window.close();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading booking summary...</p>
        </div>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Booking Not Found</h1>
          <p className="text-gray-600">The requested booking could not be found.</p>
        </div>
      </div>
    );
  }

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return null;
    try {
      return format(parseISO(dateString), "EEEE, MMMM do, yyyy");
    } catch {
      return dateString;
    }
  };

  const formatTime = (timeString: string | undefined) => {
    if (!timeString) return null;
    return timeString;
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Print Header - Only visible when printing */}
      <div className="print:block hidden text-center mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Booking Summary</h1>
        <p className="text-gray-600">Generated from MusoBuddy</p>
        <hr className="my-4" />
      </div>

      {/* Screen Header - Hidden when printing */}
      <div className="print:hidden bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Booking Summary</h1>
            <p className="text-gray-600">Print-friendly gig sheet</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleGoBack}>
              <ArrowLeft className="w-4 h-4 mr-1" />
              Close
            </Button>
            <Button onClick={handlePrint} className="bg-green-600 hover:bg-green-700">
              <Printer className="w-4 h-4 mr-1" />
              Print
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-6 space-y-6">
        {/* Event Overview */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Event Details
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {booking.eventDate && (
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-gray-500" />
                  <span className="font-semibold">Date:</span>
                  <span>{formatDate(booking.eventDate)}</span>
                </div>
              )}
              
              {booking.eventTime && (
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-gray-500" />
                  <span className="font-semibold">Time:</span>
                  <span>{formatTime(booking.eventTime)}</span>
                </div>
              )}
              
              {booking.actualPerformanceTime && (
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-gray-500" />
                  <span className="font-semibold">Performance Time:</span>
                  <span>{formatTime(booking.actualPerformanceTime)}</span>
                </div>
              )}
              
              {booking.endTime && (
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-gray-500" />
                  <span className="font-semibold">End Time:</span>
                  <span>{formatTime(booking.endTime)}</span>
                </div>
              )}
              
              {booking.duration && (
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-gray-500" />
                  <span className="font-semibold">Duration:</span>
                  <span>{booking.duration}</span>
                </div>
              )}
              
              {booking.eventType && (
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-gray-500" />
                  <span className="font-semibold">Event Type:</span>
                  <span>{booking.eventType}</span>
                </div>
              )}
              
              {booking.status && (
                <div className="flex items-center gap-2">
                  <span className="font-semibold">Status:</span>
                  <Badge variant="outline">{booking.status}</Badge>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Venue Information */}
        {(booking.venue || booking.venueAddress || booking.what3words) && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="w-5 h-5" />
                Venue Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {booking.venue && (
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-gray-500" />
                    <span className="font-semibold">Venue:</span>
                    <span className="text-lg">{booking.venue}</span>
                  </div>
                )}
                
                {booking.venueAddress && (
                  <div className="flex items-start gap-2">
                    <Navigation className="w-4 h-4 text-gray-500 mt-1" />
                    <div>
                      <span className="font-semibold">Address:</span>
                      <p className="text-gray-700 whitespace-pre-line">{booking.venueAddress}</p>
                    </div>
                  </div>
                )}
                
                {booking.what3words && (
                  <div className="flex items-center gap-2">
                    <Navigation className="w-4 h-4 text-gray-500" />
                    <span className="font-semibold">what3words:</span>
                    <code className="bg-gray-100 px-2 py-1 rounded text-sm">{booking.what3words}</code>
                  </div>
                )}
                
                {booking.travelDistance && (
                  <div className="flex items-center gap-2">
                    <Navigation className="w-4 h-4 text-gray-500" />
                    <span className="font-semibold">Distance:</span>
                    <span>{booking.travelDistance} miles</span>
                  </div>
                )}
                
                {booking.travelTime && (
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-gray-500" />
                    <span className="font-semibold">Travel Time:</span>
                    <span>{booking.travelTime}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Client Information */}
        {(booking.clientName || booking.clientEmail || booking.clientPhone) && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5" />
                Client Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {booking.clientName && (
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-gray-500" />
                    <span className="font-semibold">Name:</span>
                    <span>{booking.clientName}</span>
                  </div>
                )}
                
                {booking.clientEmail && (
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-gray-500" />
                    <span className="font-semibold">Email:</span>
                    <span>{booking.clientEmail}</span>
                  </div>
                )}
                
                {booking.clientPhone && (
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-gray-500" />
                    <span className="font-semibold">Phone:</span>
                    <span>{booking.clientPhone}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Financial Information */}
        {(booking.fee || booking.paymentTerms) && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="w-5 h-5" />
                Financial Details
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {booking.fee && (
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-gray-500" />
                    <span className="font-semibold">Fee:</span>
                    <span className="text-lg font-bold text-green-600">£{booking.fee}</span>
                  </div>
                )}
                
                {booking.paymentTerms && (
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-gray-500" />
                    <span className="font-semibold">Payment Terms:</span>
                    <span>{booking.paymentTerms}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Setup & Performance Details */}
        {(booking.setupTime || booking.packDownTime || booking.specialRequirements) && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5" />
                Setup & Performance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {booking.setupTime && (
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-gray-500" />
                    <span className="font-semibold">Setup Time:</span>
                    <span>{booking.setupTime}</span>
                  </div>
                )}
                
                {booking.packDownTime && (
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-gray-500" />
                    <span className="font-semibold">Pack Down Time:</span>
                    <span>{booking.packDownTime}</span>
                  </div>
                )}
                
                {booking.specialRequirements && (
                  <div className="flex items-start gap-2">
                    <FileText className="w-4 h-4 text-gray-500 mt-1" />
                    <div>
                      <span className="font-semibold">Special Requirements:</span>
                      <p className="text-gray-700 whitespace-pre-line">{booking.specialRequirements}</p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Notes & Additional Information */}
        {(booking.notes || booking.clientNotes || booking.additionalInfo) && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Notes & Additional Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {booking.notes && (
                  <div>
                    <h4 className="font-semibold mb-2">Internal Notes:</h4>
                    <p className="text-gray-700 whitespace-pre-line bg-gray-50 p-3 rounded-lg">{booking.notes}</p>
                  </div>
                )}
                
                {booking.clientNotes && (
                  <div>
                    <h4 className="font-semibold mb-2">Client Notes:</h4>
                    <p className="text-gray-700 whitespace-pre-line bg-blue-50 p-3 rounded-lg">{booking.clientNotes}</p>
                  </div>
                )}
                
                {booking.additionalInfo && (
                  <div>
                    <h4 className="font-semibold mb-2">Additional Information:</h4>
                    <p className="text-gray-700 whitespace-pre-line">{booking.additionalInfo}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Source Information */}
        {booking.bookingSource && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Booking Source
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <span className="font-semibold">Source:</span>
                <Badge variant="secondary">{booking.bookingSource}</Badge>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Map Section - Optional */}
        {booking.venueAddress && (
          <Card className="print:break-inside-avoid">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="w-5 h-5" />
                Location Map
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setShowMap(!showMap)}
                  className="ml-auto print:hidden"
                >
                  {showMap ? 'Hide' : 'Show'} Map
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {showMap && (
                <div className="w-full h-64 bg-gray-100 rounded-lg flex items-center justify-center">
                  <iframe
                    width="100%"
                    height="100%"
                    frameBorder="0"
                    src={`https://www.google.com/maps/embed/v1/place?key=${import.meta.env.VITE_GOOGLE_MAPS_BROWSER_KEY}&q=${encodeURIComponent(booking.venueAddress)}`}
                    allowFullScreen
                    className="rounded-lg"
                  />
                </div>
              )}
              {!showMap && (
                <p className="text-gray-500 text-center py-8">Click "Show Map" to view location</p>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Print Footer */}
      <div className="print:block hidden mt-8 pt-4 border-t border-gray-200 text-center text-sm text-gray-600">
        <p>Generated by MusoBuddy • {format(new Date(), "PPP 'at' p")}</p>
      </div>

      {/* Print Styles */}
      <style dangerouslySetInnerHTML={{
        __html: `
          @media print {
            @page {
              margin: 1in;
              size: A4;
            }
            
            body {
              print-color-adjust: exact;
              -webkit-print-color-adjust: exact;
            }
            
            .print\\:break-inside-avoid {
              break-inside: avoid;
            }
            
            .print\\:hidden {
              display: none !important;
            }
            
            .print\\:block {
              display: block !important;
            }
          }
        `
      }} />
    </div>
  );
}