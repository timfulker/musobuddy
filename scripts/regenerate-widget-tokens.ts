import jwt from 'jsonwebtoken';
import QRCode from 'qrcode';
import { storage } from '../server/core/storage';

async function regenerateWidgetTokens() {
  const emails = ['timfulker@gmail.com', 'timfulkermusic@gmail.com'];
  
  console.log('🔄 Starting widget token regeneration...');
  
  for (const email of emails) {
    try {
      // Get user by email
      const user = await storage.getUserByEmail(email);
      if (!user) {
        console.log(`❌ User not found: ${email}`);
        continue;
      }
      
      // Generate new widget token
      const secret = process.env.JWT_SECRET || process.env.SESSION_SECRET;
      if (!secret) {
        console.log(`❌ No JWT secret configured for token generation`);
        continue;
      }
      
      const token = jwt.sign(
        { userId: user.id, type: 'widget' },
        secret,
        { expiresIn: '30d' }
      );
      
      const widgetUrl = `${process.env.APP_URL || 'https://www.musobuddy.com'}/widget?token=${encodeURIComponent(token)}`;
      
      // Generate QR code
      const qrCodeDataUrl = await QRCode.toDataURL(widgetUrl, {
        width: 400,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });
      
      console.log(`\n✅ Regenerated widget token for ${email} (ID: ${user.id})`);
      console.log(`📱 Widget URL: ${widgetUrl}`);
      console.log(`🔳 QR Code generated (Data URL length: ${qrCodeDataUrl.length})`);
      console.log('\n-------------------\n');
      
      // Save QR code to file for easy access
      const fs = await import('fs');
      const filename = `widget-qr-${user.id}.png`;
      const base64Data = qrCodeDataUrl.replace(/^data:image\/png;base64,/, '');
      fs.writeFileSync(filename, base64Data, 'base64');
      console.log(`💾 QR code saved to: ${filename}`);
      
    } catch (error: any) {
      console.error(`❌ Failed to regenerate token for ${email}:`, error.message);
    }
  }
  
  console.log('\n✅ Widget token regeneration complete!');
  process.exit(0);
}

// Run the script
regenerateWidgetTokens().catch(error => {
  console.error('❌ Script failed:', error);
  process.exit(1);
});