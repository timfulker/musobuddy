/**
 * Test the complete invoice R2 integration with working credentials
 */

const { S3Client, PutObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const { neon } = require('@neondatabase/serverless');

const client = new S3Client({
  region: 'auto',
  endpoint: 'https://a730a594e40d8b46295554074c8e4413.r2.cloudflarestorage.com',
  credentials: {
    accessKeyId: '5c81b780406a8bfed414eee3d13bd5f9',
    secretAccessKey: 'b210d2d5db344de07fd936de532ab55280c44fbc64f6298026e2499bafccc13f',
  },
});

async function testFullR2Integration() {
  try {
    console.log('🧪 Testing complete R2 integration...');
    
    // Test 1: Upload a test PDF
    console.log('\n📄 Test 1: Upload test PDF...');
    const pdfContent = Buffer.from('Test PDF content for R2 integration');
    const key = `invoices/test-invoice-${Date.now()}.pdf`;
    
    const uploadCommand = new PutObjectCommand({
      Bucket: 'musobuddy-documents',
      Key: key,
      Body: pdfContent,
      ContentType: 'application/pdf'
    });
    
    const uploadResponse = await client.send(uploadCommand);
    console.log('✅ PDF uploaded successfully');
    console.log('ETag:', uploadResponse.ETag);
    
    // Test 2: Generate presigned URL
    console.log('\n🔗 Test 2: Generate presigned URL...');
    const getCommand = new GetObjectCommand({
      Bucket: 'musobuddy-documents',
      Key: key
    });
    
    const signedUrl = await getSignedUrl(client, getCommand, { expiresIn: 3600 });
    console.log('✅ Presigned URL generated:');
    console.log(signedUrl);
    
    // Test 3: Update database with cloud storage info
    console.log('\n💾 Test 3: Update database with cloud storage info...');
    const sql = neon(process.env.DATABASE_URL);
    
    const publicUrl = `https://musobuddy-documents.a730a594e40d8b46295554074c8e4413.r2.cloudflarestorage.com/${key}`;
    
    await sql`
      UPDATE invoices 
      SET cloud_storage_url = ${publicUrl}, 
          cloud_storage_key = ${key}
      WHERE invoice_number = 'INV-2025-R2-TEST'
    `;
    
    console.log('✅ Database updated with cloud storage info');
    
    // Test 4: Verify database update
    console.log('\n🔍 Test 4: Verify database update...');
    const [invoice] = await sql`
      SELECT id, invoice_number, cloud_storage_url, cloud_storage_key
      FROM invoices 
      WHERE invoice_number = 'INV-2025-R2-TEST'
    `;
    
    console.log('✅ Database verification:');
    console.log('Invoice ID:', invoice.id);
    console.log('Cloud Storage URL:', invoice.cloud_storage_url);
    console.log('Cloud Storage Key:', invoice.cloud_storage_key);
    
    console.log('\n🎉 R2 integration fully working!');
    console.log('📧 Ready to integrate with email sending system');
    
  } catch (error) {
    console.error('❌ R2 integration test failed:', error);
    console.error('Error details:', error.message);
  }
}

testFullR2Integration();