import Anthropic from '@anthropic-ai/sdk';
import type { Contract, UserSettings } from '../../shared/schema';

interface ContractGenerationResult {
  html: string;
  reasoning: string;
}

class AICompleteContractGenerator {
  private anthropic: Anthropic;

  constructor() {
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error('ANTHROPIC_API_KEY environment variable is required');
    }
    
    this.anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
  }

  async generateCompleteContractHTML(
    contract: Contract,
    userSettings: UserSettings | null,
    options: {
      isSigningPage?: boolean;
      signatureDetails?: {
        signedAt: Date;
        signatureName?: string;
        clientIpAddress?: string;
      };
    } = {}
  ): Promise<ContractGenerationResult> {
    const prompt = this.buildContractPrompt(contract, userSettings, options);
    
    try {
      console.log('🤖 AI generating complete contract HTML...');
      
      const response = await this.anthropic.messages.create({
        model: "claude-3-5-haiku-20241022", // Using Haiku for concise, professional output
        max_tokens: 4000,
        temperature: 0.1,
        system: `You are a professional contract HTML generator. Create clean, well-formatted HTML contracts.

REQUIREMENTS:
- Generate complete HTML with inline CSS
- Professional, concise layout
- Responsive design for PDF generation
- Clean typography and proper spacing
- Avoid verbose content - be precise and professional
- Use proper page break controls for PDF
- Include all provided contract data
- Match business branding colors when provided

STYLE GUIDELINES:
- Clean, modern design
- Proper visual hierarchy
- Consistent spacing and alignment
- Professional color scheme
- Print-optimized layout
- Clear section divisions

Return ONLY the complete HTML document - no explanations or markdown formatting.`,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ]
      });

      const html = response.content[0].text;
      console.log('✅ AI contract HTML generation complete');
      
      return {
        html,
        reasoning: 'AI-generated complete contract HTML with adaptive layout'
      };
      
    } catch (error) {
      console.error('❌ AI HTML generation failed:', error);
      throw new Error(`AI contract generation failed: ${error.message}`);
    }
  }

  private buildContractPrompt(
    contract: Contract,
    userSettings: UserSettings | null,
    options: {
      isSigningPage?: boolean;
      signatureDetails?: {
        signedAt: Date;
        signatureName?: string;
        clientIpAddress?: string;
      };
    }
  ): string {
    // Calculate totals
    const fee = parseFloat(contract.fee || '0');
    const travelExpenses = parseFloat(contract.travelExpenses || '0');
    const totalAmount = fee + travelExpenses;
    const depositAmount = parseFloat(contract.deposit || '0');
    const balanceAmount = totalAmount - depositAmount;

    // Format event date
    const eventDate = contract.eventDate ? new Date(contract.eventDate) : null;
    const eventDateStr = eventDate ? eventDate.toLocaleDateString('en-GB', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }) : 'Date TBC';

    // Get business details
    const businessName = userSettings?.businessName || 'MusoBuddy Professional Services';
    const themeColor = userSettings?.themeAccentColor || '#8b5cf6';

    // Build address
    const addressParts = [];
    if (userSettings?.addressLine1) addressParts.push(userSettings.addressLine1);
    if (userSettings?.addressLine2) addressParts.push(userSettings.addressLine2);
    if (userSettings?.city) addressParts.push(userSettings.city);
    if (userSettings?.county) addressParts.push(userSettings.county);
    if (userSettings?.postcode) addressParts.push(userSettings.postcode);
    const businessAddress = addressParts.join(', ') || 'Address not provided';

    // Get contract terms
    const selectedClauses = this.getSelectedClauses(userSettings);
    const customClauses = this.getCustomClauses(userSettings);

    const isSigningPage = options.isSigningPage || false;
    const isSigned = contract.status === 'signed' || options.signatureDetails;

    return `Generate a complete HTML contract document with the following specifications:

CONTRACT DETAILS:
- Contract Number: ${contract.contractNumber}
- Status: ${contract.status.toUpperCase()}
- Client: ${contract.clientName}
- Client Email: ${contract.clientEmail || 'Not provided'}
- Client Phone: ${contract.clientPhone || 'Not provided'}
- Client Address: ${contract.clientAddress || 'Not provided'}

PERFORMER DETAILS:
- Business Name: ${businessName}
- Email: ${userSettings?.businessEmail || 'Not provided'}
- Phone: ${userSettings?.phone || 'Not provided'}
- Address: ${businessAddress}

EVENT DETAILS:
- Date: ${eventDateStr}
- Time: ${contract.eventTime || 'TBC'} - ${contract.eventEndTime || 'TBC'}
- Venue: ${contract.venue || 'TBC'}
- Venue Address: ${contract.venueAddress || 'See venue name'}

FINANCIAL TERMS:
- Total Performance Fee: £${totalAmount.toFixed(2)}
${depositAmount > 0 ? `- Deposit Required: £${depositAmount.toFixed(2)}` : ''}
${depositAmount > 0 ? `- Balance Due: £${balanceAmount.toFixed(2)}` : ''}
${contract.paymentInstructions ? `- Payment Instructions: ${contract.paymentInstructions}` : ''}

TERMS & CONDITIONS:
Standard Clauses (${selectedClauses.length} selected):
${selectedClauses.map((clause, i) => `${i + 1}. ${clause}`).join('\n')}

Custom Clauses (${customClauses.length} added):
${customClauses.map((clause, i) => `${i + 1}. ${clause}`).join('\n')}

${contract.equipmentRequirements ? `EQUIPMENT REQUIREMENTS: ${contract.equipmentRequirements}` : ''}
${contract.specialRequirements ? `SPECIAL REQUIREMENTS: ${contract.specialRequirements}` : ''}

BRANDING:
- Primary Color: ${themeColor}
- Company: MusoBuddy
- Tagline: "Less admin, more music"

SIGNATURE REQUIREMENTS:
${isSigningPage ? '- Include interactive signature areas for client signing' : '- Standard signature display'}
${isSigned ? `- Show signed status: ${options.signatureDetails?.signatureName || 'Digital Signature'} on ${options.signatureDetails?.signedAt?.toLocaleDateString('en-GB') || 'contract date'}` : '- Show unsigned/awaiting signature status'}

LAYOUT REQUIREMENTS:
- Professional business contract format
- Clean, modern design optimized for PDF generation
- Proper page breaks and print optimization
- Responsive grid layout for different content lengths
- Consistent typography and spacing
- Clear visual hierarchy
- Include MusoBuddy logo/branding
- ${selectedClauses.length + customClauses.length} total terms - organize efficiently
- ${isSigningPage ? 'Optimize for digital signing interface' : 'Standard contract display'}

Create a complete, professional HTML contract document. Be concise but comprehensive. Focus on clean layout and proper formatting.`;
  }

  private getSelectedClauses(userSettings: UserSettings | null): string[] {
    if (!userSettings?.contractClauses) return [];

    const clauseMap: Record<string, string> = {
      deposit: "50% deposit required to secure booking (non-refundable)",
      balancePayment: "Remaining fee due before event / on the day",
      cancellation: "Client cancellations within 7 days of event incur full fee",
      performerCancellation: "Performer will use best efforts to provide a suitable replacement",
      access: "Client must provide safe and reasonable venue access for load-in/out",
      power: "Client must provide adequate and safe power supply",
      equipment: "All equipment remains property of performer; client responsible for damage caused by guests",
      spaceAndSafety: "Stage/performance area must be flat, covered, and safe",
      weather: "Client must provide weather protection for outdoor events",
      soundLimits: "Client responsible for venue sound restrictions or curfews",
      overtime: "Extra performance time charged at £100 per 30 minutes",
      guestNumbers: "Final numbers must be confirmed 48 hours prior",
      mealsRefreshments: "Client to provide suitable food and drink if performance exceeds 3 hours including setup",
      parkingTravel: "Client to cover parking fees; accommodation required if venue is over 50 miles or finish after midnight",
      recording: "No recording or broadcasting without performer's written consent",
      insurance: "Performer holds Public Liability Insurance; client responsible for venue licences (PRS/PPL)",
      forceMajeure: "Neither party liable for cancellation due to events beyond their control (illness, accidents, extreme weather, etc.)",
      governingLaw: "Contract subject to the laws of England & Wales"
    };

    const selected: string[] = [];
    for (const [key, text] of Object.entries(clauseMap)) {
      if (userSettings.contractClauses[key as keyof typeof clauseMap]) {
        selected.push(text);
      }
    }

    // Add payment terms if set
    if (userSettings.contractClauses.paymentTerms) {
      const paymentTermsText = this.getPaymentTermsText(userSettings.contractClauses.paymentTerms);
      selected.push(paymentTermsText);
    }

    return selected;
  }

  private getCustomClauses(userSettings: UserSettings | null): string[] {
    if (!userSettings?.customClauses || !Array.isArray(userSettings.customClauses)) {
      return [];
    }

    const custom: string[] = [];
    userSettings.customClauses.forEach(clause => {
      if (typeof clause === 'object' && clause.text && clause.enabled) {
        custom.push(clause.text);
      } else if (typeof clause === 'string' && clause.trim()) {
        custom.push(clause);
      }
    });

    return custom;
  }

  private getPaymentTermsText(paymentTerms: string): string {
    switch (paymentTerms) {
      case "28_days_before": return "Payment due 28 days prior to performance date";
      case "14_days_before": return "Payment due 14 days prior to performance date";
      case "7_days_before": return "Payment due 7 days prior to performance date";
      case "on_performance": return "Payment due on date of performance";
      case "7_days_after": return "Payment due within 7 days of performance";
      case "14_days_after": return "Payment due within 14 days of performance";
      case "28_days_after": return "Payment due within 28 days of performance";
      default: return "Payment due within 7 days of performance";
    }
  }
}

export const aiCompleteContractGenerator = new AICompleteContractGenerator();