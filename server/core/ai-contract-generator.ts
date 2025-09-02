import Anthropic from '@anthropic-ai/sdk';
import type { Contract, UserSettings } from '../../shared/schema';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!
});

interface ContractGenerationResult {
  html: string;
  reasoning: string;
  success: boolean;
  layoutDecisions?: {
    sectionSpacing: string;
    pageBreakStrategy: string;
    typographyChoices: string;
    gridLayout: string;
  };
}

interface ContractGenerationRequest {
  contract: Contract;
  userSettings: UserSettings;
  type: 'initial' | 'signing' | 'final';
  signatureDetails?: {
    performerSigned: boolean;
    performerSignedAt?: string;
    clientSigned: boolean;
    clientSignedAt?: string;
  };
}

export class AIContractGenerator {
  async generateContract(request: ContractGenerationRequest): Promise<ContractGenerationResult> {
    try {
      console.log('🤖 Generating AI contract for:', request.contract.contractNumber);
      console.log('🤖 Contract type:', request.type);
      
      const prompt = this.buildContractPrompt(request);
      
      const response = await anthropic.messages.create({
        model: "claude-3-haiku-20240307",
        max_tokens: 4096, // Haiku's maximum token limit
        temperature: 0.1,
        system: this.getSystemPrompt(request.type),
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ]
      });

      let responseText = response.content[0].text;
      
      // Strip markdown code blocks if AI returned them despite instructions
      if (responseText.startsWith('```json\n')) {
        responseText = responseText.replace(/^```json\n/, '').replace(/\n```$/, '');
      } else if (responseText.startsWith('```\n')) {
        responseText = responseText.replace(/^```\n/, '').replace(/\n```$/, '');
      }
      
      // Log first part of response for debugging
      console.log('🔍 AI Response preview:', responseText.substring(0, 500) + '...');
      
      let result: ContractGenerationResult;
      try {
        result = JSON.parse(responseText) as ContractGenerationResult;
      } catch (parseError) {
        console.error('❌ JSON Parse Error:', parseError.message);
        console.error('🔍 Response around error position:', responseText.substring(13135, 13145));
        throw parseError;
      }
      
      console.log(`✅ AI contract generation complete (${request.type}):`, result.reasoning);
      return {
        ...result,
        success: true
      };
      
    } catch (error: any) {
      console.error('❌ AI contract generation failed:', error.message);
      
      return {
        html: '',
        reasoning: `AI generation failed: ${error.message}`,
        success: false
      };
    }
  }

  private getSystemPrompt(type: 'initial' | 'signing' | 'final'): string {
    const basePrompt = `You are an expert contract HTML generator that creates COMPREHENSIVE and DETAILED custom layouts for each contract. You MUST generate verbose, thorough, and complete HTML documents with extensive embedded CSS styling.

CRITICAL: Generate a MINIMUM of 8,000+ characters of HTML/CSS. Do NOT abbreviate, summarize, or minimize any sections. Use extensive styling, detailed markup, and comprehensive formatting throughout.

CRITICAL LAYOUT INTELLIGENCE:
- Analyze content length and complexity to determine optimal spacing
- Adapt section layouts based on actual clause count and text length
- Calculate optimal page breaks to avoid awkward splits
- Choose typography scales based on content density
- Create responsive grids that accommodate varying data lengths
- Ensure professional appearance regardless of content variation

PROFESSIONAL DESIGN PRINCIPLES:
- Use MusoBuddy branding (metronome logo, dynamic theme colors)
- Maintain legal document clarity and hierarchy
- Apply proper contrast ratios and accessibility
- Balance white space with content density
- Create visual flow that guides reading

TECHNICAL REQUIREMENTS:
- Generate complete, valid HTML5 with EXTENSIVE embedded CSS styling
- Optimize for Puppeteer PDF generation (A4 size, 0.75" margins)
- Use COMPREHENSIVE CSS - include detailed styling for ALL elements
- Create RICH HTML structure with detailed markup and classes
- Handle edge cases (long names, addresses, many clauses) with VERBOSE solutions
- Ensure no content overflows or breaks inappropriately
- IMPORTANT: Use MAXIMUM verbosity - include ALL possible styling, animations, gradients, shadows, and detailed formatting
- MINIMUM 8,000 characters of HTML/CSS output required
- Include extensive CSS for headers, cards, gradients, shadows, typography, spacing
- Add detailed styling for every single element, section, and component

DYNAMIC CONTENT ADAPTATION:
- Short contract (few clauses): More generous spacing, larger typography
- Long contract (many clauses): Tighter spacing, efficient layout
- Long names/addresses: Adjust column widths and line heights
- Custom clauses: Create appropriate grouping and hierarchy

REQUIRED CONSTANT BRANDING ELEMENTS:
- MusoBuddy logo with metronome icon (midnight blue #191970 background, white trapezoid shape)
- "MusoBuddy" company name in header
- "Less admin, more music" tagline
- Contract status badge in top-right corner
- Footer with "MusoBuddy - Less admin, more music" and "Empowering musicians with professional business tools"

HEADER STRUCTURE REQUIREMENTS:
- Status badge positioned top-right
- Logo section with metronome icon and company branding
- Contract title "Performance Contract" 
- Contract number display
- Use theme colors for header background gradient

CRITICAL OUTPUT REQUIREMENTS:
- Generate a COMPREHENSIVE HTML document with EXTENSIVE embedded CSS (minimum 8,000+ characters)
- Include detailed styling for every element: gradients, shadows, borders, hover effects, animations
- Use verbose legal language and comprehensive terms throughout
- Add extensive CSS classes, detailed grid layouts, professional color schemes
- Include comprehensive typography, spacing, and visual hierarchy
- DO NOT abbreviate or minimize ANY sections - be thorough and detailed throughout

Return ONLY valid JSON with no markdown formatting, code blocks, or extra text.
Format exactly as:
{
  "html": "COMPREHENSIVE HTML document with EXTENSIVE embedded CSS - MINIMUM 8000 characters",
  "reasoning": "Detailed explanation of layout decisions and adaptations made",
  "layoutDecisions": {
    "sectionSpacing": "How spacing was adapted to content length",
    "pageBreakStrategy": "Page break decisions and reasoning", 
    "typographyChoices": "Font sizing based on content density",
    "gridLayout": "Grid decisions for varying content widths"
  }
}`;

    const typeSpecific = {
      initial: `
CONTRACT TYPE: Initial PDF for viewing after creation
FOCUS: Clean, professional presentation optimized for PDF viewing
SIGNATURES: Show placeholder signature areas with professional styling`,
      
      signing: `  
CONTRACT TYPE: Interactive signing page for CLIENT to sign in web browser
FOCUS: Client-friendly signing experience with clear instructions
SIGNATURES: Show performer as already signed, client signature field only
ADDITIONAL: Web-optimized styling, no PDF generation needed`,

      final: `
CONTRACT TYPE: Final archived PDF with completed signatures
FOCUS: Legal document permanence and professional archival quality
SIGNATURES: Display actual signature details, timestamps, and completion status
BRANDING: Include subtle "completed" or "executed" indicators`
    };

    return basePrompt + '\n\n' + typeSpecific[type];
  }

  private buildContractPrompt(request: ContractGenerationRequest): string {
    const { contract, userSettings, type } = request;
    
    // Calculate total amount
    const fee = parseFloat(contract.fee || '0');
    const travelExpenses = parseFloat(contract.travelExpenses || '0');
    const totalAmount = fee + travelExpenses;
    
    // Extract clauses
    const selectedClauses = this.extractSelectedClauses(userSettings);
    const customClauses = this.extractCustomClauses(userSettings?.customClauses || []);
    
    // Add deposit clause if deposit amount is specified
    const allSelectedClauses = this.addDepositClause(contract, [...selectedClauses]);
    
    // Theme colors
    const primaryColor = userSettings?.themeAccentColor || '#8b5cf6';
    const secondaryColor = this.getSecondaryColor(primaryColor);
    
    // Analyze content complexity for AI optimization
    const contentAnalysis = this.analyzeContentComplexity(contract, userSettings, allSelectedClauses, customClauses);
    
    return `Generate a COMPREHENSIVE, DETAILED, and VERBOSE custom contract HTML optimized for this specific content. 

CRITICAL REQUIREMENTS:
- Create EXTENSIVE HTML with detailed embedded CSS (minimum 8,000+ characters)
- Include comprehensive styling: gradients, shadows, cards, typography, spacing
- Use verbose legal language and detailed formatting throughout
- Add extensive CSS classes, animations, hover effects, and professional styling
- Create detailed grid layouts with comprehensive responsive design
- Include thorough section organization with rich visual hierarchy
- DO NOT abbreviate or minimize - be maximally verbose and detailed

CONTRACT METADATA:
Type: ${type}
Contract Number: ${contract.contractNumber || 'TBC'}
Status: ${contract.status || 'draft'}
Created: ${contract.createdAt ? new Date(contract.createdAt).toLocaleDateString('en-GB') : 'Today'}

CONTENT COMPLEXITY ANALYSIS:
${contentAnalysis}

PERFORMER (Business):
Name: ${userSettings?.businessName || 'Business Name TBC'}
Email: ${userSettings?.businessEmail || 'Email TBC'}
Phone: ${userSettings?.phone || 'Phone TBC'}
Address: ${this.formatAddress(userSettings)}

CLIENT:
Name: ${contract.clientName || 'Client Name TBC'} (${(contract.clientName || '').length} chars)
Email: ${contract.clientEmail || 'Client Email TBC'}
Phone: ${contract.clientPhone || 'Phone TBC'}
Address: ${contract.clientAddress || 'Client Address TBC'}

EVENT INFORMATION:
Date: ${contract.eventDate || 'Date TBC'}
Start Time: ${contract.eventTime || contract.startTime || 'Start Time TBC'}
End Time: ${contract.eventEndTime || contract.endTime || 'End Time TBC'}
Venue: ${contract.venue || 'Venue TBC'} (${(contract.venue || '').length} chars)
Venue Address: ${contract.venueAddress || 'Venue Address TBC'} (${(contract.venueAddress || '').length} chars)

FINANCIAL TERMS:
Performance Fee: £${totalAmount.toFixed(2)}
${contract.deposit ? `Deposit Required: £${parseFloat(contract.deposit).toFixed(2)}` : 'No deposit required'}
${contract.deposit ? `Balance Due: £${(totalAmount - parseFloat(contract.deposit)).toFixed(2)}` : ''}
${contract.paymentInstructions ? `Payment Instructions: ${contract.paymentInstructions}` : ''}

CONTRACT TERMS (${allSelectedClauses.length + customClauses.length} total clauses):

STANDARD CLAUSES (${allSelectedClauses.length}):
${allSelectedClauses.map((clause, i) => `${i+1}. ${clause}`).join('\n')}

CUSTOM CLAUSES (${customClauses.length}):
${customClauses.map((clause, i) => `${i+1}. ${clause}`).join('\n')}

${contract.equipmentRequirements ? `EQUIPMENT REQUIREMENTS:\n${contract.equipmentRequirements}` : ''}
${contract.specialRequirements ? `SPECIAL REQUIREMENTS:\n${contract.specialRequirements}` : ''}

THEME & BRANDING:
Primary Color: ${primaryColor}
Secondary Color: ${secondaryColor}
Font Family: ${this.getFontFamily(userSettings?.themeFont || 'roboto')}
Template Style: ${userSettings?.themeTemplate || 'classic'}
Show Terms Section: ${userSettings?.themeShowTerms !== false}

${type === 'signing' ? `
CLIENT SIGNING PAGE REQUIREMENTS:
- Show performer signature as already completed (signed when sent)
- CLIENT signature field only - interactive web form
- Clear signing instructions for client
- Professional web styling (not for PDF conversion)
- Signature capture and validation
- Maintain visual consistency with contract PDFs
` : ''}

${type === 'final' && request.signatureDetails ? `
SIGNATURE COMPLETION STATUS:
Performer: ${request.signatureDetails.performerSigned ? `✓ Signed on ${request.signatureDetails.performerSignedAt}` : '✗ Not signed'}
Client: ${request.signatureDetails.clientSigned ? `✓ Signed on ${request.signatureDetails.clientSignedAt}` : '✗ Not signed'}
` : ''}

Create a completely custom HTML layout optimized for this specific contract's content characteristics.`;
  }

  private extractSelectedClauses(userSettings: UserSettings | null): string[] {
    const clauses: string[] = [];
    
    if (!userSettings?.contractClauses) return clauses;
    
    const clauseMap = {
      // Legacy clause names (for backward compatibility)
      payment30: "Payment due within 30 days of performance",
      deposit50: "50% deposit required to secure booking (non-refundable)", 
      cancellation7: "Cancellations within 7 days forfeit deposit",
      equipmentOwnership: "All equipment remains property of performer",
      powerSupply: "Client must provide adequate and safe power supply",
      venueAccess: "Client must provide safe and reasonable venue access for load-in/out",
      weatherProtection: "Client must provide weather protection for outdoor events",
      finalNumbers: "Final guest numbers must be confirmed 48 hours prior",
      noRecording: "No recording or broadcasting without performer's written consent",
      forcemajeure: "Neither party liable for cancellation due to events beyond their control",
      
      // New expanded clause names
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

    for (const [key, value] of Object.entries(clauseMap)) {
      if (userSettings.contractClauses[key as keyof typeof clauseMap]) {
        clauses.push(value);
      }
    }

    // Add payment terms clause if set
    if (userSettings.contractClauses?.paymentTerms) {
      const paymentTermsText = this.getPaymentTermsText(userSettings.contractClauses.paymentTerms);
      clauses.push(paymentTermsText);
    }

    return clauses;
  }

  // Helper method to add deposit clause (called from buildContractPrompt)
  private addDepositClause(contract: Contract, clauses: string[]): string[] {
    if (contract && contract.deposit && parseFloat(contract.deposit) > 0) {
      const depositAmount = parseFloat(contract.deposit).toFixed(2);
      const depositDays = contract.depositDays || 7;
      const depositClause = `This Agreement becomes legally binding upon signature by both parties. The Client agrees to pay a non-refundable booking fee of £${depositAmount} within ${depositDays} days of signing. The booking will not be confirmed until the booking fee is received, and the Artist reserves the right to release the date if payment is not made.`;
      clauses.unshift(depositClause); // Add at the beginning since it's a critical clause
    }

    return clauses;
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
      // Legacy terms (for backward compatibility)
      case "on_receipt": return "Payment due on receipt of invoice";
      case "3_days": return "Payment due within 3 days";
      case "7_days": return "Payment due within 7 days";
      case "14_days": return "Payment due within 14 days";
      case "30_days": return "Payment due within 30 days";
      case "cash_as_agreed": return "Cash payment as agreed";
      default: return "Payment due within 7 days of performance";
    }
  }

  private extractCustomClauses(customClauses: any[]): string[] {
    const clauses: string[] = [];
    
    customClauses.forEach(clause => {
      // Handle new format: {text: string, enabled: boolean}
      if (typeof clause === 'object' && clause.text && clause.enabled) {
        clauses.push(clause.text);
      }
      // Handle legacy format: string
      else if (typeof clause === 'string' && clause.trim()) {
        clauses.push(clause);
      }
    });

    return clauses;
  }

  private getSecondaryColor(primaryColor: string): string {
    // Generate a secondary color (darker shade) from primary color
    const colorMap: Record<string, string> = {
      '#8b5cf6': '#a855f7', // Purple
      '#0ea5e9': '#0284c7', // Ocean Blue
      '#34d399': '#10b981', // Forest Green
      '#f87171': '#ef4444', // Red
      '#191970': '#1e3a8a', // Midnight Blue
    };
    
    return colorMap[primaryColor] || primaryColor; // Fallback to same color
  }

  private getFontFamily(themeFont: string): string {
    const fontMap: Record<string, string> = {
      'roboto': "'Roboto', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      'inter': "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", 
      'poppins': "'Poppins', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      'montserrat': "'Montserrat', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      'arial': "'Arial', sans-serif",
      'times': "'Times New Roman', Times, serif",
      'georgia': "'Georgia', Times, serif"
    };
    
    return fontMap[themeFont] || fontMap['roboto'];
  }

  private formatAddress(userSettings: UserSettings | null): string {
    if (!userSettings) return 'Address TBC';
    
    const addressParts: string[] = [];
    
    if (userSettings.addressLine1) addressParts.push(userSettings.addressLine1);
    if (userSettings.addressLine2) addressParts.push(userSettings.addressLine2);
    if (userSettings.city) addressParts.push(userSettings.city);
    if (userSettings.county) addressParts.push(userSettings.county);
    if (userSettings.postcode) addressParts.push(userSettings.postcode);
    
    return addressParts.length > 0 ? addressParts.join(', ') : 'Address TBC';
  }

  private analyzeContentComplexity(
    contract: Contract, 
    userSettings: UserSettings | null,
    selectedClauses: string[], 
    customClauses: string[]
  ): string {
    const totalClauses = selectedClauses.length + customClauses.length;
    const customClausesText = customClauses.join(' ');
    const customTextLength = customClausesText.length;
    
    const venueAddressLength = (contract.venueAddress || '').length;
    const clientNameLength = (contract.clientName || '').length;
    const businessNameLength = (userSettings?.businessName || '').length;
    
    // Analyze complexity levels
    const complexityFactors = [
      `Clause Count: ${totalClauses} (${totalClauses < 5 ? 'Light' : totalClauses < 10 ? 'Medium' : 'Dense'})`,
      `Custom Clause Text: ${customTextLength} chars (${customTextLength < 200 ? 'Short' : customTextLength < 500 ? 'Medium' : 'Lengthy'})`,
      `Name Lengths: Business(${businessNameLength}), Client(${clientNameLength}) - ${Math.max(businessNameLength, clientNameLength) > 25 ? 'Long names require wider columns' : 'Standard names fit well'}`,
      `Venue Address: ${venueAddressLength} chars (${venueAddressLength > 50 ? 'Long address needs careful wrapping' : 'Standard address'})`,
      `Additional Content: ${contract.equipmentRequirements ? 'Equipment reqs' : ''} ${contract.specialRequirements ? 'Special reqs' : ''} ${contract.paymentInstructions ? 'Payment instructions' : ''}`.trim() || 'None'
    ];

    // Layout recommendations based on analysis
    let layoutStrategy = '';
    if (totalClauses < 5 && customTextLength < 200) {
      layoutStrategy = 'SPACIOUS LAYOUT: Few clauses allow generous spacing and larger typography';
    } else if (totalClauses > 12 || customTextLength > 800) {
      layoutStrategy = 'COMPACT LAYOUT: Dense content requires efficient spacing and smaller typography';
    } else {
      layoutStrategy = 'BALANCED LAYOUT: Medium content density allows standard spacing';
    }

    return `${complexityFactors.join('\n')}\n\nRECOMMENDED STRATEGY: ${layoutStrategy}`;
  }
}

// Export singleton instance
export const aiContractGenerator = new AIContractGenerator();