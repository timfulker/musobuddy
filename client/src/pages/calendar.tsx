import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Menu } from "lucide-react";
import { useLocation } from "wouter";
import Sidebar from "@/components/sidebar";
import MobileNav from "@/components/mobile-nav";
import { useResponsive } from "@/hooks/useResponsive";

interface CalendarEvent {
  id: number;
  title: string;
  date: string;
  type: 'booking' | 'enquiry' | 'contract';
  status?: string;
}

export default function Calendar() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [location, navigate] = useLocation();
  const { isMobile } = useResponsive();

  // Fetch data for calendar events
  const { data: bookings = [] } = useQuery({
    queryKey: ["/api/bookings"],
    retry: 2,
  });

  const { data: enquiries = [] } = useQuery({
    queryKey: ["/api/enquiries"],
    retry: 2,
  });

  const { data: contracts = [] } = useQuery({
    queryKey: ["/api/contracts"],
    retry: 2,
  });

  // Navigation functions
  const goToPreviousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  // Get calendar events for a specific date
  const getEventsForDate = (date: Date): CalendarEvent[] => {
    const dateStr = date.toISOString().split('T')[0];
    const events: CalendarEvent[] = [];

    // Add bookings
    bookings.forEach((booking: any) => {
      if (booking.eventDate && booking.eventDate.startsWith(dateStr)) {
        events.push({
          id: booking.id,
          title: booking.title || booking.clientName || 'Booking',
          date: dateStr,
          type: 'booking',
          status: booking.status
        });
      }
    });

    // Add enquiries (confirmed ones)
    enquiries.forEach((enquiry: any) => {
      if (enquiry.eventDate && enquiry.eventDate.startsWith(dateStr) && enquiry.status === 'confirmed') {
        events.push({
          id: enquiry.id,
          title: enquiry.clientName || 'Enquiry',
          date: dateStr,
          type: 'enquiry',
          status: enquiry.status
        });
      }
    });

    return events;
  };

  // Handle date click - navigate to bookings page
  const handleDateClick = (date: Date) => {
    const events = getEventsForDate(date);
    if (events.length > 0) {
      // Navigate to enquiries page (which handles bookings)
      navigate("/enquiries");
    }
  };

  // Generate calendar grid
  const generateCalendar = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDate = new Date(firstDay);
    
    // Start from Monday of the first week
    const firstDayOfWeek = firstDay.getDay();
    const daysToSubtract = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1;
    startDate.setDate(startDate.getDate() - daysToSubtract);

    const days = [];
    const currentDateCopy = new Date(startDate);

    // Generate 6 weeks (42 days)
    for (let i = 0; i < 42; i++) {
      const date = new Date(currentDateCopy);
      const isCurrentMonth = date.getMonth() === month;
      const isToday = date.toDateString() === new Date().toDateString();
      const events = getEventsForDate(date);
      const hasEvents = events.length > 0;

      days.push({
        date,
        day: date.getDate(),
        isCurrentMonth,
        isToday,
        hasEvents,
        events
      });

      currentDateCopy.setDate(currentDateCopy.getDate() + 1);
    }

    return days;
  };

  const days = generateCalendar();
  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  return (
    <div className="min-h-screen bg-background layout-consistent">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <MobileNav />
      
      <div className="main-content">
        {/* Header */}
        <header className="border-b border-gray-200 dark:border-slate-700 p-6 bg-gradient-to-r from-white to-gray-50 dark:from-slate-900 dark:to-slate-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setSidebarOpen(true)}
                className="p-2 rounded-xl hover:bg-white dark:hover:bg-slate-800 shadow-sm md:hidden transition-all"
              >
                <Menu className="w-5 h-5" />
              </button>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent ml-12 md:ml-0">
                Calendar
              </h1>
            </div>
            <div className="flex items-center space-x-3">
              <Button
                variant="outline"
                onClick={goToPreviousMonth}
                size="sm"
                className="rounded-xl hover:bg-purple-50 dark:hover:bg-purple-900/20 border-purple-200 dark:border-purple-700"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                onClick={goToToday}
                size="sm"
                className="px-4 rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 text-white border-0 hover:shadow-lg transition-all"
              >
                Today
              </Button>
              <Button
                variant="outline"
                onClick={goToNextMonth}
                size="sm"
                className="rounded-xl hover:bg-purple-50 dark:hover:bg-purple-900/20 border-purple-200 dark:border-purple-700"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </header>

        {/* Calendar */}
        <div className="p-6">
          <Card className="shadow-xl border-0 bg-gradient-to-br from-white to-gray-50 dark:from-slate-900 dark:to-slate-800">
            <CardContent className="p-8">
              {/* Month Header */}
              <div className="text-center mb-8">
                <h2 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                  {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
                </h2>
              </div>

              {/* Calendar Grid */}
              <div className="grid grid-cols-7 gap-3 bg-white dark:bg-slate-900 rounded-2xl p-4 shadow-lg">
                {/* Day headers */}
                {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => (
                  <div
                    key={day}
                    className="h-14 flex items-center justify-center text-sm font-semibold text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-slate-800 rounded-xl"
                  >
                    {day}
                  </div>
                ))}

                {/* Calendar days */}
                {days.map((day, index) => (
                  <div
                    key={index}
                    className={`
                      h-24 p-3 cursor-pointer rounded-xl transition-all duration-200
                      hover:scale-105 hover:shadow-md
                      ${day.isCurrentMonth 
                        ? 'bg-white dark:bg-slate-800 shadow-sm border border-gray-100 dark:border-slate-700' 
                        : 'bg-gray-50 dark:bg-slate-700 opacity-40 border border-gray-50 dark:border-slate-600'
                      }
                      ${day.isToday 
                        ? 'bg-gradient-to-br from-blue-500 to-purple-600 text-white shadow-lg scale-105' 
                        : ''
                      }
                      ${day.hasEvents 
                        ? 'ring-2 ring-purple-300 dark:ring-purple-600 shadow-purple-100 dark:shadow-purple-900/20' 
                        : ''
                      }
                    `}
                    onClick={() => handleDateClick(day.date)}
                  >
                    <div className="flex flex-col h-full">
                      {/* Date number */}
                      <div className={`
                        text-right text-sm font-bold mb-1
                        ${day.isToday 
                          ? 'text-white' 
                          : day.isCurrentMonth 
                            ? 'text-gray-900 dark:text-white' 
                            : 'text-gray-400 dark:text-gray-500'
                        }
                      `}>
                        {day.day}
                      </div>

                      {/* Events indicator */}
                      {day.hasEvents && (
                        <div className="flex-1 flex flex-col">
                          {day.events.length === 1 ? (
                            // Single event - fill entire space
                            <div
                              className={`
                                flex-1 px-2 py-1 rounded-lg text-xs font-medium truncate shadow-sm
                                flex items-center justify-center text-center
                                ${day.events[0].type === 'booking' 
                                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-700' 
                                  : 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300 border border-purple-200 dark:border-purple-700'
                                }
                              `}
                            >
                              {day.events[0].title}
                            </div>
                          ) : (
                            // Multiple events - split space
                            <div className="flex-1 flex flex-col space-y-1">
                              {day.events.slice(0, 2).map((event, eventIndex) => (
                                <div
                                  key={eventIndex}
                                  className={`
                                    flex-1 px-2 py-1 rounded-lg text-xs font-medium truncate shadow-sm
                                    flex items-center justify-center text-center
                                    ${event.type === 'booking' 
                                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-700' 
                                      : 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300 border border-purple-200 dark:border-purple-700'
                                    }
                                  `}
                                >
                                  {event.title}
                                </div>
                              ))}
                              {day.events.length > 2 && (
                                <div className="text-xs text-gray-500 dark:text-gray-400 px-2 font-medium text-center">
                                  +{day.events.length - 2} more
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}