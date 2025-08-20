# MusoBuddy Complete Testing Procedure
*Comprehensive testing checklist for all application features*

## Phase 1: Authentication & Account Setup

### 1.1 Account Registration
- [ ] Navigate to `/login`
- [ ] Click "Create Account" 
- [ ] Enter valid email address
- [ ] Enter strong password
- [ ] Enter phone number for SMS verification
- [ ] Submit registration form
- [ ] Verify email received and click verification link
- [ ] Verify SMS code received and entered correctly
- [ ] Confirm successful account creation

### 1.2 Login Process
- [ ] Test login with correct credentials
- [ ] Test login with incorrect password (should fail gracefully)
- [ ] Test login with non-existent email (should fail gracefully)
- [ ] Verify JWT token is properly stored
- [ ] Test automatic redirect to dashboard after successful login

### 1.3 Password Reset
- [ ] Click "Forgot Password" on login page
- [ ] Enter registered email address
- [ ] Check email for reset link
- [ ] Click reset link and verify it loads password reset form
- [ ] Enter new password and confirm
- [ ] Verify successful password change
- [ ] Test login with new password

### 1.4 Stripe Integration & Subscription
- [ ] Test free trial signup process
- [ ] Navigate through Stripe checkout flow
- [ ] Complete payment with test credit card (4242 4242 4242 4242)
- [ ] Verify successful subscription activation
- [ ] Check subscription status in dashboard
- [ ] Test session restoration after Stripe redirect

## Phase 2: Dashboard & Core Interface

### 2.1 Dashboard Loading
- [ ] Verify dashboard loads without errors
- [ ] Check all stat cards display correct data
- [ ] Verify monthly revenue calculation
- [ ] Check active bookings count
- [ ] Verify pending invoices amount
- [ ] Check enquiries requiring response count
- [ ] Verify messages count displays correctly

### 2.2 Navigation & Layout
- [ ] Test sidebar navigation on desktop
- [ ] Test mobile navigation menu
- [ ] Verify all menu items are accessible
- [ ] Test responsive design on different screen sizes
- [ ] Check dark/light theme toggle functionality
- [ ] Verify theme preferences are saved

### 2.3 Audio Notifications
- [ ] Enable audio notifications in browser (when prompted)
- [ ] Verify cash register sound plays for new bookings
- [ ] Test message notification sounds
- [ ] Check alert sounds for overdue invoices
- [ ] Verify sound preferences are saved to localStorage
- [ ] Test volume control functionality
- [ ] Test enable/disable sound toggle

## Phase 3: Booking Management

### 3.1 Creating New Bookings
- [ ] Click "New Booking" button
- [ ] Fill in basic event details (name, date, time, venue)
- [ ] Test Google Maps venue autocomplete
- [ ] Enter client contact information
- [ ] Set performance fee and travel expenses
- [ ] Add special requirements/notes
- [ ] Verify what3words integration works
- [ ] Save booking and verify it appears in bookings list

### 3.2 Booking List & Filtering
- [ ] Navigate to bookings page
- [ ] Verify auto-scroll to next upcoming booking
- [ ] Test date range filtering
- [ ] Test status filtering (all, confirmed, pending, etc.)
- [ ] Test "Date TBC" filter for dateless bookings
- [ ] Test search functionality
- [ ] Verify sort options work correctly
- [ ] Check sort preferences are saved to localStorage

### 3.3 Booking Details & Editing
- [ ] Click on a booking to view details
- [ ] Test individual field locking mechanism
- [ ] Edit booking information
- [ ] Verify changes are saved correctly
- [ ] Test status updates (pending → confirmed → completed)
- [ ] Check conflict detection warnings
- [ ] Verify Google Maps integration in booking form

### 3.4 Booking Actions
- [ ] Test "Respond" button functionality
- [ ] Test "Conversation" view
- [ ] Test "View" booking summary in new tab
- [ ] Test dropdown menu actions (Thank You, Invoice, Contract, etc.)
- [ ] Verify "Summary" button opens gig sheet in new tab
- [ ] Check print-friendly gig sheet layout

### 3.5 Conflict Detection
- [ ] Create overlapping bookings
- [ ] Verify conflict warnings appear
- [ ] Test conflict resolution interface
- [ ] Check travel time conflicts
- [ ] Verify blocked dates are respected

## Phase 4: AI-Powered Email Processing

