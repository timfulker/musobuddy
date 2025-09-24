import { Request, Response, Router } from 'express';
import { db } from '../core/database';
import { frontEndMonitoring, frontEndErrors, performanceMetrics, userInteractions, networkRequests } from '../db/schema/monitoring';
import { sql } from 'drizzle-orm';
import { desc, eq, gte, and, count, avg } from 'drizzle-orm';
import { authenticate, type AuthenticatedRequest } from '../middleware/supabase-only-auth';

const router = Router();

// Public endpoint to collect monitoring data (no auth required)
router.post('/api/monitoring/collect', async (req: Request, res: Response) => {
  try {
    const { errors, metrics, interactions, network, sessionId, userId } = req.body;

    // Store all data in batch
    const promises = [];

    // Store errors
    if (errors && errors.length > 0) {
      const errorRecords = errors.map((error: any) => ({
        sessionId,
        userId,
        message: error.message,
        stack: error.stack,
        componentStack: error.componentStack,
        url: error.url,
        userAgent: error.userAgent,
        errorType: error.errorType,
        metadata: error.metadata,
        timestamp: error.timestamp
      }));

      promises.push(
        db.insert(frontEndErrors).values(errorRecords)
      );
    }

    // Store performance metrics
    if (metrics && metrics.length > 0) {
      const metricRecords = metrics.map((metric: any) => ({
        sessionId,
        userId,
        name: metric.name,
        value: metric.value,
        url: metric.url,
        metadata: metric.metadata,
        timestamp: metric.timestamp
      }));

      promises.push(
        db.insert(performanceMetrics).values(metricRecords)
      );
    }

    // Store user interactions
    if (interactions && interactions.length > 0) {
      const interactionRecords = interactions.map((interaction: any) => ({
        sessionId,
        userId,
        type: interaction.type,
        target: interaction.target,
        url: interaction.url,
        metadata: interaction.metadata,
        timestamp: interaction.timestamp
      }));

      promises.push(
        db.insert(userInteractions).values(interactionRecords)
      );
    }

    // Store network requests
    if (network && network.length > 0) {
      const networkRecords = network.map((request: any) => ({
        sessionId,
        userId,
        url: request.url,
        method: request.method,
        status: request.status,
        duration: request.duration,
        error: request.error,
        timestamp: request.timestamp
      }));

      promises.push(
        db.insert(networkRequests).values(networkRecords)
      );
    }

    await Promise.all(promises);

    res.status(204).send();
  } catch (error) {
    console.error('Error storing monitoring data:', error);
    // Still return success to not break the client
    res.status(204).send();
  }
});

// Admin endpoint to view monitoring dashboard (requires auth)
router.get('/api/monitoring/dashboard', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { timeRange = '24h' } = req.query;

    // Calculate time threshold
    const hoursMap: Record<string, number> = {
      '1h': 1,
      '6h': 6,
      '24h': 24,
      '7d': 168,
      '30d': 720
    };
    const hours = hoursMap[timeRange as string] || 24;
    const threshold = new Date(Date.now() - hours * 60 * 60 * 1000);

    // Get error summary
    const errorSummary = await db
      .select({
        errorType: frontEndErrors.errorType,
        count: count(),
        latestError: sql<string>`MAX(${frontEndErrors.timestamp})`
      })
      .from(frontEndErrors)
      .where(gte(frontEndErrors.timestamp, threshold.toISOString()))
      .groupBy(frontEndErrors.errorType);

    // Get recent errors
    const recentErrors = await db
      .select()
      .from(frontEndErrors)
      .where(gte(frontEndErrors.timestamp, threshold.toISOString()))
      .orderBy(desc(frontEndErrors.timestamp))
      .limit(50);

    // Get performance metrics summary
    const perfSummary = await db
      .select({
        name: performanceMetrics.name,
        avgValue: avg(performanceMetrics.value),
        minValue: sql<number>`MIN(${performanceMetrics.value})`,
        maxValue: sql<number>`MAX(${performanceMetrics.value})`,
        count: count()
      })
      .from(performanceMetrics)
      .where(gte(performanceMetrics.timestamp, threshold.toISOString()))
      .groupBy(performanceMetrics.name);

    // Get user interaction summary
    const interactionSummary = await db
      .select({
        type: userInteractions.type,
        count: count(),
        uniqueUsers: sql<number>`COUNT(DISTINCT ${userInteractions.userId})`
      })
      .from(userInteractions)
      .where(gte(userInteractions.timestamp, threshold.toISOString()))
      .groupBy(userInteractions.type);

    // Get network performance
    const networkStats = await db
      .select({
        totalRequests: count(),
        avgDuration: avg(networkRequests.duration),
        failedRequests: sql<number>`COUNT(CASE WHEN ${networkRequests.error} IS NOT NULL OR ${networkRequests.status} >= 400 THEN 1 END)`,
        slowRequests: sql<number>`COUNT(CASE WHEN ${networkRequests.duration} > 3000 THEN 1 END)`
      })
      .from(networkRequests)
      .where(gte(networkRequests.timestamp, threshold.toISOString()));

    // Get top failing endpoints
    const failingEndpoints = await db
      .select({
        url: networkRequests.url,
        method: networkRequests.method,
        failureCount: count(),
        avgDuration: avg(networkRequests.duration)
      })
      .from(networkRequests)
      .where(
        and(
          gte(networkRequests.timestamp, threshold.toISOString()),
          sql`${networkRequests.error} IS NOT NULL OR ${networkRequests.status} >= 400`
        )
      )
      .groupBy(networkRequests.url, networkRequests.method)
      .orderBy(desc(count()))
      .limit(10);

    // Get Core Web Vitals
    const webVitals = await db
      .select({
        name: performanceMetrics.name,
        value: avg(performanceMetrics.value),
        p75: sql<number>`PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY ${performanceMetrics.value})`,
        p95: sql<number>`PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY ${performanceMetrics.value})`
      })
      .from(performanceMetrics)
      .where(
        and(
          gte(performanceMetrics.timestamp, threshold.toISOString()),
          sql`${performanceMetrics.name} IN ('LCP', 'FID', 'CLS', 'TTFB')`
        )
      )
      .groupBy(performanceMetrics.name);

    res.json({
      timeRange,
      errors: {
        summary: errorSummary,
        recent: recentErrors
      },
      performance: {
        summary: perfSummary,
        webVitals
      },
      interactions: interactionSummary,
      network: {
        stats: networkStats[0],
        failingEndpoints
      }
    });
  } catch (error) {
    console.error('Error fetching monitoring dashboard:', error);
    res.status(500).json({ error: 'Failed to fetch monitoring data' });
  }
});

