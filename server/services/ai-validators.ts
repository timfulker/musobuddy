// AI Validation and Scoring utilities for MusoBuddy
// Used by AI Orchestrator for confidence-based escalation

export interface ValidationResult {
  valid: boolean;
  errors?: string[];
  warnings?: string[];
  score?: number;
}

// Booking Message Parsing Validators
export class BookingValidators {
  static validateParsedBooking(result: any): ValidationResult {
    try {
      const parsed = JSON.parse(result.content);
      const errors: string[] = [];
      const warnings: string[] = [];
      let score = 0.5;

      // Required field validation
      if (!parsed.clientName || parsed.clientName.trim() === '') {
        errors.push('Missing client name');
      } else {
        score += 0.15;
      }

      if (!parsed.clientEmail || !parsed.clientEmail.includes('@')) {
        errors.push('Missing or invalid client email');
      } else {
        score += 0.15;
      }

      // Date validation - critical for bookings
      if (!parsed.eventDate) {
        errors.push('Missing event date');
      } else if (!/^\d{4}-\d{2}-\d{2}$/.test(parsed.eventDate)) {
        errors.push('Invalid date format (expected YYYY-MM-DD)');
      } else {
        const eventDate = new Date(parsed.eventDate);
        const now = new Date();
        if (eventDate < now.setHours(0, 0, 0, 0)) {
          warnings.push('Event date is in the past');
        }
        score += 0.15;
      }

      // Location validation
      if (!parsed.venue && !parsed.venueAddress) {
        warnings.push('Missing venue information');
      } else {
        score += 0.1;
      }

      // Fee validation
      if (parsed.fee !== undefined && parsed.fee !== null) {
        if (typeof parsed.fee !== 'number' || parsed.fee < 0) {
          errors.push('Invalid fee amount');
        } else {
          score += 0.1;
        }
      }

      return {
        valid: errors.length === 0,
        errors: errors.length > 0 ? errors : undefined,
        warnings: warnings.length > 0 ? warnings : undefined,
        score: Math.min(1.0, score)
      };

    } catch (error) {
      return {
        valid: false,
        errors: [`JSON parsing failed: ${error.message}`],
        score: 0.1
      };
    }
  }
}

// AI Response Generation Validators
export class ResponseValidators {
  static validateGeneratedResponse(result: any): ValidationResult {
    try {
      const parsed = JSON.parse(result.content);
      const errors: string[] = [];
      const warnings: string[] = [];
      let score = 0.5;

      // Subject validation
      if (!parsed.subject || parsed.subject.trim() === '') {
        errors.push('Missing email subject');
      } else if (parsed.subject.length < 5) {
        warnings.push('Email subject very short');
        score += 0.15;
      } else {
        score += 0.2;
      }

      // Email body validation
      if (!parsed.emailBody || parsed.emailBody.trim() === '') {
        errors.push('Missing email body');
      } else {
        const bodyLength = parsed.emailBody.trim().length;
        if (bodyLength < 20) {
          errors.push('Email body too short');
        } else if (bodyLength < 50) {
          warnings.push('Email body quite short');
          score += 0.15;
        } else if (bodyLength > 2000) {
          warnings.push('Email body very long');
          score += 0.2;
        } else {
          score += 0.25;
        }
      }

      // Professional tone checks (basic)
      if (parsed.emailBody) {
        const body = parsed.emailBody.toLowerCase();
        
        // Check for greeting
        if (body.includes('hi ') || body.includes('hello') || body.includes('dear')) {
          score += 0.05;
        }
        
        // Check for closing
        if (body.includes('best regards') || body.includes('kind regards') || body.includes('thanks')) {
          score += 0.05;
        }
      }

      return {
        valid: errors.length === 0,
        errors: errors.length > 0 ? errors : undefined,
        warnings: warnings.length > 0 ? warnings : undefined,
        score: Math.min(1.0, score)
      };

    } catch (error) {
      return {
        valid: false,
        errors: [`JSON parsing failed: ${error.message}`],
        score: 0.1
      };
    }
  }
}

