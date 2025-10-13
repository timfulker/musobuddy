import { createClient } from '@supabase/supabase-js';
import { readFile } from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Use production Supabase (where the videos should be stored)
const supabaseUrl = process.env.SUPABASE_URL_PROD;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY_PROD;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials');
  console.error('Set SUPABASE_URL_PROD and SUPABASE_SERVICE_KEY_PROD');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const videos = [
  {
    path: 'client/public/videos/main-promo.mov',
    storagePath: 'videos/main-promo.mov',
    name: 'main-promo.mov'
  },
  {
    path: 'client/public/videos/contract-demo.mov',
    storagePath: 'videos/contract-demo.mov',
    name: 'contract-demo.mov'
  }
];

async function ensureBucket() {
  console.log('🔍 Checking for public-assets bucket...');

  const { data: buckets, error: listError } = await supabase.storage.listBuckets();

  if (listError) {
    console.error('❌ Error listing buckets:', listError);
    return false;
  }

  const publicAssetsBucket = buckets.find(b => b.name === 'public-assets');

  if (!publicAssetsBucket) {
    console.log('📦 Creating public-assets bucket...');
    const { error: createError } = await supabase.storage.createBucket('public-assets', {
      public: true
    });

    if (createError) {
      console.error('❌ Error creating bucket:', createError);
      return false;
    }
    console.log('✅ Bucket created');
  } else {
    console.log('✅ Bucket exists');
  }

  return true;
}

async function uploadVideo(videoInfo) {
  console.log(`\n📤 Uploading ${videoInfo.name}...`);

  try {
    const videoBuffer = await readFile(join(__dirname, videoInfo.path));
    console.log(`   Size: ${(videoBuffer.length / 1024 / 1024).toFixed(2)} MB`);

    const { data, error } = await supabase.storage
      .from('public-assets')
      .upload(videoInfo.storagePath, videoBuffer, {
        contentType: 'video/quicktime',
        upsert: true,
        cacheControl: '3600'
      });

    if (error) {
      console.error(`❌ Upload failed:`, error);
      return null;
    }

    // Get public URL
    const { data: publicUrlData } = supabase.storage
      .from('public-assets')
      .getPublicUrl(videoInfo.storagePath);

    console.log(`✅ Uploaded successfully`);
    console.log(`   Public URL: ${publicUrlData.publicUrl}`);

    return publicUrlData.publicUrl;
  } catch (err) {
    console.error(`❌ Error:`, err);
    return null;
  }
}

async function main() {
  console.log('🎬 Starting video upload to Supabase Storage...\n');

  const bucketReady = await ensureBucket();
  if (!bucketReady) {
    console.error('❌ Failed to ensure bucket exists');
    process.exit(1);
  }

  const results = {};

  for (const video of videos) {
    const url = await uploadVideo(video);
    if (url) {
      results[video.name] = url;
    }
  }

  console.log('\n📋 Summary:');
  console.log(JSON.stringify(results, null, 2));

  console.log('\n✅ Done! Update your landing page with these URLs:');
  for (const [name, url] of Object.entries(results)) {
    console.log(`   ${name}: ${url}`);
  }
}

main().catch(console.error);
