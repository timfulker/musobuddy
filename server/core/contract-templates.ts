// Shared contract template system - keeps PDF and signing page in sync
export interface ContractTemplate {
  name: string;
  sections: ContractSection[];
  styling: TemplateStyles;
}

export interface ContractSection {
  id: string;
  title: string;
  content: string | ((contract: any, userSettings: any) => string);
  type: 'info' | 'terms' | 'payment' | 'requirements';
  required: boolean;
}

export interface TemplateStyles {
  primaryColor: string;
  backgroundColor: string;
  fontFamily: string;
}

// Default professional template
export const DEFAULT_CONTRACT_TEMPLATE: ContractTemplate = {
  name: 'Professional Standard',
  styling: {
    primaryColor: '#1e3a8a',
    backgroundColor: '#f5f5f5',
    fontFamily: 'Arial, sans-serif'
  },
  sections: [
    {
      id: 'client-info',
      title: 'Client Information',
      type: 'info',
      required: true,
      content: (contract: any) => `
        <p><strong>Name:</strong> ${contract.clientName}</p>
        ${contract.clientEmail ? `<p><strong>Email:</strong> ${contract.clientEmail}</p>` : ''}
        ${contract.clientPhone ? `<p><strong>Phone:</strong> ${contract.clientPhone}</p>` : ''}
        ${contract.clientAddress ? `<p><strong>Address:</strong> ${contract.clientAddress}</p>` : ''}
      `
    },
    {
      id: 'event-info',
      title: 'Event Information',
      type: 'info',
      required: true,
      content: (contract: any) => `
        <p><strong>Date:</strong> ${new Date(contract.eventDate).toLocaleDateString()}</p>
        ${contract.eventTime ? `<p><strong>Time:</strong> ${contract.eventTime}</p>` : ''}
        ${contract.eventEndTime ? `<p><strong>End Time:</strong> ${contract.eventEndTime}</p>` : ''}
        <p><strong>Venue:</strong> ${contract.venue || 'TBD'}</p>
        ${contract.venueAddress ? `<p><strong>Venue Address:</strong> ${contract.venueAddress}</p>` : ''}
      `
    },
    {
      id: 'financial-terms',
      title: 'Financial Terms',
      type: 'payment',
      required: true,
      content: (contract: any) => `
        <p><strong>Total Fee:</strong> £${contract.fee}</p>
        ${contract.deposit ? `<p><strong>Deposit Required:</strong> £${contract.deposit}</p>` : ''}
        ${contract.paymentInstructions ? `<p><strong>Payment Instructions:</strong> ${contract.paymentInstructions}</p>` : ''}
      `
    },
    {
      id: 'requirements',
      title: 'Requirements & Notes',
      type: 'requirements',
      required: false,
      content: (contract: any) => {
        if (!contract.equipmentRequirements && !contract.specialRequirements) return '';
        return `
          ${contract.equipmentRequirements ? `<p><strong>Equipment:</strong> ${contract.equipmentRequirements}</p>` : ''}
          ${contract.specialRequirements ? `<p><strong>Special Requirements:</strong> ${contract.specialRequirements}</p>` : ''}
        `;
      }
    },
    {
      id: 'terms-conditions',
      title: 'Terms & Conditions',
      type: 'terms',
      required: true,
      content: (contract: any, userSettings: any) => `
        <p><strong>Performer:</strong> ${userSettings?.businessName || 'MusoBuddy User'}</p>
        <p>By signing this contract, both parties agree to the terms outlined. This contract is legally binding once signed by both parties.</p>
        <p><strong>Cancellation Policy:</strong> Any cancellations must be made in writing with reasonable notice.</p>
        <p><strong>Force Majeure:</strong> Neither party shall be liable for failure to perform due to circumstances beyond their control.</p>
        <p><strong>Payment Terms:</strong> Payment as specified above. Late payments may incur additional charges.</p>
        <p><strong>Liability:</strong> The performer's liability is limited to the contract value. Client is responsible for venue safety and compliance.</p>
      `
    }
  ]
};

// Generate contract content using template
export function generateContractContent(contract: any, userSettings: any, template: ContractTemplate = DEFAULT_CONTRACT_TEMPLATE) {
  const sections = template.sections
    .filter(section => section.required || hasContent(section, contract))
    .map(section => ({
      ...section,
      renderedContent: typeof section.content === 'function' 
        ? section.content(contract, userSettings)
        : section.content
    }));
  
  return { sections, styling: template.styling };
}

function hasContent(section: ContractSection, contract: any): boolean {
  if (section.id === 'requirements') {
    return !!(contract.equipmentRequirements || contract.specialRequirements);
  }
  return true;
}