import type { Express } from "express";
import { authenticateWithFirebase, type AuthenticatedRequest } from '../middleware/firebase-auth';
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
      const orchestrationResult = await aiOrchestrator.runTask('support-chat', aiRequest, taskConfig);

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
  app.post('/api/support-chat', authenticateWithFirebase, async (req: AuthenticatedRequest, res) => {
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