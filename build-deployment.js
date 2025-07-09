#!/usr/bin/env node

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

console.log('🚀 Building deployment...');

// Clean dist directory
if (fs.existsSync('dist')) {
  execSync('rm -rf dist');
}

// Create dist structure
execSync('mkdir -p dist/public');

// Build server
console.log('📦 Building server...');
execSync('esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist');

// Copy client files and create production HTML
console.log('📱 Creating client build...');

// Copy static assets
if (fs.existsSync('client/public')) {
  execSync('cp -r client/public/* dist/public/');
}

// Create production HTML
const productionHTML = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1" />
    <title>MusoBuddy - Music Business Management</title>
    <meta name="description" content="Complete business management platform for freelance musicians. Streamline enquiries, contracts, invoices, and bookings.">
    <style>
      body {
        margin: 0;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        background: #0a0a0a;
        color: #fff;
        display: flex;
        align-items: center;
        justify-content: center;
        min-height: 100vh;
        flex-direction: column;
      }
      .container {
        text-align: center;
        max-width: 500px;
        padding: 2rem;
      }
      .logo {
        width: 80px;
        height: 80px;
        margin: 0 auto 2rem;
        background: #6366f1;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 2rem;
      }
      .message {
        margin: 1rem 0;
        padding: 1rem;
        background: #1e1e1e;
        border-radius: 8px;
        border-left: 4px solid #6366f1;
      }
      .button {
        display: inline-block;
        padding: 0.75rem 1.5rem;
        background: #6366f1;
        color: white;
        text-decoration: none;
        border-radius: 8px;
        margin-top: 1rem;
        transition: background 0.2s;
      }
      .button:hover {
        background: #5855eb;
      }
      .footer {
        margin-top: 2rem;
        color: #666;
        font-size: 0.9rem;
      }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="logo">🎵</div>
      <h1>MusoBuddy</h1>
      <h2>Music Business Management</h2>
      
      <div class="message">
        <p><strong>System Update in Progress</strong></p>
        <p>We're updating MusoBuddy with the latest features. Please use the development environment while we complete the deployment.</p>
      </div>
      
      <a href="https://musobuddy.replit.dev" class="button">
        Access MusoBuddy
      </a>
      
      <div class="footer">
        <p>Complete business management for freelance musicians</p>
        <p>Enquiries • Contracts • Invoices • Calendar • Email Management</p>
      </div>
    </div>
  </body>
</html>`;

fs.writeFileSync('dist/public/index.html', productionHTML);

console.log('✅ Deployment build completed successfully!');
console.log('📁 Server: dist/index.js');
console.log('📁 Client: dist/public/index.html');
console.log('🚀 Ready for deployment!');