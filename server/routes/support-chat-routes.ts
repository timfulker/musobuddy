import type { Express } from "express";
import { authenticate, type AuthenticatedRequest } from '../middleware/supabase-only-auth';
import { aiOrchestrator, AIRequest, TaskConfig } from '../services/ai-orchestrator';
import { ValidatorFactory, ScorerFactory } from '../services/ai-validators';
import { storage } from '../core/storage';

// Support Chat AI Response Generator
class SupportChatAI {
  
  // Generate system prompt for support chat
  private buildSupportChatSystemPrompt(userSettings?: any): string {
    const businessName = userSettings?.businessName || 'your business';
    const primaryInstrument = userSettings?.primaryInstrument || 'musician';
    
    return `You are MusoBuddy Assistant, an expert support agent for MusoBuddy - a comprehensive booking and business management platform for musicians and entertainers.

CORE CAPABILITIES YOU CAN HELP WITH:
• Bookings Management: Creating, editing, tracking bookings and enquiries
• Contract System: Generating, sending, and managing performance contracts  
• Invoice Management: Creating invoices, payment tracking, PDF generation
• Communication Tools: Email templates, client messaging, SMS notifications
• Calendar Integration: Google Calendar sync, availability management
• Client Portal: Public booking forms, contract signing, invoice viewing
• Business Settings: Pricing, business details, payment preferences
• Compliance: GDPR tools, terms & conditions, privacy policies

PLATFORM FEATURES:
- AI-powered email responses and booking management
- Automated contract generation with e-signatures
- Professional invoice system with payment tracking
- Real-time conflict detection for double bookings
- Mobile-responsive design for on-the-go management
- Secure client portals for bookings and payments
- Integration with Google Calendar and Maps
- Advanced analytics and reporting tools

USER CONTEXT:
- Business Name: ${businessName}
- Primary Instrument/Service: ${primaryInstrument}
- Platform: MusoBuddy (musobuddy.com)

RESPONSE GUIDELINES:
1. Be helpful, professional, and concise
2. Provide specific, actionable guidance
3. Reference relevant MusoBuddy features when applicable
4. If asked about technical issues, suggest checking the Help section or contacting support
5. Keep responses under 200 words unless detailed explanation is needed
6. Use friendly, supportive tone while maintaining professionalism

IMPORTANT: Only provide information about MusoBuddy platform features. If asked about unrelated topics, politely redirect to platform-related questions.

You should respond in plain text format (not JSON). Provide helpful, accurate information about using MusoBuddy effectively.`;
  }

