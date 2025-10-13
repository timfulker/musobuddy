interface ErrorReport {
  message: string;
  stack?: string;
  componentStack?: string;
  url: string;
  userAgent: string;
  timestamp: string;
  errorType: 'react' | 'unhandled' | 'promise' | 'network';
  metadata?: Record<string, any>;
}

interface PerformanceMetric {
  name: string;
  value: number;
  timestamp: string;
  url: string;
  metadata?: Record<string, any>;
}

interface UserInteraction {
  type: 'click' | 'form_submit' | 'navigation' | 'scroll' | 'error_interaction';
  target?: string;
  url: string;
  timestamp: string;
  metadata?: Record<string, any>;
}

interface NetworkRequest {
  url: string;
  method: string;
  status?: number;
  duration: number;
  error?: string;
  timestamp: string;
}

class FrontEndMonitor {
  private errorQueue: ErrorReport[] = [];
  private metricsQueue: PerformanceMetric[] = [];
  private interactionQueue: UserInteraction[] = [];
  private networkQueue: NetworkRequest[] = [];
  private flushInterval: number = 30000; // 30 seconds
  private maxQueueSize: number = 50;
  private timer: NodeJS.Timeout | null = null;

  constructor() {
    this.setupGlobalErrorHandlers();
    this.setupPerformanceObserver();
    this.setupNetworkMonitoring();
    this.startFlushTimer();
  }

