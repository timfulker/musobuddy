import OpenAI from "openai";
import { aiOrchestrator, AIRequest, TaskConfig } from './ai-orchestrator';
import { ValidatorFactory, ScorerFactory } from './ai-validators';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export interface EventMatchResult {
  isMatch: boolean;
  confidence: number;
  reasoning: string;
  matchScore: number;
}

export class AIEventMatcher {
  
  // Main function to determine if two events are the same (cost-conscious)
  async compareEvents(musobuddyBooking: any, googleEvent: any, useAI: boolean = false): Promise<EventMatchResult> {
    // Always start with rule-based matching (free)
    const ruleBasedScore = this.calculateRuleBasedScore(musobuddyBooking, googleEvent);
    
    // If rule-based matching is confident (very high or very low), use that
    if (ruleBasedScore > 0.85 || ruleBasedScore < 0.3) {
      return {
        isMatch: ruleBasedScore > 0.85,
        confidence: ruleBasedScore,
        reasoning: ruleBasedScore > 0.85 ? 'High confidence rule-based match' : 'Clear non-match via rules',
        matchScore: ruleBasedScore
      };
    }
    
    // Only use AI for uncertain cases (0.3-0.85 range) and if explicitly enabled
    if (useAI && ruleBasedScore >= 0.3 && ruleBasedScore <= 0.85) {
      try {
        console.log(`🤖 Using AI for uncertain match (rule score: ${ruleBasedScore.toFixed(2)})`);
        const comparisonData = this.buildComparisonData(musobuddyBooking, googleEvent);
        const aiResult = await this.getAIMatchAnalysis(comparisonData);
        
        return {
          isMatch: aiResult.isMatch,
          confidence: aiResult.confidence,
          reasoning: `AI analysis: ${aiResult.reasoning}`,
          matchScore: aiResult.matchScore
        };
        
      } catch (error) {
        console.error('❌ AI event matching failed, using rule-based result:', error);
      }
    }
    
    // Default to rule-based result for uncertain cases when AI is disabled
    return {
      isMatch: ruleBasedScore > 0.7, // Slightly lower threshold without AI
      confidence: ruleBasedScore,
      reasoning: `Rule-based matching (AI ${useAI ? 'failed' : 'disabled'})`,
      matchScore: ruleBasedScore
    };
  }

  // Prepare structured data for AI analysis
  private buildComparisonData(musobuddyBooking: any, googleEvent: any) {
    return {
      musobuddy: {
        date: musobuddyBooking.eventDate,
        time: musobuddyBooking.eventTime,
        endTime: musobuddyBooking.eventEndTime,
        client: musobuddyBooking.clientName,
        venue: musobuddyBooking.venue,
        address: musobuddyBooking.venueAddress,
        title: `${musobuddyBooking.clientName} - ${musobuddyBooking.venue}`,
        notes: musobuddyBooking.notes,
        fee: musobuddyBooking.fee
      },
      google: {
        summary: googleEvent.summary,
        date: googleEvent.start?.dateTime || googleEvent.start?.date,
        endDate: googleEvent.end?.dateTime || googleEvent.end?.date,
        location: googleEvent.location,
        description: googleEvent.description,
        id: googleEvent.id,
        musobuddyId: googleEvent.extendedProperties?.private?.musobuddyId
      }
    };
  }