  // Generate AI response for support chat
  async generateSupportResponse(message: string, userSettings?: any): Promise<string> {
    console.log('🤖 [SUPPORT-CHAT] Generating AI response for user message...');
    
    try {
      const systemPrompt = this.buildSupportChatSystemPrompt(userSettings);
      const userPrompt = `User Question: "${message}"

Please provide a helpful response about using MusoBuddy platform.`;

      console.log('🤖 [SUPPORT-CHAT] System prompt length:', systemPrompt.length);
      console.log('🤖 [SUPPORT-CHAT] User message:', message.substring(0, 100));

      // Prepare AI request for orchestrator
      const aiRequest: AIRequest = {
        systemPrompt,
        userPrompt,
        maxTokens: 300, // Keep responses concise for chat
        temperature: 0.7,
        responseFormat: 'text' // Plain text response for chat
      };

      // Configure for support chat: prioritize speed and cost-effectiveness
      const taskConfig: TaskConfig = {
        models: ['gpt-4o-mini', 'gpt-4o'], // Start with cost-effective model
        confidenceThreshold: 0.6, // Lower threshold for chat responses
        maxBudgetCents: 20, // Lower budget for support chat
        validators: [
          // Simple text validation for support chat
          (result: any) => {
            const content = result.content || '';
            const hasContent = content.trim().length > 10;
            const isHelpful = content.toLowerCase().includes('musobuddy') || 
                            content.toLowerCase().includes('booking') ||
                            content.toLowerCase().includes('help') ||
                            content.length > 30;
            
            return {
              valid: hasContent && isHelpful,
              errors: !hasContent ? ['Response too short'] : !isHelpful ? ['Response not helpful'] : undefined
            };
          }
        ],
        scorer: (result: any, input: any) => {
          const content = result.content || '';
          let score = 0.5;
          
          // Score based on response quality
          if (content.length > 20) score += 0.1;
          if (content.length > 50) score += 0.1;
          if (content.toLowerCase().includes('musobuddy')) score += 0.1;
          if (content.includes('booking') || content.includes('contract') || content.includes('invoice')) score += 0.1;
          if (content.includes('help') || content.includes('assistance')) score += 0.1;
          
          return Math.min(1.0, score);
        }
      };

      console.log('🤖 [SUPPORT-CHAT] Starting AI orchestration for support response...');
      
      // Use AI orchestrator for intelligent response generation
      const orchestrationResult = await aiOrchestrator.runTask('support-chat', aiRequest, taskConfig, req.user?.id);

      if (!orchestrationResult.success || !orchestrationResult.response) {
        console.error('❌ [SUPPORT-CHAT] AI orchestration failed:', orchestrationResult.error);
        console.error('❌ [SUPPORT-CHAT] Escalation path:', orchestrationResult.escalationPath);
        return this.getFallbackResponse();
      }

      const aiResponse = orchestrationResult.response;
      const content = aiResponse.content;

      console.log('✅ [SUPPORT-CHAT] AI response generated successfully with', aiResponse.model);
      console.log('🤖 [SUPPORT-CHAT] TOKEN USAGE:', {
        model: aiResponse.model,
        inputTokens: aiResponse.inputTokens,
        outputTokens: aiResponse.outputTokens,
        confidence: aiResponse.confidence,
        costCents: orchestrationResult.totalCostCents,
        escalationPath: orchestrationResult.escalationPath
      });
      
      if (!content || content.trim().length < 10) {
        console.warn('⚠️ [SUPPORT-CHAT] Generated response too short, using fallback');
        return this.getFallbackResponse();
      }
      
      return content.trim();
      
    } catch (error) {
      console.error('❌ [SUPPORT-CHAT] Error generating AI response:', error);
      return this.getFallbackResponse();
    }
  }

  // Fallback response when AI fails
  private getFallbackResponse(): string {
    return `I apologize, but I'm having trouble processing your request right now. Here are some ways I can help you with MusoBuddy:

• **Bookings**: Create and manage your performance bookings
• **Contracts**: Generate and send professional contracts to clients  
• **Invoices**: Create invoices and track payments
• **Settings**: Configure your business details and preferences

You can also check our Help section in the app or contact our support team directly. Is there a specific feature you'd like help with?`;
  }
}

// Initialize support chat AI instance
const supportChatAI = new SupportChatAI();

