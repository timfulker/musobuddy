// SONNET-GENERATED: Beautiful Professional Contract Template
import type { Contract, UserSettings } from '../shared/schema';

export function generateSonnetContractHTML(
  contract: Contract,
  userSettings: UserSettings | null,
  signatureDetails?: {
    signedAt: Date;
    signatureName?: string;
    clientIpAddress?: string;
  }
): string {
  
  // Process contract data
  const businessName = userSettings?.businessName || 'MusoBuddy Professional Services';
  const eventDate = contract.eventDate ? new Date(contract.eventDate) : null;
  const eventDateStr = eventDate ? eventDate.toLocaleDateString('en-GB', {
    weekday: 'long',
    year: 'numeric', 
    month: 'long',
    day: 'numeric'
  }) : 'Date TBC';

  // Calculate totals
  const fee = parseFloat(contract.fee || '0');
  const travelExpenses = parseFloat(contract.travelExpenses || '0');
  const totalAmount = fee + travelExpenses;
  const depositAmount = parseFloat(contract.deposit || '0');
  const balanceAmount = totalAmount - depositAmount;

  // Format address
  const formatAddress = (userSettings: UserSettings | null): string => {
    if (!userSettings) return 'Address not provided';
    const parts = [];
    if (userSettings.addressLine1) parts.push(userSettings.addressLine1);
    if (userSettings.addressLine2) parts.push(userSettings.addressLine2);
    if (userSettings.city) parts.push(userSettings.city);
    if (userSettings.county) parts.push(userSettings.county);
    if (userSettings.postcode) parts.push(userSettings.postcode);
    return parts.join(', ') || 'Address not provided';
  };

  const businessAddress = formatAddress(userSettings);
  const themeColor = userSettings?.themeAccentColor || '#8b5cf6';
  
  // Status and signatures
  const isSigned = contract.status === 'signed' || signatureDetails;
  const signedAt = signatureDetails?.signedAt || (contract.signedAt ? new Date(contract.signedAt) : null);
  const signatureName = signatureDetails?.signatureName || contract.clientSignature || 'Digital Signature';

  return \`<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Performance Contract</title>
    <style>
        :root {
            --primary: \${themeColor};
            --primary-light: #c4b5fd;
            --gray: #64748b;
            --light-gray: #f1f5f9;
        }
        
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
            font-family: 'Segoe UI', system-ui, sans-serif;
        }

        body {
            background: #fff;
            color: #1e293b;
            line-height: 1.6;
            padding: 2rem;
            max-width: 1100px;
            margin: 0 auto;
        }

        .contract-header {
            text-align: center;
            margin-bottom: 3rem;
            padding-bottom: 2rem;
            border-bottom: 1px solid var(--primary-light);
        }

        .logo {
            color: var(--primary);
            font-size: 2.5rem;
            font-weight: 700;
            margin-bottom: 0.5rem;
        }

        .tagline {
            color: var(--gray);
            font-size: 1rem;
        }

        .contract-status {
            position: absolute;
            top: 2rem;
            right: 2rem;
            background: var(--primary);
            color: white;
            padding: 0.5rem 1rem;
            border-radius: 4px;
            font-weight: 600;
        }

        .contract-number {
            color: var(--gray);
            font-size: 0.9rem;
            margin-top: 1rem;
        }

        .section {
            margin-bottom: 2rem;
            padding: 1.5rem;
            background: var(--light-gray);
            border-radius: 8px;
        }

        .section-title {
            color: var(--primary);
            font-size: 1.2rem;
            font-weight: 600;
            margin-bottom: 1rem;
            display: flex;
            align-items: center;
            gap: 0.5rem;
        }

        .grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 1.5rem;
        }

        .detail-group {
            margin-bottom: 1rem;
        }

        .detail-label {
            font-weight: 600;
            color: var(--gray);
            font-size: 0.9rem;
        }

        .detail-value {
            font-size: 1rem;
        }

        .terms {
            margin-top: 2rem;
        }

        .terms ul {
            list-style-type: none;
            padding-left: 1rem;
        }

        .terms li {
            margin-bottom: 0.5rem;
            position: relative;
        }

        .terms li::before {
            content: "•";
            color: var(--primary);
            position: absolute;
            left: -1rem;
        }

        .signatures {
            margin-top: 3rem;
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 2rem;
        }

        .signature-box {
            border-top: 1px solid var(--gray);
            padding-top: 1rem;
            text-align: center;
        }

        .signature-label {
            color: var(--gray);
            font-size: 0.9rem;
            margin-bottom: 2rem;
        }

        .signed-status {
            color: var(--primary);
            font-weight: 600;
            margin-top: 1rem;
        }

        .financial {
            background: white;
            border: 2px solid var(--primary-light);
        }

        .amount {
            font-size: 1.2rem;
            font-weight: 600;
            color: var(--primary);
        }

        @media print {
            body {
                padding: 0;
            }
            
            .section {
                break-inside: avoid;
                page-break-inside: avoid;
            }
            
            .section-title {
                break-after: avoid;
                page-break-after: avoid;
            }
            
            .detail-group {
                break-inside: avoid;
                page-break-inside: avoid;
            }
            
            .grid {
                break-inside: avoid;
                page-break-inside: avoid;
            }
            
            .contract-status {
                position: static;
                display: inline-block;
                margin-bottom: 1rem;
            }
        }

        @media (max-width: 768px) {
            body {
                padding: 1rem;
            }

            .grid {
                grid-template-columns: 1fr;
            }

            .signatures {
                grid-template-columns: 1fr;
            }
        }
    </style>
</head>
<body>
    <div class="contract-status">\${contract.status.toUpperCase()}</div>
    
    <header class="contract-header">
        <div class="logo">MusoBuddy</div>
        <div class="tagline">Less admin, more music</div>
        <div class="contract-number">Contract #: \${contract.contractNumber}</div>
    </header>

    <div class="section">
        <h2 class="section-title">📋 Contract Parties</h2>
        <div class="grid">
            <div>
                <h3 style="color: var(--primary); margin-bottom: 1rem;">👤 CLIENT</h3>
                <div class="detail-group">
                    <div class="detail-label">Client</div>
                    <div class="detail-value">\${contract.clientName}</div>
                </div>
                <div class="detail-group">
                    <div class="detail-label">Email</div>
                    <div class="detail-value">\${contract.clientEmail || 'Not provided'}</div>
                </div>
                <div class="detail-group">
                    <div class="detail-label">Phone</div>
                    <div class="detail-value">\${contract.clientPhone || 'Not provided'}</div>
                </div>
                <div class="detail-group">
                    <div class="detail-label">Address</div>
                    <div class="detail-value">\${contract.clientAddress || 'Not provided'}</div>
                </div>
            </div>
            <div>
                <h3 style="color: var(--primary); margin-bottom: 1rem;">🎵 PERFORMER</h3>
                <div class="detail-group">
                    <div class="detail-label">Business</div>
                    <div class="detail-value">\${businessName}</div>
                </div>
                <div class="detail-group">
                    <div class="detail-label">Email</div>
                    <div class="detail-value">\${userSettings?.businessEmail || 'Not provided'}</div>
                </div>
                <div class="detail-group">
                    <div class="detail-label">Phone</div>
                    <div class="detail-value">\${userSettings?.phone || 'Not provided'}</div>
                </div>
                <div class="detail-group">
                    <div class="detail-label">Address</div>
                    <div class="detail-value">\${businessAddress}</div>
                </div>
            </div>
        </div>
    </div>

    <div class="section">
        <h2 class="section-title">📅 Event Details</h2>
        <div class="grid">
            <div>
                <div class="detail-group">
                    <div class="detail-label">Date</div>
                    <div class="detail-value">\${eventDateStr}</div>
                </div>
                <div class="detail-group">
                    <div class="detail-label">Time</div>
                    <div class="detail-value">\${contract.eventTime || 'TBC'} - \${contract.eventEndTime || 'TBC'}</div>
                </div>
            </div>
            <div>
                <div class="detail-group">
                    <div class="detail-label">Venue</div>
                    <div class="detail-value">\${contract.venue || 'TBC'}</div>
                </div>
                <div class="detail-group">
                    <div class="detail-label">Address</div>
                    <div class="detail-value">\${contract.venueAddress || 'See venue name'}</div>
                </div>
            </div>
        </div>
    </div>

    <div class="section financial">
        <h2 class="section-title">💰 Financial Terms</h2>
        <div class="grid">
            <div class="detail-group">
                <div class="detail-label">Total Performance Fee</div>
                <div class="detail-value amount">£\${totalAmount.toFixed(2)}</div>
            </div>
            \${depositAmount > 0 ? \`<div class="detail-group">
                <div class="detail-label">Deposit Required</div>
                <div class="detail-value amount">£\${depositAmount.toFixed(2)}</div>
            </div>\` : ''}
            \${depositAmount > 0 ? \`<div class="detail-group">
                <div class="detail-label">Balance Due</div>
                <div class="detail-value amount">£\${balanceAmount.toFixed(2)}</div>
            </div>\` : ''}
        </div>
        \${contract.paymentInstructions ? \`<div class="detail-group" style="margin-top: 1rem; padding-top: 1rem; border-top: 1px solid var(--primary-light);">
            <div class="detail-label">Payment Instructions</div>
            <div class="detail-value">\${contract.paymentInstructions}</div>
        </div>\` : ''}
    </div>

    \${(contract.equipmentRequirements || contract.specialRequirements) ? \`<div class="section">
        <h2 class="section-title">📝 Requirements</h2>
        \${contract.equipmentRequirements ? \`<div class="detail-group">
            <div class="detail-label">Equipment</div>
            <div class="detail-value">\${contract.equipmentRequirements}</div>
        </div>\` : ''}
        \${contract.specialRequirements ? \`<div class="detail-group">
            <div class="detail-label">Special Requirements</div>
            <div class="detail-value">\${contract.specialRequirements}</div>
        </div>\` : ''}
    </div>\` : ''}

    <div class="section terms">
        <h2 class="section-title">📋 Terms & Conditions</h2>
        <ul>
            <li>Payment due on date of performance</li>
            <li>Client must provide adequate and safe power supply</li>
            <li>Client must provide safe and reasonable venue access for load-in/out</li>
            <li>All equipment remains property of performer; client responsible for damage caused by guests</li>
            <li>Performer holds Public Liability Insurance; client responsible for venue licences (PRS/PPL)</li>
            <li>Client responsible for venue sound restrictions or curfews</li>
            <li>Stage/performance area must be flat, covered, and safe</li>
            \${depositAmount > 0 ? \`<li>This Agreement becomes legally binding upon signature by both parties. The Client agrees to pay a non-refundable booking fee of £\${depositAmount.toFixed(2)} within 7 days of signing. The booking will not be confirmed until the booking fee is received, and the Artist reserves the right to release the date if payment is not made.</li>\` : ''}
            <li>Client to cover parking fees; accommodation required if venue is over 50 miles or finish after midnight</li>
            <li>Neither party liable for cancellation due to events beyond their control (illness, accidents, extreme weather, etc.)</li>
            <li>Client must provide weather protection for outdoor events</li>
            <li>No recording or broadcasting without performer's written consent</li>
            <li>Contract subject to the laws of England & Wales</li>
            <li>Final numbers must be confirmed 48 hours prior</li>
            <li>Performer will use best efforts to provide a suitable replacement</li>
        </ul>
    </div>

    <div class="signatures">
        <div class="signature-box">
            <div class="signature-label">CLIENT SIGNATURE</div>
            \${isSigned && signedAt ? \`
                <div class="signature-label">\${signatureName}</div>
                <div class="signed-status">✓ Signed on \${signedAt.toLocaleDateString('en-GB')}</div>
            \` : \`
                <div class="signature-label">\${contract.clientName}</div>
                <div class="signature-label">Date: _______________</div>
                <div style="color: var(--gray);">Awaiting signature</div>
            \`}
        </div>
        <div class="signature-box">
            <div class="signature-label">PERFORMER SIGNATURE</div>
            <div class="signature-label">\${businessName}</div>
            <div class="signed-status">✓ Signed on \${new Date(contract.createdAt || new Date()).toLocaleDateString('en-GB')}</div>
        </div>
    </div>

    <div style="text-align: center; margin-top: 2rem; padding-top: 2rem; border-top: 1px solid var(--primary-light); color: var(--gray); font-size: 0.9rem;">
        Contract generated on \${new Date(contract.createdAt || new Date()).toLocaleDateString('en-GB')}<br>
        <strong style="color: var(--primary);">MusoBuddy</strong> - Less admin, more music<br>
        Empowering musicians with professional business tools
    </div>
</body>
</html>\`;
}