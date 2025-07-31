import OpenAI from "openai";

// Initialize OpenAI client with better error handling
const initializeOpenAI = () => {
  const apiKey = process.env.OPENAI_API_KEY;
  
  if (!apiKey) {
    console.error('❌ OPENAI_API_KEY environment variable is not set');
    throw new Error('OpenAI API key is not configured');
  }
  
  if (apiKey.length < 10) {
    console.error('❌ OPENAI_API_KEY appears to be invalid (too short)');
    throw new Error('OpenAI API key appears to be invalid');
  }
  
  console.log('✅ OpenAI API key found and appears valid');
  return new OpenAI({ 
    apiKey,
    timeout: 30000, // 30 second timeout at client level
    maxRetries: 2
  });
};

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
  businessEmail?: string;
  phone?: string;
  website?: string;
  addressLine1?: string;
  city?: string;
  county?: string;
  postcode?: string;
  primaryInstrument?: string;
  availableGigTypes?: any;
}

interface AIResponseRequest {
  action: 'respond' | 'thankyou' | 'followup' | 'custom';
  bookingContext?: BookingContext;
  userSettings?: UserSettings;
  customPrompt?: string;
  tone?: 'professional' | 'friendly' | 'formal' | 'casual';
}

export class AIResponseGenerator {
  private openai: OpenAI | null = null;
  
  private getOpenAIClient(): OpenAI {
    if (!this.openai) {
      this.openai = initializeOpenAI();
    }
    return this.openai;
  }
  
  async generateEmailResponse(request: AIResponseRequest): Promise<{
    subject: string;
    emailBody: string;
    smsBody?: string;
  }> {
    const { action, bookingContext, userSettings, customPrompt, tone = 'professional' } = request;
    
    console.log('🤖 Starting AI response generation...');
    console.log('🤖 Request details:', {
      action,
      hasBookingContext: !!bookingContext,
      hasUserSettings: !!userSettings,
      hasCustomPrompt: !!customPrompt,
      tone
    });
    
    try {
      const openai = this.getOpenAIClient();
      
      const systemPrompt = this.buildSystemPrompt(userSettings, tone);
      const userPrompt = this.buildUserPrompt(action, bookingContext, customPrompt);
      
      console.log('🤖 System prompt length:', systemPrompt.length);
      console.log('🤖 User prompt length:', userPrompt.length);
      
      console.log('🤖 Making OpenAI API call...');
      
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        response_format: { type: "json_object" },
        temperature: 0.7,
        max_tokens: 1500
      });

