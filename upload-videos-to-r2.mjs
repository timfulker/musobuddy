import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { readFile } from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const r2Client = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

const BUCKET_NAME = process.env.R2_BUCKET_NAME || 'musobuddy-storage';
const PUBLIC_URL_BASE = 'https://pub-446248abf8164fb99bee2fc3dc3c513c.r2.dev';

const videos = [
  {
    localPath: 'client/public/videos/main-promo.mov',
    r2Key: 'videos/main-promo.mov',
    name: 'main-promo.mov'
  },
  {
    localPath: 'client/public/videos/contract-demo.mov',
    r2Key: 'videos/contract-demo.mov',
    name: 'contract-demo.mov'
  },
  {
    localPath: 'Invoice Tutorial.m4v',
    r2Key: 'videos/invoice-demo.m4v',
    name: 'invoice-demo.m4v'
  }
];

async function uploadVideo(videoInfo) {
  console.log(`\n📤 Uploading ${videoInfo.name}...`);

  try {
    const videoBuffer = await readFile(join(__dirname, videoInfo.localPath));
    console.log(`   Size: ${(videoBuffer.length / 1024 / 1024).toFixed(2)} MB`);

    // Determine content type based on file extension
    const ext = videoInfo.name.split('.').pop().toLowerCase();
    const contentType = ext === 'm4v' ? 'video/x-m4v' : 'video/quicktime';

    const uploadCommand = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: videoInfo.r2Key,
      Body: videoBuffer,
      ContentType: contentType,
      CacheControl: 'public, max-age=31536000', // Cache for 1 year
    });

    await r2Client.send(uploadCommand);

    const publicUrl = `${PUBLIC_URL_BASE}/${videoInfo.r2Key}`;
    console.log(`✅ Uploaded successfully`);
    console.log(`   Public URL: ${publicUrl}`);

    return publicUrl;
  } catch (err) {
    console.error(`❌ Error:`, err);
    return null;
  }
}

async function main() {
  console.log('🎬 Starting video upload to Cloudflare R2...\n');
  console.log(`📦 Bucket: ${BUCKET_NAME}`);
  console.log(`🌐 Public URL base: ${PUBLIC_URL_BASE}\n`);

  const results = {};

  for (const video of videos) {
    const url = await uploadVideo(video);
    if (url) {
      results[video.name] = url;
    }
  }

  console.log('\n📋 Upload Summary:');
  console.log(JSON.stringify(results, null, 2));

  console.log('\n✅ Done! Update your landing page with these URLs:');
  for (const [name, url] of Object.entries(results)) {
    console.log(`   ${name}: ${url}`);
  }
}

main().catch(console.error);