// Event Matching Validators
export class EventMatchValidators {
  static validateEventMatch(result: any): ValidationResult {
    try {
      const parsed = JSON.parse(result.content);
      const errors: string[] = [];
      const warnings: string[] = [];
      let score = 0.5;

      // Required fields for event matching
      if (typeof parsed.isMatch !== 'boolean') {
        errors.push('Missing or invalid isMatch field');
      } else {
        score += 0.2;
      }

      if (typeof parsed.confidence !== 'number' || parsed.confidence < 0 || parsed.confidence > 1) {
        errors.push('Missing or invalid confidence score');
      } else {
        score += 0.2;
        // Use the provided confidence as part of our score
        score = Math.max(score, parsed.confidence);
      }

      if (!parsed.reasoning || typeof parsed.reasoning !== 'string' || parsed.reasoning.length < 10) {
        errors.push('Missing or insufficient reasoning');
      } else {
        score += 0.1;
      }

      // Consistency checks
      if (parsed.confidence > 0.8 && parsed.reasoning.length < 50) {
        warnings.push('High confidence but limited reasoning provided');
      }

      if (parsed.confidence < 0.3 && parsed.isMatch === true) {
        warnings.push('Low confidence but marked as match - investigate');
      }

      return {
        valid: errors.length === 0,
        errors: errors.length > 0 ? errors : undefined,
        warnings: warnings.length > 0 ? warnings : undefined,
        score: Math.min(1.0, score)
      };

    } catch (error) {
      return {
        valid: false,
        errors: [`JSON parsing failed: ${error.message}`],
        score: 0.1
      };
    }
  }
}

// PDF Optimization Validators
export class PDFValidators {
  static validatePDFOptimization(result: any): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    let score = 0.5;

    // Basic content validation
    if (!result.content || result.content.trim() === '') {
      errors.push('Empty optimization result');
      return { valid: false, errors, score: 0.1 };
    }

    // Check for CSS-like content (PDF optimization returns CSS)
    const content = result.content.toLowerCase();
    if (!content.includes('css') && !content.includes('{') && !content.includes('}')) {
      warnings.push('Result doesn\'t appear to contain CSS optimization');
      score += 0.2;
    } else {
      score += 0.4;
    }

    // Check for common PDF optimization patterns
    const optimizationPatterns = ['page-break', 'margin', 'padding', 'font-size', 'line-height'];
    const foundPatterns = optimizationPatterns.filter(pattern => content.includes(pattern));
    score += Math.min(0.4, foundPatterns.length * 0.1);

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
      warnings: warnings.length > 0 ? warnings : undefined,
      score: Math.min(1.0, score)
    };
  }
}

// Composite validator that runs multiple validators
export class CompositeValidator {
  static async validateWithMultiple(
    result: any, 
    validators: Array<(result: any) => ValidationResult>
  ): Promise<ValidationResult> {
    const results = validators.map(validator => validator(result));
    
    const allErrors = results.flatMap(r => r.errors || []);
    const allWarnings = results.flatMap(r => r.warnings || []);
    const avgScore = results.reduce((sum, r) => sum + (r.score || 0.5), 0) / results.length;
    
    return {
      valid: allErrors.length === 0,
      errors: allErrors.length > 0 ? allErrors : undefined,
      warnings: allWarnings.length > 0 ? allWarnings : undefined,
      score: avgScore
    };
  }
}

// Task-specific validator factory
export class ValidatorFactory {
  static createBookingParser() {
    return (result: any) => {
      const validation = BookingValidators.validateParsedBooking(result);
      return {
        valid: validation.valid,
        errors: validation.errors
      };
    };
  }

  static createResponseGenerator() {
    return (result: any) => {
      const validation = ResponseValidators.validateGeneratedResponse(result);
      return {
        valid: validation.valid,
        errors: validation.errors
      };
    };
  }

  static createEventMatcher() {
    return (result: any) => {
      const validation = EventMatchValidators.validateEventMatch(result);
      return {
        valid: validation.valid,
        errors: validation.errors
      };
    };
  }

  static createPDFOptimizer() {
    return (result: any) => {
      const validation = PDFValidators.validatePDFOptimization(result);
      return {
        valid: validation.valid,
        errors: validation.errors
      };
    };
  }
}

// Confidence scoring factory
export class ScorerFactory {
  static createBookingParserScorer() {
    return (result: any, input: any): number => {
      const validation = BookingValidators.validateParsedBooking(result);
      return validation.score || 0.5;
    };
  }

  static createResponseGeneratorScorer() {
    return (result: any, input: any): number => {
      const validation = ResponseValidators.validateGeneratedResponse(result);
      return validation.score || 0.5;
    };
  }

  static createEventMatcherScorer() {
    return (result: any, input: any): number => {
      const validation = EventMatchValidators.validateEventMatch(result);
      return validation.score || 0.5;
    };
  }

  static createPDFOptimizerScorer() {
    return (result: any, input: any): number => {
      const validation = PDFValidators.validatePDFOptimization(result);
      return validation.score || 0.5;
    };
  }
}