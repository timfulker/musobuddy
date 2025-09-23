#!/usr/bin/env node

/**
 * MusoBuddy Mailgun Development Setup
 * 
 * Creates PARALLEL testing routes that don't interfere with production.
 * Uses tagged addresses like user+dev@enquiries.musobuddy.com for testing.
 * Production emails continue working normally.
 */

const formData = require('form-data');
const Mailgun = require('mailgun.js');

const mailgun = new Mailgun(formData);

class MailgunDevSetup {
  constructor() {
    if (!process.env.MAILGUN_API_KEY) {
      console.error('❌ MAILGUN_API_KEY environment variable is required');
      process.exit(1);
    }

    this.mg = mailgun.client({
      username: 'api',
      key: process.env.MAILGUN_API_KEY,
      url: 'https://api.eu.mailgun.net'
    });

    this.domain = 'enquiries.musobuddy.com';
    this.prodWebhook = 'https://musobuddy.replit.app/api/webhook/mailgun';
  }

  async listRoutes() {
    try {
      console.log('📋 Current Mailgun routes:\n');
      const routes = await this.mg.routes.list();
      
      routes.items.forEach((route, index) => {
        const isDevRoute = route.description.includes('[DEV-PARALLEL]');
        const marker = isDevRoute ? '🧪 [DEV]' : '🏭 [PROD]';
        
        console.log(`${marker} Route ${index + 1}:`);
        console.log(`  ID: ${route.id}`);
        console.log(`  Description: ${route.description}`);
        console.log(`  Expression: ${route.expression}`);
        console.log(`  Actions: ${route.actions.join(', ')}`);
        console.log(`  Priority: ${route.priority}`);
        console.log('');
      });

      return routes.items;
    } catch (error) {
      console.error('❌ Error fetching routes:', error.message);
      return [];
    }
  }

  async createDevRoute(ngrokUrl) {
    if (!ngrokUrl) {
      console.error('❌ Please provide your ngrok URL (e.g., https://abc123.ngrok.io)');
      return;
    }

    console.log('🧪 Creating parallel development route...');
    console.log('✅ Production emails will continue working normally');
    console.log(`📡 Dev webhook: ${ngrokUrl}/api/webhook/mailgun\n`);

    try {
      // Create a high-priority route that catches +dev tagged emails
      const devRoute = await this.mg.routes.create({
        priority: 0, // Highest priority to catch dev emails first
        description: '[DEV-PARALLEL] Development testing route for +dev tagged emails',
        expression: 'match_recipient(".*\\+dev@enquiries.musobuddy.com")',
        action: [
          `forward("${ngrokUrl}/api/webhook/mailgun")`,
          'stop()' // Prevents further route processing
        ]
      });

      console.log('🎉 Parallel development route created successfully!');
      console.log(`📋 Route ID: ${devRoute.id}`);
      console.log(`🔧 Expression: match any email ending with +dev@enquiries.musobuddy.com`);
      console.log(`🛑 Includes stop() to prevent duplicate processing\n`);
      
      console.log('🧪 Testing Instructions:');
      console.log('• Send test emails to: yourname+dev@enquiries.musobuddy.com');
      console.log('• Production emails (yourname@enquiries.musobuddy.com) continue working');
      console.log('• Monitor webhooks at: http://127.0.0.1:4040 (ngrok interface)');
      console.log('• Check dev server logs for processing\n');

      return { success: true, routeId: devRoute.id };
      
    } catch (error) {
      console.error('❌ Failed to create development route:', error.message);
      return { success: false, error: error.message };
    }
  }

  async removeDevRoute() {
    console.log('🧹 Removing development testing route...\n');

    try {
      const routes = await this.mg.routes.list();
      const devRoutes = routes.items.filter(route => 
        route.description.includes('[DEV-PARALLEL]')
      );

      if (devRoutes.length === 0) {
        console.log('ℹ️  No development routes found to remove');
        return { success: true, removed: 0 };
      }

      let removed = 0;
      for (const route of devRoutes) {
        console.log(`🗑️  Removing dev route: ${route.id}`);
        await this.mg.routes.destroy(route.id);
        removed++;
      }

      console.log(`\n✅ Successfully removed ${removed} development route(s)`);
      console.log('🏭 Production routes remain completely untouched');
      
      return { success: true, removed };
      
    } catch (error) {
      console.error('❌ Error removing development routes:', error.message);
      return { success: false, error: error.message };
    }
  }

  async status() {
    console.log('📊 MusoBuddy Mailgun Status\n');
    
    try {
      const routes = await this.mg.routes.list();
      const prodRoutes = routes.items.filter(route => 
        !route.description.includes('[DEV-PARALLEL]')
      );
      const devRoutes = routes.items.filter(route => 
        route.description.includes('[DEV-PARALLEL]')
      );

      console.log(`🏭 Production routes: ${prodRoutes.length} active`);
      console.log(`🧪 Development routes: ${devRoutes.length} active\n`);

      if (devRoutes.length > 0) {
        console.log('🧪 Active Development Setup:');
        devRoutes.forEach(route => {
          console.log(`  • Route ID: ${route.id}`);
          console.log(`  • Expression: ${route.expression}`);
          const webhook = route.actions.find(action => action.includes('forward'));
          if (webhook) {
            const url = webhook.match(/forward\("([^"]+)"\)/)?.[1];
            console.log(`  • Webhook: ${url}`);
          }
        });
        console.log('\n✅ Send test emails to: yourname+dev@enquiries.musobuddy.com');
      } else {
        console.log('ℹ️  No development routes configured');
        console.log('💡 Run: node mailgun-dev-setup.js create <ngrok-url>');
      }

    } catch (error) {
      console.error('❌ Error checking status:', error.message);
    }
  }
}

// CLI Interface
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  const setup = new MailgunDevSetup();

  console.log('🎵 MusoBuddy Mailgun Development Setup\n');

  switch (command) {
    case 'list':
      await setup.listRoutes();
      break;
      
    case 'create':
      const ngrokUrl = args[1];
      if (!ngrokUrl) {
        console.log('Usage: node mailgun-dev-setup.js create <ngrok-url>');
        console.log('Example: node mailgun-dev-setup.js create https://abc123.ngrok.io');
        break;
      }
      await setup.createDevRoute(ngrokUrl);
      break;
      
    case 'remove':
      await setup.removeDevRoute();
      break;

    case 'status':
      await setup.status();
      break;
      
    default:
      console.log('Commands:');
      console.log('  list                - List all current Mailgun routes');
      console.log('  create <ngrok-url>  - Create parallel development route');
      console.log('  remove              - Remove development routes');
      console.log('  status              - Show current setup status');
      console.log('');
      console.log('Examples:');
      console.log('  node mailgun-dev-setup.js status');
      console.log('  node mailgun-dev-setup.js create https://abc123.ngrok.io');
      console.log('  node mailgun-dev-setup.js remove');
      break;
  }
}

main().catch(console.error);