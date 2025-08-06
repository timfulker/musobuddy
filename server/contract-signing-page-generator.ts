import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { nanoid } from 'nanoid';
import type { Contract, UserSettings } from '@shared/schema';

// Initialize R2 client
const r2Client = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
  },
});

export async function generateContractSigningPage(
  contract: Contract, 
  userSettings: UserSettings | null
): Promise<string> {
  const businessName = userSettings?.businessName || 'MusoBuddy';
  
  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Contract Signing - ${businessName}</title>
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
            max-width: 800px;
        }
        .header {
            text-align: center;
            margin-bottom: 32px;
        }
        .logo {
            width: 48px;
            height: 48px;
            background: linear-gradient(135deg, #667eea, #764ba2);
            border-radius: 12px;
            margin: 0 auto 16px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-weight: bold;
            font-size: 18px;
        }
        h1 {
            color: #1a202c;
            font-size: 28px;
            font-weight: 600;
            margin-bottom: 8px;
        }
        .contract-details {
            background: #f8f9fa;
            padding: 24px;
            border-radius: 12px;
            margin-bottom: 24px;
        }
        .contract-details h2 {
            color: #2d3748;
            margin-bottom: 16px;
            font-size: 20px;
        }
        .detail-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 8px;
        }
        .detail-label {
            font-weight: 600;
            color: #4a5568;
        }
        .detail-value {
            color: #2d3748;
        }
        .pdf-viewer {
            border: 2px solid #e2e8f0;
            border-radius: 8px;
            margin-bottom: 24px;
            height: 500px;
            background: #f7fafc;
            display: flex;
            align-items: center;
            justify-content: center;
            flex-direction: column;
        }
        .signature-section {
            background: #f0fff4;
            border: 1px solid #9ae6b4;
            border-radius: 12px;
            padding: 24px;
            margin-bottom: 24px;
        }
        .signature-form {
            display: flex;
            flex-direction: column;
            gap: 16px;
        }
        .form-group {
            display: flex;
            flex-direction: column;
        }
        label {
            font-weight: 600;
            margin-bottom: 6px;
            color: #2d3748;
        }
        input {
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
            margin-top: 16px;
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
        .download-btn {
            background: #6b7280;
            color: white;
            padding: 12px 24px;
            border: none;
            border-radius: 8px;
            font-size: 16px;
            cursor: pointer;
            text-decoration: none;
            display: inline-block;
            margin-right: 12px;
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
        </div>

        <div id="success-message" class="success-message">
            <h3>Contract Signed Successfully!</h3>
            <p>Thank you for signing the contract. Both parties will receive confirmation emails shortly.</p>
        </div>

        <div id="error-message" class="error-message">
            <h3>Signing Failed</h3>
            <p id="error-text">There was an error signing the contract. Please try again.</p>
        </div>

        <div class="contract-details">
            <h2>Contract Details</h2>
            <div class="detail-row">
                <span class="detail-label">Contract Number:</span>
                <span class="detail-value">${contract.contractNumber}</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">Client:</span>
                <span class="detail-value">${contract.clientName}</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">Event Date:</span>
                <span class="detail-value">${new Date(contract.eventDate).toLocaleDateString('en-GB')}</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">Venue:</span>
                <span class="detail-value">${contract.venue}</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">Fee:</span>
                <span class="detail-value">£${contract.fee}</span>
            </div>
        </div>

        <div class="pdf-viewer">
            <h3>Contract Document</h3>
            <p style="margin-top: 12px; color: #4a5568;">
                <a href="${contract.cloudStorageUrl || '#'}" target="_blank" class="download-btn">
                    View Contract PDF
                </a>
            </p>
        </div>

        <div class="signature-section" id="signing-form">
            <h3 style="margin-bottom: 16px;">Digital Signature</h3>
            <form class="signature-form" id="contract-signing-form">
                <div class="form-group">
                    <label for="clientName">Full Name (as it appears on the contract)</label>
                    <input type="text" id="clientName" name="clientName" value="${contract.clientName}" required>
                </div>
                <div class="form-group">
                    <label for="clientEmail">Email Address</label>
                    <input type="email" id="clientEmail" name="clientEmail" value="${contract.clientEmail}" required>
                </div>
                <div class="form-group">
                    <label for="signatureDate">Signature Date</label>
                    <input type="date" id="signatureDate" name="signatureDate" value="${new Date().toISOString().split('T')[0]}" required>
                </div>
                <div class="checkbox-group">
                    <input type="checkbox" id="agree" name="agree" required>
                    <label for="agree">I agree to the terms and conditions outlined in this contract</label>
                </div>
                <button type="submit" class="sign-button">Sign Contract</button>
            </form>
        </div>
    </div>

    <script>
        document.getElementById('contract-signing-form').addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const formData = new FormData(e.target);
            const data = Object.fromEntries(formData.entries());
            
            // Show loading state
            const button = document.querySelector('.sign-button');
            button.disabled = true;
            button.textContent = 'Signing...';
            
            try {
                const response = await fetch('https://musobuddy.replit.app/api/contracts/sign/${contract.id}', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(data)
                });
                
                if (response.ok) {
                    document.getElementById('success-message').style.display = 'block';
                    document.getElementById('signing-form').style.display = 'none';
                    window.scrollTo(0, 0);
                } else {
                    const error = await response.json();
                    throw new Error(error.message || 'Signing failed');
                }
            } catch (error) {
                console.error('Error:', error);
                document.getElementById('error-text').textContent = error.message;
                document.getElementById('error-message').style.display = 'block';
            } finally {
                button.disabled = false;
                button.textContent = 'Sign Contract';
            }
        });
    </script>
</body>
</html>`;
}

export async function uploadContractSigningPageToR2(
  contract: Contract,
  userSettings: UserSettings | null
): Promise<{ success: boolean; url?: string; key?: string; error?: string }> {
  try {
    console.log(`🔧 Generating signing page for contract ${contract.id}...`);
    
    const signingPageHTML = await generateContractSigningPage(contract, userSettings);
    
    // Generate secure key for the signing page
    const securityToken = nanoid(16);
    const storageKey = `contracts/signing/${contract.id}-${securityToken}.html`;
    
    console.log(`🔑 Signing page storage key: ${storageKey}`);
    
    // Upload HTML to R2
    const uploadCommand = new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME || 'musobuddy-storage',
      Key: storageKey,
      Body: signingPageHTML,
      ContentType: 'text/html',
      Metadata: {
        'contract-id': contract.id.toString(),
        'contract-number': contract.contractNumber,
        'client-name': contract.clientName || 'Unknown',
        'uploaded-at': new Date().toISOString()
      }
    });

    await r2Client.send(uploadCommand);
    
    console.log(`✅ Contract signing page uploaded to R2: ${storageKey}`);
    
    // Use direct Cloudflare R2 public URL
    const publicUrl = `https://pub-446248abf8164fb99bee2fc3dc3c513c.r2.dev/${storageKey}`;
    
    console.log(`🔗 Signing page URL: ${publicUrl}`);
    
    return {
      success: true,
      url: publicUrl,
      key: storageKey
    };
    
  } catch (error: any) {
    console.error('❌ Failed to upload signing page to R2:', error);
    return {
      success: false,
      error: error.message || 'Upload failed'
    };
  }
}