#!/usr/bin/env node

/**
 * Generate static theme preview images for contract themes
 * This script creates preview images that can be served statically
 * without requiring real-time Puppeteer calls during user interaction
 */

import puppeteer from 'puppeteer';
import fs from 'fs/promises';
import path from 'path';

const themes = {
  professional: {
    name: 'Professional & Formal',
    fontFamily: '"Times New Roman", serif',
    headerBg: '#1e293b',
    headerColor: '#ffffff',
    borderStyle: '2px solid #1e293b',
    sectionHeaderColor: '#1e293b',
    accentColor: '#1e293b',
    greeting: 'Dear Client,',
    intro: 'Please find attached the official contract for your upcoming event booking. Kindly review all details carefully and return a signed copy at your earliest convenience.',
    closing: 'If you have any questions or require amendments, do not hesitate to get in touch.\n\nBest regards,',
    terms: 'Payment is due within 30 days of invoice date. Late fees may apply for overdue accounts.',
    subjectLine: 'Event Booking Confirmation & Contract'
  },
  friendly: {
    name: 'Friendly & Informal',
    fontFamily: '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif',
    headerBg: '#059669',
    headerColor: '#ffffff',
    borderStyle: '2px solid #059669',
    sectionHeaderColor: '#059669',
    accentColor: '#059669',
    greeting: 'Hey there!',
    intro: 'Really excited to be part of your event! I\'ve attached a quick contract just to lock things in and keep everything nice and clear.',
    closing: 'Give it a quick read, and if all looks good, just sign and send it back when you can. Shout if you need anything changed!\n\nCheers,',
    terms: 'Payment due in 30 days - just drop me a line if you have any questions!',
    subjectLine: 'You\'re all booked in!'
  },
  musical: {
    name: 'Musical & Creative',
    fontFamily: '"Comic Sans MS", cursive, sans-serif',
    headerBg: 'linear-gradient(135deg, #9333ea, #c084fc)',
    headerColor: '#ffffff',
    borderStyle: '3px solid #9333ea',
    sectionHeaderColor: '#9333ea',
    accentColor: '#9333ea',
    greeting: 'Yo there! 🎶',
    intro: 'You\'re officially on the MusoBuddy gig list 🎷🎤🎧 — it\'s gonna be a vibe. I\'ve popped a contract in here to keep things in tune (pun very much intended).',
    closing: 'Have a skim, hit sign, and send it back. Any questions? Drop me a beat (or an email).\n\nLet\'s make your event unforgettable.\n\nRock on,',
    terms: 'Payment due within 30 days. Can\'t wait to rock your event!',
    subjectLine: 'Let\'s Make Music! 🎶'
  }
};