  // Get AI analysis of event match with orchestrator escalation
  private async getAIMatchAnalysis(comparisonData: any): Promise<EventMatchResult> {
    const prompt = `You are an expert at matching calendar events. Compare these two events and determine if they represent the same booking:

MusoBuddy Booking:
- Date: ${comparisonData.musobuddy.date}
- Time: ${comparisonData.musobuddy.time} - ${comparisonData.musobuddy.endTime}
- Client: ${comparisonData.musobuddy.client}
- Venue: ${comparisonData.musobuddy.venue}
- Address: ${comparisonData.musobuddy.address}
- Title: ${comparisonData.musobuddy.title}
- Notes: ${comparisonData.musobuddy.notes}
- Fee: £${comparisonData.musobuddy.fee}

Google Calendar Event:
- Summary: ${comparisonData.google.summary}
- Date: ${comparisonData.google.date}
- End Date: ${comparisonData.google.endDate}
- Location: ${comparisonData.google.location}
- Description: ${comparisonData.google.description}
- Existing MusoBuddy ID: ${comparisonData.google.musobuddyId || 'None'}

Consider these factors:
1. Date and time proximity (exact match vs slight variations)
2. Venue/location similarity (exact match, partial match, or different format)
3. Client name similarity (exact, abbreviated, or different format)
4. Event duration consistency
5. Existing MusoBuddy ID linkage

Respond with JSON in this exact format:
{
  "isMatch": boolean,
  "confidence": number (0.0 to 1.0),
  "reasoning": "Brief explanation of why they match or don't match",
  "matchScore": number (0.0 to 1.0)
}`;

    const systemPrompt = "You are an expert calendar event matching system. Analyze events carefully and return accurate match assessments in JSON format.";
    
    // Prepare AI request for orchestrator
    const aiRequest: AIRequest = {
      systemPrompt,
      userPrompt: prompt,
      maxTokens: 500,
      temperature: 0.1,
      responseFormat: 'json_object'
    };

    // Configure escalation: GPT-4o mini → GPT-5 → Claude Sonnet 4
    const taskConfig: TaskConfig = {
      models: ['gpt-4o-mini', 'gpt-5', 'claude-sonnet-4'],
      confidenceThreshold: 0.80, // Escalate if confidence < 80% for event matching
      maxBudgetCents: 10, // Max 10 cents per event matching (conservative budget)
      validators: [
        ValidatorFactory.createEventMatcher() // Validates JSON and required fields
      ],
      scorer: ScorerFactory.createEventMatcherScorer() // Confidence scoring
    };

    console.log('🎯 [AI ORCHESTRATOR] Starting event matching with escalation system...');
    
    // Use AI orchestrator for intelligent escalation
    const orchestrationResult = await aiOrchestrator.runTask('event-matching', aiRequest, taskConfig);

    if (!orchestrationResult.success || !orchestrationResult.response) {
      console.error('❌ [AI ORCHESTRATOR] All models failed for event matching:', orchestrationResult.error);
      console.error('❌ Escalation path:', orchestrationResult.escalationPath);
      console.error('❌ Total cost:', `${orchestrationResult.totalCostCents}¢`);
      throw new Error(`AI orchestrator failed: ${orchestrationResult.error}`);
    }

    const aiResponse = orchestrationResult.response;
    const content = aiResponse.content;

    console.log('✅ [AI ORCHESTRATOR] Event matching success with', aiResponse.model, 'in', orchestrationResult.attempts, 'attempts');
    console.log('🎯 [AI ORCHESTRATOR] EVENT MATCHING STATS:', {
      model: aiResponse.model,
      inputTokens: aiResponse.inputTokens,
      outputTokens: aiResponse.outputTokens,
      confidence: aiResponse.confidence,
      costCents: orchestrationResult.totalCostCents,
      escalationPath: orchestrationResult.escalationPath
    });

    const result = JSON.parse(content);
    
    return {
      isMatch: result.isMatch,
      confidence: Math.max(0, Math.min(1, result.confidence)),
      reasoning: `${result.reasoning} (via ${aiResponse.model})`,
      matchScore: Math.max(0, Math.min(1, result.matchScore))
    };
  }

  // Rule-based fallback scoring system
  private calculateRuleBasedScore(musobuddyBooking: any, googleEvent: any): number {
    let score = 0;
    let maxScore = 0;

    // Check if there's already a MusoBuddy ID link (highest priority)
    maxScore += 40;
    if (googleEvent.extendedProperties?.private?.musobuddyId === musobuddyBooking.id.toString()) {
      score += 40;
    }

    // Date matching (very important)
    maxScore += 25;
    if (this.datesMatch(musobuddyBooking.eventDate, googleEvent.start?.dateTime || googleEvent.start?.date)) {
      score += 25;
    }

    // Time matching (important)
    maxScore += 20;
    if (this.timesMatch(musobuddyBooking.eventTime, googleEvent.start?.dateTime)) {
      score += 20;
    }

    // Venue/location matching
    maxScore += 10;
    if (this.locationsMatch(musobuddyBooking.venue, musobuddyBooking.venueAddress, googleEvent.location)) {
      score += 10;
    }

    // Client name in title/summary
    maxScore += 5;
    if (this.clientNameInSummary(musobuddyBooking.clientName, googleEvent.summary)) {
      score += 5;
    }

    return score / maxScore;
  }

  // Helper methods for rule-based matching
  private datesMatch(musoDate: string | Date, googleDate: string): boolean {
    if (!musoDate || !googleDate) return false;
    
    const muso = new Date(musoDate);
    const google = new Date(googleDate);
    
    return muso.getFullYear() === google.getFullYear() &&
           muso.getMonth() === google.getMonth() &&
           muso.getDate() === google.getDate();
  }