export function registerSupportChatRoutes(app: Express) {
  console.log('💬 Setting up support chat routes...');

  // Main support chat endpoint
  app.post('/api/support-chat', authenticate, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user?.id;
      const { message } = req.body;

      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      if (!message || typeof message !== 'string' || message.trim().length === 0) {
        return res.status(400).json({ error: 'Message is required' });
      }

      if (message.length > 1000) {
        return res.status(400).json({ error: 'Message too long (max 1000 characters)' });
      }

      console.log(`💬 [SUPPORT-CHAT] Processing message for user ${userId}: "${message.substring(0, 50)}${message.length > 50 ? '...' : ''}"`);

      // Get user settings for personalized responses
      let userSettings;
      try {
        userSettings = await storage.getSettings(userId);
      } catch (error) {
        console.warn('⚠️ [SUPPORT-CHAT] Could not fetch user settings:', error.message);
        userSettings = null;
      }

      // Generate AI response
      const response = await supportChatAI.generateSupportResponse(message.trim(), userSettings);

      console.log(`✅ [SUPPORT-CHAT] Generated response for user ${userId} (${response.length} characters)`);

      res.json({
        response,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('❌ [SUPPORT-CHAT] Error processing support chat request:', error);
      res.status(500).json({ 
        error: 'Failed to process your message. Please try again.',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  });

  // Support email endpoint
  app.post('/api/support/email', authenticate, async (req: AuthenticatedRequest, res) => {
    try {
      const { subject, message } = req.body;
      const userId = req.user?.id;
      const userEmail = req.user?.email;

      if (!userId || !userEmail) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      if (!subject || !message || typeof subject !== 'string' || typeof message !== 'string') {
        return res.status(400).json({ error: 'Subject and message are required' });
      }

      if (subject.trim().length === 0 || message.trim().length === 0) {
        return res.status(400).json({ error: 'Subject and message cannot be empty' });
      }

      if (subject.length > 200 || message.length > 5000) {
        return res.status(400).json({ error: 'Subject or message too long' });
      }

      console.log(`📧 [SUPPORT-EMAIL] Processing support email from user ${userId} (${userEmail})`);

      // Get user settings for business name if available
      let userSettings;
      try {
        userSettings = await storage.getSettings(userId);
      } catch (error) {
        console.warn('⚠️ [SUPPORT-EMAIL] Could not fetch user settings:', error.message);
        userSettings = null;
      }

      const businessName = userSettings?.businessName || userEmail;

      // Import EmailService dynamically to avoid import issues
      const { EmailService } = await import('../core/services');
      const emailService = new EmailService();

      // Send email to support@musobuddy.com
      const emailResult = await emailService.sendEmail({
        from: `${businessName} via MusoBuddy <noreply@enquiries.musobuddy.com>`,
        to: 'support@musobuddy.com',
        subject: `[MusoBuddy Support] ${subject.trim()}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
              <h3 style="margin: 0 0 10px 0; color: #2c3e50;">Support Request from MusoBuddy Platform</h3>
              <p style="margin: 5px 0; color: #666;"><strong>From:</strong> ${businessName} (${userEmail})</p>
              <p style="margin: 5px 0; color: #666;"><strong>User ID:</strong> ${userId}</p>
              <p style="margin: 5px 0; color: #666;"><strong>Date:</strong> ${new Date().toLocaleString('en-GB')}</p>
            </div>
            
            <div style="background: white; padding: 20px; border: 1px solid #e1e5e9; border-radius: 8px;">
              <h4 style="margin: 0 0 15px 0; color: #2c3e50;">Subject: ${subject.trim()}</h4>
              <div style="white-space: pre-wrap; line-height: 1.6; color: #333;">${message.trim()}</div>
            </div>
            
            <div style="margin-top: 20px; padding: 15px; background: #f8f9fa; border-radius: 8px; text-align: center; color: #666; font-size: 14px;">
              This email was sent via the MusoBuddy Platform Support System
            </div>
          </div>
        `,
        text: `
Support Request from MusoBuddy Platform

From: ${businessName} (${userEmail})
User ID: ${userId}
Date: ${new Date().toLocaleString('en-GB')}

Subject: ${subject.trim()}

Message:
${message.trim()}

---
This email was sent via the MusoBuddy Platform Support System
        `
      });

      if (emailResult.success) {
        console.log(`✅ [SUPPORT-EMAIL] Email sent successfully for user ${userId}`);
        res.json({
          success: true,
          message: 'Your support email has been sent successfully. We\'ll get back to you soon!'
        });
      } else {
        console.error(`❌ [SUPPORT-EMAIL] Failed to send email for user ${userId}:`, emailResult.error);
        res.status(500).json({
          success: false,
          error: 'Failed to send support email. Please try again later.'
        });
      }

    } catch (error) {
      console.error('❌ [SUPPORT-EMAIL] Error processing support email request:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to process your support email. Please try again.',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  });

  // Support chat health check
  app.get('/api/support-chat/health', (req, res) => {
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'MusoBuddy Support Chat'
    });
  });

  console.log('✅ Support chat routes registered successfully');
}