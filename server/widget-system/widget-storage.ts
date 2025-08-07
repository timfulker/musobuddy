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
  key?: string;
  error?: string;
}> {
  try {
    console.log(`🔧 Generating widget HTML for user ${userId} with token ${token}`);
    
    const widgetHTML = await generateHybridWidgetHTML(userId, token);
    const key = `widgets/widget-${userId}-${token}.html`;
    
    const command = new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: key,
      Body: widgetHTML,
      ContentType: 'text/html',
      CacheControl: 'public, max-age=3600'
    });

    await s3Client.send(command);
    
    const publicUrl = `https://pub-446248abf8164fb99bee2fc3dc3c513c.r2.dev/${key}`;
    
    console.log(`✅ Widget uploaded to R2: ${publicUrl}`);
    
    return {
      success: true,
      url: publicUrl,
      key: key
    };
    
  } catch (error: any) {
    console.error('❌ Failed to upload widget to R2:', error);
    return {
      success: false,
      error: error.message || 'Unknown error occurred'
    };
  }
}