### 4.1 Email Parsing
- [ ] Send test booking inquiry to your MusoBuddy email
- [ ] Verify email is received and parsed by AI
- [ ] Check extracted information accuracy:
  - [ ] Event date and time
  - [ ] Venue name and location
  - [ ] Performance fee details
  - [ ] Client contact information
  - [ ] Special requirements
- [ ] Verify booking is created automatically

### 4.2 Email Response Generation
- [ ] Use AI to generate response to inquiry
- [ ] Verify response quality and professionalism
- [ ] Test response customization
- [ ] Check client-specific information insertion
- [ ] Verify email signature formatting

### 4.3 Conversation Management
- [ ] Test conversation threading
- [ ] Verify original inquiry appears with green styling
- [ ] Test back-and-forth email responses
- [ ] Check conversation history accuracy
- [ ] Verify unread message indicators

## Phase 5: Contract System

### 5.1 Contract Creation
- [ ] Generate contract from booking
- [ ] Verify all booking details populate correctly
- [ ] Test contract template selection
- [ ] Check terms and conditions inclusion
- [ ] Verify PDF generation works
- [ ] Test contract customization options

### 5.2 Contract Signing
- [ ] Send contract to client
- [ ] Open signing link as client
- [ ] Complete digital signature process
- [ ] Verify single-stage signing (no redundant steps)
- [ ] Check confirmation emails sent to both parties
- [ ] Verify signed contract is stored securely

### 5.3 Contract Management
- [ ] View contracts list
- [ ] Check contract status tracking
- [ ] Test contract amendments
- [ ] Verify contract expiry notifications
- [ ] Test contract download functionality

## Phase 6: Invoice System

### 6.1 Invoice Creation
- [ ] Create invoice from booking
- [ ] Verify performance fee calculation
- [ ] Test travel expense integration (combined vs separate display)
- [ ] Add additional line items if needed
- [ ] Set payment terms and due date
- [ ] Generate invoice PDF

### 6.2 Invoice Customization
- [ ] Test custom invoice numbering
- [ ] Verify company logo appears correctly
- [ ] Check theme consistency in PDF
- [ ] Test CC recipients for invoice emails
- [ ] Verify email signature customization

### 6.3 Payment Tracking
- [ ] Send invoice to client
- [ ] Test invoice security (random token URLs)
- [ ] Mark invoice as paid manually
- [ ] Check overdue invoice notifications
- [ ] Verify invoice status updates

## Phase 7: Client Management

### 7.1 Client Database
- [ ] Navigate to address book
- [ ] View client list and details
- [ ] Test client search functionality
- [ ] Add new client manually
- [ ] Edit existing client information

### 7.2 Client Communication
- [ ] View client booking history
- [ ] Test "View Details" navigation to calendar
- [ ] Check client contact preferences
- [ ] Verify communication history tracking

## Phase 8: Google Calendar Integration

### 8.1 Calendar Sync Setup
- [ ] Connect Google Calendar account
- [ ] Grant necessary permissions
- [ ] Test initial calendar sync
- [ ] Verify MusoBuddy booking IDs embedded in events

### 8.2 Sync Functionality
- [ ] Create booking and verify it syncs to Google Calendar
- [ ] Edit booking and check updates sync correctly
- [ ] Delete booking and verify calendar event is removed
- [ ] Test recreating deleted Google Calendar events
- [ ] Verify ID-based sync eliminates AI costs

### 8.3 Calendar Conflict Management
- [ ] Test existing Google Calendar event linking
- [ ] Verify conflict detection with external events
- [ ] Test manual conflict resolution

## Phase 9: Compliance & Document Management

### 9.1 Document Upload
- [ ] Upload compliance documents (insurance, certifications)
- [ ] Test multiple document types (PDF, images)
- [ ] Verify document categorization
- [ ] Check document security and access

### 9.2 Expiry Tracking
- [ ] Set document expiry dates
- [ ] Test expiry notifications
- [ ] Verify alert system for approaching deadlines
- [ ] Check document renewal reminders

## Phase 10: Messages & Communication

### 10.1 Message Center
- [ ] Navigate to Messages page
- [ ] Check tabbed interface (Client Messages, Unparseable)
- [ ] Test message search and filtering
- [ ] Verify read/unread status tracking

### 10.2 Unparseable Messages
- [ ] Test "Reply" button conversion to dateless booking
- [ ] Verify booking ID assignment for conversation continuity
- [ ] Check proper handling of unclear emails