      console.log('✅ OpenAI API response received');
      console.log('🤖 Response usage:', response.usage);
      
      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No content received from OpenAI API');
      }
      
      console.log('🤖 Raw response content length:', content.length);
      
      let result;
      try {
        result = JSON.parse(content);
      } catch (parseError) {
        console.error('❌ Failed to parse OpenAI response as JSON:', content);
        throw new Error('Invalid JSON response from AI service');
      }
      
      // Validate the response structure
      if (!result.subject || !result.emailBody) {
        console.error('❌ Invalid response structure:', result);
        throw new Error('AI response missing required fields');
      }
      
      const finalResponse = {
        subject: result.subject || "Re: Your Booking Inquiry",
        emailBody: result.emailBody || "Thank you for your inquiry.",
        smsBody: result.smsBody || "Thank you for your booking inquiry!"
      };
      
      console.log('✅ AI response generated successfully');
      console.log('🤖 Response preview:', {
        subjectLength: finalResponse.subject.length,
        emailBodyLength: finalResponse.emailBody.length,
        smsBodyLength: finalResponse.smsBody.length
      });
      
      return finalResponse;
      
    } catch (error: any) {
      console.error('❌ AI response generation failed:', error);
      console.error('❌ Error details:', {
        message: error.message,
        status: error.status,
        code: error.code,
        type: error.type,
        error: error.error
      });
      
      // Provide more specific error messages
      if (error.status === 401) {
        throw new Error('OpenAI API key is invalid. Please check your API key configuration.');
      } else if (error.status === 429) {
        throw new Error('OpenAI API rate limit exceeded. Please try again in a moment.');
      } else if (error.status === 502 || error.status === 503) {
        throw new Error('OpenAI API is temporarily unavailable. Please try again later.');
      } else if (error.code === 'ECONNRESET' || error.code === 'ENOTFOUND') {
        throw new Error('Network connection error. Please check your internet connection.');
      } else if (error.code === 'insufficient_quota') {
        throw new Error('OpenAI API quota exceeded. Please check your OpenAI account billing.');
      } else if (error.message.includes('timeout')) {
        throw new Error('Request timed out. The AI service may be busy, please try again.');
      } else {
        throw new Error(`AI service error: ${error.message || 'Unknown error occurred'}`);
      }
    }
  }

  private buildSystemPrompt(userSettings?: UserSettings, tone: string = 'professional'): string {
    const businessName = userSettings?.businessName || "the performer";
    const primaryInstrument = userSettings?.primaryInstrument ? 
      this.getInstrumentDisplayName(userSettings.primaryInstrument) : "musician";
    
    // Parse availableGigTypes - handle both string and array formats
    let gigTypes: string[] = [];
    if (userSettings?.availableGigTypes) {
      try {
        if (typeof userSettings.availableGigTypes === 'string') {
          gigTypes = JSON.parse(userSettings.availableGigTypes);
        } else if (Array.isArray(userSettings.availableGigTypes)) {
          gigTypes = userSettings.availableGigTypes;
        }
      } catch (e) {
        console.warn('Failed to parse availableGigTypes:', userSettings.availableGigTypes);
        gigTypes = [];
      }
    }
    
    const businessInfo = userSettings ? `
Business: ${businessName}
Contact: ${userSettings.businessEmail || 'N/A'}${userSettings.phone ? ` | ${userSettings.phone}` : ''}
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
- Provide 3-4 package options with different durations starting from 2 hours
- Mention additional services like DJ capabilities, MC services, equipment details when relevant
- Include professional details about insurance, equipment quality, and venue requirements
- Structure pricing progressively: shorter durations at lower price points, longer durations at higher price points
- CONSISTENCY RULE: Ensure all pricing within the same response follows logical progression (shorter = less expensive, longer = more expensive)
- Always mention that packages can be customized to client requirements
- Include payment terms and booking process information
- Present pricing confidently as the professional standard for the services offered
- Do not mix different pricing scales or give contradictory price points in the same response

PROFESSIONAL DETAILS TO INCLUDE:
- Equipment quality and setup capabilities
- Public liability insurance coverage
- Travel and setup included in pricing
- Flexibility for venue requirements
- Experience and professionalism
- Payment terms (typically cash/bank transfer on day)
- Contract security (Musician's Union Contract)
- Repertoire and customization options

IMPORTANT: Always return valid JSON. Do not include any text outside the JSON structure.`;
  }

  private buildUserPrompt(action: string, bookingContext?: BookingContext, customPrompt?: string): string {
    if (customPrompt) {
      return `Generate a ${action} email response with this custom request: ${customPrompt}

${this.formatBookingContext(bookingContext)}

Generate appropriate subject, email body, and SMS version. Return only valid JSON.`;
    }

    const actionPrompts = {
      respond: "Generate a professional response to a new booking inquiry. Thank the client, confirm availability, and provide comprehensive pricing options with CONSISTENT pricing structure (shorter durations = lower prices, longer durations = higher prices). Most clients don't mention fees in their initial enquiry, so proactively present your service packages and pricing structure. Ensure all prices within the response follow logical progression.",
      thankyou: "Generate a thank you message after a successful event. Express gratitude, mention the event positively, and invite future bookings or reviews.",
      followup: "Generate a follow-up message for a pending inquiry. Be polite but proactive about getting a response.",
      custom: "Generate a personalized response based on the booking context provided."
    };

    return `${actionPrompts[action as keyof typeof actionPrompts] || actionPrompts.custom}

${this.formatBookingContext(bookingContext)}

Generate appropriate subject, email body, and SMS version. Return only valid JSON.`;
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
      'saxophone': 'Saxophone',
      'trumpet': 'Trumpet',
      'trombone': 'Trombone',
      'clarinet': 'Clarinet',
      'flute': 'Flute',
      'drums': 'Drums',
      'vocals': 'Vocals',
      'other': 'Musician'
    };
    
    return displayNames[instrument] || instrument;
  }

  async generateTemplateVariations(templateName: string, templateBody: string, count: number = 3): Promise<Array<{
    name: string;
    body: string;
  }>> {
    try {
      const openai = this.getOpenAIClient();
      
      const systemPrompt = `You are an expert at creating professional email template variations. Create ${count} variations of the provided template with different tones and approaches while maintaining the core message.

RESPONSE FORMAT: Return valid JSON with this structure:
{
  "variations": [
    {
      "name": "Variation name (brief, descriptive)",
      "body": "Template body with proper formatting"
    }
  ]
}

Guidelines:
- Keep the core message and purpose intact
- Vary the tone (professional, friendly, formal, etc.)
- Use different opening and closing styles
- Maintain appropriate email formatting
- Include [Client Name], [Date], [Venue] and other template variables as in original
- Return only valid JSON structure`;

      const userPrompt = `Create ${count} variations of this email template:

Template Name: ${templateName}
Template Body: ${templateBody}

Generate variations with different approaches while keeping the essential message and template variables intact.`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        response_format: { type: "json_object" },
        temperature: 0.8,
        max_tokens: 1500
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No content received from OpenAI API');
      }

      const result = JSON.parse(content);
      
      if (!result.variations || !Array.isArray(result.variations)) {
        throw new Error('Invalid response structure for template variations');
      }

      return result.variations.map((variation: any, index: number) => ({
        name: variation.name || `${templateName} - Variation ${index + 1}`,
        body: variation.body || templateBody
      }));

    } catch (error: any) {
      console.error('❌ Template variations generation failed:', error);
      throw new Error(`Failed to generate template variations: ${error.message}`);
    }
  }
}

// Export a singleton instance
export const aiResponseGenerator = new AIResponseGenerator();