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

// Professional template with advanced styling
export const PROFESSIONAL_TEMPLATE: ContractTemplate = {
  name: 'Professional',
  styling: {
    primaryColor: '#3b82f6',
    backgroundColor: '#f4f6fa',
    fontFamily: "'Inter', Arial, sans-serif"
  },
  sections: [
    {
      id: 'performer-details',
      title: 'Performer Details',
      type: 'info',
      required: true,
      content: (contract: any, userSettings: any) => `
        <p><strong>${userSettings?.businessName || 'Professional Musician'}</strong></p>
        ${userSettings?.businessEmail ? `<p>Email: ${userSettings.businessEmail}</p>` : ''}
        ${userSettings?.phone ? `<p>Phone: ${userSettings.phone}</p>` : ''}
        ${(() => {
          const addressParts = [
            userSettings?.addressLine1,
            userSettings?.addressLine2,
            userSettings?.city,
            userSettings?.county,
            userSettings?.postcode
          ].filter(Boolean);
          return addressParts.length > 0 ? `<p>Address: ${addressParts.join(', ')}</p>` : '';
        })()}
        ${userSettings?.website ? `<p>Website: ${userSettings.website}</p>` : ''}
        ${userSettings?.taxNumber ? `<p>VAT/Tax No: ${userSettings.taxNumber}</p>` : ''}
      `
    },
    {
      id: 'client-details',
      title: 'Client Details',
      type: 'info',
      required: true,
      content: (contract: any) => `
        <p><strong>${contract.clientName}</strong></p>
        ${contract.clientEmail ? `<p>Email: ${contract.clientEmail}</p>` : ''}
        ${contract.clientPhone ? `<p>Phone: ${contract.clientPhone}</p>` : ''}
        ${contract.clientAddress ? `<p>Address: ${contract.clientAddress}</p>` : ''}
      `
    },
    {
      id: 'event-details',
      title: 'Event Details',
      type: 'info',
      required: true,
      content: (contract: any, userSettings: any) => `
        <table class="event-table">
          <tr><td class="label">Event Date:</td><td><strong>${contract.eventDate ? new Date(contract.eventDate).toLocaleDateString('en-GB', {
            weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
          }) : 'To be confirmed'}</strong></td></tr>
          <tr><td class="label">Event Time:</td><td>${contract.eventTime || 'TBC'} - ${contract.eventEndTime || 'TBC'}</td></tr>
          <tr><td class="label">Venue:</td><td><strong>${contract.venue || 'To be confirmed'}</strong></td></tr>
          <tr><td class="label">Venue Address:</td><td>${contract.venueAddress || 'To be confirmed'}</td></tr>
          <tr><td class="label">Performance Type:</td><td>${userSettings?.primaryInstrument ? `${userSettings.primaryInstrument} Performance` : 'Live Music Performance'}</td></tr>
        </table>
      `
    },
    {
      id: 'fee-highlight',
      title: 'Fee',
      type: 'payment',
      required: true,
      content: (contract: any) => `
        <div class="fee-highlight">
          £${contract.fee || '0.00'}
          <div class="label">Total Performance Fee</div>
          ${contract.deposit && parseFloat(contract.deposit) > 0 ? `<div style="font-size:12px; color:#334155; margin-top:4px;">Deposit Required: £${contract.deposit}</div>` : ''}
        </div>
      `
    },
    {
      id: 'requirements',
      title: 'Requirements & Specifications',
      type: 'requirements',
      required: false,
      content: (contract: any) => {
        if (!contract.equipmentRequirements && !contract.specialRequirements) return '';
        return `
          ${contract.equipmentRequirements ? `<h4>Equipment Requirements</h4><p>${contract.equipmentRequirements}</p>` : ''}
          ${contract.specialRequirements ? `<h4>Special Requirements</h4><p>${contract.specialRequirements}</p>` : ''}
        `;
      }
    },
    {
      id: 'payment-terms',
      title: 'Payment Terms & Conditions',
      type: 'terms',
      required: true,
      content: (contract: any) => `
        <ul>
          <li><strong>Payment Due Date:</strong> Full payment of £${contract.fee || '0.00'} becomes due and payable no later than the day of performance.</li>
          <li><strong>Payment Methods:</strong> Cash or bank transfer to the performer's designated account.</li>
          <li><strong>Deposit:</strong> £${contract.deposit || '0.00'} deposit required to secure booking. Deposit is non-refundable except as outlined in the cancellation policy.</li>
          <li><strong>Late Payment:</strong> Any payment received after the due date may incur a late payment fee of £25 plus interest at 2% per month.</li>
        </ul>
      `
    },
    {
      id: 'cancellation-policy',
      title: 'Cancellation & Refund Policy',
      type: 'terms',
      required: true,
      content: () => `
        <ul>
          <li><strong>Client Cancellation:</strong>
            <ul>
              <li>More than 30 days before event: Any deposit paid will be refunded minus a £50 administration fee.</li>
              <li>30 days or less before event: Full performance fee becomes due regardless of cancellation.</li>
              <li>Same day cancellation: Full fee due plus any additional costs incurred.</li>
            </ul>
          </li>
          <li><strong>Performer Cancellation:</strong> In the unlikely event the performer must cancel due to circumstances within their control, all payments will be refunded in full.</li>
          <li><strong>Rescheduling:</strong> Event may be rescheduled once without penalty if agreed by both parties at least 14 days in advance.</li>
        </ul>
      `
    },
    {
      id: 'force-majeure',
      title: 'Force Majeure',
      type: 'terms',
      required: true,
      content: () => `
        <p>Neither party shall be liable for any failure to perform due to circumstances beyond their reasonable control, including but not limited to: severe weather, natural disasters, government restrictions, venue closure, or serious illness.</p>
      `
    },
    {
      id: 'performance-standards',
      title: 'Professional Performance Standards',
      type: 'terms',
      required: true,
      content: () => `
        <ul>
          <li><strong>Equipment & Instrument Protection:</strong> The equipment and instruments of the performer are not available for use by any other person, except by specific permission of the performer.</li>
          <li><strong>Venue Safety Requirements:</strong> The client shall ensure a safe supply of electricity and the security of the performer and their property at the venue.</li>
          <li><strong>Recording & Transmission Policy:</strong> The client shall not make or permit the making of any audio and/or visual recording without the prior written consent of the performer.</li>
        </ul>
      `
    }
  ]
};

