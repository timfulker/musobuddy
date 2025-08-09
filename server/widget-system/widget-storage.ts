import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { generateHybridWidgetHTML } from './hybrid-widget-generator';

const s3Client = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || ''
  }
});

export async function uploadWidgetToR2(userId: string, token: string): Promise<{
  success: boolean;
  url?: string;
  qrCodeUrl?: string;
  key?: string;
  error?: string;
}> {
  try {
    console.log(`🔧 Generating widget HTML for user ${userId} with token ${token}`);
    
    const widgetHTML = await generateHybridWidgetHTML(userId, token);
    const widgetKey = `widgets/widget-${userId}-${token}.html`;
    
    // Upload widget HTML
    const widgetCommand = new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: widgetKey,
      Body: widgetHTML,
      ContentType: 'text/html',
      CacheControl: 'public, max-age=3600'
    });

    await s3Client.send(widgetCommand);
    
    const widgetUrl = `https://pub-446248abf8164fb99bee2fc3dc3c513c.r2.dev/${widgetKey}`;
    
    // Generate and upload QR code
    const qrcode = await import('qrcode');
    const qrCodeBuffer = await qrcode.default.toBuffer(widgetUrl, {
      errorCorrectionLevel: 'M',
      type: 'png',
      margin: 1,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      },
      width: 256
    });
    
    const qrCodeKey = `widgets/qr-${userId}-${token}.png`;
    const qrCodeCommand = new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: qrCodeKey,
      Body: qrCodeBuffer,
      ContentType: 'image/png',
      CacheControl: 'public, max-age=86400' // Cache for 24 hours
    });

    await s3Client.send(qrCodeCommand);
    
    const qrCodeUrl = `https://pub-446248abf8164fb99bee2fc3dc3c513c.r2.dev/${qrCodeKey}`;
    
    console.log(`✅ Widget uploaded to R2: ${widgetUrl}`);
    console.log(`✅ QR Code uploaded to R2: ${qrCodeUrl}`);
    
    return {
      success: true,
      url: widgetUrl,
      qrCodeUrl: qrCodeUrl,
      key: widgetKey
    };
    
  } catch (error: any) {
    console.error('❌ Failed to upload widget to R2:', error);
    return {
      success: false,
      error: error.message || 'Unknown error occurred'
    };
  }
}