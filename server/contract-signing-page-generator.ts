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

  // Safely process all data server-side
  const contractId = contract.id.toString();
  const contractNumber = escapeHtml(contract.contractNumber);
  const clientName = escapeHtml(contract.clientName);
  const clientEmail = escapeHtml(contract.clientEmail || '');
  const venue = escapeHtml(contract.venue || 'TBD');
  const eventTime = escapeHtml(contract.eventTime || 'TBD');
  const fee = escapeHtml(contract.fee?.toString() || '0');
  const deposit = escapeHtml(contract.deposit?.toString() || '0.00');
  const paymentInstructions = escapeHtml(contract.paymentInstructions || 'Payment due on completion of performance');
  const equipmentRequirements = escapeHtml(contract.equipmentRequirements || 'Standard performance setup as discussed');
  const specialRequirements = escapeHtml(contract.specialRequirements || 'None specified');

  const businessName = escapeHtml(userSettings?.businessName || 'MusoBuddy');
  const businessAddress = escapeHtml(userSettings?.businessAddress || 'Address not provided');
  const businessEmail = escapeHtml(userSettings?.businessEmail || '');
  const businessPhone = escapeHtml(userSettings?.phone || 'Phone not provided');

  // Format dates safely
  const eventDate = new Date(contract.eventDate);
  const eventDateFormatted = eventDate.toLocaleDateString('en-GB', {
    weekday: 'long',
    year: 'numeric', 
    month: 'long',
    day: 'numeric'
  });
  const todayFormatted = new Date().toLocaleDateString();

  // Build client info display
  const clientEmailDisplay = clientEmail ? `<strong>Email:</strong> ${clientEmail}<br>` : '';
  const clientAddressDisplay = contract.clientAddress 
    ? `<strong>Address:</strong> ${escapeHtml(contract.clientAddress)}<br>`
    : '<div class="missing-field"><strong>Address:</strong> <em>To be provided</em></div>';
  const clientPhoneDisplay = contract.clientPhone 
    ? `<strong>Phone:</strong> ${escapeHtml(contract.clientPhone)}`
    : '<div class="missing-field"><strong>Phone:</strong> <em>To be provided</em></div>';

  const venueAddressDisplay = contract.venueAddress ? escapeHtml(contract.venueAddress) : '<em>To be provided</em>';

  // Escape values for JavaScript - use JSON.stringify for safety
  const contractIdJs = JSON.stringify(contractId);
  const clientNameJs = JSON.stringify(contract.clientName || '');

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
            background: linear-gradient(135deg, #191970 0%, #1e3a8a 100%);
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
            color: #191970;
            margin-bottom: 25px;
            padding-bottom: 10px;
            border-bottom: 3px solid #1e3a8a;
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
            border-left: 4px solid #1e3a8a;
            border: 1px solid #e2e8f0;
        }
        .party-title {
            font-size: 18px;
            font-weight: 700;
            color: #191970;
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
            border-left: 3px solid #1e3a8a;
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
            border-color: #667eea;
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
                                <div class="party-title">Service Provider</div>
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
                                <span class="fee-amount">£${fee}</span>
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
                                <strong>Payment Due Date:</strong> Full payment of £${fee} becomes due and payable no later than the day of performance. Payment must be received before or immediately upon completion of the performance.<br><br>

                                <strong>Payment Methods:</strong> Cash or bank transfer to the performer's designated account (details provided separately).<br><br>

                                <strong>Deposit:</strong> £${deposit} deposit required to secure booking. Deposit is non-refundable except as outlined in the cancellation policy below.<br><br>

                                <strong>Late Payment:</strong> Any payment received after the due date may incur a late payment fee of £25 plus interest at 2% per month.
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
                        </div>
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

                        successMessage.style.display = 'none';
                        errorMessage.style.display = 'none';

                        signButton.disabled = true;
                        signButton.textContent = 'Signing Contract...';

                        var requestData = {
                            clientSignature: ${clientNameJs},
                            clientEmail: emailAddress,
                            clientIP: '0.0.0.0',
                            signedAt: new Date().toISOString()
                        };

                        fetch('https://f19aba74-886b-4308-a2de-cc9ba5e94af8-00-2ux7uy3ch9t9f.janeway.replit.dev/api/contracts/sign/' + CONTRACT_ID, {
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