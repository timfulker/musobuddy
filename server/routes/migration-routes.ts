/**
 * Email Migration Control Routes
 *
 * Admin endpoints to control the email system migration
 * and monitor progress in production.
 */

import { Router } from 'express';
import { emailMigrationController } from '../core/email-migration-controller';

const router = Router();

// Simple admin authentication middleware
// TODO: Replace with proper admin auth if needed
const authenticateAdmin = (req: any, res: any, next: any) => {
  // For now, just check for a simple admin header
  const adminKey = req.headers['x-admin-key'];

  if (adminKey === 'musobuddy-admin-2024' || process.env.NODE_ENV === 'development') {
    next();
  } else {
    res.status(401).json({ error: 'Admin access required' });
  }
};

/**
 * Get current migration status
 * GET /api/migration/status
 */
router.get('/status', authenticateAdmin, (req, res) => {
  try {
    const status = emailMigrationController.getStatus();

    res.json({
      success: true,
      status,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Set migration percentage
 * POST /api/migration/percentage
 * Body: { percentage: number }
 */
router.post('/percentage', authenticateAdmin, (req, res) => {
  try {
    const { percentage } = req.body;

    if (typeof percentage !== 'number' || percentage < 0 || percentage > 100) {
      return res.status(400).json({
        success: false,
        error: 'Percentage must be a number between 0 and 100'
      });
    }

    emailMigrationController.setMigrationPercentage(percentage);

    const status = emailMigrationController.getStatus();

    res.json({
      success: true,
      message: `Migration percentage set to ${percentage}%`,
      status,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Emergency rollback to 0%
 * POST /api/migration/rollback
 */
router.post('/rollback', authenticateAdmin, (req, res) => {
  try {
    console.log('🚨 Admin triggered emergency rollback');
    emailMigrationController.emergencyRollback();

    const status = emailMigrationController.getStatus();

    res.json({
      success: true,
      message: 'Emergency rollback completed - all traffic routed to OLD system',
      status,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Get recent processing logs
 * GET /api/migration/logs
 */
router.get('/logs', authenticateAdmin, (req, res) => {
  try {
    const logs = emailMigrationController.getRecentLogs();

    res.json({
      success: true,
      logs,
      instructions: [
        'Monitor in real-time with:',
        'tail -f logs/app.log | grep "MIGRATION_LOG"',
        '',
        'Log format: SYSTEM|SUCCESS/FAILED|TIME|%|FROM|TO'
      ],
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Quick migration presets
 * POST /api/migration/preset/:name
 */
router.post('/preset/:name', authenticateAdmin, (req, res) => {
  try {
    const { name } = req.params;

    let percentage: number;
    let message: string;

    switch (name) {
      case 'start':
        percentage = 0;
        message = 'Migration started at 0% - monitoring mode';
        break;
      case 'test':
        percentage = 10;
        message = 'Test migration at 10% - monitoring for issues';
        break;
      case 'half':
        percentage = 50;
        message = 'Half migration at 50% - significant traffic on new system';
        break;
      case 'complete':
        percentage = 100;
        message = 'Migration complete at 100% - all traffic on new system';
        break;
      case 'rollback':
        percentage = 0;
        message = 'Rollback to 0% - all traffic on old system';
        break;
      default:
        return res.status(400).json({
          success: false,
          error: 'Invalid preset. Use: start, test, half, complete, rollback'
        });
    }

    emailMigrationController.setMigrationPercentage(percentage);

    const status = emailMigrationController.getStatus();

    res.json({
      success: true,
      preset: name,
      percentage,
      message,
      status,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Health check for migration system
 * GET /api/migration/health
 */
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Email migration controller is running',
    timestamp: new Date().toISOString(),
    endpoints: {
      status: 'GET /api/migration/status',
      setPercentage: 'POST /api/migration/percentage',
      rollback: 'POST /api/migration/rollback',
      logs: 'GET /api/migration/logs',
      presets: 'POST /api/migration/preset/{start|test|half|complete|rollback}'
    }
  });
});

export default router;