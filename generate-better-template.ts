import Anthropic from '@anthropic-ai/sdk';
import { writeFileSync } from 'fs';

async function generateBetterContractTemplate() {
  const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  });

  try {
    console.log('🚀 Calling Claude Sonnet to create better contract HTML template...');
    
    const response = await anthropic.messages.create({
      model: "claude-3-5-sonnet-20241022", // Using Sonnet for best results
      max_tokens: 4000,
      temperature: 0.1,
      system: `You are a professional web designer creating business contract templates. Create a beautiful, modern, professional HTML contract template with inline CSS.

REQUIREMENTS:
- Modern, clean design with excellent typography
- Professional business document appearance
- Proper spacing, alignment, and visual hierarchy
- Use CSS Grid/Flexbox for perfect layout
- Print-optimized styles
- Responsive design that works for any content length
- Beautiful color scheme and styling
- Perfect for PDF generation via Puppeteer

The template should be dynamic and professional - much better than typical contract templates.`,
      messages: [
        {
          role: 'user',
          content: `Create a beautiful, professional HTML contract template based on this data:

CONTRACT DETAILS:
- Contract Number: 30/08/2025 - Kelly Boyd
- Status: DRAFT
- Client: Kelly Boyd
- Client Email: timfulker@gmail.com  
- Client Phone: 07989676155
- Client Address: 94, Hambledon Road, Waterlooville, PO7 6UP

PERFORMER DETAILS:
- Business: Tim Fulker Music
- Email: timfulkermusic@gmail.com
- Phone: 07764190034
- Address: 59, Gloucester Rd, Bournemouth, Dorset, BH7 6JA

EVENT DETAILS:
- Date: Saturday, 30 August 2025
- Time: 19:00 - 22:00
- Venue: Kelly's House
- Venue Address: 94, Hambledon Road, Waterlooville, PO7 6UP

FINANCIAL TERMS:
- Total Performance Fee: £310.00
- Deposit Required: £23.00
- Balance Due: £287.00

REQUIREMENTS:
- Equipment: 1 PA speaker
- Special: vegan

TERMS & CONDITIONS:
- Client must provide adequate and safe power supply
- Client must provide safe and reasonable venue access for load-in/out
- All equipment remains property of performer; client responsible for damage caused by guests
- Performer holds Public Liability Insurance; client responsible for venue licences (PRS/PPL)
- Client responsible for venue sound restrictions or curfews
- Stage/performance area must be flat, covered, and safe
- Client to provide suitable food and drink if performance exceeds 3 hours including setup
- This Agreement becomes legally binding upon signature by both parties. The Client agrees to pay a non-refundable booking fee of £23.00 within 3 days of signing. The booking will not be confirmed until the booking fee is received, and the Artist reserves the right to release the date if payment is not made.
- Client to cover parking fees; accommodation required if venue is over 50 miles or finish after midnight
- Payment due on date of performance
- Neither party liable for cancellation due to events beyond their control (illness, accidents, extreme weather, etc.)
- Client must provide weather protection for outdoor events
- No recording or broadcasting without performer's written consent
- Contract subject to the laws of England & Wales
- Final numbers must be confirmed 48 hours prior
- Performer will use best efforts to provide a suitable replacement

BRANDING:
- Company: MusoBuddy
- Tagline: "Less admin, more music"
- Colors: Professional blue theme (#8b5cf6 primary)

Create a stunning, professional contract template that looks like a premium business document. Include proper signatures section. Make it much better than typical contract templates with excellent design and layout.

Return ONLY the complete HTML - no explanations.`
        }
      ]
    });

    const html = response.content[0].text;
    console.log('✅ Generated HTML template:', html.length, 'characters');
    
    // Write the HTML to a file
    writeFileSync('./generated-contract-template.html', html);
    console.log('📄 Template saved to: generated-contract-template.html');
    
    // Also create a TypeScript template function
    const templateFunction = `// AI-Generated Professional Contract Template
export function generateProfessionalContractHTML(
  contract: any,
  userSettings: any,
  signatureDetails?: any
): string {
  // TODO: Replace static values with dynamic data from contract/userSettings
  return \`${html.replace(/`/g, '\\`').replace(/\$/g, '\\$')}\`;
}

export default generateProfessionalContractHTML;`;

    writeFileSync('./generated-contract-template.ts', templateFunction);
    console.log('📄 TypeScript template saved to: generated-contract-template.ts');
    
    console.log('\n🎉 SUCCESS! Generated professional contract template.');
    console.log('📋 Next steps:');
    console.log('1. Review generated-contract-template.html');
    console.log('2. Replace unified-contract-pdf.ts with this template');
    console.log('3. Test the new formatting');
    
  } catch (error) {
    console.error('❌ Failed to generate template:', error);
  }
}

generateBetterContractTemplate();