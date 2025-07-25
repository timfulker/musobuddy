import { storage } from './storage';

interface User {
  id: string;
  emailPrefix?: string | null;
}

export class EmailOnboardingService {
  
  async validateEmailPrefix(prefix: string): Promise<{ valid: boolean; error?: string }> {
    // Basic format validation
    if (!prefix || prefix.length < 2) {
      return { valid: false, error: 'Email prefix must be at least 2 characters long' };
    }
    
    if (prefix.length > 25) {
      return { valid: false, error: 'Email prefix must be 25 characters or less' };
    }

    // Allow only letters, numbers, and hyphens (like Gmail)
    const validFormat = /^[a-z0-9-]+$/.test(prefix.toLowerCase());
    if (!validFormat) {
      return { valid: false, error: 'Email prefix can only contain letters, numbers, and hyphens' };
    }

    // Cannot start or end with hyphen
    if (prefix.startsWith('-') || prefix.endsWith('-')) {
      return { valid: false, error: 'Email prefix cannot start or end with a hyphen' };
    }

    // Reserved prefixes
    const reserved = [
      'leads', 'admin', 'support', 'noreply', 'info', 'contact', 'sales', 'billing', 
      'help', 'no-reply', 'mail', 'email', 'www', 'ftp', 'webmaster', 'hostmaster',
      'root', 'postmaster', 'abuse', 'security', 'api', 'dev', 'test', 'staging'
    ];
    
    if (reserved.includes(prefix.toLowerCase())) {
      return { valid: false, error: 'This email prefix is reserved. Please choose a different one.' };
    }

    return { valid: true };
  }

  async checkEmailPrefixAvailability(prefix: string): Promise<{ available: boolean; suggestion?: string }> {
    try {
      const users = await storage.getAllUsers();
      const existingUser = users.find((u: User) => u.emailPrefix?.toLowerCase() === prefix.toLowerCase());
      
      if (existingUser) {
        // Generate suggestions like Gmail does
        const suggestions = [
          `${prefix}music`,
          `${prefix}live`,
          `${prefix}gigs`,
          `${prefix}${Math.floor(Math.random() * 999)}`,
          `${prefix}-music`,
          `${prefix}-live`
        ];
        
        return { 
          available: false, 
          suggestion: suggestions[Math.floor(Math.random() * suggestions.length)]
        };
      }
      
      return { available: true };
    } catch (error) {
      console.error('Error checking email prefix availability:', error);
      return { available: false };
    }
  }

  async assignEmailPrefixToUser(userId: string, emailPrefix: string): Promise<{ success: boolean; email?: string; error?: string }> {
    try {
      // Validate format
      const validation = await this.validateEmailPrefix(emailPrefix);
      if (!validation.valid) {
        return { success: false, error: validation.error };
      }

      // Check availability
      const availability = await this.checkEmailPrefixAvailability(emailPrefix);
      if (!availability.available) {
        return { 
          success: false, 
          error: `Email prefix "${emailPrefix}" is already taken. Try "${availability.suggestion}" instead.` 
        };
      }

      // Assign to user
      await storage.updateUser(userId, { emailPrefix: emailPrefix.toLowerCase() });
      
      const fullEmail = `leads+${emailPrefix.toLowerCase()}@mg.musobuddy.com`;
      console.log(`✅ Assigned email ${fullEmail} to user ${userId}`);
      
      return { 
        success: true, 
        email: fullEmail 
      };
      
    } catch (error: any) {
      console.error('Error assigning email prefix:', error);
      return { success: false, error: 'Failed to assign email prefix' };
    }
  }

  async getUserEmail(userId: string): Promise<string | null> {
    try {
      const user = await storage.getUserById(userId);
      if (user?.emailPrefix) {
        return `leads+${user.emailPrefix}@mg.musobuddy.com`;
      }
      return null;
    } catch (error) {
      console.error('Error getting user email:', error);
      return null;
    }
  }
}

export const emailOnboarding = new EmailOnboardingService();