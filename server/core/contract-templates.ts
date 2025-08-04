// BULLETPROOF CONTRACT TEMPLATE SYSTEM
// Zero dependencies, zero breaking changes

export interface ContractTemplate {
  id: string;
  name: string;
  description: string;
  htmlTemplate: string;
  cssStyles: string;
  colorScheme: string;
}

// TEMPLATE REGISTRY - Add new templates here without breaking anything
export const CONTRACT_TEMPLATES: Record<string, ContractTemplate> = {
  
  basic: {
    id: 'basic',
    name: 'Basic Purple',
    description: 'Original purple template',
    colorScheme: '#8b5cf6',
    cssStyles: `
      body { font-family: Arial, sans-serif; color: #333; }
      .header { background: #8b5cf6; color: white; padding: 20px; }
      .content { padding: 20px; }
      .terms { background: #f8f4ff; padding: 15px; margin: 20px 0; }
    `,
    htmlTemplate: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Performance Contract</title>
        <style>{{CSS_STYLES}}</style>
      </head>
      <body>
        <div class="header">
          <h1>Performance Contract</h1>
          <p>Contract Number: {{CONTRACT_NUMBER}}</p>
        </div>
        
        <div class="content">
          <h2>Event Details</h2>
          <p><strong>Client:</strong> {{CLIENT_NAME}}</p>
          <p><strong>Date:</strong> {{EVENT_DATE}}</p>
          <p><strong>Time:</strong> {{EVENT_TIME}} - {{EVENT_END_TIME}}</p>
          <p><strong>Venue:</strong> {{VENUE}}</p>
          <p><strong>Fee:</strong> £{{FEE}}</p>
          
          <div class="terms">
            <h3>Terms & Conditions</h3>
            <p>Payment terms and performance requirements...</p>
          </div>
        </div>
      </body>
      </html>
    `
  },

  professional: {
    id: 'professional',
    name: 'Professional Blue',
    description: 'Corporate blue template',
    colorScheme: '#3b82f6',
    cssStyles: `
      body { font-family: 'Inter', sans-serif; color: #1f2937; line-height: 1.6; }
      .header { background: #3b82f6; color: white; padding: 30px; text-align: center; }
      .content { padding: 30px; max-width: 800px; margin: 0 auto; }
      .section { margin: 30px 0; }
      .terms { background: #eff6ff; border-left: 4px solid #3b82f6; padding: 20px; margin: 20px 0; }
      .signature-section { border-top: 2px solid #e5e7eb; padding-top: 30px; margin-top: 40px; }
    `,
    htmlTemplate: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Professional Performance Agreement</title>
        <style>{{CSS_STYLES}}</style>
      </head>
      <body>
        <div class="header">
          <h1>Professional Performance Agreement</h1>
          <p>Contract Reference: {{CONTRACT_NUMBER}}</p>
        </div>
        
        <div class="content">
          <div class="section">
            <h2>Event Information</h2>
            <table style="width: 100%; border-collapse: collapse;">
              <tr><td><strong>Client Name:</strong></td><td>{{CLIENT_NAME}}</td></tr>
              <tr><td><strong>Event Date:</strong></td><td>{{EVENT_DATE}}</td></tr>
              <tr><td><strong>Performance Time:</strong></td><td>{{EVENT_TIME}} - {{EVENT_END_TIME}}</td></tr>
              <tr><td><strong>Venue:</strong></td><td>{{VENUE}}</td></tr>
              <tr><td><strong>Performance Fee:</strong></td><td>£{{FEE}}</td></tr>
            </table>
          </div>
          
          <div class="terms">
            <h3>Terms & Conditions</h3>
            <p><strong>Payment:</strong> Payment due within 30 days of performance.</p>
            <p><strong>Cancellation:</strong> 48 hours notice required for cancellation.</p>
            <p><strong>Equipment:</strong> Professional sound equipment will be provided.</p>
          </div>
          
          <div class="signature-section">
            <h3>Agreement</h3>
            <p>By signing below, both parties agree to the terms outlined in this contract.</p>
            <br><br>
            <p>Client Signature: ___________________________ Date: ___________</p>
            <br>
            <p>Performer Signature: _______________________ Date: ___________</p>
          </div>
        </div>
      </body>
      </html>
    `
  }
};

// BULLETPROOF TEMPLATE RENDERER - Never breaks existing system
export function renderContractTemplate(templateId: string, contractData: any): string {
  const template = CONTRACT_TEMPLATES[templateId];
  if (!template) {
    // Fallback to basic template - never breaks
    return renderContractTemplate('basic', contractData);
  }

  let html = template.htmlTemplate;
  
  // Replace CSS placeholder
  html = html.replace('{{CSS_STYLES}}', template.cssStyles);
  
  // Replace contract data placeholders
  const replacements: Record<string, string> = {
    '{{CONTRACT_NUMBER}}': contractData.contractNumber || '',
    '{{CLIENT_NAME}}': contractData.clientName || '',
    '{{EVENT_DATE}}': contractData.eventDate ? new Date(contractData.eventDate).toLocaleDateString('en-GB') : '',
    '{{EVENT_TIME}}': contractData.eventTime || '',
    '{{EVENT_END_TIME}}': contractData.eventEndTime || '',
    '{{VENUE}}': contractData.venue || '',
    '{{FEE}}': contractData.fee || '0.00'
  };

  // Apply all replacements
  Object.entries(replacements).forEach(([placeholder, value]) => {
    html = html.replace(new RegExp(placeholder, 'g'), value);
  });

  return html;
}

// TEMPLATE SELECTOR - For frontend dropdown
export function getAvailableTemplates() {
  return Object.values(CONTRACT_TEMPLATES).map(template => ({
    id: template.id,
    name: template.name,
    description: template.description,
    colorScheme: template.colorScheme
  }));
}