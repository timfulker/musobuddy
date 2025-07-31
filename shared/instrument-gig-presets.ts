// Instrument-specific gig type presets for MusoBuddy
// Each instrument gets a curated list of relevant gig types

export interface GigType {
  id: string;
  name: string;
  description: string;
  defaultDuration: string;
  priceRange: string;
  commonVenues: string[];
}

export interface InstrumentPreset {
  instrument: string;
  displayName: string;
  gigTypes: GigType[];
}

export const INSTRUMENT_GIG_PRESETS: InstrumentPreset[] = [
  {
    instrument: "saxophone",
    displayName: "Saxophone",
    gigTypes: [
      // Wedding Events
      {
        id: "wedding-ceremony",
        name: "Wedding Ceremony",
        description: "Musical accompaniment for wedding ceremonies",
        defaultDuration: "30-45 minutes",
        priceRange: "£200-300",
        commonVenues: ["Churches", "Hotels", "Registry Offices", "Outdoor venues"]
      },
      {
        id: "wedding-reception",
        name: "Wedding Reception",
        description: "Background music and entertainment for wedding receptions",
        defaultDuration: "2-4 hours",
        priceRange: "£300-500",
        commonVenues: ["Hotels", "Wedding venues", "Marquees", "Function rooms"]
      },
      {
        id: "wedding-drinks-reception",
        name: "Wedding Drinks Reception",
        description: "Background music during cocktail hour and drinks reception",
        defaultDuration: "1-2 hours",
        priceRange: "£200-350",
        commonVenues: ["Hotels", "Wedding venues", "Outdoor venues", "Gardens"]
      },
      {
        id: "wedding-breakfast",
        name: "Wedding Breakfast",
        description: "Musical accompaniment during wedding meal service",
        defaultDuration: "1-2 hours",
        priceRange: "£250-400",
        commonVenues: ["Hotels", "Wedding venues", "Restaurants", "Marquees"]
      },
      // Corporate Events
      {
        id: "corporate-event",
        name: "Corporate Event",
        description: "Professional entertainment for corporate functions",
        defaultDuration: "1-3 hours",
        priceRange: "£250-400",
        commonVenues: ["Hotels", "Conference centers", "Corporate offices", "Restaurants"]
      },
      {
        id: "product-launch",
        name: "Product Launch",
        description: "Musical entertainment for product launch events",
        defaultDuration: "1-2 hours",
        priceRange: "£300-500",
        commonVenues: ["Conference centers", "Hotels", "Exhibition venues", "Corporate offices"]
      },
      {
        id: "awards-ceremony",
        name: "Awards Ceremony",
        description: "Musical accompaniment for corporate awards and recognition events",
        defaultDuration: "2-3 hours",
        priceRange: "£350-550",
        commonVenues: ["Hotels", "Conference centers", "Theaters", "Function rooms"]
      },
      {
        id: "conference-entertainment",
        name: "Conference Entertainment",
        description: "Entertainment during conference breaks and networking events",
        defaultDuration: "1-3 hours",
        priceRange: "£250-400",
        commonVenues: ["Conference centers", "Hotels", "Exhibition venues", "Corporate venues"]
      },
      // Private Events
      {
        id: "private-party",
        name: "Private Party",
        description: "Entertainment for private celebrations and parties",
        defaultDuration: "2-3 hours",
        priceRange: "£200-350",
        commonVenues: ["Private homes", "Function rooms", "Restaurants", "Clubs"]
      },
      {
        id: "birthday-party",
        name: "Birthday Party",
        description: "Musical entertainment for birthday celebrations",
        defaultDuration: "2-3 hours",
        priceRange: "£200-350",
        commonVenues: ["Private homes", "Function rooms", "Restaurants", "Hotels"]
      },
      {
        id: "anniversary-celebration",
        name: "Anniversary Celebration",
        description: "Musical entertainment for wedding anniversaries and milestone celebrations",
        defaultDuration: "2-3 hours",
        priceRange: "£250-400",
        commonVenues: ["Private homes", "Hotels", "Restaurants", "Function rooms"]
      },
      {
        id: "retirement-party",
        name: "Retirement Party",
        description: "Musical entertainment for retirement celebrations",
        defaultDuration: "2-3 hours",
        priceRange: "£200-350",
        commonVenues: ["Function rooms", "Hotels", "Restaurants", "Community centers"]
      },
      // Hospitality & Entertainment
      {
        id: "restaurant-performance",
        name: "Restaurant Performance",
        description: "Background music for restaurant dining experiences",
        defaultDuration: "2-4 hours",
        priceRange: "£150-300",
        commonVenues: ["Restaurants", "Wine bars", "Bistros", "Hotel restaurants"]
      },
      {
        id: "hotel-lounge",
        name: "Hotel Lounge Performance",
        description: "Background music for hotel lounges and bars",
        defaultDuration: "2-4 hours",
        priceRange: "£200-350",
        commonVenues: ["Hotel lounges", "Cocktail bars", "Wine bars", "Resort venues"]
      },
      {
        id: "jazz-club",
        name: "Jazz Club",
        description: "Performance at jazz venues and music clubs",
        defaultDuration: "2-3 sets",
        priceRange: "£150-250",
        commonVenues: ["Jazz clubs", "Music venues", "Bars", "Restaurants"]
      },
      {
        id: "cruise-ship",
        name: "Cruise Ship Performance",
        description: "Entertainment aboard cruise ships and maritime venues",
        defaultDuration: "2-4 hours",
        priceRange: "£300-600",
        commonVenues: ["Cruise ships", "Yacht clubs", "Marina venues", "Boat parties"]
      },
      // Religious & Memorial Services
      {
        id: "funeral-service",
        name: "Funeral Service",
        description: "Musical tribute for funeral and memorial services",
        defaultDuration: "30-60 minutes",
        priceRange: "£150-250",
        commonVenues: ["Churches", "Crematoriums", "Funeral homes", "Outdoor venues"]
      },
      {
        id: "memorial-service",
        name: "Memorial Service",
        description: "Musical tribute for memorial and celebration of life services",
        defaultDuration: "30-90 minutes",
        priceRange: "£150-300",
        commonVenues: ["Churches", "Community centers", "Function rooms", "Outdoor venues"]
      },
      {
        id: "christening-baptism",
        name: "Christening/Baptism",
        description: "Musical accompaniment for christening and baptism ceremonies",
        defaultDuration: "30-60 minutes",
        priceRange: "£150-250",
        commonVenues: ["Churches", "Private homes", "Outdoor venues", "Community centers"]
      },
      // Educational & Tuition
      {
        id: "private-lessons",
        name: "Private Saxophone Lessons",
        description: "One-on-one saxophone instruction and tuition",
        defaultDuration: "30-60 minutes",
        priceRange: "£30-60",
        commonVenues: ["Private homes", "Music schools", "Studios", "Online"]
      },
      {
        id: "group-lessons",
        name: "Group Saxophone Lessons",
        description: "Small group saxophone instruction",
        defaultDuration: "45-90 minutes",
        priceRange: "£20-40 per person",
        commonVenues: ["Music schools", "Community centers", "Schools", "Studios"]
      },
      {
        id: "masterclass",
        name: "Saxophone Masterclass",
        description: "Advanced instruction and performance coaching",
        defaultDuration: "1-3 hours",
        priceRange: "£100-300",
        commonVenues: ["Music schools", "Universities", "Conservatoires", "Workshops"]
      },
      {
        id: "school-workshop",
        name: "School Workshop",
        description: "Educational saxophone workshops for schools",
        defaultDuration: "1-2 hours",
        priceRange: "£150-350",
        commonVenues: ["Schools", "Colleges", "Universities", "Music centers"]
      },
      // Performance & Recording
      {
        id: "concert-performance",
        name: "Concert Performance",
        description: "Formal concert and recital performances",
        defaultDuration: "1-2 hours",
        priceRange: "£200-500",
        commonVenues: ["Concert halls", "Theaters", "Music venues", "Churches"]
      },
      {
        id: "festival-performance",
        name: "Festival Performance",
        description: "Performance at music festivals and outdoor events",
        defaultDuration: "30-90 minutes",
        priceRange: "£200-600",
        commonVenues: ["Festival stages", "Outdoor venues", "Parks", "Event grounds"]
      },
      {
        id: "recording-session",
        name: "Recording Session",
        description: "Studio recording and session work",
        defaultDuration: "2-8 hours",
        priceRange: "£100-400",
        commonVenues: ["Recording studios", "Home studios", "Rehearsal rooms"]
      },
      {
        id: "session-musician",
        name: "Session Musician",
        description: "Backup musician for other artists and bands",
        defaultDuration: "2-4 hours",
        priceRange: "£150-400",
        commonVenues: ["Music venues", "Theaters", "Recording studios", "Concert halls"]
      },
      // Specialty Events
      {
        id: "charity-event",
        name: "Charity Event",
        description: "Musical entertainment for charity fundraisers and benefit events",
        defaultDuration: "1-3 hours",
        priceRange: "£150-350",
        commonVenues: ["Function rooms", "Hotels", "Community centers", "Outdoor venues"]
      },
      {
        id: "open-day",
        name: "Open Day Entertainment",
        description: "Musical entertainment for business and venue open days",
        defaultDuration: "2-4 hours",
        priceRange: "£200-400",
        commonVenues: ["Showrooms", "Garden centers", "Business premises", "Shopping centers"]
      },
      {
        id: "graduation-ceremony",
        name: "Graduation Ceremony",
        description: "Musical accompaniment for graduation and academic ceremonies",
        defaultDuration: "1-3 hours",
        priceRange: "£250-450",
        commonVenues: ["Universities", "Schools", "Colleges", "Graduation venues"]
      },
      {
        id: "seasonal-event",
        name: "Seasonal Event",
        description: "Christmas, New Year and seasonal celebration entertainment",
        defaultDuration: "2-4 hours",
        priceRange: "£250-500",
        commonVenues: ["Hotels", "Restaurants", "Function rooms", "Corporate venues"]
      }
    ]
  },
  {
    instrument: "guitar",
    displayName: "Guitar",
    gigTypes: [
      {
        id: "acoustic-wedding",
        name: "Acoustic Wedding",
        description: "Acoustic guitar for wedding ceremonies and receptions",
        defaultDuration: "2-4 hours",
        priceRange: "£250-400",
        commonVenues: ["Churches", "Hotels", "Outdoor venues", "Wedding venues"]
      },
      {
        id: "restaurant-gig",
        name: "Restaurant Performance",
        description: "Background music for restaurants and dining venues",
        defaultDuration: "2-3 hours",
        priceRange: "£150-300",
        commonVenues: ["Restaurants", "Bars", "Cafes", "Hotels"]
      },
      {
        id: "pub-gig",
        name: "Pub Performance",
        description: "Live music performance at pubs and bars",
        defaultDuration: "2-3 sets",
        priceRange: "£100-200",
        commonVenues: ["Pubs", "Bars", "Social clubs", "Music venues"]
      },
      {
        id: "private-lesson",
        name: "Private Lesson",
        description: "One-on-one guitar instruction",
        defaultDuration: "45-60 minutes",
        priceRange: "£25-50",
        commonVenues: ["Private homes", "Music schools", "Studios", "Online"]
      },
      {
        id: "band-performance",
        name: "Band Performance",
        description: "Performance as part of a band or ensemble",
        defaultDuration: "2-4 hours",
        priceRange: "£200-400",
        commonVenues: ["Music venues", "Clubs", "Festivals", "Private events"]
      }
    ]
  },
  {
    instrument: "piano",
    displayName: "Piano",
    gigTypes: [
      {
        id: "wedding-pianist",
        name: "Wedding Pianist",
        description: "Piano accompaniment for wedding ceremonies and receptions",
        defaultDuration: "2-4 hours",
        priceRange: "£300-500",
        commonVenues: ["Churches", "Hotels", "Wedding venues", "Function rooms"]
      },
      {
        id: "cocktail-piano",
        name: "Cocktail Piano",
        description: "Background piano music for cocktail events and functions",
        defaultDuration: "2-3 hours",
        priceRange: "£250-400",
        commonVenues: ["Hotels", "Bars", "Restaurants", "Private venues"]
      },
      {
        id: "piano-lessons",
        name: "Piano Lessons",
        description: "Private piano instruction and teaching",
        defaultDuration: "30-60 minutes",
        priceRange: "£30-60",
        commonVenues: ["Private homes", "Music schools", "Studios", "Online"]
      },
      {
        id: "recital",
        name: "Piano Recital",
        description: "Solo piano performance or recital",
        defaultDuration: "1-2 hours",
        priceRange: "£200-400",
        commonVenues: ["Concert halls", "Churches", "Music venues", "Private events"]
      }
    ]
  },
  {
    instrument: "violin",
    displayName: "Violin",
    gigTypes: [
      {
        id: "string-quartet",
        name: "String Quartet",
        description: "Classical ensemble performance for formal events",
        defaultDuration: "1-3 hours",
        priceRange: "£300-600",
        commonVenues: ["Churches", "Hotels", "Concert halls", "Wedding venues"]
      },
      {
        id: "solo-violin",
        name: "Solo Violin",
        description: "Solo violin performance for ceremonies and events",
        defaultDuration: "30-90 minutes",
        priceRange: "£200-400",
        commonVenues: ["Churches", "Private homes", "Function rooms", "Outdoor venues"]
      },
      {
        id: "electric-violin",
        name: "Electric Violin",
        description: "Contemporary electric violin performance",
        defaultDuration: "1-3 hours",
        priceRange: "£250-450",
        commonVenues: ["Clubs", "Corporate events", "Private parties", "Music venues"]
      }
    ]
  },
  {
    instrument: "drums",
    displayName: "Drums",
    gigTypes: [
      {
        id: "band-drummer",
        name: "Band Drummer",
        description: "Drumming for band performances and gigs",
        defaultDuration: "2-4 hours",
        priceRange: "£150-350",
        commonVenues: ["Music venues", "Clubs", "Pubs", "Festivals"]
      },
      {
        id: "session-work",
        name: "Session Work",
        description: "Studio recording and session drumming",
        defaultDuration: "3-8 hours",
        priceRange: "£100-300",
        commonVenues: ["Recording studios", "Rehearsal rooms", "Home studios"]
      },
      {
        id: "drum-lessons",
        name: "Drum Lessons",
        description: "Private drum instruction and teaching",
        defaultDuration: "30-60 minutes",
        priceRange: "£25-50",
        commonVenues: ["Music schools", "Private homes", "Studios", "Online"]
      }
    ]
  },
  {
    instrument: "dj",
    displayName: "DJ",
    gigTypes: [
      {
        id: "wedding-dj",
        name: "Wedding DJ",
        description: "Full DJ service for wedding receptions and celebrations",
        defaultDuration: "4-6 hours",
        priceRange: "£400-800",
        commonVenues: ["Hotels", "Wedding venues", "Marquees", "Function rooms"]
      },
      {
        id: "party-dj",
        name: "Party DJ",
        description: "DJ entertainment for private parties and celebrations",
        defaultDuration: "3-5 hours",
        priceRange: "£300-600",
        commonVenues: ["Private homes", "Function rooms", "Clubs", "Outdoor venues"]
      },
      {
        id: "corporate-dj",
        name: "Corporate DJ",
        description: "Professional DJ services for corporate events and functions",
        defaultDuration: "2-4 hours",
        priceRange: "£350-700",
        commonVenues: ["Hotels", "Conference centers", "Corporate venues", "Function rooms"]
      },
      {
        id: "club-dj",
        name: "Club DJ",
        description: "DJ performance at nightclubs and music venues",
        defaultDuration: "3-6 hours",
        priceRange: "£200-500",
        commonVenues: ["Nightclubs", "Music venues", "Bars", "Event spaces"]
      },
      {
        id: "mobile-disco",
        name: "Mobile Disco",
        description: "Complete mobile disco service with lighting and sound",
        defaultDuration: "3-5 hours",
        priceRange: "£300-600",
        commonVenues: ["Community halls", "Schools", "Private venues", "Outdoor events"]
      }
    ]
  }
];

// Helper function to get gig types for a specific instrument
export function getGigTypesForInstrument(instrument: string): GigType[] {
  const preset = INSTRUMENT_GIG_PRESETS.find(p => p.instrument === instrument);
  return preset?.gigTypes || [];
}

// Helper function to get gig type names for a specific instrument (returns strings)
export function getGigTypeNamesForInstrument(instrument: string): string[] {
  const preset = INSTRUMENT_GIG_PRESETS.find(p => p.instrument === instrument);
  return preset?.gigTypes.map(gt => gt.name) || [];
}

// Helper function to get all available instruments
export function getAvailableInstruments(): string[] {
  return INSTRUMENT_GIG_PRESETS.map(preset => preset.instrument);
}

// Helper function to get display name for instrument
export function getInstrumentDisplayName(instrument: string): string {
  const preset = INSTRUMENT_GIG_PRESETS.find(p => p.instrument === instrument);
  return preset?.displayName || instrument;
}

// Helper function to get gig type details
export function getGigTypeDetails(instrument: string, gigTypeId: string): GigType | null {
  const gigTypes = getGigTypesForInstrument(instrument);
  return gigTypes.find(gt => gt.id === gigTypeId) || null;
}