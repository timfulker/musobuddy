import type { Contract, UserSettings } from '@shared/schema';

export function generateContractSigningPage(
  contract: Contract, 
  userSettings: UserSettings | null
): string {
  const businessName = userSettings?.businessName || 'MusoBuddy';
  
  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Contract Signing - ${contract.contractNumber}</title>
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
        .header h1 {
            color: #333;
            font-size: 24px;
            margin-bottom: 8px;
        }
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
            font-size: 14px;
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
        }
        
        /* Professional Contract Header */
        .contract-header {
            background: linear-gradient(135deg, #191970 0%, #1e3a8a 100%);
            color: white;
            padding: 40px;
            text-align: center;
            position: relative;
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
            flex-shrink: 0;
            backdrop-filter: blur(10px);
        }
        
        .metronome-body {
            width: 24px;
            height: 38px;
            background: white;
            clip-path: polygon(25% 0%, 75% 0%, 100% 100%, 0% 100%);
            position: relative;
        }
        
        .metronome-arm {
            position: absolute;
            top: 8px;
            left: 50%;
            transform: translateX(-50%) rotate(10deg);
            width: 2.5px;
            height: 24px;
            background: #191970;
            border-radius: 1px;
            transform-origin: bottom center;
        }
        
        .company-name {
            font-size: 42px;
            font-weight: 700;
            letter-spacing: -1px;
            color: white;
            line-height: 1;
            margin-bottom: 8px;
        }
        
        .tagline {
            font-size: 18px;
            color: rgba(255, 255, 255, 0.9);
            font-style: italic;
            font-weight: 500;
        }
        
        .contract-title {
            font-size: 32px;
            font-weight: 800;
            margin: 25px 0 15px 0;
            text-shadow: 0 2px 4px rgba(0,0,0,0.3);
        }
        
        .contract-number {
            font-size: 16px;
            opacity: 0.9;
            font-weight: 500;
        }
        
        .status-badge {
            position: absolute;
            top: 20px;
            right: 20px;
            padding: 10px 18px;
            border-radius: 25px;
            font-size: 12px;
            font-weight: bold;
            text-transform: uppercase;
            backdrop-filter: blur(10px);
            background: rgba(59, 130, 246, 0.9);
            color: white;
        }
        
        /* Contract Body */
        .contract-body {
            padding: 40px;
        }
        
        .section {
            margin-bottom: 35px;
        }
        
        .section-title {
            font-size: 22px;
            font-weight: 700;
            color: #191970;
            margin-bottom: 25px;
            padding-bottom: 10px;
            border-bottom: 3px solid #1e3a8a;
        }
        
        /* Parties Section */
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
            font-size: 16px;
            font-weight: 700;
            color: #191970;
            margin-bottom: 15px;
        }
        
        .party-details {
            font-size: 15px;
            line-height: 1.6;
            color: #4a5568;
        }
        
        .party-details strong {
            color: #2d3748;
            font-weight: 700;
        }
        
        /* Details Grid */
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
        
        .detail-label {
            font-weight: 600;
            color: #495057;
        }
        
        .detail-value {
            font-weight: 500;
            color: #212529;
        }
        
        /* Financial Section */
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
            font-size: 16px;
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
            font-size: 14px;
            line-height: 1.6;
        }
        
        /* Requirements and Terms */
        .requirements-content, .terms-content {
            font-size: 15px;
            line-height: 1.7;
        }
        
        .requirements-content p, .terms-content p {
            margin-bottom: 15px;
        }
        
        .terms-content p strong {
            color: #191970;
            font-weight: 600;
        }
        .contract-document {
            text-align: center;
            margin: 16px 0;
        }
        .download-btn {
            display: inline-block;
            background: #6c757d;
            color: white;
            padding: 8px 16px;
            border-radius: 6px;
            text-decoration: none;
            font-weight: 500;
            font-size: 14px;
            transition: background-color 0.2s;
        }
        .download-btn:hover {
            background: #5a6268;
        }
        .signature-section {
            background: #f8fff4;
            border: 2px solid #28a745;
            border-radius: 12px;
            padding: 24px;
        }
        .signature-section h3 {
            color: #155724;
            margin-bottom: 16px;
            font-size: 18px;
            text-align: center;
        }
        .signature-notice {
            color: #6c757d;
            font-size: 14px;
            text-align: center;
            margin-bottom: 20px;
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
            background: linear-gradient(135deg, #22c55e, #16a34a);
            color: white;
            padding: 16px 32px;
            border: none;
            border-radius: 8px;
            font-size: 18px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s;
            width: 100%;
            margin-top: 16px;
        }
        .sign-button:hover {
            transform: translateY(-1px);
            box-shadow: 0 10px 20px rgba(34, 197, 94, 0.2);
        }
        .sign-button:disabled {
            opacity: 0.6;
            cursor: not-allowed;
            transform: none;
        }
        .success-message {
            background: #f0fff4;
            color: #22543d;
            padding: 20px;
            border-radius: 8px;
            margin-bottom: 20px;
            text-align: center;
            border: 2px solid #9ae6b4;
            display: none;
        }
        .error-message {
            background: #fed7d7;
            color: #742a2a;
            padding: 20px;
            border-radius: 8px;
            margin-bottom: 20px;
            text-align: center;
            border: 2px solid #fc8181;
            display: none;
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
                    <span class="detail-value">${contract.contractNumber}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Client</span>
                    <span class="detail-value">${contract.clientName}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Event Date</span>
                    <span class="detail-value">${new Date(contract.eventDate).toLocaleDateString()}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Venue</span>
                    <span class="detail-value">${contract.venue}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Event Time</span>
                    <span class="detail-value">${contract.eventTime || 'TBD'}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Fee</span>
                    <span class="detail-value">£${contract.fee}</span>
                </div>
            </div>
        </div>

        <div class="contract-viewer">
            <div class="contract-content" id="contractContent">
                <div style="padding: 20px; text-align: center; color: #666;">
                    <p>Loading contract document...</p>
                </div>
            </div>
        </div>
        
        <div class="contract-document">
            <a href="#" onclick="downloadContract()" class="download-btn">Download Full Contract</a>
        </div>

        ${contract.status !== 'signed' ? `
            <div class="signature-section">
                <h3>Digital Signature</h3>
                <p class="signature-notice">Please fill in the following details to complete the contract</p>
                
                <form id="signatureForm">
                    <div class="form-group">
                        <label for="clientName">Client Name</label>
                        <input type="text" id="clientName" value="${contract.clientName}" readonly style="background: #f8f9fa;">
                    </div>
                    
                    <div class="form-group">
                        <label for="emailAddress">Email Address</label>
                        <input type="email" id="emailAddress" value="${contract.clientEmail || ''}" placeholder="Enter your email address">
                    </div>
                    
                    <div class="form-group">
                        <label for="signatureDate">Signature Date</label>
                        <input type="text" id="signatureDate" value="${new Date().toLocaleDateString()}" readonly style="background: #f8f9fa;">
                    </div>
                    
                    <div class="checkbox-group">
                        <input type="checkbox" id="agreeTerms" required>
                        <label for="agreeTerms" style="margin: 0;">I agree to the terms and conditions outlined in this contract</label>
                    </div>
                    
                    <button type="submit" class="sign-button" id="signButton">Sign Contract</button>
                </form>
            </div>
        ` : ''}
    </div>

    <script>
        function downloadContract() {
            const apiUrl = 'https://f19aba74-886b-4308-a2de-cc9ba5e94af8-00-2ux7uy3ch9t9f.janeway.replit.dev/api/contracts/${contract.id}/download';
            window.open(apiUrl, '_blank');
        }

        document.getElementById('signatureForm')?.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const signButton = document.getElementById('signButton');
            const successMessage = document.getElementById('success-message');
            const errorMessage = document.getElementById('error-message');
            const errorText = document.getElementById('error-text');
            
            // Validate form
            const emailAddress = document.getElementById('emailAddress').value;
            const agreeTerms = document.getElementById('agreeTerms').checked;
            
            if (!agreeTerms) {
                errorText.textContent = 'Please agree to the terms and conditions';
                errorMessage.style.display = 'block';
                return;
            }
            
            if (!emailAddress || !emailAddress.includes('@')) {
                errorText.textContent = 'Please enter a valid email address';
                errorMessage.style.display = 'block';
                return;
            }
            
            // Hide previous messages
            successMessage.style.display = 'none';
            errorMessage.style.display = 'none';
            
            // Disable button and show loading
            signButton.disabled = true;
            signButton.textContent = 'Signing Contract...';
            
            try {
                const response = await fetch('https://f19aba74-886b-4308-a2de-cc9ba5e94af8-00-2ux7uy3ch9t9f.janeway.replit.dev/api/contracts/sign/${contract.id}', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        clientSignature: document.getElementById('clientName').value,
                        clientEmail: emailAddress,
                        clientIP: '0.0.0.0',
                        signedAt: new Date().toISOString()
                    })
                });
                
                const result = await response.json();
                
                if (result.success) {
                    successMessage.style.display = 'block';
                    document.getElementById('signatureForm').style.display = 'none';
                    successMessage.scrollIntoView({ behavior: 'smooth' });
                } else {
                    throw new Error(result.message || 'Signing failed');
                }
                
            } catch (error) {
                console.error('Signing error:', error);
                errorText.textContent = error.message || 'Error occurred while signing the contract';
                errorMessage.style.display = 'block';
                
                signButton.disabled = false;
                signButton.textContent = 'Sign Contract';
            }
        });
        
        // Load contract content on page load
        document.addEventListener('DOMContentLoaded', function() {
            loadContractData();
        });
        
        async function loadContractData() {
            try {
                const contractContent = document.getElementById('contractContent');
                const eventDate = new Date('${contract.eventDate}');
                const eventDateStr = eventDate ? eventDate.toLocaleDateString('en-GB', {
                    weekday: 'long',
                    year: 'numeric', 
                    month: 'long',
                    day: 'numeric'
                }) : 'Date TBC';
                
                contractContent.innerHTML = \`
                    <!-- Professional Contract Header -->
                    <div class="contract-header">
                        <div class="logo-section">
                            <div class="metronome-container">
                                <div class="metronome-body">
                                    <div class="metronome-arm"></div>
                                </div>
                            </div>
                            <div>
                                <div class="company-name">${userSettings.businessName || 'MusoBuddy'}</div>
                                <div class="tagline">Professional Music Services</div>
                            </div>
                        </div>
                        <div class="contract-title">Performance Contract</div>
                        <div class="contract-number">Contract No. ${contract.contractNumber}</div>
                        <div class="status-badge status-sent">Awaiting Signature</div>
                    </div>
                    
                    <!-- Contract Content -->
                    <div class="contract-body">
                        <!-- Parties Section -->
                        <div class="section">
                            <div class="section-title">Parties to this Agreement</div>
                            <div class="parties-section">
                                <div class="party-box">
                                    <div class="party-title">Service Provider</div>
                                    <div class="party-details">
                                        <strong>${userSettings.businessName || 'Professional Music Services'}</strong><br>
                                        ${userSettings.businessAddress || ''}<br>
                                        ${userSettings.businessEmail || ''}<br>
                                        ${userSettings.businessPhone || ''}
                                    </div>
                                </div>
                                <div class="party-box">
                                    <div class="party-title">Client</div>
                                    <div class="party-details">
                                        <strong>${contract.clientName}</strong><br>
                                        ${contract.clientAddress || ''}<br>
                                        ${contract.clientEmail || ''}<br>
                                        ${contract.clientPhone || ''}
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Event Details -->
                        <div class="section">
                            <div class="section-title">Event Details</div>
                            <div class="details-grid">
                                <div class="detail-item">
                                    <span class="detail-label">Event Date:</span>
                                    <span class="detail-value">\${eventDateStr}</span>
                                </div>
                                <div class="detail-item">
                                    <span class="detail-label">Event Time:</span>
                                    <span class="detail-value">${contract.eventTime || 'TBC'}</span>
                                </div>
                                <div class="detail-item">
                                    <span class="detail-label">Venue:</span>
                                    <span class="detail-value">${contract.venue || 'TBC'}</span>
                                </div>
                                <div class="detail-item">
                                    <span class="detail-label">Venue Address:</span>
                                    <span class="detail-value">${contract.venueAddress || 'TBC'}</span>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Financial Terms -->
                        <div class="section">
                            <div class="section-title">Financial Terms</div>
                            <div class="financial-summary">
                                <div class="fee-item">
                                    <span class="fee-label">Total Performance Fee:</span>
                                    <span class="fee-amount">£${contract.fee}</span>
                                </div>
                                <div class="fee-item">
                                    <span class="fee-label">Deposit Required:</span>
                                    <span class="fee-amount">£${contract.deposit || '0.00'}</span>
                                </div>
                            </div>
                            <div class="payment-terms">
                                <strong>Payment Instructions:</strong><br>
                                ${contract.paymentInstructions || 'Payment due on completion of performance'}
                            </div>
                        </div>
                        
                        <!-- Technical Requirements -->
                        <div class="section">
                            <div class="section-title">Technical Requirements</div>
                            <div class="requirements-content">
                                <p><strong>Equipment Requirements:</strong><br>
                                ${contract.equipmentRequirements || 'Standard performance setup as discussed'}</p>
                                
                                <p><strong>Special Requirements:</strong><br>
                                ${contract.specialRequirements || 'None specified'}</p>
                            </div>
                        </div>
                        
                        <!-- Terms and Conditions -->
                        <div class="section">
                            <div class="section-title">Terms and Conditions</div>
                            <div class="terms-content">
                                <p>This contract constitutes the entire agreement between the parties for the provision of live musical entertainment services.</p>
                                
                                <p><strong>Performance Obligations:</strong> The Service Provider agrees to provide professional musical entertainment services at the specified venue and time, using appropriate equipment and maintaining professional standards throughout the performance.</p>
                                
                                <p><strong>Payment Terms:</strong> Payment shall be made according to the schedule specified above. Late payments may incur additional charges.</p>
                                
                                <p><strong>Cancellation Policy:</strong> Cancellation by the Client within 48 hours of the event may result in forfeiture of the deposit. Cancellation due to force majeure events shall excuse performance by either party.</p>
                                
                                <p><strong>Liability:</strong> The Service Provider's liability is limited to the total contract value. Both parties agree to maintain appropriate insurance coverage.</p>
                                
                                <p><strong>Governing Law:</strong> This contract shall be governed by the laws of England and Wales.</p>
                            </div>
                        </div>
                    </div>
                \`;
            } catch (error) {
                console.error('Error loading contract:', error);
            }
        }
    </script>
</body>
</html>`;
}