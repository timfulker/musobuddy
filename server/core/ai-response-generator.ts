import Anthropic from "@anthropic-ai/sdk";

// Initialize Anthropic client with better error handling
const initializeAnthropic = () => {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  
  if (!apiKey) {
    console.error('❌ ANTHROPIC_API_KEY environment variable is not set');
    throw new Error('Anthropic API key is not configured');
  }
  
  if (apiKey.length < 10) {
    console.error('❌ ANTHROPIC_API_KEY appears to be invalid (too short)');
    throw new Error('Anthropic API key appears to be invalid');
  }
  
  console.log('✅ Anthropic API key found and appears valid - using Claude for cost efficiency');
  return new Anthropic({ 
    apiKey,
    timeout: 30000, // 30 second timeout at client level
    maxRetries: 1 // Reduced from 2 to limit cost exposure
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
  travelExpense?: number;
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
  secondaryInstruments?: string[] | string;
  availableGigTypes?: any;
  // AI Pricing Guide fields
  aiPricingEnabled?: boolean;
  baseHourlyRate?: number;
  minimumBookingHours?: number;
  additionalHourRate?: number;
  djServiceRate?: number;
  pricingNotes?: string;
  specialOffers?: string;
  // Travel expense integration setting
  includeTravelInPerformanceFee?: boolean;
}

interface ClientHistory {
  name: string;
  totalBookings: number;
  totalRevenue: number;
  recentBookings: Array<{
    eventDate?: string;
    venue?: string;
    eventType?: string;
    fee?: number;
    status?: string;
  }>;
}

interface AIResponseRequest {
  action: 'respond' | 'thankyou' | 'followup' | 'custom';
  bookingContext?: BookingContext;
  userSettings?: UserSettings;
  customPrompt?: string;
  tone?: 'professional' | 'friendly' | 'formal' | 'casual';
  contextualInfo?: string; // Additional context when no booking is selected
  clientHistory?: ClientHistory; // Client's booking history for personalized emails
}

export class AIResponseGenerator {
  private anthropic: Anthropic | null = null;
  
  private getAnthropicClient(): Anthropic {
    if (!this.anthropic) {
      this.anthropic = initializeAnthropic();
    }
    return this.anthropic;
  }
  
  async generateEmailResponse(request: AIResponseRequest): Promise<{
    subject: string;
    emailBody: string;
    smsBody?: string;
  }> {
    const { action, bookingContext, userSettings, customPrompt, tone = 'professional', contextualInfo, clientHistory } = request;
    
    console.log('🤖 Starting AI response generation...');
    console.log('🤖 Request details:', {
      action,
      hasBookingContext: !!bookingContext,
      hasUserSettings: !!userSettings,
      hasCustomPrompt: !!customPrompt,
      hasContextualInfo: !!contextualInfo,
      tone
    });
    
    try {
      const anthropic = this.getAnthropicClient();
      
      const systemPrompt = this.buildSystemPrompt(userSettings, tone, bookingContext);
      const userPrompt = this.buildUserPrompt(action, bookingContext, customPrompt, contextualInfo, clientHistory);
      
      console.log('🤖 System prompt length:', systemPrompt.length);
      console.log('🤖 User prompt length:', userPrompt.length);
      
      console.log('🤖 Making Claude API call with Sonnet 4 for superior quality...');
      
      const response = await anthropic.messages.create({
        model: "claude-3-5-sonnet-20241022",
        max_tokens: 1500,
        temperature: 0.7,
        system: systemPrompt,
        messages: [
          { role: "user", content: `${userPrompt}\n\nPlease respond with valid JSON format only.` }
        ]
      });

      console.log('✅ Claude API response received');
      console.log('🤖 Response usage:', response.usage);
      
      const content = response.content[0]?.text;
      if (!content) {
        throw new Error('No content received from Claude API');
      }
      
      console.log('🤖 Raw response content length:', content.length);
      
      let result;
      try {
        result = JSON.parse(content);
      } catch (parseError) {
        console.error('❌ Failed to parse Claude response as JSON:', content);
        throw new Error('Invalid JSON response from AI service');
      }
      
      // POST-PROCESSING: Force correct pricing if AI ignores instructions
      // BUT SKIP if there's an agreed fee in booking context
      const hasAgreedFee = bookingContext?.fee && parseFloat(bookingContext.fee) > 0;
      
      if (userSettings?.aiPricingEnabled !== false && !hasAgreedFee) {
        const BHR = Number(userSettings?.baseHourlyRate) || 125;
        const AHR = Number(userSettings?.additionalHourRate) || 60;
        const T = Number(bookingContext?.travelExpense) || 0;
        
        const twoHoursPrice = (BHR * 2) + ((2 - 2) * AHR) + T;
        const threeHoursPrice = (BHR * 2) + ((3 - 2) * AHR) + T;
        const fourHoursPrice = (BHR * 2) + ((4 - 2) * AHR) + T;
        
        console.log('🔧 POST-PROCESSING: Enforcing correct pricing...', {
          correct: { twoHours: twoHoursPrice, threeHours: threeHoursPrice, fourHours: fourHoursPrice }
        });
        
        // Replace any incorrect pricing with correct calculations
        const correctPrices = [
          { pattern: /2\s*hours?\s*saxophone:?\s*£\d+/gi, replacement: `2 hours Saxophone: £${twoHoursPrice}` },
          { pattern: /3\s*hours?\s*saxophone:?\s*£\d+/gi, replacement: `3 hours Saxophone: £${threeHoursPrice}` },
          { pattern: /4\s*hours?\s*saxophone:?\s*£\d+/gi, replacement: `4 hours Saxophone: £${fourHoursPrice}` }
        ];
        
        correctPrices.forEach(({ pattern, replacement }) => {
          if (result.emailBody) {
            const before = result.emailBody;
            result.emailBody = result.emailBody.replace(pattern, replacement);
            if (before !== result.emailBody) {
              console.log('🔧 CORRECTED pricing in email body');
            }
          }
          if (result.smsBody) {
            const before = result.smsBody;
            result.smsBody = result.smsBody.replace(pattern, replacement);
            if (before !== result.smsBody) {
              console.log('🔧 CORRECTED pricing in SMS body');
            }
          }
        });
      } else if (hasAgreedFee) {
        console.log('🎯 SKIPPING post-processing corrections - using agreed fee:', bookingContext.fee);
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

  private buildSystemPrompt(userSettings?: UserSettings, tone: string = 'professional', bookingContext?: BookingContext): string {
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

    // Check if user offers DJ services (primary or secondary instrument)
    let secondaryInstruments: string[] = [];
    if (userSettings?.secondaryInstruments) {
      try {
        if (typeof userSettings.secondaryInstruments === 'string') {
          secondaryInstruments = JSON.parse(userSettings.secondaryInstruments);
        } else if (Array.isArray(userSettings.secondaryInstruments)) {
          secondaryInstruments = userSettings.secondaryInstruments;
        }
      } catch (e) {
        console.warn('Failed to parse secondaryInstruments:', userSettings.secondaryInstruments);
        secondaryInstruments = [];
      }
    }
    
    const hasDJServices = userSettings?.primaryInstrument === 'dj' || secondaryInstruments.includes('dj');
    
    console.log('🎵 DJ Service Detection:', {
      primaryInstrument: userSettings?.primaryInstrument,
      secondaryInstruments,
      hasDJServices
    });
    
    // Build pricing structure from user settings - FORCE NUMBER CONVERSION
    const BHR = Number(userSettings?.baseHourlyRate) || 125; // Basic Hourly Rate
    const AHR = Number(userSettings?.additionalHourRate) || 60; // Additional Hourly Rate  
    const T = Number(bookingContext?.travelExpense) || 0; // Total travel cost (already includes round trip)
    const pricingEnabled = userSettings?.aiPricingEnabled !== false;
    
    // HARD-CODED PRICE CALCULATION: P = (BHR*2) + ((N-2) x AHR) + T
    function calculatePrice(N: number): number {
      return (BHR * 2) + ((N - 2) * AHR) + T;
    }
    
    const twoHoursPrice = calculatePrice(2);   // (125*2) + ((2-2)*60) + T = 250 + 0 + T
    const threeHoursPrice = calculatePrice(3); // (125*2) + ((3-2)*60) + T = 250 + 60 + T  
    const fourHoursPrice = calculatePrice(4);  // (125*2) + ((4-2)*60) + T = 250 + 120 + T
    
    console.log('🎵 HARD-CODED PRICING CALCULATION:', {
      formula: 'P = (BHR*2) + ((N-2) × AHR) + T',
      BHR: `${BHR} (type: ${typeof BHR})`,
      AHR: `${AHR} (type: ${typeof AHR})`,
      T: `${T} (total travel expense from booking field)`,
      calculations: {
        '2hrs': `(${BHR}*2) + ((2-2)*${AHR}) + ${T} = ${twoHoursPrice}`,
        '3hrs': `(${BHR}*2) + ((3-2)*${AHR}) + ${T} = ${threeHoursPrice}`,
        '4hrs': `(${BHR}*2) + ((4-2)*${AHR}) + ${T} = ${fourHoursPrice}`
      }
    });
    
    const basePriceStr = `£${BHR * 2}`;
    const additionalHourStr = `£${AHR} per hour beyond the 2-hour minimum`;
    const djServiceStr = `£300 additional charge when combined with ${primaryInstrument}`;
    
    // FIXED: Use hard-coded pricing formula results
    const basePackages = [
      `2 hours ${primaryInstrument}: £${twoHoursPrice}`,
      `3 hours ${primaryInstrument}: £${threeHoursPrice}`,
      `4 hours ${primaryInstrument}: £${fourHoursPrice}`
    ];
    
    const djPackages = hasDJServices ? [
      `2 hours ${primaryInstrument} + DJ: £${twoHoursPrice + 300}`,
      `3 hours ${primaryInstrument} + DJ: £${threeHoursPrice + 300}`,
      `4 hours ${primaryInstrument} + DJ: £${fourHoursPrice + 300}`
    ] : [];
    
    const packages = [...basePackages, ...djPackages];

    // Check if there's an agreed fee in booking context - if so, use that instead of calculated prices
    const hasAgreedFee = bookingContext?.fee && parseFloat(bookingContext.fee) > 0;
    
    const pricingSection = pricingEnabled ? (hasAgreedFee ? `
CRITICAL PRICING RULES - AGREED FEE:
- THE CLIENT HAS AGREED TO A SPECIFIC FEE: £${bookingContext.fee}
- USE THIS EXACT AMOUNT - DO NOT RECALCULATE OR CHANGE
- This is the final agreed total that includes all costs
- Do NOT offer other pricing options or packages - the fee is agreed
- Focus on confirming the booking details and next steps
- NEVER mention travel costs, expenses, or fee breakdowns
- Present as: "2 hours saxophone: £${bookingContext.fee}" (or appropriate duration)
- MANDATORY: Use the agreed fee of £${bookingContext.fee} exactly as stated` : `
CRITICAL PRICING RULES:
- IMPORTANT: Most clients don't mention fees in initial enquiries - always proactively provide pricing options
- For wedding enquiries, offer multiple service packages with clear duration and pricing tiers
- Include options for different event segments (ceremony, drinks reception, wedding breakfast, evening entertainment)
- NEVER MENTION TRAVEL COSTS, TRAVEL EXPENSES, OR TRAVEL CHARGES TO CLIENTS
- All quoted prices must include travel costs but present as clean totals only
- Do NOT use phrases like "inclusive of all expenses" or "including travel" - just show clean package prices
- ALWAYS include VAT status: "All prices are VAT-exempt as a sole trader" or similar based on business structure
- Use simple formatting without excessive punctuation: "2 hours saxophone: £290" (NEVER use **asterisks**)
- ABSOLUTELY CRITICAL: Do NOT perform any mathematical calculations - use the exact prices provided above
- WARNING: If you modify these prices in any way, the response will be rejected
- INSTRUCTION: These prices already include ALL costs - do not add anything to them
- CRITICAL: Use EXACTLY these prices - DO NOT CALCULATE OR MODIFY:
    - 2 hours saxophone: £${twoHoursPrice}
    - 3 hours saxophone: £${threeHoursPrice}
    - 4 hours saxophone: £${fourHoursPrice}
- FORBIDDEN: DO NOT add travel costs, setup fees, or any other charges to these prices
- FORBIDDEN: DO NOT perform any mathematical operations on these prices
- MANDATORY: Copy these exact price figures into your response without changes
- EXAMPLE: "2 hours Saxophone: £${twoHoursPrice}" (use this exact format and number)
- Present 3-4 package options starting from 2 hours, showing total inclusive pricing${hasDJServices ? `
- Mention DJ capabilities when relevant - you offer DJ services as an additional service` : ''}
- Mention equipment details, setup capabilities, and venue requirements when relevant
- Include professional details about insurance, equipment quality, and venue requirements
- Always mention that packages can be customized to client requirements
- Include payment terms and booking process information`) 
- Present pricing confidently as the professional standard for the services offered
- CRITICAL: Present prices as clean totals without mentioning what's included (travel, setup, etc.)
- Use simple text formatting for pricing: "2 hours saxophone: £290" without asterisks, bold markup, or excessive punctuation
${userSettings?.pricingNotes ? `- Additional pricing notes: ${userSettings.pricingNotes}` : ''}
${userSettings?.specialOffers ? `- Special offers to mention: ${userSettings.specialOffers}` : ''}` : `
PRICING POLICY:
- Pricing information is handled separately - focus on availability and service details
- Do not include specific pricing in your response unless specifically requested
- Mention that detailed pricing can be provided separately`;

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
- FORMATTING: Do NOT use asterisks (**) or bold markup in any text - use plain text only
- Present pricing as simple text: "2 hours saxophone: £290" without any ** formatting

${pricingSection}

PROFESSIONAL DETAILS TO INCLUDE:
- Equipment quality and setup capabilities
- Public liability insurance coverage
- Travel costs and setup logistics
- Flexibility for venue requirements
- Experience and professionalism
- Payment terms (typically cash/bank transfer on day)
- Professional contract provided for booking security
- Repertoire and customization options
- Include travel expenses in total quote when applicable

IMPORTANT: Always return valid JSON. Do not include any text outside the JSON structure.`;
  }

  private buildUserPrompt(action: string, bookingContext?: BookingContext, customPrompt?: string, contextualInfo?: string, clientHistory?: ClientHistory): string {
    // Format client history for context
    let clientHistoryContext = '';
    if (clientHistory && clientHistory.totalBookings > 0) {
      clientHistoryContext = `\n\nCLIENT HISTORY - PERSONALIZE YOUR RESPONSE:
This is a returning client with ${clientHistory.totalBookings} previous booking${clientHistory.totalBookings > 1 ? 's' : ''} totaling £${clientHistory.totalRevenue}.
${clientHistory.recentBookings.length > 0 ? `Recent events:` : ''}
${clientHistory.recentBookings.map(b => `- ${b.eventType || 'Event'} at ${b.venue || 'venue'} (${b.eventDate ? new Date(b.eventDate).toLocaleDateString() : 'date TBD'})`).join('\n')}

Use this history to:
- Reference their past events positively if relevant
- Show you remember them as a valued client
- Suggest services based on their booking patterns
- Acknowledge their loyalty and repeat business
- Make the email feel personal and warm\n`;
    }
    
    if (customPrompt) {
      return `Generate a ${action} email response with this custom request: ${customPrompt}

${contextualInfo ? `ADDITIONAL CONTEXT: ${contextualInfo}\n\n` : ''}${clientHistoryContext}${this.formatBookingContext(bookingContext)}

Generate appropriate subject, email body, and SMS version. Return only valid JSON.`;
    }

    const actionPrompts = {
      respond: "Generate a professional response to a new booking inquiry. Thank the client, confirm availability, and provide comprehensive pricing options with CONSISTENT pricing structure (shorter durations = lower prices, longer durations = higher prices). Most clients don't mention fees in their initial enquiry, so proactively present your service packages and pricing structure. Ensure all prices within the response follow logical progression.",
      thankyou: "Generate a thank you message after a successful event. Express gratitude, mention the event positively, and invite future bookings or reviews.",
      followup: "Generate a follow-up message for a pending inquiry. Be polite but proactive about getting a response.",
      custom: "Generate a personalized response based on the booking context provided."
    };

    return `${actionPrompts[action as keyof typeof actionPrompts] || actionPrompts.custom}

${contextualInfo ? `ADDITIONAL CONTEXT PROVIDED BY USER: ${contextualInfo}

This additional context should be used to personalize the response and offer relevant services or information. For example:
- If context mentions "DJ services", highlight your DJ capabilities
- If context mentions "wedding reception", tailor response for wedding events
- If context mentions "corporate event", adjust tone and service focus accordingly
- Use this context to suggest additional services that complement the inquiry

` : ''}${clientHistoryContext}${this.formatBookingContext(bookingContext)}

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
    if (context.fee) details.push(`Performance Fee: £${context.fee}`);
    if (context.performanceDuration) details.push(`Duration: ${context.performanceDuration}`);
    if (context.styles) details.push(`Music Styles: ${context.styles}`);
    if (context.equipment) details.push(`Equipment: ${context.equipment}`);
    if (context.additionalInfo) details.push(`Additional Info: ${context.additionalInfo}`);

    // PRIORITY: If a specific fee has been agreed, use that exact amount
    // Otherwise, add travel expense instruction if provided
    let pricingInstruction = '';
    if (context.fee) {
      pricingInstruction = `\n\nCRITICAL PRICING INSTRUCTION: The agreed performance fee is £${context.fee}. Use this EXACT amount - do NOT recalculate or modify this price. This is the final agreed total that includes all costs.`;
    } else if (context.travelExpense) {
      pricingInstruction = `\n\nCRITICAL PRICING INSTRUCTION: Add £${context.travelExpense} to ALL quoted prices. NEVER mention travel, travel costs, or expenses to the client. Present only clean total prices.`;
    }

    return details.length > 0 
      ? `BOOKING DETAILS:\n${details.join('\n')}${pricingInstruction}`
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
      'dj': 'DJ',
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
      const anthropic = this.getAnthropicClient();
      
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

Generate variations with different approaches while keeping the essential message and template variables intact.

Please respond with valid JSON format only.`;

      const response = await anthropic.messages.create({
        model: "claude-3-5-sonnet-20241022", 
        max_tokens: 1500,
        temperature: 0.8,
        system: systemPrompt,
        messages: [
          { role: "user", content: userPrompt }
        ]
      });

      const content = response.content[0]?.text;
      if (!content) {
        throw new Error('No content received from Claude API');
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