// Generate full professional contract HTML with styling
export function generateProfessionalContractHTML(contract: any, userSettings: any): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>MusoBuddy Performance Contract</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600&display=swap');
    html, body {
      background: #f4f6fa;
      color: #222;
      font-family: 'Inter', Arial, sans-serif;
      font-size: 13px;
      margin: 0;
      padding: 0;
    }
    .container {
      max-width: 800px;
      margin: 0 auto;
      background: #fff;
      padding: 32px 28px 24px 28px;
      box-shadow: 0 2px 16px #e0e7ef;
      min-height: 1120px;
    }
    .header {
      background: #3b82f6;
      color: #fff;
      padding: 28px 0 18px 0;
      text-align: center;
      border-radius: 0 0 8px 8px;
      margin-bottom: 32px;
    }
    .header h1 {
      font-size: 26px;
      font-weight: 600;
      margin-bottom: 6px;
      letter-spacing: 1px;
    }
    .header .subtitle {
      font-size: 14px;
      opacity: 0.92;
    }
    .section-header {
      color: #334155;
      background: #e0e7ef;
      font-size: 15px;
      font-weight: 600;
      padding: 10px 18px;
      border-radius: 6px;
      margin: 32px 0 14px 0;
      letter-spacing: 0.5px;
    }
    .two-column {
      display: flex;
      gap: 32px;
      margin-bottom: 24px;
    }
    .column {
      flex: 1;
      background: #f4f6fa;
      padding: 18px 18px 12px 18px;
      border-radius: 8px;
      border-left: 4px solid #3b82f6;
    }
    .column h3 {
      color: #3b82f6;
      font-size: 13px;
      font-weight: 600;
      margin-bottom: 10px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .column p {
      margin-bottom: 6px;
      font-size: 13px;
    }
    .event-table {
      width: 100%;
      border-collapse: collapse;
      margin: 18px 0 0 0;
      background: #fff;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 1px 4px #e0e7ef;
    }
    .event-table th {
      background: #3b82f6;
      color: #fff;
      padding: 12px;
      text-align: left;
      font-weight: 600;
      font-size: 13px;
    }
    .event-table td {
      padding: 12px;
      border-bottom: 1px solid #e0e7ef;
      font-size: 13px;
    }
    .event-table tr:last-child td {
      border-bottom: none;
    }
    .event-table .label {
      font-weight: 600;
      color: #334155;
      width: 32%;
    }
    .fee-highlight {
      background: #e0e7ef;
      color: #3b82f6;
      font-size: 22px;
      text-align: center;
      padding: 18px;
      border-radius: 6px;
      margin: 28px 0 0 0;
      font-weight: 600;
      box-shadow: 0 2px 8px #e0e7ef;
    }
    .fee-highlight .label {
      font-size: 13px;
      color: #334155;
      font-weight: 400;
      margin-top: 6px;
    }
    .terms-section {
      background: #f4f6fa;
      padding: 20px 18px;
      border-radius: 8px;
      margin: 18px 0;
      border-left: 4px solid #3b82f6;
    }
    .terms-section h4 {
      color: #3b82f6;
      font-size: 13px;
      font-weight: 600;
      margin-bottom: 10px;
      text-transform: uppercase;
    }
    .terms-section p, .terms-section ul {
      font-size: 12px;
      line-height: 1.5;
      margin-bottom: 8px;
      color: #475569;
    }
    .terms-section ul {
      padding-left: 20px;
    }
    .terms-section li {
      margin-bottom: 4px;
    }
    .signature-section {
      margin-top: 36px;
      display: flex;
      gap: 32px;
    }
    .signature-box {
      flex: 1;
      border: 2px solid #3b82f6;
      border-radius: 8px;
      padding: 22px 12px 18px 12px;
      text-align: center;
      background: #fff;
      min-height: 100px;
      position: relative;
    }
    .signature-box h4 {
      color: #3b82f6;
      font-size: 13px;
      font-weight: 600;
      margin-bottom: 12px;
    }
    .signature-line {
      border-bottom: 2px solid #3b82f6;
      margin: 18px 0 8px 0;
      height: 36px;
    }
    .signature-box .date-line {
      font-size: 11px;
      color: #64748b;
      margin-top: 8px;
    }
    .signed-indicator {
      background: #059669;
      color: white;
      padding: 7px 14px;
      border-radius: 20px;
      font-size: 11px;
      font-weight: 600;
      display: inline-block;
      margin-top: 8px;
    }
    .footer {
      background: #3b82f6;
      color: white;
      padding: 18px 0 12px 0;
      text-align: center;
      font-size: 11px;
      border-radius: 8px 8px 0 0;
      margin-top: 40px;
    }
    .footer .brand {
      font-size: 16px;
      font-weight: 700;
      margin-bottom: 3px;
    }
    .footer .contract-ref {
      font-size: 10px;
      opacity: 0.7;
    }
    @media print {
      body { margin: 0; -webkit-print-color-adjust: exact; color-adjust: exact; }
      .container { box-shadow: none; }
      .header, .footer { background: #3b82f6 !important; }
      .section-header, .event-table th { background: #e0e7ef !important; color: #334155 !important; }
      .fee-highlight { background: #e0e7ef !important; color: #3b82f6 !important; }
      .event-table, .fee-highlight, .section-header, .terms-section, .signature-section { page-break-inside: avoid; break-inside: avoid; }
      .section-header.terms { page-break-before: always; break-before: page; }
      .section-header { page-break-after: avoid; break-after: avoid; }
    }
    @media (max-width: 700px) {
      .container { padding: 10px; }
      .two-column, .signature-section { flex-direction: column; gap: 16px; }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Performance Contract</h1>
      <div class="subtitle">Contract #\${contract.contractNumber || 'DRAFT'} • Generated \${new Date().toLocaleDateString('en-GB')}</div>
    </div>

    <div class="two-column">
      <div class="column">
        <h3>Performer Details</h3>
        <p><strong>\${userSettings?.businessName || 'Professional Musician'}</strong></p>
        \${userSettings?.businessEmail ? \`<p>Email: \${userSettings.businessEmail}</p>\` : ''}
        \${userSettings?.phone ? \`<p>Phone: \${userSettings.phone}</p>\` : ''}
        \${(() => {
          const addressParts = [
            userSettings?.addressLine1,
            userSettings?.addressLine2,
            userSettings?.city,
            userSettings?.county,
            userSettings?.postcode
          ].filter(Boolean);
          return addressParts.length > 0 ? \`<p>Address: \${addressParts.join(', ')}</p>\` : '';
        })()}
        \${userSettings?.website ? \`<p>Website: \${userSettings.website}</p>\` : ''}
        \${userSettings?.taxNumber ? \`<p>VAT/Tax No: \${userSettings.taxNumber}</p>\` : ''}
      </div>
      <div class="column">
        <h3>Client Details</h3>
        <p><strong>\${contract.clientName}</strong></p>
        \${contract.clientEmail ? \`<p>Email: \${contract.clientEmail}</p>\` : ''}
        \${contract.clientPhone ? \`<p>Phone: \${contract.clientPhone}</p>\` : ''}
        \${contract.clientAddress ? \`<p>Address: \${contract.clientAddress}</p>\` : ''}
      </div>
    </div>

    <div class="section-header">Event Details</div>
    <table class="event-table">
      <tr>
        <td class="label">Event Date:</td>
        <td><strong>\${contract.eventDate ? new Date(contract.eventDate).toLocaleDateString('en-GB', {
          weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
        }) : 'To be confirmed'}</strong></td>
      </tr>
      <tr>
        <td class="label">Event Time:</td>
        <td>\${contract.eventTime || 'TBC'} - \${contract.eventEndTime || 'TBC'}</td>
      </tr>
      <tr>
        <td class="label">Venue:</td>
        <td><strong>\${contract.venue || 'To be confirmed'}</strong></td>
      </tr>
      <tr>
        <td class="label">Venue Address:</td>
        <td>\${contract.venueAddress || 'To be confirmed'}</td>
      </tr>
      <tr>
        <td class="label">Performance Type:</td>
        <td>\${userSettings?.primaryInstrument ? \`\${userSettings.primaryInstrument} Performance\` : 'Live Music Performance'}</td>
      </tr>
    </table>

    <div class="fee-highlight">
      £\${contract.fee || '0.00'}
      <div class="label">Total Performance Fee</div>
      \${contract.deposit && parseFloat(contract.deposit) > 0 ? \`<div style="font-size:12px; color:#334155; margin-top:4px;">Deposit Required: £\${contract.deposit}</div>\` : ''}
    </div>

    \${(contract.equipmentRequirements || contract.specialRequirements) ? \`
      <div class="section-header">Requirements & Specifications</div>
      <div class="terms-section">
        \${contract.equipmentRequirements ? \`
          <h4>Equipment Requirements</h4>
          <p>\${contract.equipmentRequirements}</p>
        \` : ''}
        \${contract.specialRequirements ? \`
          <h4>Special Requirements</h4>
          <p>\${contract.specialRequirements}</p>
        \` : ''}
      </div>
    \` : ''}

    <div class="section-header terms">Terms & Conditions</div>

    <div class="terms-section">
      <h4>Payment Terms & Conditions</h4>
      <ul>
        <li><strong>Payment Due Date:</strong> Full payment of £\${contract.fee || '0.00'} becomes due and payable no later than the day of performance.</li>
        <li><strong>Payment Methods:</strong> Cash or bank transfer to the performer's designated account.</li>
        <li><strong>Deposit:</strong> £\${contract.deposit || '0.00'} deposit required to secure booking. Deposit is non-refundable except as outlined in the cancellation policy.</li>
        <li><strong>Late Payment:</strong> Any payment received after the due date may incur a late payment fee of £25 plus interest at 2% per month.</li>
      </ul>
    </div>

    <div class="terms-section">
      <h4>Cancellation & Refund Policy</h4>
      <ul>
        <li><strong>Client Cancellation:</strong>
          <ul>
            <li>More than 30 days before event: Any deposit paid will be refunded minus a £50 administration fee.</li>
            <li>30 days or less before event: Full performance fee becomes due regardless of cancellation.</li>
            <li>Same day cancellation: Full fee due plus any additional costs incurred.</li>
          </ul>
        </li>
        <li><strong>Performer Cancellation:</strong> In the unlikely event the performer must cancel due to circumstances within their control, all payments will be refunded in full.</li>
        <li><strong>Rescheduling:</strong> Event may be rescheduled once without penalty if agreed by both parties at least 14 days in advance.</li>
      </ul>
    </div>

    <div class="terms-section">
      <h4>Force Majeure</h4>
      <p>Neither party shall be liable for any failure to perform due to circumstances beyond their reasonable control, including but not limited to: severe weather, natural disasters, government restrictions, venue closure, or serious illness.</p>
    </div>

    <div class="terms-section">
      <h4>Professional Performance Standards</h4>
      <ul>
        <li><strong>Equipment & Instrument Protection:</strong> The equipment and instruments of the performer are not available for use by any other person, except by specific permission of the performer.</li>
        <li><strong>Venue Safety Requirements:</strong> The client shall ensure a safe supply of electricity and the security of the performer and their property at the venue.</li>
        <li><strong>Recording & Transmission Policy:</strong> The client shall not make or permit the making of any audio and/or visual recording without the prior written consent of the performer.</li>
      </ul>
    </div>

    <div class="signature-section">
      <div class="signature-box">
        <h4>Client Signature</h4>
        <div class="signature-line"></div>
        <p><strong>\${contract.clientName}</strong></p>
        <div class="date-line">Date: ________________</div>
      </div>
      <div class="signature-box">
        <h4>Performer Signature</h4>
        <div class="signature-line"></div>
        <p><strong>\${userSettings?.businessName || 'Performer'}</strong></p>
        <div class="date-line">Date: ________________</div>
      </div>
    </div>

    <div class="footer">
      <div class="brand">MusoBuddy</div>
      <div class="contract-ref">
        Contract Reference: \${contract.contractNumber || 'DRAFT'} • 
        Generated: \${new Date().toLocaleDateString('en-GB')} \${new Date().toLocaleTimeString('en-GB')}
        \${contract.id ? \` • ID: \${contract.id}\` : ''}
      </div>
    </div>
  </div>
</body>
</html>
  `;
}

// Default professional template (for backward compatibility)
export const DEFAULT_CONTRACT_TEMPLATE: ContractTemplate = PROFESSIONAL_TEMPLATE;
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