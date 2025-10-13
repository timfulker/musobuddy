import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { bookings, users } from '../shared/schema';
import { eq } from 'drizzle-orm';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Production database connection - use same approach as server/core/database.ts
const PRODUCTION_DATABASE_URL = process.env.SUPABASE_DB_URL_PROD || process.env.DATABASE_URL_PROD || process.env.DATABASE_URL;

if (!PRODUCTION_DATABASE_URL) {
  console.error('❌ No production database URL found in environment variables');
  console.error('Please set SUPABASE_DB_URL_PROD or DATABASE_URL_PROD');
  process.exit(1);
}

// Verify we're using production database
if (!PRODUCTION_DATABASE_URL.includes('supabase.co')) {
  console.error('⚠️ WARNING: This does not appear to be a Supabase production database URL');
  console.log('Database URL:', PRODUCTION_DATABASE_URL.substring(0, 50) + '...');
  process.exit(1);
}

// Create connection pool
const pool = new Pool({
  connectionString: PRODUCTION_DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const db = drizzle(pool);

// Event venue data for variety
const venues = [
  { name: "The Royal Albert Hall", address: "Kensington Gore, South Kensington, London SW7 2AP", type: "Concert Hall" },
  { name: "Claridge's Hotel", address: "Brook Street, Mayfair, London W1K 4HR", type: "Hotel" },
  { name: "The Savoy", address: "Strand, London WC2R 0EZ", type: "Hotel" },
  { name: "Hedsor House", address: "Hedsor Park, Hedsor, Taplow SL6 0HX", type: "Wedding Venue" },
  { name: "Blenheim Palace", address: "Woodstock, Oxfordshire OX20 1PP", type: "Wedding Venue" },
  { name: "The Ned", address: "27 Poultry, London EC2R 8AJ", type: "Hotel/Event Space" },
  { name: "Somerset House", address: "Strand, London WC2R 1LA", type: "Event Space" },
  { name: "Ronnie Scott's Jazz Club", address: "47 Frith St, Soho, London W1D 4HT", type: "Jazz Club" },
  { name: "The 100 Club", address: "100 Oxford St, London W1D 1LL", type: "Music Venue" },
  { name: "Village Underground", address: "54 Holywell Ln, London EC2A 3PQ", type: "Music Venue" },
  { name: "Glastonbury Festival", address: "Worthy Farm, Pilton, Somerset BA4 4BY", type: "Festival" },
  { name: "Hyde Park", address: "Hyde Park, London W2 2UH", type: "Park/Outdoor" },
  { name: "The O2 Arena", address: "Peninsula Square, London SE10 0DX", type: "Arena" },
  { name: "Cliveden House", address: "Cliveden Rd, Taplow, Maidenhead SL6 0JF", type: "Wedding Venue" },
  { name: "The Dorchester", address: "53 Park Ln, Mayfair, London W1K 1QA", type: "Hotel" },
  { name: "Kew Gardens", address: "Richmond, Surrey, TW9 3AE", type: "Botanical Garden" },
  { name: "The Ivy", address: "1-5 West St, London WC2H 9NQ", type: "Restaurant" },
  { name: "Annabel's", address: "46 Berkeley Square, Mayfair, London W1J 5AT", type: "Private Club" },
  { name: "The Roundhouse", address: "Chalk Farm Rd, Camden, London NW1 8EH", type: "Music Venue" },
  { name: "Barbican Centre", address: "Silk St, Barbican, London EC2Y 8DS", type: "Arts Centre" }
];

const clientNames = [
  "Sarah & James Wilson", "Emma Thompson", "Michael Harrison", "Charlotte Davies",
  "Oliver Bennett", "Sophie Anderson", "William Taylor", "Isabella Brown",
  "Thomas Clarke", "Emily Roberts", "Daniel Miller", "Grace Johnson",
  "Alexander White", "Lily Evans", "Benjamin Cooper", "Mia Williams",
  "Henry Martin", "Amelia Green", "Sebastian Lee", "Victoria King",
  "Corporate Events Ltd", "Harmony Productions", "Elite Weddings", "Jazz Society UK"
];

const eventTypes = [
  { type: "Wedding", duration: "4 hours", fee: 850 },
  { type: "Wedding Reception", duration: "3 hours", fee: 650 },
  { type: "Corporate Event", duration: "2 hours", fee: 550 },
  { type: "Birthday Party", duration: "3 hours", fee: 450 },
  { type: "Anniversary", duration: "2 hours", fee: 400 },
  { type: "Jazz Night", duration: "2 sets", fee: 600 },
  { type: "Concert", duration: "90 minutes", fee: 800 },
  { type: "Private Party", duration: "3 hours", fee: 500 },
  { type: "Festival Performance", duration: "45 minutes", fee: 1200 },
  { type: "Club Gig", duration: "2 sets", fee: 400 },
  { type: "Charity Gala", duration: "2 hours", fee: 350 },
  { type: "Christmas Party", duration: "3 hours", fee: 650 },
  { type: "New Year's Eve", duration: "5 hours", fee: 1500 },
  { type: "Engagement Party", duration: "2 hours", fee: 450 },
  { type: "Cocktail Reception", duration: "2 hours", fee: 500 }
];

const gigTypes = ["Solo Piano", "Jazz Trio", "Jazz Quartet", "Piano & Vocals", "Full Band", "Acoustic Duo"];

const statuses = ["confirmed", "pending", "completed", "invoiced", "paid", "enquiry", "cancelled"];

// Generate dates between August 2025 and January 2027
function generateRandomDate(): Date {
  const start = new Date('2025-08-01');
  const end = new Date('2027-01-31');
  const randomTime = start.getTime() + Math.random() * (end.getTime() - start.getTime());
  return new Date(randomTime);
}

// Generate random time between 12:00 and 22:00
function generateEventTime(): { start: string, end: string } {
  const startHour = 12 + Math.floor(Math.random() * 8); // 12-19
  const startMin = Math.random() > 0.5 ? '00' : '30';
  const duration = 2 + Math.floor(Math.random() * 4); // 2-5 hours
  const endHour = Math.min(startHour + duration, 23);

  return {
    start: `${startHour.toString().padStart(2, '0')}:${startMin}`,
    end: `${endHour.toString().padStart(2, '0')}:00`
  };
}

async function createDummyEvents() {
  try {
    console.log('🔍 Looking for user jakestanleymusician@gmail.com in production...');

    // Find the user
    const user = await db.select().from(users)
      .where(eq(users.email, 'jakestanleymusician@gmail.com'))
      .limit(1);

    if (!user || user.length === 0) {
      console.error('❌ User jakestanleymusician@gmail.com not found in production database');
      process.exit(1);
    }

    const userId = user[0].id;
    console.log(`✅ Found user with ID: ${userId}`);

    const eventsToCreate = [];

    // Generate 50 events
    for (let i = 0; i < 50; i++) {
      const venue = venues[Math.floor(Math.random() * venues.length)];
      const client = clientNames[Math.floor(Math.random() * clientNames.length)];
      const eventType = eventTypes[Math.floor(Math.random() * eventTypes.length)];
      const gigType = gigTypes[Math.floor(Math.random() * gigTypes.length)];
      const eventDate = generateRandomDate();
      const eventTime = generateEventTime();
      const status = statuses[Math.floor(Math.random() * statuses.length)];

      // Add some variety to fees
      const baseFee = eventType.fee;
      const feeVariation = Math.floor(Math.random() * 200) - 100; // -100 to +100
      const travelExpense = Math.random() > 0.7 ? Math.floor(Math.random() * 100) + 20 : 0;
      const finalFee = baseFee + feeVariation;
      const deposit = Math.random() > 0.6 ? Math.floor(finalFee * 0.25) : null;

      const event = {
        userId: userId,
        clientName: client,
        clientEmail: client.toLowerCase().replace(/[^a-z]/g, '') + '@example.com',
        clientPhone: `07${Math.floor(Math.random() * 900000000 + 100000000)}`,
        clientAddress: Math.random() > 0.5 ? venue.address : null,

        title: `${eventType.type} - ${client}`,
        eventDate: eventDate,
        eventTime: eventTime.start,
        eventEndTime: eventTime.end,
        performanceDuration: eventType.duration,

        venue: venue.name,
        venueAddress: venue.address,
        venueContactInfo: Math.random() > 0.5 ? `Venue Manager: 020 ${Math.floor(Math.random() * 9000 + 1000)} ${Math.floor(Math.random() * 9000 + 1000)}` : null,

        gigType: gigType,
        eventType: eventType.type,

        fee: finalFee.toString(),
        finalAmount: (finalFee + travelExpense).toString(),
        travelExpense: travelExpense.toString(),
        depositAmount: deposit ? deposit.toString() : null,

        equipmentRequirements: Math.random() > 0.5 ? 'Piano required, PA system provided' : null,
        specialRequirements: Math.random() > 0.3 ? 'Please arrive 30 minutes before start time' : null,

        status: status,
        notes: `Test event ${i + 1} for demo purposes`,

        createdAt: new Date(),
        updatedAt: new Date()
      };

      eventsToCreate.push(event);
    }

    console.log('📝 Creating 50 dummy events...');

    // Insert in batches of 10
    for (let i = 0; i < eventsToCreate.length; i += 10) {
      const batch = eventsToCreate.slice(i, i + 10);
      await db.insert(bookings).values(batch);
      console.log(`✅ Created events ${i + 1} to ${Math.min(i + 10, eventsToCreate.length)}`);
    }

    console.log('🎉 Successfully created 50 dummy events for jakestanleymusician@gmail.com');
    console.log('📅 Date range: August 2025 - January 2027');
    console.log('📍 Venues used:', venues.length, 'different locations');
    console.log('🎵 Event types:', eventTypes.length, 'different types');

    // Show summary of events by month
    const monthCounts: { [key: string]: number } = {};
    eventsToCreate.forEach(event => {
      const monthKey = event.eventDate.toISOString().substring(0, 7);
      monthCounts[monthKey] = (monthCounts[monthKey] || 0) + 1;
    });

    console.log('\n📊 Events by month:');
    Object.keys(monthCounts).sort().forEach(month => {
      console.log(`  ${month}: ${monthCounts[month]} events`);
    });

  } catch (error) {
    console.error('❌ Error creating dummy events:', error);
    process.exit(1);
  } finally {
    await pool.end();
    process.exit(0);
  }
}

// Run the script
console.log('🚀 Starting dummy event creation for production...');
console.log('📧 Target account: jakestanleymusician@gmail.com');
console.log('📅 Date range: August 2025 - January 2027');
console.log('🎯 Number of events: 50');
console.log('');

createDummyEvents();