// Get detailed error information
router.get('/api/monitoring/errors/:id', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;

    const error = await db
      .select()
      .from(frontEndErrors)
      .where(eq(frontEndErrors.id, parseInt(id)))
      .limit(1);

    if (error.length === 0) {
      return res.status(404).json({ error: 'Error not found' });
    }

    // Get similar errors
    const similarErrors = await db
      .select({
        id: frontEndErrors.id,
        timestamp: frontEndErrors.timestamp,
        url: frontEndErrors.url
      })
      .from(frontEndErrors)
      .where(
        and(
          eq(frontEndErrors.message, error[0].message),
          sql`${frontEndErrors.id} != ${id}`
        )
      )
      .orderBy(desc(frontEndErrors.timestamp))
      .limit(10);

    res.json({
      error: error[0],
      similarErrors
    });
  } catch (error) {
    console.error('Error fetching error details:', error);
    res.status(500).json({ error: 'Failed to fetch error details' });
  }
});

// Get user session timeline
router.get('/api/monitoring/sessions/:sessionId', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { sessionId } = req.params;

    const [errors, metrics, interactions, requests] = await Promise.all([
      db.select().from(frontEndErrors).where(eq(frontEndErrors.sessionId, sessionId)),
      db.select().from(performanceMetrics).where(eq(performanceMetrics.sessionId, sessionId)),
      db.select().from(userInteractions).where(eq(userInteractions.sessionId, sessionId)),
      db.select().from(networkRequests).where(eq(networkRequests.sessionId, sessionId))
    ]);

    // Combine and sort by timestamp
    const timeline = [
      ...errors.map(e => ({ type: 'error', ...e })),
      ...metrics.map(m => ({ type: 'metric', ...m })),
      ...interactions.map(i => ({ type: 'interaction', ...i })),
      ...requests.map(r => ({ type: 'network', ...r }))
    ].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    res.json({
      sessionId,
      timeline,
      summary: {
        errorCount: errors.length,
        interactionCount: interactions.length,
        requestCount: requests.length,
        duration: timeline.length > 0
          ? new Date(timeline[timeline.length - 1].timestamp).getTime() - new Date(timeline[0].timestamp).getTime()
          : 0
      }
    });
  } catch (error) {
    console.error('Error fetching session timeline:', error);
    res.status(500).json({ error: 'Failed to fetch session timeline' });
  }
});

// Health check endpoint for monitoring system
router.get('/api/monitoring/health', async (req: Request, res: Response) => {
  try {
    // Check if we can query the database
    const recentData = await db
      .select({ count: count() })
      .from(frontEndErrors)
      .where(gte(frontEndErrors.timestamp, new Date(Date.now() - 60000).toISOString()));

    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      recentErrors: recentData[0]?.count || 0
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      error: 'Database connection failed'
    });
  }
});

export default router;