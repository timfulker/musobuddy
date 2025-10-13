import type { Contract, UserSettings } from '@shared/schema';

export function generateContractSigningPage(
  contract: Contract, 
  userSettings: UserSettings | null
): string {
  // Helper function to escape HTML to prevent XSS
  function escapeHtml(unsafe: string): string {
    if (!unsafe || typeof unsafe !== 'string') return '';
    return unsafe
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;")
      .replace(/\n/g, "<br>");
  }

  // Helper function to escape JavaScript strings
  function escapeJs(unsafe: string | null | undefined): string {
    if (!unsafe || typeof unsafe !== 'string') return '';
    return unsafe
      .replace(/\\/g, "\\\\")
      .replace(/'/g, "\\'")
      .replace(/"/g, '\\"')
      .replace(/\n/g, "\\n")
      .replace(/\r/g, "\\r")
      .replace(/\t/g, "\\t")
      .replace(/\u0000/g, ""); // Remove null bytes
  }

  // Safely process all data server-side - handle both camelCase and snake_case field names
  const contractId = contract.id.toString();
  const contractNumber = escapeHtml(contract.contractNumber || contract.contract_number || `Contract-${contract.id}`);
  const clientName = escapeHtml(contract.clientName || contract.client_name || '');
  const clientEmail = escapeHtml(contract.clientEmail || contract.client_email || '');
  const venue = escapeHtml(contract.venue || 'TBD');
  const eventTime = escapeHtml(contract.eventTime || contract.event_time || 'TBD');
  // Calculate total fee including travel expenses for client-facing display
  const baseFee = parseFloat(contract.fee?.toString() || '0');
  const travelExpensesAmount = parseFloat(contract.travelExpenses?.toString() || contract.travel_expenses?.toString() || '0');
  const totalFee = baseFee + travelExpensesAmount;
  const fee = escapeHtml(totalFee.toFixed(2));
  const deposit = escapeHtml(contract.deposit?.toString() || '0.00');
  const depositDays = contract.depositDays || contract.deposit_days || 7;
  const travelExpenses = escapeHtml(travelExpensesAmount.toFixed(2));

  // Get due date from contract (attached from booking - single source of truth)
  const dueDate = (contract as any).dueDate ? new Date((contract as any).dueDate) : null;
  const formattedDueDate = dueDate ? dueDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : null;

  // Helper function to convert payment terms setting to readable text (defined early for use below)
  function getPaymentTermsText(paymentTerms: string): string {
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

  // Use payment terms from contract (from booking) or fallback to payment instructions
  const paymentTermsFromContract = (contract as any).paymentTerms;
  const paymentInstructions = escapeHtml(
    paymentTermsFromContract
      ? getPaymentTermsText(paymentTermsFromContract)
      : (contract.paymentInstructions || contract.payment_instructions || '')
  );
  const equipmentRequirements = escapeHtml(contract.equipmentRequirements || contract.equipment_requirements || 'Standard performance setup as discussed');
  const specialRequirements = escapeHtml(contract.specialRequirements || contract.special_requirements || 'None specified');

  const businessName = escapeHtml(userSettings?.businessName || userSettings?.business_name || 'MusoBuddy');
  // Build complete business address from multiple fields
  const addressParts: string[] = [];
  if (userSettings?.addressLine1) addressParts.push(userSettings.addressLine1);
  if (userSettings?.addressLine2) addressParts.push(userSettings.addressLine2);
  if (userSettings?.city) addressParts.push(userSettings.city);
  if (userSettings?.county) addressParts.push(userSettings.county);
  if (userSettings?.postcode) addressParts.push(userSettings.postcode);
  
  const businessAddress = addressParts.length > 0 
    ? escapeHtml(addressParts.join(', '))
    : 'Address not provided';
  const businessEmail = escapeHtml(userSettings?.businessEmail || userSettings?.business_email || '');
  const businessPhone = escapeHtml(userSettings?.phone || 'Phone not provided');
  
  // Get theme color from settings, fallback to purple if not set
  console.log('🎨 [CONTRACT-SIGNING] UserSettings theme data:', {
    themeAccentColor: userSettings?.themeAccentColor,
    theme_accent_color: userSettings?.theme_accent_color
  });
  
  const themeColor = userSettings?.themeAccentColor || userSettings?.theme_accent_color || '#667eea';
  // Create a darker version for accents
  const themeDarkColor = userSettings?.themeAccentColor || userSettings?.theme_accent_color || '#764ba2';
  
  console.log('🎨 [CONTRACT-SIGNING] Using theme colors:', { themeColor, themeDarkColor });

  // Helper function to generate dynamic terms section using user's custom settings
  function generateUserTermsSection(): string {
    // Standard clauses mapping - same as contract PDF system
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
    
    // Get selected standard clauses
    const selectedClauses: string[] = [];
    if (userSettings?.contractClauses) {
      for (const [key, value] of Object.entries(userSettings.contractClauses)) {
        if (value && clauseMap[key as keyof typeof clauseMap]) {
          selectedClauses.push(clauseMap[key as keyof typeof clauseMap]);
        }
      }
    }
    
    // Add payment terms from contract's linked booking (Single Source of Truth) or fallback to settings
    // Settings have both contractClauses.paymentTerms and invoicePaymentTerms - they should be the same value
    const paymentTermsToUse = (contract as any).paymentTerms || (userSettings?.contractClauses as any)?.paymentTerms || userSettings?.invoicePaymentTerms;
    if (paymentTermsToUse) {
      const paymentTermsText = getPaymentTermsText(paymentTermsToUse);
      selectedClauses.push(paymentTermsText);
    }
    
    // Get custom clauses - handle new format with {text, enabled} objects
    const customClauses: string[] = [];
    if (userSettings?.customClauses && Array.isArray(userSettings.customClauses)) {
      userSettings.customClauses.forEach(clause => {
        // Handle new format: {text: string, enabled: boolean}
        if (typeof clause === 'object' && clause.text && clause.enabled) {
          customClauses.push(clause.text);
        }
        // Handle legacy format: string
        else if (typeof clause === 'string' && clause.trim()) {
          customClauses.push(clause);
        }
      });
    }
    
    const allClauses = [...selectedClauses, ...customClauses].filter(clause => clause && clause.trim());
    
    // If user has custom terms, use them; otherwise use default terms
    if (allClauses.length > 0) {
      // Group terms by category for better organization
      const paymentTerms: string[] = [];
      const performanceTerms: string[] = [];
      const cancellationTerms: string[] = [];
      const generalTerms: string[] = [];
      
      // Categorize each clause based on keywords
      allClauses.forEach(clause => {
        const lowerClause = clause.toLowerCase();
        if (lowerClause.includes('payment') || lowerClause.includes('deposit') || lowerClause.includes('fee') || 
            lowerClause.includes('£') || lowerClause.includes('charged') || lowerClause.includes('overtime')) {
          paymentTerms.push(clause);
        } else if (lowerClause.includes('cancellation') || lowerClause.includes('cancel') || 
                   lowerClause.includes('reschedul') || lowerClause.includes('refund')) {
          cancellationTerms.push(clause);
        } else if (lowerClause.includes('performance') || lowerClause.includes('equipment') || 
                   lowerClause.includes('venue') || lowerClause.includes('stage') || lowerClause.includes('setup') ||
                   lowerClause.includes('access') || lowerClause.includes('power') || lowerClause.includes('sound')) {
          performanceTerms.push(clause);
        } else {
          generalTerms.push(clause);
        }
      });
      
      let sectionsHtml = '';
      
      // Add Performance & Equipment section if there are terms
      if (performanceTerms.length > 0) {
        sectionsHtml += `
          <div class="terms-section">
            <div class="terms-subtitle">Performance & Equipment</div>
            <ul class="terms-list">
              ${performanceTerms.map(term => `<li>${escapeHtml(term)}</li>`).join('')}
            </ul>
          </div>`;
      }
      
      // Add Payment Terms section if there are terms
      if (paymentTerms.length > 0) {
        sectionsHtml += `
          <div class="terms-section">
            <div class="terms-subtitle">Payment Terms</div>
            <ul class="terms-list">
              ${paymentTerms.map(term => `<li>${escapeHtml(term)}</li>`).join('')}
            </ul>
          </div>`;
      }
      
      // Add Cancellation & Rescheduling section if there are terms
      if (cancellationTerms.length > 0) {
        sectionsHtml += `
          <div class="terms-section">
            <div class="terms-subtitle">Cancellation & Rescheduling</div>
            <ul class="terms-list">
              ${cancellationTerms.map(term => `<li>${escapeHtml(term)}</li>`).join('')}
            </ul>
          </div>`;
      }
      
      // Add General Terms section if there are terms
      if (generalTerms.length > 0) {
        sectionsHtml += `
          <div class="terms-section">
            <div class="terms-subtitle">General Terms</div>
            <ul class="terms-list">
              ${generalTerms.map(term => `<li>${escapeHtml(term)}</li>`).join('')}
            </ul>
          </div>`;
      }
      
      // If no categorization happened (shouldn't occur), fall back to simple list
      if (!sectionsHtml) {
        sectionsHtml = `
          <div class="terms-section">
            <ul class="terms-list">
              ${allClauses.map(clause => `<li>${escapeHtml(clause)}</li>`).join('')}
            </ul>
          </div>`;
      }
      
      return sectionsHtml;
    } else {
      // Fallback to default terms if no custom terms are configured
      return `
        <div class="terms-section">
          <div class="terms-subtitle">Professional Performance Standards</div>
          <ul class="terms-list">
            <li>Professional musical performance delivered to industry standards with appropriate attire</li>
            <li>Punctual arrival and setup at the agreed time with performance duration as specified</li>
            <li>The performer maintains professional liability insurance as required for musical performances</li>
            <li>Both parties agree to a 'Safe Space' principle providing a working environment free from harassment and discrimination</li>
            <li>The equipment and instruments of the performer are not available for use by any other person, except by specific permission</li>
            <li>All musical instruments and equipment remain the exclusive property of the performer</li>
            <li>The client shall ensure a safe supply of electricity and the security of the performer and their property at the venue</li>
            <li>The client shall not make or permit any audio/visual recording or transmission without prior written consent</li>
          </ul>
        </div>

        <div class="terms-section">
          <div class="terms-subtitle">Payment Terms & Conditions</div>
          <div class="requirements-box">
            <strong>Payment Due Date:</strong> Full payment of £${(parseFloat(fee) + parseFloat(travelExpenses)).toFixed(2)} ${formattedDueDate ? `is due on ${formattedDueDate}` : 'becomes due and payable no later than the day of performance'}. Payment must be received before or on the due date.<br><br>

            <strong>Payment Methods:</strong> Cash or bank transfer to the performer's designated account (details provided separately).<br><br>

            <strong>Deposit:</strong> £${deposit} deposit required to secure booking. Deposit is non-refundable except as outlined in the cancellation policy below.<br><br>

            <strong>Late Payment:</strong> Any payment received after the due date may incur additional charges as per agreed terms.
          </div>
        </div>

        <div class="terms-section">
          <div class="terms-subtitle">Cancellation & Refund Policy</div>
          <div class="requirements-box">
            <strong>Client Cancellation:</strong><br>
            • More than 30 days before event: Any deposit paid will be refunded minus a £50 administration fee<br>
            • 30 days or less before event: Full performance fee becomes due regardless of cancellation<br>
            • Same day cancellation: Full fee due plus any additional costs incurred<br><br>

            <strong>Performer Cancellation:</strong> In the unlikely event the performer must cancel due to circumstances within their control, all payments will be refunded in full and reasonable assistance will be provided to find a suitable replacement.<br><br>

            <strong>Rescheduling:</strong> Event may be rescheduled once without penalty if agreed by both parties at least 14 days in advance. Additional rescheduling requests may incur a £25 administrative fee.
          </div>
        </div>

        <div class="terms-section">
          <div class="terms-subtitle">Legal Framework</div>
          <ul class="terms-list">
            <li>This agreement may not be modified except by mutual consent, in writing signed by both parties</li>
            <li>Any rider attached and signed by both parties shall be deemed incorporated into this agreement</li>
            <li>Contract governed by the laws of England and Wales</li>
            <li>This contract constitutes the entire agreement between parties</li>
            <li>Both parties confirm they have authority to enter this agreement</li>
          </ul>
        </div>`;
    }
  }

  // Format dates safely
  const eventDate = new Date(contract.eventDate || contract.event_date);
  const eventDateFormatted = eventDate.toLocaleDateString('en-GB', {
    weekday: 'long',
    year: 'numeric', 
    month: 'long',
    day: 'numeric'
  });
  const todayFormatted = new Date().toLocaleDateString();

  // Build client info display
  const clientEmailDisplay = clientEmail ? `<strong>Email:</strong> ${clientEmail}<br>` : '';
  const clientAddressDisplay = (contract.clientAddress || contract.client_address)
    ? `<strong>Address:</strong> ${escapeHtml(contract.clientAddress || contract.client_address)}<br>`
    : '<div class="missing-field"><strong>Address:</strong> <em>To be provided</em></div>';
  const clientPhoneDisplay = (contract.clientPhone || contract.client_phone)
    ? `<strong>Phone:</strong> ${escapeHtml(contract.clientPhone || contract.client_phone)}`
    : '<div class="missing-field"><strong>Phone:</strong> <em>To be provided</em></div>';

  const venueAddressDisplay = escapeHtml(contract.venueAddress || contract.venue_address || '<em>To be provided</em>');

  // Escape values for JavaScript - use JSON.stringify for safety
  // This ensures proper escaping of all special characters
  const contractIdJs = JSON.stringify(contractId);
  const clientNameJs = JSON.stringify(contract.clientName || contract.client_name || '');
  
  // CRITICAL: Verify these are valid JSON strings
  if (!contractIdJs || contractIdJs === 'undefined') {
    throw new Error('Invalid contract ID for signing page');
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Contract Signing - ${contractNumber}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, ${themeColor} 0%, ${themeDarkColor} 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
            font-size: 16px;
        }
        .container {
            background: linear-gradient(145deg, #ffffff 0%, #f8f9fa 100%);
            border-radius: 20px;
            box-shadow: 0 25px 50px rgba(0,0,0,0.15), 0 10px 20px rgba(0,0,0,0.1);
            padding: 40px;
            width: 100%;
            max-width: 1000px;
            border: 1px solid #e9ecef;
        }
        .header {
            text-align: center;
            margin-bottom: 30px;
            padding-bottom: 20px;
            border-bottom: 2px solid #e9ecef;
        }
        .logo {
            width: 70px;
            height: 70px;
            background: linear-gradient(135deg, ${themeColor} 0%, ${themeDarkColor} 100%);
            border-radius: 50%;
            margin: 0 auto 20px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-weight: bold;
            font-size: 28px;
            box-shadow: 0 8px 16px rgba(102, 126, 234, 0.3);
        }
        .header h1 { color: #333; font-size: 24px; margin-bottom: 8px; }

        .failure-notice {
            background: #ffebee;
            color: #c62828;
            padding: 16px;
            border-radius: 8px;
            margin-bottom: 24px;
            border: 1px solid #ef5350;
            text-align: center;
            font-weight: 500;
        }

        .contract-details {
            background: #f8f9fa;
            padding: 20px;
            border-radius: 12px;
            margin-bottom: 24px;
            border: 1px solid #e9ecef;
        }
        .contract-details h2 {
            color: #495057;
            margin-bottom: 16px;
            font-size: 18px;
            text-align: center;
        }
        .detail-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 12px 20px;
        }
        .detail-row {
            display: flex;
            flex-direction: column;
        }
        .detail-label {
            font-weight: 600;
            color: #6c757d;
            font-size: 12px;
            text-transform: uppercase;
            margin-bottom: 4px;
        }
        .detail-value {
            color: #212529;
            font-size: 16px;
        }

        .contract-viewer {
            background: white;
            border: 2px solid #e9ecef;
            border-radius: 8px;
            margin: 24px 0;
            position: relative;
            overflow: hidden;
        }
        .contract-content {
            width: 100%;
            min-height: 600px;
            background: white;
            box-shadow: 0 0 20px rgba(0,0,0,0.1);
            border-radius: 12px;
            overflow: hidden;
            font-family: 'Arial', sans-serif;
            line-height: 1.6;
            color: #333;
            font-size: 16px;
        }

        .contract-header {
            background: linear-gradient(135deg, ${themeColor} 0%, ${themeDarkColor} 100%);
            color: white;
            padding: 40px;
            text-align: center;
        }
        .logo-section {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 25px;
            margin-bottom: 30px;
        }
        .metronome-container {
            width: 80px;
            height: 80px;
            background: rgba(255, 255, 255, 0.15);
            border-radius: 18px;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
        }
        .metronome-body {
            width: 24px;
            height: 38px;
            background: white;
            clip-path: polygon(25% 0%, 75% 0%, 100% 100%, 0% 100%);
            position: relative;
        }
        .company-name {
            font-size: 42px;
            font-weight: 700;
            color: white;
            line-height: 1;
            margin-bottom: 8px;
        }
        .tagline {
            font-size: 18px;
            color: rgba(255, 255, 255, 0.9);
            font-style: italic;
        }
        .contract-title {
            font-size: 32px;
            font-weight: 800;
            margin: 25px 0 15px 0;
        }
        .contract-number {
            font-size: 16px;
            opacity: 0.9;
        }

        .contract-body {
            padding: 40px;
        }
        .section {
            margin-bottom: 35px;
        }
        .section-title {
            font-size: 24px;
            font-weight: 700;
            color: ${themeColor};
            margin-bottom: 25px;
            padding-bottom: 10px;
            border-bottom: 3px solid ${themeColor};
        }
        .parties-section {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 30px;
            margin-bottom: 25px;
        }
        .party-box {
            background: linear-gradient(135deg, #f8f9ff 0%, #e3e7ff 100%);
            padding: 25px;
            border-radius: 12px;
            border-left: 4px solid ${themeColor};
            border: 1px solid #e2e8f0;
        }
        .party-title {
            font-size: 18px;
            font-weight: 700;
            color: ${themeColor};
            margin-bottom: 15px;
        }
        .party-details {
            font-size: 17px;
            line-height: 1.6;
            color: #4a5568;
        }
        .party-details strong {
            color: #2d3748;
            font-weight: 700;
        }
        .details-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
            margin-bottom: 20px;
        }
        .detail-item {
            display: flex;
            justify-content: space-between;
            padding: 15px;
            background: #f8f9fa;
            border-radius: 8px;
            border-left: 3px solid ${themeColor};
        }
        .financial-summary {
            background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
            padding: 25px;
            border-radius: 12px;
            margin-bottom: 20px;
            border: 1px solid #0284c7;
        }
        .fee-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 15px;
            padding-bottom: 15px;
            border-bottom: 1px solid #bae6fd;
        }
        .fee-item:last-child {
            margin-bottom: 0;
            padding-bottom: 0;
            border-bottom: none;
        }
        .fee-label {
            font-size: 17px;
            font-weight: 600;
            color: #0c4a6e;
        }
        .fee-amount {
            font-size: 18px;
            font-weight: 700;
            color: #0284c7;
        }
        .payment-terms {
            background: #f8f9fa;
            padding: 20px;
            border-radius: 8px;
            border-left: 4px solid #6c757d;
            font-size: 16px;
            line-height: 1.6;
        }
        .requirements-content, .terms-content {
            font-size: 17px;
            line-height: 1.7;
        }
        .requirements-content p, .terms-content p {
            margin-bottom: 15px;
        }
        .missing-field {
            color: #dc3545;
            font-style: italic;
        }
        .terms-section {
            margin-bottom: 25px;
        }
        .terms-subtitle {
            font-weight: bold;
            color: #1e293b;
            margin-bottom: 10px;
            font-size: 16px;
        }
        .terms-list {
            margin: 0 0 15px 20px;
            padding: 0;
        }
        .terms-list li {
            margin-bottom: 8px;
            line-height: 1.4;
            font-size: 16px;
        }
        .requirements-box {
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 6px;
            padding: 15px;
            margin: 10px 0;
            line-height: 1.5;
            font-size: 16px;
        }

        .signature-section {
            margin-top: 24px;
        }
        .signature-form {
            background: #f8fff4;
            border: 2px solid #28a745;
            border-radius: 12px;
            padding: 24px;
        }
        .form-group {
            margin-bottom: 16px;
        }
        .form-group label {
            display: block;
            font-weight: 600;
            margin-bottom: 6px;
            color: #495057;
        }
        .form-group input {
            width: 100%;
            padding: 12px 16px;
            border: 2px solid #e2e8f0;
            border-radius: 8px;
            font-size: 16px;
            transition: border-color 0.2s;
        }
        input:focus {
            outline: none;
            border-color: ${themeColor};
            box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
        }
        .checkbox-group {
            display: flex;
            align-items: center;
            gap: 12px;
            margin: 16px 0;
        }
        .checkbox-group input[type="checkbox"] {
            width: 18px;
            height: 18px;
        }

        .sign-button {
            background: linear-gradient(135deg, ${themeColor}, ${themeDarkColor});
            color: white;
            padding: 16px 32px;
            border: none;
            border-radius: 8px;
            font-size: 18px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s ease;
            width: 100%;
            margin-top: 16px;
            box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
        }
        .sign-button:hover:not(:disabled) {
            background: linear-gradient(135deg, ${themeDarkColor}, ${themeDarkColor});
            transform: translateY(-2px);
            box-shadow: 0 8px 25px rgba(59, 130, 246, 0.4);
        }
        .sign-button:disabled {
            opacity: 0.6;
            cursor: not-allowed;
            transform: none;
        }

        .success-message, .error-message {
            padding: 20px;
            border-radius: 8px;
            margin-bottom: 20px;
            text-align: center;
            display: none;
        }
        .success-message {
            background: #f0fff4;
            color: #22543d;
            border: 2px solid #9ae6b4;
        }
        .error-message {
            background: #fed7d7;
            color: #742a2a;
            border: 2px solid #fc8181;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">MB</div>
            <h1>Contract Signing</h1>
            <p style="color: #666; margin-top: 8px;">Please review and sign the contract below</p>
        </div>

        <div id="success-message" class="success-message">
            <h3>Contract Signed Successfully!</h3>
            <p>Thank you for signing the contract. You will receive a copy via email shortly.</p>
        </div>

        <div id="error-message" class="error-message">
            <h3>Signing Failed</h3>
            <p id="error-text">Please try again or contact support if the problem persists.</p>
        </div>

        ${contract.status === 'signed' ? `
            <div class="failure-notice">
                <h3>Contract Already Signed</h3>
                <p>This contract has already been signed and cannot be signed again.</p>
            </div>
        ` : ''}

        <div class="contract-details">
            <h2>Contract Details</h2>
            <div class="detail-grid">
                <div class="detail-row">
                    <span class="detail-label">Contract Number</span>
                    <span class="detail-value">${contractNumber}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Client</span>
                    <span class="detail-value">${clientName}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Event Date</span>
                    <span class="detail-value">${eventDateFormatted}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Venue</span>
                    <span class="detail-value">${venue}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Event Time</span>
                    <span class="detail-value">${eventTime}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Fee</span>
                    <span class="detail-value">£${fee}</span>
                </div>
            </div>
        </div>

        <div class="contract-viewer">
            <div class="contract-content">
                <div class="contract-header">
                    <div class="logo-section">
                        <div class="metronome-container">
                            <div class="metronome-body"></div>
                        </div>
                        <div>
                            <div class="company-name">${businessName}</div>
                            <div class="tagline">Professional Music Services</div>
                        </div>
                    </div>
                    <div class="contract-title">Performance Contract</div>
                    <div class="contract-number">Contract No. ${contractNumber}</div>
                </div>

                <div class="contract-body">
                    <div class="section">
                        <div class="section-title">Parties to this Agreement</div>
                        <div class="parties-section">
                            <div class="party-box">
                                <div class="party-title">Performer</div>
                                <div class="party-details">
                                    <strong>${businessName}</strong><br>
                                    <strong>Address:</strong> ${businessAddress}<br>
                                    ${businessEmail ? '<strong>Email:</strong> ' + businessEmail + '<br>' : ''}
                                    <strong>Phone:</strong> ${businessPhone}
                                </div>
                            </div>
                            <div class="party-box">
                                <div class="party-title">Client</div>
                                <div class="party-details">
                                    <strong>${clientName}</strong><br>
                                    ${clientEmailDisplay}
                                    ${clientAddressDisplay}
                                    ${clientPhoneDisplay}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="section">
                        <div class="section-title">Event Details</div>
                        <div class="details-grid">
                            <div class="detail-item">
                                <span class="detail-label">Event Date:</span>
                                <span class="detail-value">${eventDateFormatted}</span>
                            </div>
                            <div class="detail-item">
                                <span class="detail-label">Event Time:</span>
                                <span class="detail-value">${eventTime}</span>
                            </div>
                            <div class="detail-item">
                                <span class="detail-label">Venue:</span>
                                <span class="detail-value">${venue}</span>
                            </div>
                            <div class="detail-item">
                                <span class="detail-label">Venue Address:</span>
                                <span class="detail-value">${venueAddressDisplay}</span>
                            </div>
                        </div>
                    </div>

                    <div class="section">
                        <div class="section-title">Financial Terms</div>
                        <div class="financial-summary">
                            <div class="fee-item">
                                <span class="fee-label">Total Performance Fee:</span>
                                <span class="fee-amount">£${(parseFloat(fee) + parseFloat(travelExpenses)).toFixed(2)}</span>
                            </div>
                            <div class="fee-item">
                                <span class="fee-label">Deposit Required:</span>
                                <span class="fee-amount">£${deposit}</span>
                            </div>
                        </div>
                        <div class="payment-terms">
                            <strong>Payment Instructions:</strong><br>
                            ${paymentInstructions}
                        </div>
                    </div>

                    <div class="section">
                        <div class="section-title">Technical Requirements</div>
                        <div class="requirements-content">
                            <p><strong>Equipment Requirements:</strong><br>
                            ${equipmentRequirements}</p>

                            <p><strong>Special Requirements:</strong><br>
                            ${specialRequirements}</p>
                        </div>
                    </div>

                    <div class="section">
                        <div class="section-title">Terms & Conditions</div>
                        ${generateUserTermsSection()}
                    </div>
                </div>
            </div>
        </div>

        ${contract.status !== 'signed' ? `
            <div class="signature-section">
                <div class="signature-form">
                    <form id="signatureForm">
                        <div class="form-group">
                            <label for="clientName">Client Name</label>
                            <input type="text" id="clientName" value="${clientName}" readonly style="background: #f8f9fa;">
                        </div>

                        <div class="form-group">
                            <label for="emailAddress">Email Address</label>
                            <input type="email" id="emailAddress" value="${clientEmail}" placeholder="Enter your email address">
                        </div>

                        ${(!contract.clientPhone || contract.clientPhone === 'To be provided') ? `
                            <div class="form-group" style="border: 2px solid #dc3545; padding: 10px; border-radius: 8px; background: #ffebee;">
                                <label for="clientPhone" style="color: #dc3545; font-weight: bold;">Phone Number <span style="color: red;">* Required</span></label>
                                <input type="tel" id="clientPhone" placeholder="07123 456789" required>
                                <small style="color: #dc3545;">This field is required to sign the contract</small>
                            </div>
                        ` : `
                            <input type="hidden" id="clientPhone" value="${escapeHtml(contract.clientPhone || '')}">
                        `}

                        ${(!contract.clientAddress || contract.clientAddress === 'To be provided') ? `
                            <div class="form-group" style="border: 2px solid #dc3545; padding: 10px; border-radius: 8px; background: #ffebee;">
                                <label for="clientAddress" style="color: #dc3545; font-weight: bold;">Address <span style="color: red;">* Required</span></label>
                                <input type="text" id="clientAddress" placeholder="123 Main Street, London, SW1A 1AA" required>
                                <small style="color: #dc3545;">This field is required to sign the contract</small>
                            </div>
                        ` : `
                            <input type="hidden" id="clientAddress" value="${escapeHtml(contract.clientAddress || '')}">
                        `}

                        <div class="form-group">
                            <label for="signatureDate">Signature Date</label>
                            <input type="text" id="signatureDate" value="${todayFormatted}" readonly style="background: #f8f9fa;">
                        </div>

                        <div class="checkbox-group">
                            <input type="checkbox" id="agreeTerms" required>
                            <label for="agreeTerms" style="margin: 0;">I agree to the terms and conditions outlined in this contract</label>
                        </div>

                        <button type="submit" class="sign-button" id="signButton">Sign Contract</button>
                    </form>
                </div>
            </div>
        ` : ''}
    </div>

    <script>
        (function() {
            'use strict';

            // Contract ID for API calls - properly escaped
            var CONTRACT_ID = ${contractIdJs};

            document.addEventListener('DOMContentLoaded', function() {
                var signatureForm = document.getElementById('signatureForm');

                if (signatureForm) {
                    signatureForm.addEventListener('submit', function(e) {
                        e.preventDefault();

                        var signButton = document.getElementById('signButton');
                        var successMessage = document.getElementById('success-message');
                        var errorMessage = document.getElementById('error-message');
                        var errorText = document.getElementById('error-text');

                        var emailAddress = document.getElementById('emailAddress').value;
                        var agreeTerms = document.getElementById('agreeTerms').checked;
                        var clientPhone = document.getElementById('clientPhone') ? document.getElementById('clientPhone').value : null;
                        var clientAddress = document.getElementById('clientAddress') ? document.getElementById('clientAddress').value : null;

                        if (!agreeTerms) {
                            errorText.textContent = 'Please agree to the terms and conditions';
                            errorMessage.style.display = 'block';
                            return;
                        }

                        if (!emailAddress || emailAddress.indexOf('@') === -1) {
                            errorText.textContent = 'Please enter a valid email address';
                            errorMessage.style.display = 'block';
                            return;
                        }

                        // Validate required phone field
                        if (clientPhone !== null && (!clientPhone || clientPhone.trim() === '')) {
                            errorText.textContent = 'Phone number is required to sign the contract';
                            errorMessage.style.display = 'block';
                            return;
                        }

                        // Validate required address field
                        if (clientAddress !== null && (!clientAddress || clientAddress.trim() === '')) {
                            errorText.textContent = 'Address is required to sign the contract';
                            errorMessage.style.display = 'block';
                            return;
                        }

                        successMessage.style.display = 'none';
                        errorMessage.style.display = 'none';

                        signButton.disabled = true;
                        signButton.textContent = 'Signing Contract...';

                        var requestData = {
                            clientSignature: ${clientNameJs},
                            clientEmail: emailAddress,
                            clientIP: '0.0.0.0',
                            clientPhone: clientPhone,
                            clientAddress: clientAddress,
                            signedAt: new Date().toISOString()
                        };

                        var API_BASE = ${JSON.stringify(process.env.NODE_ENV === 'production' ? 'https://musobuddy.replit.app' : 'https://f19aba74-886b-4308-a2de-cc9ba5e94af8-00-2ux7uy3ch9t9f.janeway.replit.dev')};
                        fetch(API_BASE + '/api/contracts/sign/' + CONTRACT_ID, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify(requestData)
                        })
                        .then(function(response) {
                            if (!response.ok) {
                                throw new Error('Server error: ' + response.status);
                            }
                            return response.json();
                        })
                        .then(function(result) {
                            if (result.success) {
                                successMessage.style.display = 'block';
                                signatureForm.style.display = 'none';
                                successMessage.scrollIntoView({ behavior: 'smooth' });
                            } else {
                                throw new Error(result.message || result.error || 'Signing failed');
                            }
                        })
                        .catch(function(error) {
                            console.error('Signing error:', error);
                            errorText.textContent = error.message || 'Error occurred while signing the contract';
                            errorMessage.style.display = 'block';

                            signButton.disabled = false;
                            signButton.textContent = 'Sign Contract';
                        });
                    });
                }
            });
        })();
    </script>
</body>
</html>`;
}