  private timesMatch(musoTime: string, googleDateTime: string): boolean {
    if (!musoTime || !googleDateTime) return false;
    
    const googleDate = new Date(googleDateTime);
    const googleTime = `${googleDate.getHours().toString().padStart(2, '0')}:${googleDate.getMinutes().toString().padStart(2, '0')}`;
    
    return musoTime === googleTime;
  }

  private locationsMatch(musoVenue: string, musoAddress: string, googleLocation: string): boolean {
    if (!googleLocation) return false;
    
    const googleLower = googleLocation.toLowerCase();
    const venueMatch = musoVenue && googleLower.includes(musoVenue.toLowerCase());
    const addressMatch = musoAddress && googleLower.includes(musoAddress.toLowerCase());
    
    return venueMatch || addressMatch;
  }

  private clientNameInSummary(clientName: string, summary: string): boolean {
    if (!clientName || !summary) return false;
    
    return summary.toLowerCase().includes(clientName.toLowerCase());
  }

  // Cost estimation for AI usage (updated for orchestrator)
  estimateAICost(uncertainMatches: number): { estimatedCost: number; maxCost: number } {
    // With orchestrator: 90%+ requests stay on GPT-4o mini (~$0.00015), 5-10% escalate
    // Conservative estimate assuming 20% escalation rate
    const avgCostPerComparison = 0.0003; // Slightly higher due to potential escalation
    
    return {
      estimatedCost: uncertainMatches * avgCostPerComparison,
      maxCost: uncertainMatches * 0.10 // 10 cents max per comparison (orchestrator budget limit)
    };
  }

  // Batch matching for efficiency (cost-conscious)
  async findBestMatches(
    musobuddyBookings: any[], 
    googleEvents: any[], 
    useAI: boolean = false
  ): Promise<{
    matches: Map<string, string>;
    stats: {
      totalComparisons: number;
      ruleBasedMatches: number;
      aiComparisons: number;
      estimatedCost: number;
    }
  }> {
    const matches = new Map<string, string>(); // booking ID -> google event ID
    let totalComparisons = 0;
    let ruleBasedMatches = 0;
    let aiComparisons = 0;
    
    // Pre-filter to reduce unnecessary comparisons
    const filteredGoogleEvents = googleEvents.filter(event => {
      // Only consider events within a reasonable time window
      const eventDate = new Date(event.start?.dateTime || event.start?.date);
      const now = new Date();
      const oneYearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
      const oneYearFromNow = new Date(now.getFullYear() + 1, now.getMonth(), now.getDate());
      
      return eventDate >= oneYearAgo && eventDate <= oneYearFromNow;
    });
    
    for (const booking of musobuddyBookings) {
      let bestMatch = null;
      let bestScore = 0;
      
      // Further filter Google events by date proximity for this booking
      const bookingDate = new Date(booking.eventDate);
      const relevantEvents = filteredGoogleEvents.filter(event => {
        if (Array.from(matches.values()).includes(event.id)) return false;
        
        const eventDate = new Date(event.start?.dateTime || event.start?.date);
        const daysDiff = Math.abs((eventDate.getTime() - bookingDate.getTime()) / (1000 * 60 * 60 * 24));
        
        return daysDiff <= 3; // Only consider events within 3 days
      });
      
      for (const googleEvent of relevantEvents) {
        totalComparisons++;
        
        const matchResult = await this.compareEvents(booking, googleEvent, useAI);
        
        if (matchResult.reasoning.includes('AI analysis')) {
          aiComparisons++;
        } else {
          ruleBasedMatches++;
        }
        
        if (matchResult.isMatch && matchResult.matchScore > bestScore) {
          bestMatch = googleEvent;
          bestScore = matchResult.matchScore;
        }
      }
      
      if (bestMatch && bestScore > 0.6) {
        matches.set(booking.id.toString(), bestMatch.id);
        console.log(`🎯 Matched booking ${booking.id} with Google event ${bestMatch.id} (score: ${bestScore.toFixed(2)})`);
      }
    }
    
    const costEstimate = this.estimateAICost(aiComparisons);
    
    return {
      matches,
      stats: {
        totalComparisons,
        ruleBasedMatches,
        aiComparisons,
        estimatedCost: costEstimate.estimatedCost
      }
    };
  }
}

export default AIEventMatcher;