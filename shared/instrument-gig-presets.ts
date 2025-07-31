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
        id: "corporate-event",
        name: "Corporate Event",
        description: "Professional entertainment for corporate functions",
        defaultDuration: "1-3 hours",
        priceRange: "£250-400",
        commonVenues: ["Hotels", "Conference centers", "Corporate offices", "Restaurants"]
      },
      {
        id: "private-party",
        name: "Private Party",
        description: "Entertainment for private celebrations and parties",
        defaultDuration: "2-3 hours",
        priceRange: "£200-350",
        commonVenues: ["Private homes", "Function rooms", "Restaurants", "Clubs"]
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
        id: "funeral-service",
        name: "Funeral Service",
        description: "Musical tribute for funeral and memorial services",
        defaultDuration: "30-60 minutes",
        priceRange: "£150-250",
        commonVenues: ["Churches", "Crematoriums", "Funeral homes", "Outdoor venues"]
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