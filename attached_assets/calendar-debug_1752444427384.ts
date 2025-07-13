# Calendar Component Debug Analysis

## Common Issues & Solutions

### 1. **Data Loading Issues**
```typescript
// Add error handling to queries
const { data: bookings = [], isLoading, error: bookingsError } = useQuery({
  queryKey: ["/api/bookings"],
});

// Add loading states
if (isLoading) return <div>Loading...</div>;
if (bookingsError) return <div>Error loading bookings: {bookingsError.message}</div>;
```

### 2. **Date Handling Problems**
```typescript
// Fix potential timezone issues
const getBookingsForDate = (date: Date) => {
  return bookings.filter((booking: Booking) => {
    const bookingDate = new Date(booking.eventDate);
    // Use local date comparison to avoid timezone issues
    return bookingDate.toDateString() === date.toDateString();
  });
};

// Better date formatting
const formatICalDate = (date: Date) => {
  // Ensure UTC formatting
  return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
};
```

### 3. **Form Validation Issues**
```typescript
// Add better form validation
const onSubmit = (data: z.infer<typeof bookingFormSchema>) => {
  // Validate date is not in the past
  const eventDate = new Date(data.eventDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  if (eventDate < today) {
    toast({
      title: "Error",
      description: "Cannot create booking for past dates",
      variant: "destructive",
    });
    return;
  }
  
  createBookingMutation.mutate(data);
};
```

### 4. **Calendar Modifier Issues**
```typescript
// Ensure dates are properly formatted for calendar modifiers
const getCalendarModifiers = () => {
  const confirmedDates = bookings
    .filter((b: Booking) => b.status === 'confirmed')
    .map((booking: Booking) => {
      const date = new Date(booking.eventDate);
      // Reset time to avoid timezone issues
      return new Date(date.getFullYear(), date.getMonth(), date.getDate());
    });
    
  return {
    confirmed: confirmedDates,
    // ... other modifiers
  };
};
```

### 5. **Export Function Issues**
```typescript
// Fix calendar export with better error handling
const handleCalendarExport = () => {
  try {
    const icalData = createICalData();
    if (!icalData) {
      throw new Error("No calendar data to export");
    }
    downloadICalFile(icalData, "musobuddy-calendar.ics");
    
    toast({
      title: "Calendar Export",
      description: "Calendar file downloaded successfully",
    });
  } catch (error) {
    console.error("Export failed:", error);
    toast({
      title: "Export Failed",
      description: "Unable to export calendar. Please try again.",
      variant: "destructive",
    });
  }
};
```

### 6. **Performance Issues**
```typescript
// Memoize expensive calculations
import { useMemo } from 'react';

const Calendar = () => {
  // Memoize potential bookings calculation
  const potentialBookings = useMemo(() => {
    return getPotentialBookings();
  }, [enquiries, contracts, bookings, showExpiredEnquiries]);
  
  // Memoize current month events
  const currentMonthEvents = useMemo(() => {
    return getCurrentMonthEvents();
  }, [bookings, potentialBookings, currentDate, showExpiredEnquiries]);
};
```

### 7. **Mobile Responsiveness**
```typescript
// Fix mobile sidebar state management
const [sidebarOpen, setSidebarOpen] = useState(false);

// Close sidebar when clicking outside or on route change
useEffect(() => {
  const handleResize = () => {
    if (window.innerWidth >= 768) {
      setSidebarOpen(false);
    }
  };
  
  window.addEventListener('resize', handleResize);
  return () => window.removeEventListener('resize', handleResize);
}, []);
```

### 8. **API Error Handling**
```typescript
// Better mutation error handling
const createBookingMutation = useMutation({
  mutationFn: async (data: z.infer<typeof bookingFormSchema>) => {
    const bookingData = {
      ...data,
      eventDate: new Date(data.eventDate).toISOString(),
      fee: parseFloat(data.fee) || 0,
      contractId: data.contractId === 0 ? null : data.contractId,
    };
    
    const response = await apiRequest("/api/bookings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(bookingData),
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return response.json();
  },
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ["/api/bookings"] });
    toast({
      title: "Success",
      description: "Booking created successfully",
    });
    setIsDialogOpen(false);
    form.reset();
  },
  onError: (error: any) => {
    console.error("Booking creation failed:", error);
    toast({
      title: "Error",
      description: error.message || "Failed to create booking. Please try again.",
      variant: "destructive",
    });
  },
});
```

## Debug Checklist

1. **Check browser console** for JavaScript errors
2. **Verify API endpoints** are returning expected data
3. **Test date handling** across different timezones
4. **Validate form inputs** with edge cases
5. **Check query invalidation** after mutations
6. **Test responsive behavior** on mobile devices
7. **Verify export functionality** with different browsers
8. **Check calendar modifiers** are applying correctly

## Common Error Messages to Look For

- "Cannot read property of undefined" - Check data loading states
- "Invalid date" - Check date parsing and formatting
- "Network error" - Check API endpoints and error handling
- "Schema validation failed" - Check form validation rules
- "Calendar not rendering" - Check date modifiers and data structure