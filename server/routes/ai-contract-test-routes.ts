import { type Express } from "express";
import { generateAIContractPDF } from "../ai-powered-contract-pdf";
import { generateContractPDF } from "../unified-contract-pdf";

export function registerAIContractTestRoutes(app: Express) {
  console.log('🧪 Setting up AI contract test routes...');

  // Test AI contract generation with sample data
  app.get('/api/test/ai-contract', async (req, res) => {
    try {
      // Sample contract data similar to Kelly Boyd
      const sampleContract = {
        id: 999,
        contractNumber: 'TEST-AI-CONTRACT-2025',
        clientName: 'Kelly Boyd',
        clientEmail: 'kelly.boyd@example.com',
        clientPhone: '07989676155',
        clientAddress: '94, Hambledon Road,\nWaterlooville, PO7 6UP',
        venue: "Kelly's House",
        venueAddress: '94, Hambledon Road, Waterlooville, PO7 6UP',
        eventDate: '2025-08-30T00:00:00.000Z',
        eventTime: '19:00',
        eventEndTime: '22:00',
        fee: '310.00',
        deposit: '100.00',
        travelExpenses: '0',
        paymentInstructions: 'Payment due on date of performance',
        equipmentRequirements: 'Client must provide adequate and safe power supply',
        specialRequirements: 'Client to provide suitable food and drink if performance exceeds 3 hours including setup',
        status: 'draft',
        createdAt: new Date(),
        signedAt: null,
        clientSignature: null
      };

      const sampleUserSettings = {
        businessName: 'Tim Fulker Music',
        businessEmail: 'tim@timfulkermusic.com',
        phone: '07764190034',
        addressLine1: '59, Gloucester Rd',
        city: 'Bournemouth',
        county: 'Dorset',
        postcode: 'BH7 6JA',
        themeAccentColor: '#8b5cf6',
        contractClauses: {
          deposit: true,
          balancePayment: true,
          cancellation: true,
          access: true,
          power: true,
          equipment: true,
          weather: true,
          recording: true,
          insurance: true,
          forceMajeure: true,
          paymentTerms: 'on_performance'
        },
        customClauses: [
          {
            text: 'Client to provide suitable food and drink if performance exceeds 3 hours including setup',
            enabled: true
          },
          {
            text: 'Client to cover parking fees; accommodation required if venue is over 50 miles or finish after midnight',
            enabled: true
          }
        ]
      };

      console.log('🤖 Testing AI contract generation...');
      const pdfBuffer = await generateAIContractPDF(sampleContract, sampleUserSettings);
      
      res.set({
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'inline; filename="ai-test-contract.pdf"',
        'Content-Length': pdfBuffer.length
      });

      res.send(pdfBuffer);
    } catch (error: any) {
      console.error('❌ AI contract test failed:', error);
      res.status(500).json({ 
        error: 'AI contract generation failed', 
        message: error.message,
        suggestion: 'Check that ANTHROPIC_API_KEY is set and valid'
      });
    }
  });

  // Compare AI vs Template side by side
  app.get('/api/test/contract-compare', async (req, res) => {
    try {
      const sampleContract = {
        id: 999,
        contractNumber: 'COMPARE-TEST-2025',
        clientName: 'Kelly Boyd',
        clientEmail: 'kelly.boyd@example.com',
        clientPhone: '07989676155',
        clientAddress: '94, Hambledon Road,\nWaterlooville, PO7 6UP',
        venue: "Kelly's House",
        venueAddress: '94, Hambledon Road, Waterlooville, PO7 6UP',
        eventDate: '2025-08-30T00:00:00.000Z',
        eventTime: '19:00',
        eventEndTime: '22:00',
        fee: '310.00',
        deposit: '100.00',
        travelExpenses: '0',
        status: 'draft',
        createdAt: new Date()
      };

      const sampleUserSettings = {
        businessName: 'Tim Fulker Music',
        businessEmail: 'tim@timfulkermusic.com',
        phone: '07764190034',
        addressLine1: '59, Gloucester Rd',
        city: 'Bournemouth',
        county: 'Dorset',
        postcode: 'BH7 6JA',
        themeAccentColor: '#8b5cf6',
        contractClauses: {
          deposit: true,
          balancePayment: true,
          cancellation: true,
          access: true,
          power: true,
          equipment: true,
          weather: true,
          recording: true,
          insurance: true,
          forceMajeure: true,
          paymentTerms: 'on_performance'
        }
      };

      const type = req.query.type as string;
      
      if (type === 'ai') {
        console.log('🤖 Generating AI contract...');
        const pdfBuffer = await generateAIContractPDF(sampleContract, sampleUserSettings);
        
        res.set({
          'Content-Type': 'application/pdf',
          'Content-Disposition': 'inline; filename="ai-contract.pdf"'
        });
        res.send(pdfBuffer);
      } else if (type === 'template') {
        console.log('📄 Generating template contract...');
        const pdfBuffer = await generateContractPDF(sampleContract, sampleUserSettings);
        
        res.set({
          'Content-Type': 'application/pdf',
          'Content-Disposition': 'inline; filename="template-contract.pdf"'
        });
        res.send(pdfBuffer);
      } else {
        res.json({
          message: 'Contract comparison endpoint',
          usage: {
            ai: '/api/test/contract-compare?type=ai',
            template: '/api/test/contract-compare?type=template'
          },
          note: 'Compare the formatting between AI and template systems'
        });
      }
    } catch (error: any) {
      console.error('❌ Contract comparison failed:', error);
      res.status(500).json({ 
        error: 'Contract comparison failed', 
        message: error.message 
      });
    }
  });

  // Test endpoint info
  app.get('/api/test/ai-info', (req, res) => {
    res.json({
      message: 'AI Contract Generation Test Endpoints',
      endpoints: {
        '/api/test/ai-contract': 'Generate AI contract PDF (Kelly Boyd sample)',
        '/api/test/contract-compare?type=ai': 'Generate AI contract for comparison',
        '/api/test/contract-compare?type=template': 'Generate template contract for comparison',
        '/api/test/contract-compare': 'Show comparison options'
      },
      status: 'Ready for testing',
      aiModel: 'claude-3-5-haiku-20241022',
      fallback: 'Template system if AI fails'
    });
  });

  console.log('✅ AI contract test routes registered');
}