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
import { useTheme } from "@/hooks/useTheme";
import { getOptimalTextColor } from "@/lib/luminance";

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
  distance?: string;
  duration?: string;
  what3words?: string;
  setupTime?: string;
  packDownTime?: string;
  duration?: string;
  performanceDuration?: string;
  additionalInfo?: string;
  bookingSource?: string;
  // Client portal fields
  styles?: string;
  equipmentRequirements?: string;
  equipmentProvided?: string;
  whatsIncluded?: string;
  gigType?: string;
  // Original email content (should NOT be displayed in summary)
  originalEmailContent?: string;
}

export default function BookingSummary() {
  const { bookingId } = useParams();
  const [showMap, setShowMap] = useState(false);
  const { theme } = useTheme();

  const { data: booking, isLoading } = useQuery({
    queryKey: [`/api/bookings/${bookingId}`],
    enabled: !!bookingId,
  }) as { data: BookingData | undefined; isLoading: boolean };

  // Fetch user settings for theme color
  const { data: settings } = useQuery({
    queryKey: ['/api/settings'],
    retry: false,
  });

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

  // Filter function to exclude original email content from notes
  const filterOriginalEmail = (text: string | undefined) => {
    if (!text) return text;
    
    // If this text looks like it might be the original email content, exclude it
    // Original emails typically contain "From:", "To:", "Subject:" headers
    const emailHeaders = ['From:', 'To:', 'Subject:', 'Date:', 'Sent:', 'Reply-To:'];
    const looksLikeEmail = emailHeaders.some(header => text.includes(header));
    
    // Also check for common email signature patterns
    const hasEmailSignature = text.includes('@') && (text.includes('Kind regards') || text.includes('Best regards') || text.includes('Sincerely'));
    
    // If it looks like an email, don't display it in summary
    if (looksLikeEmail || hasEmailSignature) {
      return null;
    }
    
    return text;
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
            <Button
              onClick={handlePrint}
              className="transition-all hover:opacity-90"
              style={{
                backgroundColor: settings?.themeColor || '#10b981',
                color: getOptimalTextColor(settings?.themeColor || '#10b981')
              }}
            >
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
              
              {booking.performanceDuration && (
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-gray-500" />
                  <span className="font-semibold">Performance Duration:</span>
                  <span>{booking.performanceDuration}</span>
                </div>
              )}
              
              {booking.eventType && (
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-gray-500" />
                  <span className="font-semibold">Event Type:</span>
                  <span>{booking.eventType}</span>
                </div>
              )}
              
              {booking.gigType && (
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-gray-500" />
                  <span className="font-semibold">Gig Type:</span>
                  <span>{booking.gigType}</span>
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

        {/* Technical Details */}
        {(booking.soundTechContact || booking.venueContact || booking.venueContactInfo || booking.soundCheckTime) && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Technical Details
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {booking.venueContact && (
                  <div>
                    <h4 className="font-semibold mb-2">Venue On-Site Contact:</h4>
                    <p className="text-gray-700 bg-blue-50 p-3 rounded-lg">{booking.venueContact}</p>
                  </div>
                )}
                {booking.soundTechContact && (
                  <div>
                    <h4 className="font-semibold mb-2">Sound Tech Contact:</h4>
                    <p className="text-gray-700 bg-green-50 p-3 rounded-lg">{booking.soundTechContact}</p>
                  </div>
                )}
                {booking.venueContactInfo && (
                  <div>
                    <h4 className="font-semibold mb-2">Additional Venue Contact Info:</h4>
                    <p className="text-gray-700 bg-purple-50 p-3 rounded-lg">{booking.venueContactInfo}</p>
                  </div>
                )}
                {booking.soundCheckTime && (
                  <div>
                    <h4 className="font-semibold mb-2">Sound Check Time:</h4>
                    <p className="text-gray-700 bg-orange-50 p-3 rounded-lg">{booking.soundCheckTime}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Special Moments & Music */}
        {(booking.firstDanceSong || booking.processionalSong || booking.recessionalSong || booking.signingRegisterSong || booking.mustPlaySongs || booking.avoidSongs) && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Special Moments & Music Preferences
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {booking.firstDanceSong && (
                  <div>
                    <h4 className="font-semibold mb-2">First Dance Song:</h4>
                    <p className="text-gray-700 bg-pink-50 p-3 rounded-lg">{booking.firstDanceSong}</p>
                  </div>
                )}
                {booking.processionalSong && (
                  <div>
                    <h4 className="font-semibold mb-2">Processional Music:</h4>
                    <p className="text-gray-700 bg-blue-50 p-3 rounded-lg">{booking.processionalSong}</p>
                  </div>
                )}
                {booking.recessionalSong && (
                  <div>
                    <h4 className="font-semibold mb-2">Recessional Music:</h4>
                    <p className="text-gray-700 bg-green-50 p-3 rounded-lg">{booking.recessionalSong}</p>
                  </div>
                )}
                {booking.signingRegisterSong && (
                  <div>
                    <h4 className="font-semibold mb-2">Register Signing Music:</h4>
                    <p className="text-gray-700 bg-purple-50 p-3 rounded-lg">{booking.signingRegisterSong}</p>
                  </div>
                )}
                {booking.mustPlaySongs && (
                  <div>
                    <h4 className="font-semibold mb-2">Must-Play Songs:</h4>
                    <p className="text-gray-700 whitespace-pre-line bg-yellow-50 p-3 rounded-lg">{booking.mustPlaySongs}</p>
                  </div>
                )}
                {booking.avoidSongs && (
                  <div>
                    <h4 className="font-semibold mb-2">Songs to Avoid:</h4>
                    <p className="text-gray-700 whitespace-pre-line bg-red-50 p-3 rounded-lg">{booking.avoidSongs}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Musical Style & Requirements */}
        {(booking.styles || booking.whatsIncluded) && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Musical Style & Service Details
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {booking.styles && (
                  <div>
                    <h4 className="font-semibold mb-2">Musical Styles Requested:</h4>
                    <p className="text-gray-700 whitespace-pre-line bg-blue-50 p-3 rounded-lg">{booking.styles}</p>
                  </div>
                )}
                
                {booking.whatsIncluded && (
                  <div>
                    <h4 className="font-semibold mb-2">What's Included in Service:</h4>
                    <p className="text-gray-700 whitespace-pre-line bg-green-50 p-3 rounded-lg">{booking.whatsIncluded}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Equipment Information */}
        {(booking.equipmentRequirements || booking.equipmentProvided) && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Equipment Details
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {booking.equipmentRequirements && (
                  <div>
                    <h4 className="font-semibold mb-2">Equipment Required:</h4>
                    <p className="text-gray-700 whitespace-pre-line bg-orange-50 p-3 rounded-lg">{booking.equipmentRequirements}</p>
                  </div>
                )}
                
                {booking.equipmentProvided && (
                  <div>
                    <h4 className="font-semibold mb-2">Equipment Provided by Musician:</h4>
                    <p className="text-gray-700 whitespace-pre-line bg-blue-50 p-3 rounded-lg">{booking.equipmentProvided}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

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
                
                {(booking.distance || booking.travelDistance) && (
                  <div className="flex items-center gap-2">
                    <Navigation className="w-4 h-4 text-gray-500" />
                    <span className="font-semibold">Distance:</span>
                    <span>{booking.distance || `${booking.travelDistance} miles`}</span>
                  </div>
                )}
                
                {(booking.duration || booking.travelTime) && (
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-gray-500" />
                    <span className="font-semibold">Travel Time:</span>
                    <span>{booking.duration || booking.travelTime}</span>
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
        {(filterOriginalEmail(booking.notes) || filterOriginalEmail(booking.clientNotes) || filterOriginalEmail(booking.additionalInfo)) && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Notes & Additional Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {filterOriginalEmail(booking.notes) && (
                  <div>
                    <h4 className="font-semibold mb-2">Internal Notes:</h4>
                    <p className="text-gray-700 whitespace-pre-line bg-gray-50 p-3 rounded-lg">{filterOriginalEmail(booking.notes)}</p>
                  </div>
                )}
                
                {filterOriginalEmail(booking.clientNotes) && (
                  <div>
                    <h4 className="font-semibold mb-2">Client Notes:</h4>
                    <p className="text-gray-700 whitespace-pre-line bg-blue-50 p-3 rounded-lg">{filterOriginalEmail(booking.clientNotes)}</p>
                  </div>
                )}
                
                {filterOriginalEmail(booking.additionalInfo) && (
                  <div>
                    <h4 className="font-semibold mb-2">Additional Information:</h4>
                    <p className="text-gray-700 whitespace-pre-line">{filterOriginalEmail(booking.additionalInfo)}</p>
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
                  <div className="text-center p-4">
                    <p className="text-gray-600 mb-3">📍 {booking.venue}</p>
                    <p className="text-sm text-gray-500 mb-4">{booking.venueAddress}</p>
                    <a 
                      href={`https://www.google.com/maps/search/${encodeURIComponent(booking.venueAddress || booking.venue || '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      <MapPin className="w-4 h-4" />
                      Open in Google Maps
                    </a>
                  </div>
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