function generatePreviewHTML(themeId, theme) {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Theme Preview - ${theme.name}</title>
      <style>
        body {
          font-family: ${theme.fontFamily};
          line-height: 1.6;
          color: #333;
          max-width: 800px;
          margin: 0 auto;
          padding: 30px;
          background: white;
        }
        .header {
          background: ${theme.headerBg};
          color: ${theme.headerColor};
          text-align: center;
          padding: 30px;
          border-radius: 8px;
          margin-bottom: 40px;
        }
        .header h1 {
          margin: 0 0 10px 0;
          font-size: 28px;
        }
        .header h2 {
          margin: 0;
          font-size: 16px;
          opacity: 0.9;
        }
        .business-info {
          text-align: center;
          padding: 20px;
          background: #f8f9fa;
          border-radius: 8px;
        }
        .section {
          margin-bottom: 30px;
          padding: 20px;
          border: ${theme.borderStyle};
          border-radius: 8px;
        }
        .section h3 {
          color: ${theme.sectionHeaderColor};
          margin-top: 0;
          font-size: 18px;
          border-bottom: 1px solid #ddd;
          padding-bottom: 10px;
        }
        .event-details {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
          margin: 20px 0;
        }
        .detail-item {
          padding: 10px;
          background: #f8f9fa;
          border-radius: 6px;
        }
        .detail-item strong {
          color: ${theme.sectionHeaderColor};
        }
        .fee-section {
          background: #f8f9fa;
          padding: 20px;
          border-radius: 8px;
          text-align: center;
          margin: 20px 0;
          border: 2px solid ${theme.accentColor};
        }
        .fee-amount {
          font-size: 24px;
          font-weight: bold;
          color: ${theme.accentColor};
        }
        .terms {
          background: #f9f9f9;
          padding: 20px;
          border-radius: 8px;
          font-size: 14px;
          border: 1px solid #ddd;
        }
        .preview-badge {
          position: fixed;
          top: 20px;
          right: 20px;
          background: ${theme.accentColor};
          color: white;
          padding: 10px 15px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: bold;
          box-shadow: 0 2px 10px rgba(0,0,0,0.2);
        }
      </style>
    </head>
    <body>
      <div class="preview-badge">THEME PREVIEW</div>
      
      <div class="header">
        <h1>${theme.subjectLine}</h1>
        <h2>${theme.name} Theme Preview</h2>
      </div>

      <div class="business-info">
        <h3>MusoBuddy Music Services</h3>
        <p>Professional Music Performance | Saxophone & Live Entertainment</p>
      </div>

      <div class="section">
        <h3>Contract Details</h3>
        <div class="event-details">
          <div class="detail-item">
            <strong>Event:</strong> Sample Wedding Reception
          </div>
          <div class="detail-item">
            <strong>Date:</strong> Saturday, March 15, 2025
          </div>
          <div class="detail-item">
            <strong>Time:</strong> 7:00 PM - 11:00 PM
          </div>
          <div class="detail-item">
            <strong>Venue:</strong> Grand Ballroom, City Hotel
          </div>
        </div>
        
        <div class="fee-section">
          <h4>Performance Fee</h4>
          <div class="fee-amount">£450.00</div>
          <p>Including equipment setup and 4-hour performance</p>
        </div>
      </div>

      <div class="section">
        <p>${theme.greeting}</p>
        <p>${theme.intro}</p>
        <p>This preview shows how your documents will look with the ${theme.name} theme. Your actual contracts and invoices will include real booking details and personalized content.</p>
        <p>${theme.closing}<br><strong>Tim Fulker - MusoBuddy</strong></p>
      </div>

      <div class="terms">
        <h4>Terms & Conditions</h4>
        <p>${theme.terms}</p>
        <p>Cancellation policy: 48 hours notice required for full refund. Equipment will be provided as specified in the contract.</p>
      </div>
    </body>
    </html>
  `;
}

async function generateThemePreviews() {
  console.log('🎨 Generating theme preview images...');
  
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: '/nix/store/zi4f80l169xlmivz8vja8wlphq74qqk0-chromium-125.0.6422.141/bin/chromium',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const previewsDir = path.join(process.cwd(), 'attached_assets', 'theme_previews');
    await fs.mkdir(previewsDir, { recursive: true });

    for (const [themeId, theme] of Object.entries(themes)) {
      console.log(`📄 Generating preview for ${theme.name}...`);
      
      const page = await browser.newPage();
      await page.setViewport({ width: 800, height: 1200 });
      
      const html = generatePreviewHTML(themeId, theme);
      await page.setContent(html, { waitUntil: 'networkidle0' });
      
      const screenshotPath = path.join(previewsDir, `${themeId}-preview.png`);
      await page.screenshot({
        path: screenshotPath,
        type: 'png',
        fullPage: true
      });
      
      console.log(`✅ Generated ${themeId} preview: ${screenshotPath}`);
      await page.close();
    }

    console.log('🎉 All theme previews generated successfully!');
    
  } catch (error) {
    console.error('❌ Error generating theme previews:', error);
  } finally {
    await browser.close();
  }
}

// Run the script
generateThemePreviews().catch(console.error);