  // Error handling
  private setupGlobalErrorHandlers() {
    // Unhandled errors
    window.addEventListener('error', (event) => {
      this.reportError({
        message: event.message,
        stack: event.error?.stack,
        url: window.location.href,
        userAgent: navigator.userAgent,
        timestamp: new Date().toISOString(),
        errorType: 'unhandled',
        metadata: {
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno
        }
      });
    });

    // Unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.reportError({
        message: event.reason?.message || String(event.reason),
        stack: event.reason?.stack,
        url: window.location.href,
        userAgent: navigator.userAgent,
        timestamp: new Date().toISOString(),
        errorType: 'promise'
      });
    });
  }

  // Performance monitoring
  private setupPerformanceObserver() {
    // Core Web Vitals
    if ('PerformanceObserver' in window) {
      // LCP (Largest Contentful Paint)
      try {
        const lcpObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const lastEntry = entries[entries.length - 1];
          this.recordMetric('LCP', lastEntry.startTime);
        });
        lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
      } catch (e) {
        console.warn('LCP observer not supported');
      }

      // FID (First Input Delay)
      try {
        const fidObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          entries.forEach((entry: any) => {
            this.recordMetric('FID', entry.processingStart - entry.startTime);
          });
        });
        fidObserver.observe({ entryTypes: ['first-input'] });
      } catch (e) {
        console.warn('FID observer not supported');
      }

      // CLS (Cumulative Layout Shift)
      try {
        let clsValue = 0;
        const clsObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (!(entry as any).hadRecentInput) {
              clsValue += (entry as any).value;
            }
          }
          this.recordMetric('CLS', clsValue);
        });
        clsObserver.observe({ entryTypes: ['layout-shift'] });
      } catch (e) {
        console.warn('CLS observer not supported');
      }
    }

    // Page Load Metrics
    window.addEventListener('load', () => {
      setTimeout(() => {
        const perfData = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
        if (perfData) {
          this.recordMetric('DOM_LOAD', perfData.domContentLoadedEventEnd - perfData.domContentLoadedEventStart);
          this.recordMetric('PAGE_LOAD', perfData.loadEventEnd - perfData.fetchStart);
          this.recordMetric('TTFB', perfData.responseStart - perfData.fetchStart);
          this.recordMetric('DNS_LOOKUP', perfData.domainLookupEnd - perfData.domainLookupStart);
          this.recordMetric('TCP_CONNECTION', perfData.connectEnd - perfData.connectStart);
        }
      }, 0);
    });
  }

  // Network monitoring
  private setupNetworkMonitoring() {
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      const startTime = performance.now();
      const url = typeof args[0] === 'string' ? args[0] : args[0].url;
      const method = args[1]?.method || 'GET';

      try {
        const response = await originalFetch(...args);
        const duration = performance.now() - startTime;

        this.recordNetworkRequest({
          url,
          method,
          status: response.status,
          duration,
          timestamp: new Date().toISOString()
        });

        // Track failed requests
        if (!response.ok && response.status >= 400) {
          this.reportError({
            message: `API Error: ${method} ${url} returned ${response.status}`,
            url: window.location.href,
            userAgent: navigator.userAgent,
            timestamp: new Date().toISOString(),
            errorType: 'network',
            metadata: {
              status: response.status,
              statusText: response.statusText,
              duration
            }
          });
        }

        return response;
      } catch (error) {
        const duration = performance.now() - startTime;

        this.recordNetworkRequest({
          url,
          method,
          duration,
          error: error instanceof Error ? error.message : String(error),
          timestamp: new Date().toISOString()
        });

        this.reportError({
          message: `Network Error: ${method} ${url} failed`,
          stack: error instanceof Error ? error.stack : undefined,
          url: window.location.href,
          userAgent: navigator.userAgent,
          timestamp: new Date().toISOString(),
          errorType: 'network',
          metadata: {
            duration,
            errorMessage: error instanceof Error ? error.message : String(error)
          }
        });

        throw error;
      }
    };
  }

  // Public methods for manual reporting
  public reportError(error: ErrorReport) {
    this.errorQueue.push(error);
    if (this.errorQueue.length >= this.maxQueueSize) {
      this.flush();
    }
  }

  public recordMetric(name: string, value: number, metadata?: Record<string, any>) {
    this.metricsQueue.push({
      name,
      value,
      timestamp: new Date().toISOString(),
      url: window.location.href,
      metadata
    });
    if (this.metricsQueue.length >= this.maxQueueSize) {
      this.flush();
    }
  }

  public trackInteraction(interaction: UserInteraction) {
    this.interactionQueue.push(interaction);
    if (this.interactionQueue.length >= this.maxQueueSize) {
      this.flush();
    }
  }

  private recordNetworkRequest(request: NetworkRequest) {
    this.networkQueue.push(request);
    if (this.networkQueue.length >= this.maxQueueSize) {
      this.flush();
    }
  }

  // Batch sending
  private startFlushTimer() {
    this.timer = setInterval(() => {
      this.flush();
    }, this.flushInterval);

    // Flush on page unload
    window.addEventListener('beforeunload', () => {
      this.flush();
    });

    // Flush on visibility change (mobile background)
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.flush();
      }
    });
  }

  private async flush() {
    const hasData = this.errorQueue.length > 0 ||
                   this.metricsQueue.length > 0 ||
                   this.interactionQueue.length > 0 ||
                   this.networkQueue.length > 0;

    if (!hasData) return;

    const payload = {
      errors: [...this.errorQueue],
      metrics: [...this.metricsQueue],
      interactions: [...this.interactionQueue],
      network: [...this.networkQueue],
      sessionId: this.getSessionId(),
      userId: this.getUserId()
    };

    // Clear queues
    this.errorQueue = [];
    this.metricsQueue = [];
    this.interactionQueue = [];
    this.networkQueue = [];

    try {
      // Use sendBeacon for reliability on page unload
      if (navigator.sendBeacon) {
        navigator.sendBeacon('/api/monitoring/collect', JSON.stringify(payload));
      } else {
        // Fallback to fetch
        fetch('/api/monitoring/collect', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        }).catch(() => {
          // Silently fail - we don't want monitoring to break the app
        });
      }
    } catch (error) {
      console.error('Failed to send monitoring data:', error);
    }
  }

  private getSessionId(): string {
    let sessionId = sessionStorage.getItem('monitoring_session_id');
    if (!sessionId) {
      sessionId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      sessionStorage.setItem('monitoring_session_id', sessionId);
    }
    return sessionId;
  }

  private getUserId(): string | null {
    // Get from your auth system
    const authData = localStorage.getItem('auth_token');
    if (authData) {
      try {
        const payload = JSON.parse(atob(authData.split('.')[1]));
        return payload.sub || payload.userId || null;
      } catch {
        return null;
      }
    }
    return null;
  }

  public destroy() {
    if (this.timer) {
      clearInterval(this.timer);
    }
    this.flush();
  }
}

// Create singleton instance
const monitor = new FrontEndMonitor();

// Export for use in React components
export default monitor;
export type { ErrorReport, PerformanceMetric, UserInteraction, NetworkRequest };