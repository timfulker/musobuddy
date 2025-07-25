import formData from 'form-data';
import Mailgun from 'mailgun.js';

const mailgun = new Mailgun(formData);

// ENHANCED: Mailgun route management for multi-user email system
export class MailgunRouteManager {
  private mg: any;
  private domain = 'mg.musobuddy.com';

  constructor() {
    if (process.env.MAILGUN_API_KEY) {
      this.mg = mailgun.client({
        username: 'api',
        key: process.env.MAILGUN_API_KEY,
        url: 'https://api.eu.mailgun.net' // EU endpoint for mg.musobuddy.com
      });
    }
  }

  async createUserEmailRoute(emailPrefix: string, userId: string): Promise<{ success: boolean; routeId?: string; error?: string }> {
    if (!this.mg) {
      return { success: false, error: 'Mailgun not configured' };
    }

    try {
      console.log(`📧 Creating Mailgun route for user ${userId} with prefix "${emailPrefix}"`);
      
      const expression = `match_recipient("${emailPrefix}-leads@${this.domain}")`;
      const webhookUrl = `${process.env.APP_SERVER_URL || 'https://musobuddy.replit.app'}/api/webhook/mailgun`;
      
      const route = await this.mg.routes.create({
        priority: 1,
        description: `MusoBuddy lead emails for user ${userId} (${emailPrefix})`,
        expression: expression,
        action: [`forward("${webhookUrl}")`]
      });

      console.log(`✅ Mailgun route created successfully:`, route.id);
      return { success: true, routeId: route.id };
      
    } catch (error: any) {
      console.error(`❌ Failed to create Mailgun route:`, error);
      return { success: false, error: error.message };
    }
  }

  async deleteUserEmailRoute(routeId: string): Promise<{ success: boolean; error?: string }> {
    if (!this.mg) {
      return { success: false, error: 'Mailgun not configured' };
    }

    try {
      await this.mg.routes.destroy(routeId);
      console.log(`✅ Mailgun route deleted:`, routeId);
      return { success: true };
    } catch (error: any) {
      console.error(`❌ Failed to delete Mailgun route:`, error);
      return { success: false, error: error.message };
    }
  }

  async listRoutes(): Promise<any[]> {
    if (!this.mg) {
      return [];
    }

    try {
      const routes = await this.mg.routes.list();
      return routes.items || [];
    } catch (error: any) {
      console.error(`❌ Failed to list Mailgun routes:`, error);
      return [];
    }
  }

  async validateEmailPrefix(emailPrefix: string): Promise<{ valid: boolean; error?: string }> {
    // Check format: only lowercase letters, numbers, and hyphens
    const validFormat = /^[a-z0-9-]+$/.test(emailPrefix);
    
    if (!validFormat) {
      return { valid: false, error: 'Email prefix can only contain lowercase letters, numbers, and hyphens' };
    }

    if (emailPrefix.length < 2 || emailPrefix.length > 20) {
      return { valid: false, error: 'Email prefix must be 2-20 characters long' };
    }

    // Reserved prefixes
    const reserved = ['leads', 'admin', 'support', 'noreply', 'info', 'contact', 'sales', 'billing', 'help'];
    if (reserved.includes(emailPrefix)) {
      return { valid: false, error: 'This email prefix is reserved' };
    }

    return { valid: true };
  }
}

export const mailgunRoutes = new MailgunRouteManager();