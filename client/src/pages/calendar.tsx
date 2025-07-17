import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Menu, Upload, Download, Calendar as CalendarIcon, Clock, List, Grid } from "lucide-react";
import { useLocation } from "wouter";
import Sidebar from "@/components/sidebar";
import MobileNav from "@/components/mobile-nav";
import { useResponsive } from "@/hooks/useResponsive";
import CalendarImport from "@/components/calendar-import";
import type { Enquiry } from "@shared/schema";

interface CalendarEvent {
  id: number;
  title: string;
  date: string;
  type: 'booking' | 'enquiry' | 'contract';
  status?: string;
}

type CalendarView = 'day' | 'week' | 'month' | 'year';

export default function Calendar() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [view, setView] = useState<CalendarView>('month');
  const [location, navigate] = useLocation();
  const { isMobile } = useResponsive();
  const [resolvedConflicts, setResolvedConflicts] = useState<Set<number>>(new Set());

  // Load resolved conflicts from localStorage
  useEffect(() => {
    const savedResolvedConflicts = localStorage.getItem('resolvedConflicts');
    if (savedResolvedConflicts) {
      try {
        const parsed = JSON.parse(savedResolvedConflicts);
        setResolvedConflicts(new Set(parsed));
      } catch (error) {
        console.error('Error parsing resolved conflicts:', error);
      }
    }
  }, []);

  // Detect conflicts for events on the same date
  const detectConflicts = (event: CalendarEvent, allEvents: CalendarEvent[]) => {
    if (!event.date) return [];
    
    const eventDate = new Date(event.date).toDateString();
    
    return allEvents.filter((other) => {
      if (other.id === event.id) return false;
      if (!other.date) return false;
      
      const otherDate = new Date(other.date).toDateString();
      return otherDate === eventDate;
    });
  };

  // Check if events have resolved conflicts
  const hasResolvedConflicts = (event: CalendarEvent, allEvents: CalendarEvent[]) => {
    const conflicts = detectConflicts(event, allEvents);
    if (conflicts.length === 0) return false;
    
    // Check if any of the conflicts are resolved
    const isResolved = conflicts.some(conflict => resolvedConflicts.has(event.id) || resolvedConflicts.has(conflict.id));
    
    // Debug logging
    if (conflicts.length > 0) {
      console.log(`🔍 Event ${event.id} "${event.title}" has ${conflicts.length} conflicts, resolved: ${isResolved}`, {
        eventId: event.id,
        conflictIds: conflicts.map(c => c.id),
        resolvedConflicts: Array.from(resolvedConflicts),
        isResolved
      });
    }
    
    return isResolved;
  };

  // Fetch data for calendar events - Phase 3: Only use main bookings table
  const { data: bookings = [] } = useQuery({
    queryKey: ["/api/bookings"],
    retry: 2,
  });

  const { data: contracts = [] } = useQuery({
    queryKey: ["/api/contracts"],
    retry: 2,
  });

  // Navigation functions
  const goToPrevious = () => {
    const newDate = new Date(currentDate);
    switch (view) {
      case 'day':
        newDate.setDate(newDate.getDate() - 1);
        break;
      case 'week':
        newDate.setDate(newDate.getDate() - 7);
        break;
      case 'month':
        newDate.setMonth(newDate.getMonth() - 1);
        break;
      case 'year':
        newDate.setFullYear(newDate.getFullYear() - 1);
        break;
    }
    setCurrentDate(newDate);
  };

  const goToNext = () => {
    const newDate = new Date(currentDate);
    switch (view) {
      case 'day':
        newDate.setDate(newDate.getDate() + 1);
        break;
      case 'week':
        newDate.setDate(newDate.getDate() + 7);
        break;
      case 'month':
        newDate.setMonth(newDate.getMonth() + 1);
        break;
      case 'year':
        newDate.setFullYear(newDate.getFullYear() + 1);
        break;
    }
    setCurrentDate(newDate);
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  // Export calendar to .ics file
  const exportCalendar = () => {
    const calendarData = createICSFromBookings(bookings);
    const blob = new Blob([calendarData], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'musobuddy-calendar.ics';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Create ICS format from bookings
  const createICSFromBookings = (bookings: any[]) => {
    const header = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//MusoBuddy//Calendar Export//EN',
      'CALSCALE:GREGORIAN'
    ].join('\r\n');

    const events = bookings.map(booking => {
      const startDate = new Date(booking.eventDate);
      const endDate = new Date(booking.eventDate);
      
      // Add time if available
      if (booking.startTime) {
        const [hours, minutes] = booking.startTime.split(':');
        startDate.setHours(parseInt(hours), parseInt(minutes));
      }
      if (booking.endTime) {
        const [hours, minutes] = booking.endTime.split(':');
        endDate.setHours(parseInt(hours), parseInt(minutes));
      } else {
        // Default to 2 hours if no end time
        endDate.setTime(startDate.getTime() + (2 * 60 * 60 * 1000));
      }

      const formatDate = (date: Date) => {
        return date.toISOString().replace(/[:-]/g, '').replace(/\.\d{3}/, '');
      };

      return [
        'BEGIN:VEVENT',
        `UID:${booking.id}@musobuddy.com`,
        `DTSTART:${formatDate(startDate)}`,
        `DTEND:${formatDate(endDate)}`,
        `SUMMARY:${booking.title || 'Music Booking'}`,
        `DESCRIPTION:${booking.notes || ''}`,
        `LOCATION:${booking.venue || ''}`,
        `STATUS:${booking.status?.toUpperCase() || 'CONFIRMED'}`,
        'END:VEVENT'
      ].join('\r\n');
    }).join('\r\n');

    const footer = 'END:VCALENDAR';

    return [header, events, footer].join('\r\n');
  };

  // Get calendar events for a specific date
  const getEventsForDate = (date: Date): CalendarEvent[] => {
    // Use local date string without timezone conversion
    const dateStr = date.getFullYear() + '-' + 
      String(date.getMonth() + 1).padStart(2, '0') + '-' + 
      String(date.getDate()).padStart(2, '0');
    const events: CalendarEvent[] = [];

    // Add all bookings (not just confirmed ones)
    bookings.forEach((booking: any) => {
      if (booking.eventDate) {
        // Handle both string and Date formats - use local date comparison
        const bookingDate = new Date(booking.eventDate);
        const bookingDateStr = bookingDate.getFullYear() + '-' + 
          String(bookingDate.getMonth() + 1).padStart(2, '0') + '-' + 
          String(bookingDate.getDate()).padStart(2, '0');
        
        if (bookingDateStr === dateStr) {
          events.push({
            id: booking.id,
            title: booking.title || booking.clientName || 'Booking',
            date: dateStr,
            type: 'booking',
            status: booking.status
          });
        }
      }
    });

    // Add contracts as potential bookings
    contracts.forEach((contract: any) => {
      if (contract.eventDate) {
        const contractDate = new Date(contract.eventDate);
        const contractDateStr = contractDate.getFullYear() + '-' + 
          String(contractDate.getMonth() + 1).padStart(2, '0') + '-' + 
          String(contractDate.getDate()).padStart(2, '0');
        
        if (contractDateStr === dateStr) {
          events.push({
            id: contract.id,
            title: contract.clientName || 'Contract',
            date: dateStr,
            type: 'contract',
            status: contract.status
          });
        }
      }
    });

    return events;
  };

  // Handle date click - navigate to bookings page with appropriate filter
  const handleDateClick = (date: Date) => {
    const events = getEventsForDate(date);
    if (events.length > 0) {
      // Get the first event to determine the appropriate filter
      const firstEvent = events[0];
      const status = firstEvent.status || 'new';
      const id = firstEvent.id;
      
      // Navigate to bookings page with status filter and ID
      navigate(`/bookings?status=${status}&id=${id}`);
    }
  };

  // Get status color for events - matches bookings page color scheme
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'new': return 'bg-[#5DADE2] text-white';
      case 'booking_in_progress': return 'bg-[#F39C12] text-white';
      case 'confirmed': return 'bg-[#2980B9] text-white';
      case 'contract_sent': return 'bg-[#9B59B6] text-white';
      case 'contract_received': return 'bg-[#27AE60] text-white';
      case 'completed': return 'bg-[#34495E] text-white';
      case 'rejected': return 'bg-[#C0392B] text-white';
      default: return 'bg-[#5DADE2] text-white';
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

  // Get formatted date string based on view
  const getFormattedDate = () => {
    switch (view) {
      case 'day':
        return `${currentDate.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}`;
      case 'week':
        const weekStart = new Date(currentDate);
        weekStart.setDate(currentDate.getDate() - currentDate.getDay() + 1);
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);
        return `${weekStart.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} - ${weekEnd.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`;
      case 'month':
        return `${monthNames[currentDate.getMonth()]} ${currentDate.getFullYear()}`;
      case 'year':
        return `${currentDate.getFullYear()}`;
    }
  };

  // Generate day view
  const renderDayView = () => {
    const events = getEventsForDate(currentDate);
    const hours = Array.from({ length: 24 }, (_, i) => i);
    
    return (
      <div className="space-y-4">
        {events.length > 0 ? (
          <div className="grid gap-4">
            {events.map((event, index) => (
              <div
                key={index}
                className={`
                  p-4 rounded-lg border-l-4 shadow-sm cursor-pointer hover:shadow-md transition-shadow
                  ${getStatusColor(event.status || 'new').replace('text-white', 'text-gray-900')} 
                  bg-opacity-10 border-l-current
                `}
                onClick={() => navigate(`/bookings?status=${event.status || 'new'}&id=${event.id}`)}
              >
                <h3 className="font-semibold">{event.title}</h3>
                <p className="text-sm opacity-75">{event.status}</p>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 text-gray-500">
            No events scheduled for this day
          </div>
        )}
      </div>
    );
  };

  // Generate week view
  const renderWeekView = () => {
    const weekStart = new Date(currentDate);
    weekStart.setDate(currentDate.getDate() - currentDate.getDay() + 1);
    
    const weekDays = Array.from({ length: 7 }, (_, i) => {
      const date = new Date(weekStart);
      date.setDate(weekStart.getDate() + i);
      return date;
    });

    return (
      <div className="grid grid-cols-7 gap-2">
        {weekDays.map((day, index) => {
          const events = getEventsForDate(day);
          const isToday = day.toDateString() === new Date().toDateString();
          
          return (
            <div
              key={index}
              className={`
                p-4 rounded-lg border min-h-32
                ${isToday 
                  ? 'bg-blue-50 border-blue-200' 
                  : 'bg-white border-gray-200'
                }
              `}
            >
              <div className={`text-center mb-2 ${isToday ? 'font-bold text-blue-600' : 'text-gray-700'}`}>
                {day.toLocaleDateString('en-GB', { weekday: 'short' })}
                <br />
                {day.getDate()}
              </div>
              <div className="space-y-1">
                {events.map((event, eventIndex) => (
                  <div
                    key={eventIndex}
                    className={`
                      text-xs p-1 rounded cursor-pointer hover:bg-opacity-40 transition-colors
                      ${getStatusColor(event.status || 'new').replace('text-white', 'text-gray-900')} 
                      bg-opacity-20 lg:block
                    `}
                    onClick={() => navigate(`/bookings?status=${event.status || 'new'}&id=${event.id}`)}
                  >
                    {/* Mobile: show abbreviated title */}
                    <span className="lg:hidden">
                      {event.title.length > 6 ? event.title.substring(0, 6) + '...' : event.title}
                    </span>
                    {/* Desktop: show full title */}
                    <span className="hidden lg:inline">
                      {event.title}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  // Generate year view
  const renderYearView = () => {
    const months = Array.from({ length: 12 }, (_, i) => {
      const monthDate = new Date(currentDate.getFullYear(), i, 1);
      return monthDate;
    });

    return (
      <div className="grid grid-cols-3 gap-6">
        {months.map((month, index) => {
          const monthEvents = bookings.filter((booking: any) => {
            if (booking.eventDate) {
              const bookingDate = new Date(booking.eventDate);
              return bookingDate.getMonth() === month.getMonth() && 
                     bookingDate.getFullYear() === month.getFullYear();
            }
            return false;
          });

          return (
            <div
              key={index}
              className="p-4 rounded-lg border hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => {
                setCurrentDate(month);
                setView('month');
              }}
            >
              <h3 className="font-semibold text-center mb-2">
                {monthNames[month.getMonth()]}
              </h3>
              <div className="text-center text-sm text-gray-600">
                {monthEvents.length} events
              </div>
              {monthEvents.length > 0 && (
                <div className="mt-2 flex justify-center">
                  <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background layout-consistent">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <MobileNav />
      
      <div className="main-content">
        {/* Header */}
        <header className="border-b border-gray-200 dark:border-slate-700 p-4 lg:p-6 bg-gradient-to-r from-white to-gray-50 dark:from-slate-900 dark:to-slate-800">
          {/* Mobile Header */}
          <div className="flex items-center justify-between lg:hidden">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setSidebarOpen(true)}
                className="p-2 rounded-xl hover:bg-white dark:hover:bg-slate-800 shadow-sm transition-all"
              >
                <Menu className="w-5 h-5" />
              </button>
              <h1 className="text-xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                Calendar
              </h1>
            </div>
            
            {/* Mobile Navigation Controls */}
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                onClick={goToPrevious}
                size="sm"
                className="rounded-xl hover:bg-purple-50 dark:hover:bg-purple-900/20 border-purple-200 dark:border-purple-700"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                onClick={goToToday}
                size="sm"
                className="px-3 rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 text-white border-0 hover:shadow-lg transition-all text-xs"
              >
                Today
              </Button>
              <Button
                variant="outline"
                onClick={goToNext}
                size="sm"
                className="rounded-xl hover:bg-purple-50 dark:hover:bg-purple-900/20 border-purple-200 dark:border-purple-700"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Mobile View Selector */}
          <div className="mt-4 lg:hidden">
            <div className="flex items-center justify-center space-x-1 bg-gray-100 dark:bg-slate-800 rounded-lg p-1">
              <Button
                variant={view === 'day' ? 'default' : 'ghost'}
                onClick={() => setView('day')}
                size="sm"
                className="rounded-md flex-1"
              >
                <Clock className="w-4 h-4" />
              </Button>
              <Button
                variant={view === 'week' ? 'default' : 'ghost'}
                onClick={() => setView('week')}
                size="sm"
                className="rounded-md flex-1"
              >
                <List className="w-4 h-4" />
              </Button>
              <Button
                variant={view === 'month' ? 'default' : 'ghost'}
                onClick={() => setView('month')}
                size="sm"
                className="rounded-md flex-1"
              >
                <CalendarIcon className="w-4 h-4" />
              </Button>
              <Button
                variant={view === 'year' ? 'default' : 'ghost'}
                onClick={() => setView('year')}
                size="sm"
                className="rounded-md flex-1"
              >
                <Grid className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Desktop Header */}
          <div className="hidden lg:flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                Calendar
              </h1>
            </div>
            <div className="flex items-center space-x-3">
              {/* Calendar Import */}
              <CalendarImport onImportComplete={() => {
                // Refresh calendar data after import
                window.location.reload();
              }} />
              
              {/* Calendar Export */}
              <Button
                variant="outline"
                onClick={exportCalendar}
                size="sm"
                className="rounded-xl hover:bg-purple-50 dark:hover:bg-purple-900/20 border-purple-200 dark:border-purple-700"
              >
                <Download className="w-4 h-4 mr-2" />
                Export Calendar
              </Button>
              
              {/* View Selector */}
              <div className="flex items-center space-x-2 ml-4">
                <div className="flex items-center space-x-1 bg-gray-100 dark:bg-slate-800 rounded-lg p-1">
                  <Button
                    variant={view === 'day' ? 'default' : 'ghost'}
                    onClick={() => setView('day')}
                    size="sm"
                    className="rounded-md"
                  >
                    <Clock className="w-4 h-4 mr-1" />
                    Day
                  </Button>
                  <Button
                    variant={view === 'week' ? 'default' : 'ghost'}
                    onClick={() => setView('week')}
                    size="sm"
                    className="rounded-md"
                  >
                    <List className="w-4 h-4 mr-1" />
                    Week
                  </Button>
                  <Button
                    variant={view === 'month' ? 'default' : 'ghost'}
                    onClick={() => setView('month')}
                    size="sm"
                    className="rounded-md"
                  >
                    <CalendarIcon className="w-4 h-4 mr-1" />
                    Month
                  </Button>
                  <Button
                    variant={view === 'year' ? 'default' : 'ghost'}
                    onClick={() => setView('year')}
                    size="sm"
                    className="rounded-md"
                  >
                    <Grid className="w-4 h-4 mr-1" />
                    Year
                  </Button>
                </div>
              </div>

              {/* Navigation */}
              <div className="flex items-center space-x-2 ml-4">
                <Button
                  variant="outline"
                  onClick={goToPrevious}
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
                  onClick={goToNext}
                  size="sm"
                  className="rounded-xl hover:bg-purple-50 dark:hover:bg-purple-900/20 border-purple-200 dark:border-purple-700"
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </header>

        {/* Calendar */}
        <div className="p-2 lg:p-6">
          <Card className="shadow-xl border-0 bg-gradient-to-br from-white to-gray-50 dark:from-slate-900 dark:to-slate-800">
            <CardContent className="p-2 lg:p-8">
              {/* Date Header */}
              <div className="text-center mb-4 lg:mb-8">
                <h2 className="text-2xl lg:text-4xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                  {getFormattedDate()}
                </h2>
              </div>

              {/* Calendar Content */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl p-2 lg:p-4 shadow-lg">
                {view === 'day' && renderDayView()}
                {view === 'week' && renderWeekView()}
                {view === 'month' && (
                  <div className="grid grid-cols-7 gap-1 lg:gap-3">
                    {/* Day headers */}
                    {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => (
                      <div
                        key={day}
                        className="h-8 lg:h-14 flex items-center justify-center text-xs lg:text-sm font-semibold text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-slate-800 rounded-lg lg:rounded-xl"
                      >
                        {day}
                      </div>
                    ))}

                    {/* Calendar days */}
                    {days.map((day, index) => (
                      <div
                        key={index}
                        className={`
                          h-16 lg:h-24 cursor-pointer rounded-lg lg:rounded-xl transition-all duration-200 relative
                          hover:scale-105 hover:shadow-md
                          ${day.hasEvents && day.events.length === 1
                            ? day.events[0].type === 'booking'
                              ? 'bg-emerald-100 dark:bg-emerald-900/40 border border-emerald-200 dark:border-emerald-700 shadow-sm'
                              : 'bg-purple-100 dark:bg-purple-900/40 border border-purple-200 dark:border-purple-700 shadow-sm'
                            : day.isCurrentMonth 
                              ? 'bg-white dark:bg-slate-800 shadow-sm border border-gray-100 dark:border-slate-700' 
                              : 'bg-gray-50 dark:bg-slate-700 opacity-40 border border-gray-50 dark:border-slate-600'
                          }
                          ${day.isToday 
                            ? 'bg-gradient-to-br from-blue-500 to-purple-600 text-white shadow-lg scale-105' 
                            : ''
                          }
                          ${day.hasEvents && day.events.length > 1
                            ? // Check if this is a resolved conflict (orange ring) or regular multiple events (purple ring)
                              day.events.some(event => hasResolvedConflicts(event, [...bookings, ...contracts]))
                                ? 'ring-2 ring-orange-400 dark:ring-orange-500 shadow-orange-100 dark:shadow-orange-900/20'
                                : 'ring-2 ring-purple-300 dark:ring-purple-600 shadow-purple-100 dark:shadow-purple-900/20'
                            : ''
                          }
                        `}
                        onClick={() => handleDateClick(day.date)}
                      >
                        {/* Date number - positioned absolutely in top right */}
                        <div className={`
                          absolute top-1 right-1 lg:top-2 lg:right-2 text-xs lg:text-sm font-bold z-10
                          ${day.isToday 
                            ? 'text-white' 
                            : day.hasEvents && day.events.length === 1
                              ? day.events[0].type === 'booking'
                                ? 'text-emerald-800 dark:text-emerald-300'
                                : 'text-purple-800 dark:text-purple-300'
                              : day.isCurrentMonth 
                                ? 'text-gray-900 dark:text-white' 
                                : 'text-gray-400 dark:text-gray-500'
                          }
                        `}>
                          {day.day}
                        </div>

                        {/* Events display */}
                        {day.hasEvents && (
                          <div className="h-full flex flex-col p-1 lg:p-2">
                            {/* Mobile view - use dots/indicators for events */}
                            <div className="lg:hidden h-full flex flex-col justify-center">
                              {day.events.length === 1 ? (
                                // Single event - show abbreviated title
                                <div className="flex flex-col items-center">
                                  <div 
                                    className={`w-3 h-3 rounded-full mb-1 ${getStatusColor(day.events[0].status || 'new').replace('text-white', 'bg-current')}`}
                                  />
                                  <span className="text-xs font-medium text-center leading-tight break-words max-w-full">
                                    {day.events[0].title.length > 6 ? day.events[0].title.substring(0, 6) + '...' : day.events[0].title}
                                  </span>
                                </div>
                              ) : day.events.length === 2 ? (
                                // Two events - show stacked dots with count
                                <div className="flex flex-col items-center space-y-1">
                                  <div className="flex flex-col items-center space-y-1">
                                    <div className="flex space-x-1">
                                      {day.events.map((event, eventIndex) => (
                                        <div
                                          key={eventIndex}
                                          className={`w-3 h-3 rounded-full ${getStatusColor(event.status || 'new').replace('text-white', 'bg-current')}`}
                                          title={event.title}
                                        />
                                      ))}
                                    </div>
                                    <span className="text-xs text-gray-700 dark:text-gray-300 font-medium">
                                      2 events
                                    </span>
                                  </div>
                                </div>
                              ) : (
                                // Multiple events (3+) - show dots grid
                                <div className="flex flex-col items-center space-y-1">
                                  <div className="flex flex-wrap justify-center gap-1 max-w-full">
                                    {day.events.slice(0, 4).map((event, eventIndex) => (
                                      <div
                                        key={eventIndex}
                                        className={`w-2 h-2 rounded-full ${getStatusColor(event.status || 'new').replace('text-white', 'bg-current')}`}
                                        title={event.title}
                                      />
                                    ))}
                                  </div>
                                  <span className="text-xs text-gray-700 dark:text-gray-300 font-medium">
                                    {day.events.length > 4 ? `${day.events.length} events` : `${day.events.length} events`}
                                  </span>
                                </div>
                              )}
                            </div>

                            {/* Desktop view - show full text */}
                            <div className="hidden lg:flex lg:flex-col lg:h-full">
                              {day.events.length === 1 ? (
                                // Single event - fill entire cell
                                <div
                                  className={`
                                    flex-1 flex items-center justify-center text-center p-2
                                    ${getStatusColor(day.events[0].status || 'new').includes('text-white') 
                                      ? 'text-gray-900 dark:text-gray-100' 
                                      : 'text-gray-800 dark:text-gray-200'
                                    }
                                  `}
                                >
                                  <span className="text-xs font-medium leading-tight whitespace-pre-wrap break-words">
                                    {day.events[0].title}
                                  </span>
                                </div>
                              ) : day.events.length === 2 ? (
                                // Two events - show abbreviated titles in separate boxes
                                <div className="flex-1 flex flex-col space-y-1">
                                  {day.events.map((event, eventIndex) => (
                                    <div
                                      key={eventIndex}
                                      className={`
                                        flex-1 px-1 py-1 rounded-lg text-xs font-medium shadow-sm
                                        flex items-center justify-center text-center
                                        ${getStatusColor(event.status || 'new')} 
                                        ${day.events.length > 1
                                          ? 'bg-opacity-80 border border-current border-opacity-50'
                                          : 'bg-opacity-20 border border-current border-opacity-30'
                                        }
                                      `}
                                    >
                                      <span className="leading-tight break-words">
                                        {event.title.length > 15 ? event.title.substring(0, 15) + '...' : event.title}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                // Multiple events (3+) - show first event and count
                                <div className="flex-1 flex flex-col space-y-1">
                                  <div
                                    className={`
                                      flex-1 px-1 py-1 rounded-lg text-xs font-medium shadow-sm
                                      flex items-center justify-center text-center
                                      ${getStatusColor(day.events[0].status || 'new')} 
                                      ${day.events.length > 1
                                        ? 'bg-opacity-80 border border-current border-opacity-50'
                                        : 'bg-opacity-20 border border-current border-opacity-30'
                                      }
                                    `}
                                  >
                                    <span className="leading-tight break-words">
                                      {day.events[0].title.length > 12 ? day.events[0].title.substring(0, 12) + '...' : day.events[0].title}
                                    </span>
                                  </div>
                                  <div className="text-xs text-gray-500 dark:text-gray-400 px-1 font-medium text-center bg-gray-100 dark:bg-gray-800 rounded py-1">
                                    +{day.events.length - 1} more
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
                {view === 'year' && renderYearView()}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}