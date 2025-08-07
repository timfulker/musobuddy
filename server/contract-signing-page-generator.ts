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
            background: white;
            border-radius: 16px;
            box-shadow: 0 20px 40px rgba(0,0,0,0.1);
            padding: 32px;
            width: 100%;
            max-width: 900px;
        }
        .header {
            text-align: center;
            margin-bottom: 32px;
            padding-bottom: 16px;
            border-bottom: 2px solid #f0f0f0;
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
        .pdf-embed {
            width: 100%;
            height: 600px;
            border: none;
            display: block;
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
            <div style="width: 48px; height: 48px; background: linear-gradient(135deg, #667eea, #764ba2); border-radius: 12px; margin: 0 auto 16px; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 18px;">MB</div>
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
            <iframe 
                src="https://f19aba74-886b-4308-a2de-cc9ba5e94af8-00-2ux7uy3ch9t9f.janeway.replit.dev/api/contracts/${contract.id}/download#toolbar=1&navpanes=0&scrollbar=1" 
                class="pdf-embed"
                title="Contract Document">
            </iframe>
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
    </script>
</body>
</html>`;
}