import OpenAI from "openai";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

interface BookingContext {
  clientName?: string;
  eventDate?: string;
  eventTime?: string;
  eventEndTime?: string;
  venue?: string;
  eventType?: string;
  gigType?: string;
  fee?: number;
  performanceDuration?: string;
  styles?: string;
  equipment?: string;
  additionalInfo?: string;
}

interface UserSettings {
  businessName?: string;
  email?: string;
  phone?: string;
  website?: string;
  addressLine1?: string;
  city?: string;
  county?: string;
  postcode?: string;
  primaryInstrument?: string;
  availableGigTypes?: any[];
}

interface AIResponseRequest {
  action: 'respond' | 'thankyou' | 'followup' | 'custom';
  bookingContext?: BookingContext;
  userSettings?: UserSettings;
  customPrompt?: string;
  tone?: 'professional' | 'friendly' | 'formal' | 'casual';
}

export class AIResponseGenerator {
  
  async generateEmailResponse(request: AIResponseRequest): Promise<{
    subject: string;
    emailBody: string;
    smsBody?: string;
  }> {
    const { action, bookingContext, userSettings, customPrompt, tone = 'professional' } = request;
    
    const systemPrompt = this.buildSystemPrompt(userSettings, tone);
    const userPrompt = this.buildUserPrompt(action, bookingContext, customPrompt);
    
    try {
      console.log('🤖 Attempting OpenAI API call...');
      console.log('🔑 API Key present:', !!process.env.OPENAI_API_KEY);
      console.log('🔑 API Key length:', process.env.OPENAI_API_KEY?.length || 0);
      
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        response_format: { type: "json_object" },
        temperature: 0.7,
        max_tokens: 1000,
        timeout: 30000 // 30 second timeout
      });

      console.log('✅ OpenAI API response received');
      const result = JSON.parse(response.choices[0].message.content || '{}');
      
