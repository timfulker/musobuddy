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
        <header className="border-b border-gray-200 dark:border-slate-700 p-4 bg-white dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setSidebarOpen(true)}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 md:hidden"
              >
                <Menu className="w-5 h-5" />
              </button>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white ml-12 md:ml-0">
                Calendar
              </h1>
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                onClick={goToPreviousMonth}
                size="sm"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                onClick={goToToday}
                size="sm"
                className="px-4"
              >
                Today
              </Button>
              <Button
                variant="outline"
                onClick={goToNextMonth}
                size="sm"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </header>

        {/* Calendar */}
        <div className="p-6">
          <Card className="shadow-lg">
            <CardContent className="p-6">
              {/* Month Header */}
              <div className="text-center mb-6">
                <h2 className="text-3xl font-bold text-gray-900 dark:text-white">
                  {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
                </h2>
              </div>

              {/* Calendar Grid */}
              <div className="grid grid-cols-7 gap-1">
                {/* Day headers */}
                {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => (
                  <div
                    key={day}
                    className="h-12 flex items-center justify-center text-sm font-medium text-gray-500 dark:text-gray-400"
                  >
                    {day}
                  </div>
                ))}

                {/* Calendar days */}
                {days.map((day, index) => (
                  <div
                    key={index}
                    className={`
                      h-24 border border-gray-200 dark:border-slate-700 p-2 cursor-pointer
                      transition-colors hover:bg-gray-50 dark:hover:bg-slate-800
                      ${day.isCurrentMonth 
                        ? 'bg-white dark:bg-slate-900' 
                        : 'bg-gray-50 dark:bg-slate-800 opacity-50'
                      }
                      ${day.isToday 
                        ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-700' 
                        : ''
                      }
                      ${day.hasEvents 
                        ? 'ring-2 ring-purple-200 dark:ring-purple-800' 
                        : ''
                      }
                    `}
                    onClick={() => handleDateClick(day.date)}
                  >
                    <div className="flex flex-col h-full">
                      {/* Date number */}
                      <div className={`
                        text-right text-sm font-medium mb-1
                        ${day.isToday 
                          ? 'text-blue-600 dark:text-blue-400 font-bold' 
                          : day.isCurrentMonth 
                            ? 'text-gray-900 dark:text-white' 
                            : 'text-gray-400 dark:text-gray-600'
                        }
                      `}>
                        {day.day}
                      </div>

                      {/* Events indicator */}
                      {day.hasEvents && (
                        <div className="flex-1 flex flex-col space-y-1">
                          {day.events.slice(0, 2).map((event, eventIndex) => (
                            <div
                              key={eventIndex}
                              className={`
                                px-2 py-1 rounded text-xs font-medium truncate
                                ${event.type === 'booking' 
                                  ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' 
                                  : 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400'
                                }
                              `}
                            >
                              {event.title}
                            </div>
                          ))}
                          {day.events.length > 2 && (
                            <div className="text-xs text-gray-500 dark:text-gray-400 px-2">
                              +{day.events.length - 2} more
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