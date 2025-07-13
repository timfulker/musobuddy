// Calendar Bug Analysis & Fixes

// 1. CRITICAL BUG: Duplicate loading check
// You have TWO loading checks - one early and one at the end
// The second one will never be reached!

// Fix: Remove the duplicate loading check at the bottom
// Delete this entire block at the end:
/*
if (isLoading) {
  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="animate-pulse space-y-6">
        <div className="h-8 bg-gray-200 rounded w-1/4"></div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 h-96 bg-gray-200 rounded"></div>
          <div className="h-96 bg-gray-200 rounded"></div>
        </div>
      </div>
    </div>
  );
}
*/

// 2. Calendar Modifier Bug - Potential Date Issues
const getCalendarModifiers = () => {
  // Ensure dates are properly normalized to avoid timezone issues
  const normalizeDate = (dateString: string) => {
    const date = new Date(dateString);
    // Create date in local timezone to avoid UTC conversion issues
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
  };

  return {
    today: [new Date()],
    confirmed: bookings
      .filter((b: Booking) => b.status === 'confirmed')
      .map((booking: Booking) => normalizeDate(booking.eventDate)),
    completed: bookings
      .filter((b: Booking) => b.status === 'completed')
      .map((booking: Booking) => normalizeDate(booking.eventDate)),
    cancelled: bookings
      .filter((b: Booking) => b.status === 'cancelled')
      .map((booking: Booking) => normalizeDate(booking.eventDate)),
    newEnquiry: potentialBookings
      .filter((b: any) => b.status === 'enquiry-new' && !b.isExpired)
      .map((booking: any) => normalizeDate(booking.eventDate)),
    inProgressEnquiry: potentialBookings
      .filter((b: any) => (b.status === 'enquiry-qualified' || b.status === 'enquiry-contract_sent') && !b.isExpired)
      .map((booking: any) => normalizeDate(booking.eventDate)),
    confirmedEnquiry: potentialBookings
      .filter((b: any) => b.status === 'enquiry-confirmed' && !b.isExpired)
      .map((booking: any) => normalizeDate(booking.eventDate)),
    signedContract: potentialBookings
      .filter((b: any) => b.status === 'contract-signed')
      .map((booking: any) => normalizeDate(booking.eventDate)),
    expiredEnquiry: showExpiredEnquiries ? potentialBookings
      .filter((b: any) => b.isExpired && b.source === 'enquiry')
      .map((booking: any) => normalizeDate(booking.eventDate)) : [],
  };
};

// 3. Performance Issue - Memoize Expensive Calculations
import { useMemo } from 'react';

const Calendar = () => {
  // Memoize potential bookings to avoid recalculation on every render
  const potentialBookings = useMemo(() => {
    console.log("Calculating potential bookings...");
    return getPotentialBookings();
  }, [enquiries, contracts, bookings, showExpiredEnquiries]);

  // Memoize calendar modifiers
  const calendarModifiers = useMemo(() => {
    console.log("Calculating calendar modifiers...");
    return getCalendarModifiers();
  }, [bookings, potentialBookings, showExpiredEnquiries]);

  // 4. Form Reset Bug - Missing dependency
  useEffect(() => {
    if (!isDialogOpen) {
      form.reset();
    }
  }, [isDialogOpen, form]);

  // 5. Sidebar Bug - Close on route change
  useEffect(() => {
    setSidebarOpen(false);
  }, [location]);

  // 6. Mobile Responsiveness Bug
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768 && sidebarOpen) {
        setSidebarOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [sidebarOpen]);

  // 7. Date Comparison Bug Fix
  const getBookingsForDate = (date: Date) => {
    try {
      console.log("Getting bookings for date:", date.toDateString());
      
      const filteredBookings = bookings.filter((booking: Booking) => {
        const bookingDate = new Date(booking.eventDate);
        
        // Normalize both dates to avoid timezone issues
        const normalizedBookingDate = new Date(
          bookingDate.getFullYear(),
          bookingDate.getMonth(),
          bookingDate.getDate()
        );
        
        const normalizedSelectedDate = new Date(
          date.getFullYear(),
          date.getMonth(),
          date.getDate()
        );
        
        const isMatch = normalizedBookingDate.getTime() === normalizedSelectedDate.getTime();
        
        if (isMatch) {
          console.log(`✓ Booking ${booking.id} (${booking.eventDate}) matches ${date.toDateString()}`);
        }
        
        return isMatch;
      });
      
      console.log(`Found ${filteredBookings.length} bookings for ${date.toDateString()}`);
      return filteredBookings;
    } catch (error) {
      console.error("Error filtering bookings for date:", error);
      return [];
    }
  };

  // 8. API Error Handling Improvement
  const createBookingMutation = useMutation({
    mutationFn: async (data: z.infer<typeof bookingFormSchema>) => {
      console.log("Creating booking with data:", data);
      
      const bookingData = {
        ...data,
        eventDate: new Date(data.eventDate).toISOString(),
        fee: parseFloat(data.fee) || 0,
        contractId: data.contractId === 0 ? null : data.contractId,
      };
      
      console.log("Processed booking data:", bookingData);
      
      const response = await apiRequest("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bookingData),
      });
      
      if (!response.ok) {
        const errorData = await response.text();
        console.error("API Error Response:", errorData);
        throw new Error(`HTTP ${response.status}: ${errorData}`);
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      console.log("Booking created successfully:", data);
      queryClient.invalidateQueries({ queryKey: ["/api/bookings"] });
      toast({
        title: "Success",
        description: "Time marked as unavailable successfully",
      });
      setIsDialogOpen(false);
      form.reset();
    },
    onError: (error: any) => {
      console.error("Booking creation failed:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to mark time as unavailable. Please try again.",
        variant: "destructive",
      });
    },
  });

  // 9. Calendar Export Error Handling
  const handleCalendarExport = () => {
    try {
      console.log("Starting calendar export...");
      console.log("Confirmed bookings for export:", bookings.filter(b => b.status === 'confirmed'));
      
      if (!bookings || bookings.length === 0) {
        toast({
          title: "No Data",
          description: "No bookings available to export",
          variant: "destructive",
        });
        return;
      }
      
      const confirmedBookings = bookings.filter(b => b.status === 'confirmed');
      
      if (confirmedBookings.length === 0) {
        toast({
          title: "No Confirmed Bookings", 
          description: "No confirmed bookings to export",
          variant: "destructive",
        });
        return;
      }
      
      const icalData = createICalData();
      
      if (!icalData) {
        throw new Error("Failed to generate calendar data");
      }
      
      downloadICalFile(icalData, "musobuddy-calendar.ics");
      
      toast({
        title: "Calendar Export",
        description: `Successfully exported ${confirmedBookings.length} confirmed bookings`,
      });
    } catch (error) {
      console.error("Calendar export failed:", error);
      toast({
        title: "Export Failed",
        description: error instanceof Error ? error.message : "Unable to export calendar",
        variant: "destructive",
      });
    }
  };

  return (
    // ... rest of component
  );
};

// 10. Debug Checklist
/*
Common issues to check:

1. ✅ Remove duplicate loading check
2. ✅ Fix calendar modifier date normalization
3. ✅ Add memoization for performance
4. ✅ Fix form reset dependency
5. ✅ Close sidebar on route change
6. ✅ Handle mobile responsiveness
7. ✅ Fix date comparison in getBookingsForDate
8. ✅ Improve API error handling
9. ✅ Add calendar export validation

Additional debugging:
- Check browser console for errors
- Verify API responses in Network tab
- Test calendar navigation
- Test form submission
- Test export functionality
- Test mobile responsiveness
*/