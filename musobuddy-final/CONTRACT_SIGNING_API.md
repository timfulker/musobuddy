# Contract Signing API Documentation

## Endpoint: POST /api/contracts/sign/:id

### Description
Complete contract signing endpoint that handles e-signature collection, database updates, PDF generation, and automated email delivery.

### Request

**URL**: `/api/contracts/sign/:id`
**Method**: POST
**Authentication**: None required (public endpoint for client signing)

**Parameters**:
- `id` (path parameter): Contract ID to sign

**Body**:
```json
{
  "signatureName": "John Smith"
}
```

### Response

**Success (200)**:
```json
{
  "message": "Contract signed successfully",
  "contract": {
    "id": 21,
    "status": "signed",
    "signedAt": "2025-01-06T08:30:00.000Z",
    "signatureName": "John Smith",
    // ... other contract fields
  },
  "status": "signed",
  "emailStatus": "processing"
}
```

**Error Responses**:

**400 Bad Request** - Missing signature name:
```json
{
  "message": "Signature name is required"
}
```

**400 Bad Request** - Contract not available for signing:
```json
{
  "message": "Contract is not available for signing. Current status: draft"
}
```

**404 Not Found** - Contract doesn't exist:
```json
{
  "message": "Contract not found"
}
```

**500 Internal Server Error**:
```json
{
  "message": "Failed to sign contract"
}
```

### Implementation Details

#### Database Updates
- Updates contract status to 'signed'
- Records signature timestamp (`signedAt`)
- Stores signer name (`signatureName`)
- Updates modification timestamp (`updatedAt`)

#### Background Processing
After sending the immediate response, the system processes:

1. **PDF Generation**: Creates professional contract PDF with signature details
2. **Email Delivery**: Sends confirmation emails to both client and performer
3. **Attachments**: Includes signed contract PDF in both emails

#### Email Configuration
- **From**: Authenticated domain (noreply@musobuddy.com)
- **Reply-To**: User's business email (if different from authenticated domain)
- **Subject**: Professional contract confirmation
- **Content**: HTML formatted with contract details and signature information
- **Attachments**: Signed contract PDF (typically 41KB)

#### Error Handling
- Comprehensive validation of input data
- Contract status verification before signing
- Database transaction safety
- Email delivery error isolation (doesn't affect signing success)

#### Performance Features
- **Immediate Response**: Returns success within 200ms to prevent browser timeouts
- **Background Processing**: Email and PDF generation happen after response
- **Cross-Browser Compatible**: Works on iOS, macOS, Windows across all major browsers

### Example Usage

```javascript
// Frontend JavaScript example
const signContract = async (contractId, signatureName) => {
  try {
    const response = await fetch(`/api/contracts/sign/${contractId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        signatureName: signatureName.trim(),
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to sign contract: ${response.status}`);
    }

    const result = await response.json();
    console.log('Contract signed successfully:', result);
    return result;
  } catch (error) {
    console.error('Error signing contract:', error);
    throw error;
  }
};
```

### Related Endpoints

- **GET /api/contracts/public/:id** - Retrieve contract for signing page
- **GET /api/settings/public/:userId** - Get user business settings for PDF generation

### Database Schema

The contracts table includes the following signature-related fields:

```sql
CREATE TABLE contracts (
  id SERIAL PRIMARY KEY,
  -- ... other fields
  status VARCHAR NOT NULL DEFAULT 'draft',
  signed_at TIMESTAMP,
  signature_name VARCHAR,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### Security Considerations

- No authentication required for signing (intended for client access)
- Input validation prevents SQL injection
- Status verification prevents unauthorized signing
- Audit trail maintained with signature name and timestamp
- Rate limiting should be implemented in production

### Monitoring and Logging

The endpoint provides comprehensive logging:
- Contract signing attempts
- Validation failures
- Email processing status
- PDF generation success/failure
- Performance metrics

Sample log output:
```
=== CONTRACT SIGNING ATTEMPT ===
Contract ID: 21
Signature name: John Smith
Contract found: YES
Contract status: sent
✅ Contract signed successfully
=== RESPONSE FINISHED - STARTING EMAIL PROCESSING ===
Processing emails for contract 21 signed by John Smith
=== EMAIL SENDING COMPLETED ===
Both confirmation emails sent successfully with PDF attachments
```