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
  // Core Instruments (maintain backward compatibility)
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
  },
  {
    instrument: "drums",
    displayName: "Drum Kit",
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
    instrument: "guitar",
    displayName: "Electric Guitar",
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
    instrument: "bass",
    displayName: "Bass Guitar",
    gigTypes: [
      {
        id: "wedding-bass",
        name: "Wedding Reception",
        description: "Bass accompaniment for wedding bands and receptions",
        defaultDuration: "3-4 hours",
        priceRange: "£300-500",
        commonVenues: ["Hotels", "Wedding venues", "Function rooms", "Marquees"]
      },
      {
        id: "jazz-bass",
        name: "Jazz Performance",
        description: "Bass performance for jazz ensembles and venues",
        defaultDuration: "2-3 hours",
        priceRange: "£200-400",
        commonVenues: ["Jazz clubs", "Restaurants", "Hotels", "Private events"]
      },
      {
        id: "corporate-bass",
        name: "Corporate Event",
        description: "Bass accompaniment for corporate entertainment",
        defaultDuration: "2-3 hours",
        priceRange: "£250-450",
        commonVenues: ["Hotels", "Conference centers", "Corporate venues"]
      }
    ]
  },
  {
    instrument: "vocals",
    displayName: "Lead Vocals",
    gigTypes: [
      {
        id: "wedding-singer",
        name: "Wedding Singer",
        description: "Vocal performance for wedding ceremonies and receptions",
        defaultDuration: "2-4 hours",
        priceRange: "£300-600",
        commonVenues: ["Churches", "Hotels", "Wedding venues", "Marquees"]
      },
      {
        id: "jazz-vocals",
        name: "Jazz Vocals",
        description: "Jazz singing for restaurants and intimate venues",
        defaultDuration: "2-3 hours",
        priceRange: "£250-500",
        commonVenues: ["Jazz clubs", "Restaurants", "Hotels", "Wine bars"]
      },
      {
        id: "corporate-singer",
        name: "Corporate Entertainment",
        description: "Vocal entertainment for corporate events",
        defaultDuration: "1-3 hours",
        priceRange: "£300-700",
        commonVenues: ["Hotels", "Conference centers", "Corporate venues", "Awards ceremonies"]
      },
      {
        id: "tribute-act",
        name: "Tribute Act",
        description: "Tribute singing performance",
        defaultDuration: "2-4 hours",
        priceRange: "£400-800",
        commonVenues: ["Clubs", "Hotels", "Function rooms", "Outdoor events"]
      }
    ]
  },
  {
    instrument: "keyboard",
    displayName: "Keyboard / Synthesizer",
    gigTypes: [
      {
        id: "wedding-keyboard",
        name: "Wedding Reception",
        description: "Keyboard accompaniment for weddings",
        defaultDuration: "3-4 hours",
        priceRange: "£250-500",
        commonVenues: ["Hotels", "Wedding venues", "Function rooms", "Marquees"]
      },
      {
        id: "corporate-keyboard",
        name: "Corporate Event",
        description: "Keyboard entertainment for corporate functions",
        defaultDuration: "2-3 hours",
        priceRange: "£250-450",
        commonVenues: ["Hotels", "Conference centers", "Corporate venues"]
      },
      {
        id: "party-keyboard",
        name: "Private Party",
        description: "Keyboard entertainment for private celebrations",
        defaultDuration: "2-4 hours",
        priceRange: "£200-400",
        commonVenues: ["Private homes", "Function rooms", "Community halls"]
      }
    ]
  },
  {
    instrument: "saxophone",
    displayName: "Saxophone (Alto, Tenor, Baritone)",
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
        description: "Reception entertainment and background music",
        defaultDuration: "2-4 hours",
        priceRange: "£300-500",
        commonVenues: ["Hotels", "Wedding venues", "Function rooms", "Marquees"]
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
        commonVenues: ["Private homes", "Function rooms", "Gardens", "Clubs"]
      },
      {
        id: "restaurant-performance",
        name: "Restaurant Performance",
        description: "Background music for dining establishments",
        defaultDuration: "2-4 hours",
        priceRange: "£150-300",
        commonVenues: ["Restaurants", "Cafes", "Wine bars", "Hotels"]
      },
      {
        id: "funeral-service",
        name: "Funeral Service",
        description: "Respectful musical accompaniment for funeral services",
        defaultDuration: "30-60 minutes",
        priceRange: "£150-250",
        commonVenues: ["Churches", "Crematoria", "Function rooms", "Outdoor venues"]
      },
      {
        id: "festival-performance",
        name: "Festival Performance",
        description: "Live performance at festivals and outdoor events",
        defaultDuration: "30-90 minutes",
        priceRange: "£200-400",
        commonVenues: ["Festival stages", "Outdoor venues", "Parks", "Community events"]
      }
    ]
  },
  // NEW INSTRUMENTS - Additional options from the comprehensive list
  {
    instrument: "acoustic-guitar",
    displayName: "Acoustic Guitar",
    gigTypes: [
      {
        id: "acoustic-solo",
        name: "Acoustic Solo",
        description: "Solo acoustic guitar performance",
        defaultDuration: "2-3 hours",
        priceRange: "£200-350",
        commonVenues: ["Cafes", "Restaurants", "Private events", "Gardens"]
      }
    ]
  },
  {
    instrument: "trumpet",
    displayName: "Trumpet",
    gigTypes: [
      {
        id: "wedding-trumpet",
        name: "Wedding Ceremony",
        description: "Trumpet fanfares and ceremony music",
        defaultDuration: "30-60 minutes",
        priceRange: "£200-400",
        commonVenues: ["Churches", "Hotels", "Outdoor venues", "Registry offices"]
      },
      {
        id: "brass-ensemble",
        name: "Brass Ensemble",
        description: "Trumpet in brass quintet or ensemble",
        defaultDuration: "1-2 hours",
        priceRange: "£200-350",
        commonVenues: ["Churches", "Outdoor events", "Hotels", "Corporate venues"]
      }
    ]
  },
  {
    instrument: "trombone",
    displayName: "Trombone",
    gigTypes: [
      {
        id: "jazz-trombone",
        name: "Jazz Performance",
        description: "Trombone for jazz bands and big bands",
        defaultDuration: "2-3 hours",
        priceRange: "£250-450",
        commonVenues: ["Jazz clubs", "Hotels", "Function rooms", "Private events"]
      },
      {
        id: "brass-trombone",
        name: "Brass Ensemble",
        description: "Trombone in brass quintet or ensemble",
        defaultDuration: "1-2 hours",
        priceRange: "£200-350",
        commonVenues: ["Churches", "Outdoor events", "Hotels", "Corporate venues"]
      }
    ]
  },
  {
    instrument: "double-bass",
    displayName: "Double Bass / Upright Bass",
    gigTypes: [
      {
        id: "jazz-double-bass",
        name: "Jazz Performance",
        description: "Double bass for jazz ensembles and venues",
        defaultDuration: "2-3 hours",
        priceRange: "£200-400",
        commonVenues: ["Jazz clubs", "Restaurants", "Hotels", "Private events"]
      },
      {
        id: "classical-bass",
        name: "Classical Performance",
        description: "Double bass in orchestral or chamber settings",
        defaultDuration: "1-3 hours",
        priceRange: "£250-500",
        commonVenues: ["Concert halls", "Churches", "Theaters", "Private events"]
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
      }
    ]
  },
  {
    instrument: "vibraphone",
    displayName: "Vibraphone",
    gigTypes: [
      {
        id: "jazz-vibes",
        name: "Jazz Performance",
        description: "Vibraphone for jazz ensembles and cocktail settings",
        defaultDuration: "2-3 hours",
        priceRange: "£200-400",
        commonVenues: ["Jazz clubs", "Hotels", "Restaurants", "Private events"]
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
      }
    ]
  },
  {
    instrument: "viola",
    displayName: "Viola",
    gigTypes: [
      {
        id: "string-quartet-viola",
        name: "String Quartet",
        description: "Classical string quartet performance for formal events",
        defaultDuration: "1-3 hours",
        priceRange: "£300-600",
        commonVenues: ["Churches", "Hotels", "Concert halls", "Wedding venues"]
      }
    ]
  },
  {
    instrument: "cello",
    displayName: "Cello",
    gigTypes: [
      {
        id: "wedding-ceremony-cello",
        name: "Wedding Ceremony",
        description: "Classical cello performance for wedding ceremonies",
        defaultDuration: "30-60 minutes",
        priceRange: "£200-400",
        commonVenues: ["Churches", "Hotels", "Registry offices", "Outdoor venues"]
      },
      {
        id: "classical-cello",
        name: "Classical Concert",
        description: "Solo or ensemble cello performance",
        defaultDuration: "1-2 hours",
        priceRange: "£300-600",
        commonVenues: ["Concert halls", "Churches", "Private homes", "Hotels"]
      }
    ]
  },
  {
    instrument: "harp",
    displayName: "Harp",
    gigTypes: [
      {
        id: "wedding-harp",
        name: "Wedding Ceremony",
        description: "Classical harp music for wedding ceremonies",
        defaultDuration: "30-60 minutes",
        priceRange: "£300-600",
        commonVenues: ["Churches", "Hotels", "Gardens", "Outdoor venues"]
      },
      {
        id: "classical-harp",
        name: "Classical Concert",
        description: "Solo harp recital or ensemble performance",
        defaultDuration: "1-2 hours",
        priceRange: "£400-800",
        commonVenues: ["Concert halls", "Churches", "Private venues", "Hotels"]
      }
    ]
  },
  {
    instrument: "flute",
    displayName: "Flute",
    gigTypes: [
      {
        id: "wedding-ceremony-flute",
        name: "Wedding Ceremony",
        description: "Flute performance for wedding ceremonies",
        defaultDuration: "30-45 minutes",
        priceRange: "£180-350",
        commonVenues: ["Churches", "Hotels", "Gardens", "Registry offices"]
      },
      {
        id: "classical-flute",
        name: "Classical Performance",
        description: "Solo flute recital or ensemble performance",
        defaultDuration: "1-2 hours",
        priceRange: "£250-500",
        commonVenues: ["Concert halls", "Churches", "Private venues", "Schools"]
      }
    ]
  },
  {
    instrument: "oboe",
    displayName: "Oboe",
    gigTypes: [
      {
        id: "classical-oboe",
        name: "Classical Performance",
        description: "Solo oboe or orchestral performance",
        defaultDuration: "1-2 hours",
        priceRange: "£250-500",
        commonVenues: ["Concert halls", "Churches", "Private venues", "Schools"]
      }
    ]
  },
  {
    instrument: "clarinet",
    displayName: "Clarinet",
    gigTypes: [
      {
        id: "wedding-clarinet",
        name: "Wedding Ceremony",
        description: "Classical clarinet for wedding ceremonies",
        defaultDuration: "30-45 minutes",
        priceRange: "£200-400",
        commonVenues: ["Churches", "Hotels", "Gardens", "Registry offices"]
      },
      {
        id: "jazz-clarinet",
        name: "Jazz Performance",
        description: "Clarinet for jazz ensembles and venues",
        defaultDuration: "2-3 hours",
        priceRange: "£200-400",
        commonVenues: ["Jazz clubs", "Restaurants", "Hotels", "Private events"]
      }
    ]
  },
  {
    instrument: "bassoon",
    displayName: "Bassoon",
    gigTypes: [
      {
        id: "classical-bassoon",
        name: "Classical Performance",
        description: "Solo bassoon or orchestral performance",
        defaultDuration: "1-2 hours",
        priceRange: "£250-500",
        commonVenues: ["Concert halls", "Churches", "Private venues", "Schools"]
      }
    ]
  },
  {
    instrument: "cor-anglais",
    displayName: "Cor Anglais (English Horn)",
    gigTypes: [
      {
        id: "classical-cor-anglais",
        name: "Classical Performance",
        description: "Solo cor anglais or orchestral performance",
        defaultDuration: "1-2 hours",
        priceRange: "£250-500",
        commonVenues: ["Concert halls", "Churches", "Private venues", "Schools"]
      }
    ]
  },
  {
    instrument: "piccolo",
    displayName: "Piccolo",
    gigTypes: [
      {
        id: "classical-piccolo",
        name: "Classical Performance",
        description: "Solo piccolo or orchestral performance",
        defaultDuration: "1-2 hours",
        priceRange: "£200-400",
        commonVenues: ["Concert halls", "Churches", "Private venues", "Schools"]
      }
    ]
  },
  {
    instrument: "french-horn",
    displayName: "French Horn",
    gigTypes: [
      {
        id: "classical-horn",
        name: "Classical Performance",
        description: "Solo french horn or orchestral performance",
        defaultDuration: "1-2 hours",
        priceRange: "£250-500",
        commonVenues: ["Concert halls", "Churches", "Private venues", "Schools"]
      }
    ]
  },
  {
    instrument: "tuba",
    displayName: "Tuba",
    gigTypes: [
      {
        id: "brass-tuba",
        name: "Brass Ensemble",
        description: "Tuba in brass quintet or ensemble",
        defaultDuration: "1-2 hours",
        priceRange: "£200-400",
        commonVenues: ["Churches", "Outdoor events", "Hotels", "Corporate venues"]
      }
    ]
  },
  {
    instrument: "euphonium",
    displayName: "Euphonium",
    gigTypes: [
      {
        id: "brass-euphonium",
        name: "Brass Ensemble",
        description: "Euphonium in brass band or ensemble",
        defaultDuration: "1-2 hours",
        priceRange: "£200-400",
        commonVenues: ["Churches", "Outdoor events", "Hotels", "Corporate venues"]
      }
    ]
  },
  {
    instrument: "timpani",
    displayName: "Timpani",
    gigTypes: [
      {
        id: "orchestral-timpani",
        name: "Orchestral Performance",
        description: "Timpani in orchestral or ensemble settings",
        defaultDuration: "1-3 hours",
        priceRange: "£200-500",
        commonVenues: ["Concert halls", "Theaters", "Opera houses", "Festival venues"]
      }
    ]
  },
  {
    instrument: "congas",
    displayName: "Congas",
    gigTypes: [
      {
        id: "latin-percussion",
        name: "Latin Performance",
        description: "Congas for Latin music and world music performances",
        defaultDuration: "2-4 hours",
        priceRange: "£150-350",
        commonVenues: ["Clubs", "Restaurants", "Festivals", "Private events"]
      }
    ]
  },
  {
    instrument: "bongos",
    displayName: "Bongos",
    gigTypes: [
      {
        id: "latin-bongos",
        name: "Latin Performance",
        description: "Bongos for Latin music and world music performances",
        defaultDuration: "2-4 hours",
        priceRange: "£150-350",
        commonVenues: ["Clubs", "Restaurants", "Festivals", "Private events"]
      }
    ]
  },
  {
    instrument: "percussion",
    displayName: "Percussion",
    gigTypes: [
      {
        id: "general-percussion",
        name: "Percussion Performance",
        description: "General percussion for various musical styles",
        defaultDuration: "2-4 hours",
        priceRange: "£150-350",
        commonVenues: ["Music venues", "Clubs", "Theaters", "Private events"]
      }
    ]
  },
  {
    instrument: "backing-vocals",
    displayName: "Backing Vocals",
    gigTypes: [
      {
        id: "session-backing",
        name: "Session Backing Vocals",
        description: "Studio recording and live backing vocals",
        defaultDuration: "2-4 hours",
        priceRange: "£150-350",
        commonVenues: ["Recording studios", "Live venues", "Concerts"]
      }
    ]
  },
  {
    instrument: "sampler",
    displayName: "Sampler / Drum Machine",
    gigTypes: [
      {
        id: "electronic-performance",
        name: "Electronic Performance",
        description: "Live electronic music performance with samplers and drum machines",
        defaultDuration: "2-4 hours",
        priceRange: "£200-500",
        commonVenues: ["Clubs", "Electronic venues", "Festivals", "Private events"]
      }
    ]
  },
  {
    instrument: "loop-station",
    displayName: "Loop Station",
    gigTypes: [
      {
        id: "solo-loop-performance",
        name: "Solo Loop Performance",
        description: "One-person performance using loop station technology",
        defaultDuration: "2-3 hours",
        priceRange: "£200-450",
        commonVenues: ["Cafes", "Bars", "Street performances", "Private events"]
      }
    ]
  },
  {
    instrument: "accordion",
    displayName: "Accordion",
    gigTypes: [
      {
        id: "folk-accordion",
        name: "Folk Performance",
        description: "Traditional accordion music for folk events",
        defaultDuration: "2-3 hours",
        priceRange: "£200-400",
        commonVenues: ["Pubs", "Folk clubs", "Festivals", "Community events"]
      }
    ]
  },
  {
    instrument: "harmonica",
    displayName: "Harmonica",
    gigTypes: [
      {
        id: "blues-harmonica",
        name: "Blues Performance",
        description: "Harmonica for blues bands and venues",
        defaultDuration: "2-3 hours",
        priceRange: "£150-350",
        commonVenues: ["Blues clubs", "Pubs", "Music venues", "Festivals"]
      }
    ]
  },
  {
    instrument: "bagpipes",
    displayName: "Bagpipes",
    gigTypes: [
      {
        id: "wedding-bagpipes",
        name: "Wedding Ceremony",
        description: "Traditional bagpipes for wedding ceremonies",
        defaultDuration: "30-90 minutes",
        priceRange: "£300-600",
        commonVenues: ["Churches", "Outdoor venues", "Highland venues", "Private estates"]
      },
      {
        id: "funeral-bagpipes",
        name: "Funeral Service",
        description: "Traditional bagpipes for memorial services",
        defaultDuration: "30-60 minutes",
        priceRange: "£200-400",
        commonVenues: ["Churches", "Crematoriums", "Cemeteries", "Memorial venues"]
      }
    ]
  },
  {
    instrument: "sitar",
    displayName: "Sitar",
    gigTypes: [
      {
        id: "indian-classical",
        name: "Indian Classical Performance",
        description: "Traditional sitar performance for Indian classical music",
        defaultDuration: "1-3 hours",
        priceRange: "£200-500",
        commonVenues: ["Cultural centers", "Private events", "Festivals", "Concert halls"]
      }
    ]
  },
  {
    instrument: "tabla",
    displayName: "Tabla",
    gigTypes: [
      {
        id: "indian-percussion",
        name: "Indian Classical Performance",
        description: "Traditional tabla for Indian classical music",
        defaultDuration: "1-3 hours",
        priceRange: "£200-500",
        commonVenues: ["Cultural centers", "Private events", "Festivals", "Concert halls"]
      }
    ]
  },
  {
    instrument: "steel-pan",
    displayName: "Steel Pan",
    gigTypes: [
      {
        id: "caribbean-performance",
        name: "Caribbean Performance",
        description: "Steel pan for Caribbean and tropical music",
        defaultDuration: "2-4 hours",
        priceRange: "£250-500",
        commonVenues: ["Beach venues", "Tropical events", "Festivals", "Private parties"]
      }
    ]
  },
  {
    instrument: "didgeridoo",
    displayName: "Didgeridoo",
    gigTypes: [
      {
        id: "world-music-didgeridoo",
        name: "World Music Performance",
        description: "Traditional didgeridoo for world music and meditation",
        defaultDuration: "1-2 hours",
        priceRange: "£150-350",
        commonVenues: ["Festivals", "Meditation centers", "Cultural events", "Outdoor venues"]
      }
    ]
  },
  {
    instrument: "theremin",
    displayName: "Theremin",
    gigTypes: [
      {
        id: "electronic-theremin",
        name: "Electronic Performance",
        description: "Theremin for electronic and experimental music",
        defaultDuration: "1-2 hours",
        priceRange: "£200-400",
        commonVenues: ["Electronic venues", "Art galleries", "Experimental venues", "Private events"]
      }
    ]
  },
  {
    instrument: "mandolin",
    displayName: "Mandolin",
    gigTypes: [
      {
        id: "folk-mandolin",
        name: "Folk Performance",
        description: "Traditional mandolin music for folk venues",
        defaultDuration: "2-3 hours",
        priceRange: "£150-350",
        commonVenues: ["Folk clubs", "Pubs", "Restaurants", "Private events"]
      }
    ]
  },
  {
    instrument: "banjo",
    displayName: "Banjo",
    gigTypes: [
      {
        id: "folk-banjo",
        name: "Folk Performance",
        description: "Traditional banjo music for folk events",
        defaultDuration: "2-3 hours",
        priceRange: "£150-350",
        commonVenues: ["Folk clubs", "Pubs", "Festivals", "Outdoor events"]
      }
    ]
  },
  {
    instrument: "ukulele",
    displayName: "Ukulele",
    gigTypes: [
      {
        id: "wedding-ukulele",
        name: "Wedding Ceremony",
        description: "Intimate ukulele music for small weddings",
        defaultDuration: "30-90 minutes",
        priceRange: "£150-350",
        commonVenues: ["Gardens", "Beach venues", "Small venues", "Private homes"]
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
export async function getGigTypeNamesForInstrument(instrument: string): Promise<string[]> {
  try {
    // Import OpenAI here to avoid circular dependencies
    const { OpenAI } = await import("openai");
    
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      console.warn('⚠️ OPENAI_API_KEY not set, using fallback gig types');
      return getFallbackGigTypes(instrument);
    }

    const openai = new OpenAI({ apiKey });
    
    console.log(`🤖 Generating gig types for instrument: ${instrument}`);
    
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      max_tokens: 1000,
      temperature: 0.7,
      messages: [{
        role: "user", 
        content: `Provide up to 20 gig types based on the following instrument: ${instrument}

Return ONLY a JSON array of specific gig type names, no other text:
["Wedding Ceremony", "Corporate Event", "Private Party"]`
      }]
    });

    const content = response.choices[0]?.message?.content || '';
    
    try {
      const gigTypes = JSON.parse(content.trim());
      if (Array.isArray(gigTypes) && gigTypes.length > 0) {
        console.log(`✅ Generated ${gigTypes.length} OpenAI gig types for ${instrument}`);
        return gigTypes;
      }
    } catch (parseError) {
      console.warn(`⚠️ Failed to parse OpenAI response for ${instrument}, using fallback`);
    }
    
    return getFallbackGigTypes(instrument);
    
  } catch (error: any) {
    console.error(`❌ OpenAI gig type generation failed for ${instrument}:`, error.message);
    return getFallbackGigTypes(instrument);
  }
}

function getFallbackGigTypes(instrument: string): string[] {
  // Use the existing static preset as fallback
  const preset = INSTRUMENT_GIG_PRESETS.find(p => p.instrument === instrument);
  return preset?.gigTypes.map(gt => gt.name) || [
    "Wedding Ceremony",
    "Corporate Event", 
    "Private Party",
    "Restaurant Performance"
  ];
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