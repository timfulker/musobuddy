import type { Contract, UserSettings } from '../shared/schema';
import { generateContractSigningPage as templateSigningPage } from './contract-signing-page-generator';
import { aiCompleteContractGenerator } from './core/ai-complete-contract-generator';

/**
 * Generate contract signing page HTML using AI or template fallback
 */
export async function generateContractSigningPage(
  contract: Contract,
  userSettings: UserSettings | null,
  options?: { useAI?: boolean }
): Promise<string> {
  const useAI = options?.useAI ?? true; // Default to AI system

  try {
    if (useAI) {
      console.log('🤖 Generating AI-powered contract signing page...');
      
      const result = await aiCompleteContractGenerator.generateCompleteContractHTML(
        contract,
        userSettings,
        {
          isSigningPage: true
        }
      );
      
      console.log('✅ AI signing page generated:', result.reasoning);
      return result.html;
    } else {
      console.log('📄 Using template-based signing page generator...');
      return templateSigningPage(contract, userSettings);
    }
  } catch (error: any) {
    // Fallback to template system if AI fails
    if (useAI) {
      console.warn('⚠️ AI signing page generation failed, falling back to template:', error.message);
      try {
        return templateSigningPage(contract, userSettings);
      } catch (fallbackError: any) {
        console.error('💥 Both AI and template signing page generation failed:', fallbackError);
        throw new Error(`Contract signing page generation failed: ${fallbackError.message}`);
      }
    } else {
      console.error('💥 Template signing page generation failed:', error);
      throw new Error(`Contract signing page generation failed: ${error.message}`);
    }
  }
}

/**
 * Generate contract signing page using template system (backward compatibility)
 */
export function generateContractSigningPageTemplate(
  contract: Contract,
  userSettings: UserSettings | null
): string {
  return templateSigningPage(contract, userSettings);
}

export default {
  generateContractSigningPage,
  generateContractSigningPageTemplate
};