#!/usr/bin/env node

/**
 * MusoBuddy Mailgun Development Setup
 * 
 * This script helps you switch Mailgun routes between production and development
 * for testing email webhooks locally using ngrok.
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
      console.log('📋 Fetching current Mailgun routes...\n');
      const routes = await this.mg.routes.list();
      
      routes.items.forEach((route, index) => {
        console.log(`Route ${index + 1}:`);
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

  async switchToDev(ngrokUrl) {
    if (!ngrokUrl) {
      console.error('❌ Please provide your ngrok URL (e.g., https://abc123.ngrok.io)');
      return;
    }

    console.log(`🔄 Switching routes to development mode...`);
    console.log(`📡 Dev webhook: ${ngrokUrl}/api/webhook/mailgun\n`);

    try {
      const routes = await this.mg.routes.list();
      const updates = [];

      for (const route of routes.items) {
        // Check if this route contains the production webhook
        const hasProductionWebhook = route.actions.some(action => 
          action.includes(this.prodWebhook)
        );

        if (hasProductionWebhook) {
          console.log(`🔧 Updating route: ${route.description}`);
          
          // Replace production webhook with development webhook
          const newActions = route.actions.map(action => 
            action.replace(this.prodWebhook, `${ngrokUrl}/api/webhook/mailgun`)
          );

          await this.mg.routes.update(route.id, {
            priority: route.priority,
            description: `[DEV] ${route.description}`,
            expression: route.expression,
            action: newActions
          });

          updates.push({
            id: route.id,
            description: route.description,
            oldActions: route.actions,
            newActions: newActions
          });

          console.log(`✅ Updated route ${route.id}`);
        }
      }

      console.log(`\n🎉 Successfully switched ${updates.length} routes to development mode!`);
      console.log('\n⚠️  Remember to switch back to production when done testing!');
      
      return updates;
    } catch (error) {
      console.error('❌ Error switching to dev mode:', error.message);
    }
  }

  async switchToProd() {
    console.log('🔄 Switching routes back to production mode...\n');

    try {
      const routes = await this.mg.routes.list();
      const updates = [];

      for (const route of routes.items) {
        // Check if this is a dev route (has [DEV] prefix or ngrok URL)
        const isDevRoute = route.description.includes('[DEV]') || 
                          route.actions.some(action => action.includes('ngrok.io'));

        if (isDevRoute) {
          console.log(`🔧 Reverting route: ${route.description}`);
          
          // Replace any ngrok URLs with production webhook
          const newActions = route.actions.map(action => {
            // Replace any ngrok URL with production webhook
            return action.replace(/https:\/\/[a-z0-9-]+\.ngrok\.io\/api\/webhook\/mailgun/g, this.prodWebhook);
          });

          // Remove [DEV] prefix from description
          const newDescription = route.description.replace('[DEV] ', '');

          await this.mg.routes.update(route.id, {
            priority: route.priority,
            description: newDescription,
            expression: route.expression,
            action: newActions
          });

          updates.push({
            id: route.id,
            description: route.description,
            newDescription: newDescription
          });

          console.log(`✅ Reverted route ${route.id}`);
        }
      }

      console.log(`\n🎉 Successfully switched ${updates.length} routes back to production!`);
      
      return updates;
    } catch (error) {
      console.error('❌ Error switching to production mode:', error.message);
    }
  }
}

// CLI Interface
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  const setup = new MailgunDevSetup();

  switch (command) {
    case 'list':
      await setup.listRoutes();
      break;
      
    case 'dev':
      const ngrokUrl = args[1];
      if (!ngrokUrl) {
        console.log('Usage: node mailgun-dev-setup.js dev <ngrok-url>');
        console.log('Example: node mailgun-dev-setup.js dev https://abc123.ngrok.io');
        break;
      }
      await setup.switchToDev(ngrokUrl);
      break;
      
    case 'prod':
      await setup.switchToProd();
      break;
      
    default:
      console.log('MusoBuddy Mailgun Development Setup');
      console.log('');
      console.log('Commands:');
      console.log('  list              - List all current Mailgun routes');
      console.log('  dev <ngrok-url>   - Switch routes to development (ngrok)');
      console.log('  prod              - Switch routes back to production');
      console.log('');
      console.log('Examples:');
      console.log('  node mailgun-dev-setup.js list');
      console.log('  node mailgun-dev-setup.js dev https://abc123.ngrok.io');
      console.log('  node mailgun-dev-setup.js prod');
      break;
  }
}

main().catch(console.error);