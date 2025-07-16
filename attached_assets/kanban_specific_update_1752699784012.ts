// REPLACE the handleConflictClick function in kanban-board.tsx (around line 55)

const handleConflictClick = (enquiry: any) => {
  if (!enquiry || !enquiry.id) {
    console.error('Invalid enquiry data for conflict resolution:', enquiry);
    return;
  }
  
  // Find conflicts by matching date across all enquiries/bookings
  const enquiryDate = new Date(enquiry.eventDate);
  const conflictingEnquiries: any[] = [];
  
  // Check all enquiries for date conflicts
  enquiries.forEach((otherEnquiry: any) => {
    if (otherEnquiry.id !== enquiry.id && otherEnquiry.eventDate) {
      const otherDate = new Date(otherEnquiry.eventDate);
      if (enquiryDate.toDateString() === otherDate.toDateString()) {
        conflictingEnquiries.push(otherEnquiry);
      }
    }
  });
  
  console.log('Conflict detection from kanban board:', {
    enquiryId: enquiry.id,
    enquiryDate: enquiryDate.toDateString(),
    totalEnquiries: enquiries.length,
    conflictsFound: conflictingEnquiries.length,
    conflictDetails: conflictingEnquiries.map(c => ({ 
      id: c.id, 
      title: c.title, 
      clientName: c.clientName,
      eventDate: c.eventDate,
      status: c.status 
    })),
    allConflictingBookings: [enquiry, ...conflictingEnquiries].map(c => ({ 
      id: c.id, 
      title: c.title, 
      clientName: c.clientName 
    }))
  });
  
  setSelectedConflictEnquiry(enquiry);
  setSelectedConflicts(conflictingEnquiries);
  setConflictResolutionDialogOpen(true);
};