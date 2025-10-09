/**
 * Contract Email HTML Template Generator
 * Extracted from services.ts for use with email provider abstraction
 */

export function generateContractEmailHTML(
  contract: any,
  userSettings: any,
  contractUrl: string,
  customMessage?: string
): string {
  // Get theme color from settings
  const themeColor = userSettings?.themeAccentColor || userSettings?.theme_accent_color || '#1e3a8a';

  // Calculate total fee including travel expenses
  const baseFee = parseFloat(contract.fee || '0');
  const travelExpenses = parseFloat(contract.travelExpenses || contract.travel_expenses || '0');
  const totalFee = baseFee + travelExpenses;

  console.log('📧 Email fee calculation:', {
    baseFee,
    travelExpenses,
    totalFee,
    contractFields: Object.keys(contract)
  });

  return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Contract Ready for Signing</title>
    <style>
        /* Email-safe CSS - minimal and compatible */
        body {
          font-family: Arial, sans-serif;
          line-height: 1.6;
          margin: 0;
          padding: 20px;
          background-color: #f8f9fa;
          color: #333333;
        }
        .email-container {
          max-width: 600px;
          margin: 0 auto;
          background: white;
          border-radius: 8px;
          overflow: hidden;
          box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .email-header {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 20px;
          text-align: center;
        }
        .email-content {
          padding: 30px;
          background: white;
        }
        .event-details {
          background: #f8f9fa;
          padding: 20px;
          border-radius: 8px;
          margin: 20px 0;
        }
        .cta-button {
          display: inline-block;
          background: ${themeColor};
          color: white;
          padding: 15px 30px;
          text-decoration: none;
          border-radius: 5px;
          font-weight: bold;
          margin: 20px 0;
        }
        .cta-section {
          text-align: center;
          margin: 30px 0;
        }
        .signature {
          margin-top: 30px;
          padding-top: 20px;
          border-top: 1px solid #e9ecef;
          color: #6c757d;
          font-size: 14px;
        }
        h1, h2, h3 { margin: 0 0 16px 0; }
        p { margin: 0 0 16px 0; line-height: 1.6; }
        .footer {
          background: #f8f9fa;
          padding: 20px;
          text-align: center;
          font-size: 12px;
          color: #6c757d;
        }
    </style>
</head>
<body>
    <div class="email-container">
        <div class="email-header">
            <h1 style="margin: 0; font-size: 24px; font-weight: 300;">Contract Ready for Signing</h1>
        </div>
        <div class="email-content">
            <p>Dear ${contract.clientName},</p>

            ${customMessage ? `<p>${customMessage}</p>` : ''}

            <p>Your contract for the event on ${new Date(contract.eventDate).toLocaleDateString('en-GB')} is ready for signing.</p>

            <div class="event-details">
              <h3 style="margin-top: 0;">Event Details:</h3>
              <p><strong>Date:</strong> ${new Date(contract.eventDate).toLocaleDateString('en-GB')}</p>
              <p><strong>Time:</strong> ${contract.eventTime} - ${contract.eventEndTime}</p>
              <p><strong>Venue:</strong> ${contract.venue}</p>
              <p><strong>Fee:</strong> £${totalFee.toFixed(2)}</p>
            </div>

            <div class="cta-section">
              <a href="${contractUrl}" class="cta-button">
                View & Sign Contract
              </a>
            </div>

            <p>Please review and sign the contract at your earliest convenience.</p>

            <div class="signature">
                <p><strong>${userSettings?.businessName || 'MusoBuddy'}</strong><br>
                Professional Music Services<br>
                ${userSettings?.businessContactEmail || ''}</p>
            </div>
        </div>
        <div class="footer">
            <p>This email was sent via MusoBuddy Professional Music Management Platform</p>
        </div>
    </div>
</body>
</html>
  `;
}