      return {
        subject: result.subject || "Re: Your Booking Inquiry",
        emailBody: result.emailBody || "Thank you for your inquiry.",
        smsBody: result.smsBody || "Thank you for your booking inquiry!"
      };
      
    } catch (error) {
      console.error('❌ AI response generation failed:', error);
      console.error('❌ Error details:', {
        message: error.message,
        status: error.status,
        code: error.code,
        type: error.type
      });
      
      // Provide more specific error messages
      if (error.status === 401) {
        throw new Error('OpenAI API key is invalid or missing');
      } else if (error.status === 429) {
        throw new Error('OpenAI API rate limit exceeded. Please try again later.');
      } else if (error.status === 502 || error.status === 503) {
        throw new Error('OpenAI API is temporarily unavailable. Please try again later.');
      } else if (error.code === 'ECONNRESET' || error.code === 'ENOTFOUND') {
        throw new Error('Network connection error. Please check your internet connection.');
      } else {
        throw new Error(`Failed to generate AI response: ${error.message}`);
      }
    }
  }

  private buildSystemPrompt(userSettings?: UserSettings, tone: string = 'professional'): string {
    const businessName = userSettings?.businessName || "the performer";
    const primaryInstrument = userSettings?.primaryInstrument ? 
      this.getInstrumentDisplayName(userSettings.primaryInstrument) : "musician";
    
    // Parse availableGigTypes from JSON string or array
    let gigTypes: string[] = [];
    if (userSettings?.availableGigTypes) {
      if (typeof userSettings.availableGigTypes === 'string') {
        try {
          gigTypes = JSON.parse(userSettings.availableGigTypes);
        } catch (e) {
          console.warn('Failed to parse availableGigTypes JSON:', userSettings.availableGigTypes);
        }
      } else if (Array.isArray(userSettings.availableGigTypes)) {
        gigTypes = userSettings.availableGigTypes;
      }
    }
    
    const businessInfo = userSettings ? `
Business: ${businessName}
Contact: ${userSettings.email}${userSettings.phone ? ` | ${userSettings.phone}` : ''}
${userSettings.website ? `Website: ${userSettings.website}` : ''}
Primary Instrument: ${primaryInstrument}
${gigTypes.length > 0 ? `Specializes in: ${gigTypes.join(', ')}` : ''}
` : '';

    const instrumentContext = userSettings?.primaryInstrument ? `
INSTRUMENT-SPECIFIC GUIDANCE:
- You are responding as a professional ${primaryInstrument} player
- Tailor your service packages to ${primaryInstrument}-specific gigs and pricing
- Reference ${primaryInstrument} capabilities and repertoire in your responses
- Consider typical ${primaryInstrument} gig requirements (equipment, setup, acoustics)
${gigTypes.length > 0 ? `- Highlight your expertise in: ${gigTypes.join(', ')}` : ''}
` : '';

    return `You are an AI assistant helping a professional musician generate email responses for booking inquiries. 

${businessInfo}
${instrumentContext}

TONE: ${tone} - maintain this tone throughout the response.

RESPONSE FORMAT: Return valid JSON with these fields:
{
  "subject": "Email subject line (keep concise, 50 chars max)",
  "emailBody": "Full email body with proper formatting and line breaks",
  "smsBody": "Short SMS version (160 chars max)"
}

GUIDELINES:
- Be ${tone} but warm and approachable
- Include specific booking details when provided
- Use proper business email formatting
- Add appropriate call-to-action
- Include business signature when settings provided
- For email body, use \\n\\n for paragraph breaks
- Keep SMS version concise but complete
- Never make up details not provided in the booking context

PRICING STRUCTURE GUIDELINES:
- IMPORTANT: Most clients don't mention fees in initial enquiries - always proactively provide pricing options
- For wedding enquiries, offer multiple service packages with clear duration and pricing tiers
- Include options for different event segments (ceremony, drinks reception, wedding breakfast, evening entertainment)
- Provide 3-5 package options with different durations (e.g., 2-4 hours) with specific price points
- Mention additional services like DJ capabilities, MC services, equipment details when relevant
- Include professional details about insurance, equipment quality, and venue requirements
- Structure pricing from basic to comprehensive packages (e.g., £260 for 2 hours up to £380 for 4 hours)
- Always mention that packages can be customized to client requirements
- Include payment terms and booking process information
- Present pricing confidently as the professional standard for the services offered

EXAMPLE PACKAGE STRUCTURE (adapt to context):
- Package 1: Basic service (2-2.5 hours) - Entry level pricing
- Package 2: Standard service (2.5-3 hours) - Mid-tier pricing  
- Package 3: Premium service (3-3.5 hours) - Higher pricing
- Package 4: Comprehensive service (3.5-4 hours) - Top tier pricing
- Additional services: DJ, MC, special requests - Separate pricing

PROFESSIONAL DETAILS TO INCLUDE:
- Equipment quality and setup capabilities
- Public liability insurance coverage
- Travel and setup included in pricing
- Flexibility for venue requirements
- Experience and professionalism
- Payment terms (typically cash/bank transfer on day)
- Contract security (Musician's Union Contract)
- Repertoire and customization options`;
  }

  private buildUserPrompt(action: string, bookingContext?: BookingContext, customPrompt?: string): string {
    if (customPrompt) {
      return `Generate a ${action} email response with this custom request: ${customPrompt}

${this.formatBookingContext(bookingContext)}

Generate appropriate subject, email body, and SMS version.`;
    }

    const actionPrompts = {
      respond: "Generate a professional response to a new booking inquiry. Thank the client, confirm availability, and provide comprehensive pricing options and service details. Most clients don't mention fees in their initial enquiry, so proactively present your service packages and pricing structure.",
      thankyou: "Generate a thank you message after a successful event. Express gratitude, mention the event positively, and invite future bookings or reviews.",
      followup: "Generate a follow-up message for an pending inquiry. Be polite but proactive about getting a response.",
      custom: "Generate a personalized response based on the booking context provided."
    };

    return `${actionPrompts[action as keyof typeof actionPrompts] || actionPrompts.custom}

${this.formatBookingContext(bookingContext)}

Generate appropriate subject, email body, and SMS version.`;
  }

  private formatBookingContext(context?: BookingContext): string {
    if (!context) return "No specific booking details provided.";

    const details = [];
    if (context.clientName) details.push(`Client: ${context.clientName}`);
    if (context.eventDate) details.push(`Date: ${context.eventDate}`);
    if (context.eventTime && context.eventEndTime) {
      details.push(`Time: ${context.eventTime} - ${context.eventEndTime}`);
    } else if (context.eventTime) {
      details.push(`Time: ${context.eventTime}`);
    }
    if (context.venue) details.push(`Venue: ${context.venue}`);
    if (context.eventType) details.push(`Event Type: ${context.eventType}`);
    if (context.gigType) details.push(`Gig Type: ${context.gigType}`);
    if (context.fee) details.push(`Fee: £${context.fee}`);
    if (context.performanceDuration) details.push(`Duration: ${context.performanceDuration}`);
    if (context.styles) details.push(`Music Styles: ${context.styles}`);
    if (context.equipment) details.push(`Equipment: ${context.equipment}`);
    if (context.additionalInfo) details.push(`Additional Info: ${context.additionalInfo}`);

    return details.length > 0 
      ? `BOOKING DETAILS:\n${details.join('\n')}`
      : "No specific booking details provided.";
  }

  private getInstrumentDisplayName(instrument: string): string {
    const displayNames: { [key: string]: string } = {
      'acoustic_guitar': 'Acoustic Guitar',
      'electric_guitar': 'Electric Guitar',
      'classical_guitar': 'Classical Guitar',
      'bass_guitar': 'Bass Guitar',
      'piano': 'Piano',
      'keyboard': 'Keyboard',
      'violin': 'Violin',
      'viola': 'Viola',
      'cello': 'Cello',
      'double_bass': 'Double Bass',
      'saxophone': 'Saxophone',
      'trumpet': 'Trumpet',
      'trombone': 'Trombone',
      'clarinet': 'Clarinet',
      'flute': 'Flute',
      'drums': 'Drums',
      'percussion': 'Percussion',
      'vocals': 'Vocals',
      'harp': 'Harp',
      'ukulele': 'Ukulele',
      'mandolin': 'Mandolin',
      'banjo': 'Banjo',
      'harmonica': 'Harmonica',
      'accordion': 'Accordion',
      'dj': 'DJ',
      'band': 'Band',
      'duo': 'Duo',
      'trio': 'Trio',
      'quartet': 'Quartet',
      'other': 'Other'
    };
    return displayNames[instrument] || instrument;
  }

  async generateTemplateVariations(
    templateName: string, 
    templateBody: string,
    count: number = 3
  ): Promise<Array<{ name: string; subject: string; emailBody: string; }>> {
    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `You are helping a musician create variations of email templates. 
            Generate ${count} professional variations of the provided template.
            Return JSON array with format: [{"name": "variation name", "subject": "subject", "emailBody": "body"}]`
          },
          {
            role: "user", 
            content: `Create ${count} variations of this template:
            Name: ${templateName}
            Body: ${templateBody}
            
            Make each variation have a different tone (professional, friendly, formal) while maintaining the core message.`
          }
        ],
        response_format: { type: "json_object" },
        temperature: 0.8
      });

      const result = JSON.parse(response.choices[0].message.content || '{"variations": []}');
      return result.variations || [];
      
    } catch (error) {
      console.error('❌ Template variations generation failed:', error);
      return [];
    }
  }
}

// Export an instance for use in routes
export const aiResponseGenerator = new AIResponseGenerator();