/**
 * Email Migration Controller
 *
 * Safely routes emails between old and new processing systems
 * with comprehensive logging and instant rollback capability.
 */

interface MigrationStats {
  totalProcessed: number;
  newSystemProcessed: number;
  oldSystemProcessed: number;
  newSystemErrors: number;
  oldSystemErrors: number;
  startTime: Date;
}

interface ProcessingResult {
  success: boolean;
  system: 'OLD' | 'NEW';
  processingTime: number;
  result?: any;
  error?: string;
}

export class EmailMigrationController {
  private migrationPercentage = 0;
  private stats: MigrationStats = {
    totalProcessed: 0,
    newSystemProcessed: 0,
    oldSystemProcessed: 0,
    newSystemErrors: 0,
    oldSystemErrors: 0,
    startTime: new Date()
  };

  constructor() {
    console.log('🔄 Email Migration Controller initialized');

    // Log stats every 5 minutes
    setInterval(() => {
      this.logStats();
    }, 5 * 60 * 1000);
  }

  /**
   * Main email processing entry point
   */
  async processEmail(webhookData: any): Promise<any> {
    const requestId = `migration_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    const startTime = Date.now();

    try {
      this.stats.totalProcessed++;

      // Determine which system to use
      const useNewSystem = Math.random() * 100 < this.migrationPercentage;

      let result: ProcessingResult;

      if (useNewSystem) {
        result = await this.processWithNewSystem(webhookData, requestId, startTime);
      } else {
        result = await this.processWithOldSystem(webhookData, requestId, startTime);
      }

      // Log the result
      this.logProcessingResult(requestId, webhookData, result);

      return result.result;

    } catch (error: any) {
      console.error(`❌ [${requestId}] Migration controller error:`, error);

      // Fallback to old system on any migration error
      console.log(`🔄 [${requestId}] Falling back to old system due to migration error`);
      return await this.processWithOldSystem(webhookData, requestId, startTime);
    }
  }

  /**
   * Process email with new unified system
   */
  private async processWithNewSystem(webhookData: any, requestId: string, startTime: number): Promise<ProcessingResult> {
    try {
      console.log(`🆕 [${requestId}] Processing with NEW system`);

      const { unifiedEmailProcessor } = await import('./unified-email-processor');
      const result = await unifiedEmailProcessor.processEmail(webhookData);

      this.stats.newSystemProcessed++;
      const processingTime = Date.now() - startTime;

      return {
        success: result.success,
        system: 'NEW',
        processingTime,
        result,
        error: result.success ? undefined : result.error
      };

    } catch (error: any) {
      console.error(`❌ [${requestId}] NEW system error:`, error);
      this.stats.newSystemErrors++;

      const processingTime = Date.now() - startTime;
      return {
        success: false,
        system: 'NEW',
        processingTime,
        error: error.message
      };
    }
  }

  /**
   * Process email with existing old system
   */
  private async processWithOldSystem(webhookData: any, requestId: string, startTime: number): Promise<ProcessingResult> {
    try {
      console.log(`🔄 [${requestId}] Processing with OLD system`);

      // Use the existing enhanced email queue
      const { enhancedEmailQueue } = await import('./email-queue-enhanced');
      const result = await enhancedEmailQueue.addEmail(webhookData);

      this.stats.oldSystemProcessed++;
      const processingTime = Date.now() - startTime;

      return {
        success: true, // Assume success unless error thrown
        system: 'OLD',
        processingTime,
        result,
        error: undefined
      };

    } catch (error: any) {
      console.error(`❌ [${requestId}] OLD system error:`, error);
      this.stats.oldSystemErrors++;

      const processingTime = Date.now() - startTime;
      return {
        success: false,
        system: 'OLD',
        processingTime,
        result: null,
        error: error.message
      };
    }
  }

  /**
   * Log processing results for monitoring
   */
  private logProcessingResult(requestId: string, webhookData: any, result: ProcessingResult): void {
    const fromField = webhookData.From || webhookData.from || webhookData.sender || 'Unknown';
    const toField = webhookData.To || webhookData.recipient || 'Unknown';
    const subjectField = webhookData.Subject || webhookData.subject || 'No Subject';

    const logData = {
      requestId,
      system: result.system,
      success: result.success,
      processingTime: result.processingTime,
      from: fromField.substring(0, 50),
      to: toField.substring(0, 50),
      subject: subjectField.substring(0, 50),
      migrationPercentage: this.migrationPercentage
    };

    if (result.success) {
      console.log(`✅ [${requestId}] ${result.system} SYSTEM SUCCESS:`, logData);
    } else {
      console.error(`❌ [${requestId}] ${result.system} SYSTEM FAILED:`, {
        ...logData,
        error: result.error
      });
    }

    // Also log in a format that's easy to grep/filter
    console.log(`📊 MIGRATION_LOG: ${result.system}|${result.success ? 'SUCCESS' : 'FAILED'}|${result.processingTime}ms|${this.migrationPercentage}%|${fromField}|${toField}`);
  }

  /**
   * Set migration percentage (0-100)
   */
  setMigrationPercentage(percentage: number): void {
    if (percentage < 0 || percentage > 100) {
      throw new Error('Migration percentage must be between 0 and 100');
    }

    const oldPercentage = this.migrationPercentage;
    this.migrationPercentage = percentage;

    console.log(`🎛️  Migration percentage changed: ${oldPercentage}% → ${percentage}%`);

    if (percentage === 0) {
      console.log('🔄 Migration set to 0% - OLD system only');
    } else if (percentage === 100) {
      console.log('🆕 Migration set to 100% - NEW system only');
    } else {
      console.log(`⚖️  Migration set to ${percentage}% - Mixed processing`);
    }

    this.logStats();
  }

  /**
   * Get current migration status
   */
  getStatus(): any {
    const runTime = Date.now() - this.stats.startTime.getTime();
    const runTimeHours = Math.round(runTime / (1000 * 60 * 60) * 100) / 100;

    const oldSuccessRate = this.stats.oldSystemProcessed > 0
      ? Math.round(((this.stats.oldSystemProcessed - this.stats.oldSystemErrors) / this.stats.oldSystemProcessed) * 100)
      : 100;

    const newSuccessRate = this.stats.newSystemProcessed > 0
      ? Math.round(((this.stats.newSystemProcessed - this.stats.newSystemErrors) / this.stats.newSystemProcessed) * 100)
      : 100;

    return {
      migrationPercentage: this.migrationPercentage,
      totalProcessed: this.stats.totalProcessed,
      runTimeHours,
      oldSystem: {
        processed: this.stats.oldSystemProcessed,
        errors: this.stats.oldSystemErrors,
        successRate: oldSuccessRate
      },
      newSystem: {
        processed: this.stats.newSystemProcessed,
        errors: this.stats.newSystemErrors,
        successRate: newSuccessRate
      },
      recommendation: this.getRecommendation()
    };
  }

  /**
   * Get automated recommendation based on performance
   */
  private getRecommendation(): string {
    const status = this.getStatus();

    if (this.stats.totalProcessed < 10) {
      return 'Not enough data - continue monitoring';
    }

    if (status.newSystem.errors > status.oldSystem.errors) {
      return 'NEW system has more errors - investigate before increasing migration';
    }

    if (status.newSystem.successRate < status.oldSystem.successRate) {
      return 'NEW system success rate lower - investigate issues';
    }

    if (status.newSystem.successRate >= status.oldSystem.successRate) {
      if (this.migrationPercentage < 50) {
        return 'NEW system performing well - safe to increase migration to 50%';
      } else if (this.migrationPercentage < 100) {
        return 'NEW system stable - safe to migrate to 100%';
      } else {
        return 'Migration complete - monitor for stability';
      }
    }

    return 'Continue monitoring';
  }

  /**
   * Log current statistics
   */
  private logStats(): void {
    const status = this.getStatus();

    console.log('📊 =================================');
    console.log('📊 EMAIL MIGRATION STATISTICS');
    console.log('📊 =================================');
    console.log(`📊 Migration: ${status.migrationPercentage}%`);
    console.log(`📊 Total Processed: ${status.totalProcessed} emails`);
    console.log(`📊 Runtime: ${status.runTimeHours} hours`);
    console.log(`📊 OLD System: ${status.oldSystem.processed} processed, ${status.oldSystem.errors} errors (${status.oldSystem.successRate}% success)`);
    console.log(`📊 NEW System: ${status.newSystem.processed} processed, ${status.newSystem.errors} errors (${status.newSystem.successRate}% success)`);
    console.log(`📊 Recommendation: ${status.recommendation}`);
    console.log('📊 =================================');
  }

  /**
   * Emergency rollback to 0%
   */
  emergencyRollback(): void {
    console.log('🚨 EMERGENCY ROLLBACK INITIATED');
    this.setMigrationPercentage(0);
    console.log('🚨 All traffic now routed to OLD system');
  }

  /**
   * Get recent processing logs for debugging
   */
  getRecentLogs(): string[] {
    // In a real implementation, you'd store recent logs
    // For now, just return instruction
    return [
      'Use this command to see recent migration logs:',
      'tail -f logs/app.log | grep "MIGRATION_LOG"',
      '',
      'Format: SYSTEM|SUCCESS/FAILED|PROCESSING_TIME|MIGRATION_%|FROM|TO'
    ];
  }
}

// Export singleton instance
export const emailMigrationController = new EmailMigrationController();