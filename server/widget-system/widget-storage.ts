import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { generateWidgetHTML } from './widget-generator';

const s3Client = new S3Client({
  region: 'auto',
  endpoint: process.env.CLOUDFLARE_R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY || ''
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
    
    const widgetHTML = await generateWidgetHTML(userId, token);
    const key = `widgets/widget-${userId}-${token}.html`;
    
    const command = new PutObjectCommand({
      Bucket: process.env.CLOUDFLARE_R2_BUCKET_NAME,
      Key: key,
      Body: widgetHTML,
      ContentType: 'text/html',
      CacheControl: 'public, max-age=3600'
    });

    await s3Client.send(command);
    
    const publicUrl = `${process.env.CLOUDFLARE_R2_PUBLIC_URL}/${key}`;
    
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