import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomBytes } from 'crypto';

const r2Client = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
  },
});

export interface DocumentUploadResult {
  success: boolean;
  documentUrl?: string;
  documentKey?: string;
  error?: string;
}

export async function uploadDocumentToR2(
  userId: string,
  bookingId: number,
  file: Buffer,
  originalName: string,
  contentType: string
): Promise<DocumentUploadResult> {
  try {
    // Verify R2 environment variables
    const requiredEnvVars = ['R2_ACCOUNT_ID', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY', 'R2_BUCKET_NAME'];
    const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
    
    if (missingVars.length > 0) {
      const error = `Missing R2 environment variables: ${missingVars.join(', ')}`;
      console.error('❌', error);
      return {
        success: false,
        error
      };
    }

    // Generate unique document key
    const fileExtension = originalName.split('.').pop() || '';
    const randomId = randomBytes(16).toString('hex');
    const documentKey = `documents/${userId}/booking-${bookingId}/${randomId}.${fileExtension}`;
    
    console.log(`📄 Uploading document for user ${userId}, booking ${bookingId}`);
    console.log(`📄 R2 Config: account=${process.env.R2_ACCOUNT_ID}, bucket=${process.env.R2_BUCKET_NAME}`);
    
    // Upload document to R2
    const command = new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: documentKey,
      Body: file,
      ContentType: contentType,
      CacheControl: 'private, max-age=3600',
      Metadata: {
        'user-id': userId,
        'booking-id': bookingId.toString(),
        'original-name': originalName,
      }
    });

    await r2Client.send(command);
    
    // Generate public URL (adjust domain as needed)
    const documentUrl = `https://pub-446248abf8164fb99bee2fc3dc3c513c.r2.dev/${documentKey}`;
    
    console.log(`✅ Document uploaded successfully: ${documentKey}`);
    
    return {
      success: true,
      documentUrl,
      documentKey
    };
    
  } catch (error: any) {
    console.error('❌ Document upload error:', error);
    
    let errorMessage = 'Failed to upload document';
    if (error.message?.includes('credentials')) {
      errorMessage = 'R2 authentication failed';
    } else if (error.message?.includes('Bucket')) {
      errorMessage = 'R2 bucket configuration error';
    }
    
    return {
      success: false,
      error: errorMessage
    };
  }
}

export async function deleteDocumentFromR2(documentKey: string): Promise<boolean> {
  try {
    const command = new DeleteObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: documentKey,
    });

    await r2Client.send(command);
    console.log(`✅ Document deleted from R2: ${documentKey}`);
    return true;
    
  } catch (error: any) {
    console.error('❌ Document deletion error:', error);
    return false;
  }
}

export async function generateDocumentDownloadUrl(documentKey: string): Promise<string | null> {
  try {
    const command = new GetObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: documentKey,
    });

    // Generate signed URL valid for 1 hour
    const signedUrl = await getSignedUrl(r2Client, command, { expiresIn: 3600 });
    return signedUrl;
    
  } catch (error: any) {
    console.error('❌ Failed to generate download URL:', error);
    return null;
  }
}