### 10.3 Notification System
- [ ] Test dashboard notification counts
- [ ] Verify real-time notification updates
- [ ] Check notification sound integration
- [ ] Test notification preferences

## Phase 11: Settings & Preferences

### 11.1 User Settings
- [ ] Test theme color customization
- [ ] Verify auto-save functionality for theme changes
- [ ] Check travel expense display preferences
- [ ] Test email signature customization

### 11.2 System Preferences
- [ ] Test notification sound preferences
- [ ] Verify localStorage persistence
- [ ] Check mobile vs desktop preference handling
- [ ] Test reset to defaults functionality

## Phase 12: Mobile Experience

### 12.1 Mobile Interface
- [ ] Test mobile dashboard layout
- [ ] Verify touch navigation works
- [ ] Check responsive booking forms
- [ ] Test mobile-optimized features only

### 12.2 Mobile Actions
- [ ] Test invoice sending from mobile
- [ ] Verify booking list view on mobile
- [ ] Check client lookup functionality
- [ ] Test basic booking entry on mobile

## Phase 13: Widget & External Access

### 13.1 Public Booking Widget
- [ ] Generate widget QR code
- [ ] Test widget URL accessibility
- [ ] Verify client can submit booking request
- [ ] Check widget form validation
- [ ] Test widget styling consistency

### 13.2 Client Portal
- [ ] Test client portal access
- [ ] Verify contract signing interface
- [ ] Check invoice payment interface
- [ ] Test client communication portal

## Phase 14: Advanced Features

### 14.1 Bulk Operations
- [ ] Test booking bulk selection
- [ ] Verify "Re-process Selected" functionality
- [ ] Check bulk status updates
- [ ] Test batch operations

### 14.2 Search & Analytics
- [ ] Test global search functionality
- [ ] Check booking analytics
- [ ] Verify revenue reporting
- [ ] Test data export options

## Phase 15: Error Handling & Edge Cases

### 15.1 Network Issues
- [ ] Test offline behavior
- [ ] Verify graceful error handling
- [ ] Check retry mechanisms
- [ ] Test partial data loading

### 15.2 Data Validation
- [ ] Test form validation errors
- [ ] Verify required field enforcement
- [ ] Check data type validation
- [ ] Test SQL injection prevention

### 15.3 Browser Compatibility
- [ ] Test in Chrome, Firefox, Safari
- [ ] Verify mobile browser compatibility
- [ ] Check accessibility compliance
- [ ] Test with ad blockers enabled

## Phase 16: Performance & Security

### 16.1 Performance Testing
- [ ] Check page load times
- [ ] Test with large datasets
- [ ] Verify image optimization
- [ ] Check API response times

### 16.2 Security Testing
- [ ] Test authentication bypass attempts
- [ ] Verify CORS policy enforcement
- [ ] Check rate limiting functionality
- [ ] Test SQL injection prevention

### 16.3 Data Backup & Recovery
- [ ] Test data export functionality
- [ ] Verify backup procedures
- [ ] Check data recovery options
- [ ] Test rollback functionality (if available)

## Final Verification

### System Integration
- [ ] Test complete workflow: Email → Booking → Contract → Invoice → Payment
- [ ] Verify all notifications work end-to-end
- [ ] Check cross-feature data consistency
- [ ] Test user session management across features

### Production Readiness
- [ ] Verify all test data is cleaned up
- [ ] Check production environment variables
- [ ] Test deployment configuration
- [ ] Verify SSL certificates and security headers

---

## Testing Notes

**Test Accounts:**
- Demo account: jake.stanley@musobuddy.com / password: demo123
- Primary account: timfulkermusic@gmail.com (production data)

**Test Data:**
- Use realistic booking scenarios
- Test with various venue types and locations
- Include edge cases (same-day bookings, far-future events)
- Test with different client communication styles

**Known Limitations:**
- Google app verification still needed for production Google Calendar
- Spark email client shows plain text (expected behavior)
- Browser autoplay policies may block audio notifications

**Critical Success Criteria:**
- Zero data loss during operations
- All financial calculations accurate
- Email parsing accuracy >95%
- Response time <3 seconds for all operations
- Mobile usability on iOS and Android

This testing procedure should be executed in order, with each phase building on the previous ones. Document any issues found and retest after fixes are applied.