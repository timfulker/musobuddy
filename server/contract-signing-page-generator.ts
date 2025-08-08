import type { Contract, UserSettings } from '@shared/schema';

// Define proper interfaces for type safety
interface ContractData {
  id: number;
  contractNumber?: string;
  contract_number?: string;
  clientName?: string;
  client_name?: string;
  clientEmail?: string;
  client_email?: string;
  clientPhone?: string;
  client_phone?: string;
  clientAddress?: string;
  client_address?: string;
  venue?: string;
  venueAddress?: string;
  venue_address?: string;
  eventDate?: string;
  event_date?: string;
  eventTime?: string;
  event_time?: string;
  eventEndTime?: string;
  fee?: number;
  total_fee?: number;
  deposit?: number;
  paymentInstructions?: string;
  payment_instructions?: string;
  equipmentRequirements?: string;
  equipment_requirements?: string;
  specialRequirements?: string;
  special_requirements?: string;
  status?: string;
  createdAt?: string;
  template?: string;
  setlist?: string;
  riderNotes?: string;
  additionalInfo?: string;
  additionalTerms?: string;
  cancellationPolicy?: string;
  cloudStorageUrl?: string;
}

interface UserSettingsData {
  businessName?: string;
  business_name?: string;
  businessAddress?: string;
  business_address?: string;
  businessEmail?: string;
  business_email?: string;
  phone?: string;
}

export function generateContractSigningPage(
  contract: Contract | ContractData, 
  userSettings: UserSettings | UserSettingsData | null
): string {
  // Helper function to escape HTML to prevent XSS
  function escapeHtml(unsafe: string | number | null | undefined): string {
    if (unsafe === null || unsafe === undefined) return '';
    const str = String(unsafe);
    return str
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
  const contractNumber = escapeHtml(contract.contractNumber || (contract as any).contract_number || `Contract-${contract.id}`);
  const clientName = escapeHtml(contract.clientName || (contract as any).client_name || '');
  const clientEmail = escapeHtml(contract.clientEmail || (contract as any).client_email || '');
  const venue = escapeHtml(contract.venue || 'TBD');
  const eventTime = escapeHtml(contract.eventTime || (contract as any).event_time || 'TBD');
  const fee = escapeHtml((contract.fee || (contract as any).total_fee)?.toString() || '0');
  const deposit = escapeHtml(contract.deposit?.toString() || '0.00');
  const paymentInstructions = escapeHtml(contract.paymentInstructions || (contract as any).payment_instructions || 'Payment due on completion of performance');
  const equipmentRequirements = escapeHtml(contract.equipmentRequirements || (contract as any).equipment_requirements || 'Standard performance setup as discussed');
  const specialRequirements = escapeHtml(contract.specialRequirements || (contract as any).special_requirements || 'None specified');

  const businessName = escapeHtml(userSettings?.businessName || (userSettings as any)?.business_name || 'MusoBuddy');
  const businessAddress = escapeHtml(userSettings?.businessAddress || (userSettings as any)?.business_address || 'Address not provided');
  const businessEmail = escapeHtml(userSettings?.businessEmail || (userSettings as any)?.business_email || '');
  const businessPhone = escapeHtml(userSettings?.phone || 'Phone not provided');

  // Format dates safely
  const eventDateStr = contract.eventDate || (contract as any).event_date;
  const eventDate = eventDateStr ? new Date(eventDateStr) : new Date();
  const eventDateFormatted = eventDate.toLocaleDateString('en-GB', {
    weekday: 'long',
    year: 'numeric', 
    month: 'long',
    day: 'numeric'
  });
  const todayFormatted = new Date().toLocaleDateString();

  // Build client info display
  const clientEmailDisplay = clientEmail ? `<strong>Email:</strong> ${clientEmail}<br>` : '';
  const clientAddressDisplay = (contract.clientAddress || (contract as any).client_address)
    ? `<strong>Address:</strong> ${escapeHtml(contract.clientAddress || (contract as any).client_address)}<br>`
    : '<div class="missing-field"><strong>Address:</strong> <em>To be provided</em></div>';
  const clientPhoneDisplay = (contract.clientPhone || (contract as any).client_phone)
    ? `<strong>Phone:</strong> ${escapeHtml(contract.clientPhone || (contract as any).client_phone)}`
    : '<div class="missing-field"><strong>Phone:</strong> <em>To be provided</em></div>';

  const venueAddressDisplay = escapeHtml(contract.venueAddress || (contract as any).venue_address || '<em>To be provided</em>');

  // Escape values for JavaScript - use JSON.stringify for safety
  const contractIdJs = JSON.stringify(contractId);
  const clientNameJs = JSON.stringify(contract.clientName || (contract as any).client_name || '');
  
  // CRITICAL: Verify these are valid JSON strings
  if (!contractIdJs || contractIdJs === 'undefined') {
    throw new Error('Invalid contract ID for signing page');
  }

  const contractStatus = contract.status || 'draft';

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
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
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
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
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
    .sign-button {
      background: linear-gradient(135deg, #3b82f6, #1d4ed8);
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
      background: linear-gradient(135deg, #1d4ed8, #1e40af);
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

      ${contractStatus !== 'signed' ? `
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

            <div class="form-group">
              <label for="signatureDate">Signature Date</label>
              <input type="text" id="signatureDate" value="${todayFormatted}" readonly style="background: #f8f9fa;">
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

            if (!emailAddress || emailAddress.indexOf('@') === -1) {
              if (errorText) errorText.textContent = 'Please enter a valid email address';
              if (errorMessage) errorMessage.style.display = 'block';
              return;
            }

            if (successMessage) successMessage.style.display = 'none';
            if (errorMessage) errorMessage.style.display = 'none';

            if (signButton) {
              signButton.disabled = true;
              signButton.textContent = 'Signing Contract...';
            }

            var requestData = {
              clientSignature: ${clientNameJs},
              clientEmail: emailAddress,
              clientIP: '0.0.0.0',
              signedAt: new Date().toISOString()
            };

            fetch('/api/contracts/sign/' + CONTRACT_ID, {
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
                if (successMessage) successMessage.style.display = 'block';
                if (signatureForm) signatureForm.style.display = 'none';
                if (successMessage) successMessage.scrollIntoView({ behavior: 'smooth' });
              } else {
                throw new Error(result.message || result.error || 'Signing failed');
              }
            })
            .catch(function(error) {
              console.error('Contract signing error:', error);
              if (errorText) errorText.textContent = error.message || 'Signing failed. Please try again.';
              if (errorMessage) errorMessage.style.display = 'block';
            })
            .finally(function() {
              if (signButton) {
                signButton.disabled = false;
                signButton.textContent = 'Sign Contract';
              }
            });
          });
        }
      });
    })();
    </script>
</body>
</html>`;
}