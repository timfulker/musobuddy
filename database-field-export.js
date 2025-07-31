#!/usr/bin/env node

/**
 * Database Field Export Tool
 * Exports all database fields and their current values to CSV format
 * User can open in Excel to review field consistency
 */

import { db } from './server/core/database.js';
import { bookings, contracts, invoices, users, userSettings } from './shared/schema.js';
import fs from 'fs';

async function exportDatabaseFields() {
  console.log('📊 Exporting database fields for Excel review...');
  
  try {
    // Get all bookings with their actual field values
    const allBookings = await db.select().from(bookings).limit(10);
    
    if (allBookings.length === 0) {
      console.log('❌ No bookings found in database');
      return;
    }
    
    // Create CSV content
    let csvContent = 'Booking ID,Client Name,Event Date,Event Time,Event End Time,Venue,Fee,Status,Notes\n';
    
    allBookings.forEach(booking => {
      const row = [
        booking.id || '',
        booking.clientName || '',
        booking.eventDate ? new Date(booking.eventDate).toISOString().split('T')[0] : '',
        booking.eventTime || '',
        booking.eventEndTime || '',
        booking.venue || '',
        booking.fee || '',
        booking.status || '',
        (booking.notes || '').replace(/,/g, ';').replace(/\n/g, ' ')
      ].map(field => `"${field}"`).join(',');
      
      csvContent += row + '\n';
    });
    
    // Write to file
    fs.writeFileSync('booking-fields-export.csv', csvContent);
    
    console.log('✅ Database export complete: booking-fields-export.csv');
    console.log(`📋 Exported ${allBookings.length} bookings`);
    
    // Also create a field mapping reference
    const fieldMappingContent = `Database Field Mapping Reference
Generated: ${new Date().toISOString()}

BOOKINGS TABLE FIELDS:
- id (Primary Key)
- userId (Foreign Key)
- title
- clientName
- clientEmail  
- clientPhone
- eventDate (timestamp)
- eventTime (varchar) 
- eventEndTime (varchar)
- performanceDuration (text)
- venue
- venueAddress
- clientAddress
- eventType
- gigType
- fee (decimal)
- equipmentRequirements
- specialRequirements
- styles
- equipmentProvided
- whatsIncluded
- status
- notes
- createdAt
- updatedAt

FRONTEND FORM FIELDS (BookingDetailsDialog):
- eventTime (matches database)
- eventEndTime (matches database)

SAMPLE DATA FROM CURRENT BOOKINGS:
${allBookings.map(b => `
Booking ${b.id}: ${b.clientName}
- Event Time: "${b.eventTime}" (type: ${typeof b.eventTime})
- Event End Time: "${b.eventEndTime}" (type: ${typeof b.eventEndTime})
- Status: ${b.status}
`).join('')}
`;
    
    fs.writeFileSync('field-mapping-reference.txt', fieldMappingContent);
    console.log('✅ Field mapping reference: field-mapping-reference.txt');
    
  } catch (error) {
    console.error('❌ Export failed:', error);
  }
}

exportDatabaseFields();