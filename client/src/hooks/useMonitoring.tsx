import { useEffect, useCallback } from 'react';
import { useLocation } from 'wouter';
import monitor from '@/lib/monitoring';

export function useMonitoring() {
  const [location] = useLocation();

  // Track page navigation
  useEffect(() => {
    monitor.trackInteraction({
      type: 'navigation',
      url: location,
      timestamp: new Date().toISOString(),
      metadata: {
        referrer: document.referrer
      }
    });
  }, [location]);

  // Track click events
  const trackClick = useCallback((target: string, metadata?: Record<string, any>) => {
    monitor.trackInteraction({
      type: 'click',
      target,
      url: window.location.href,
      timestamp: new Date().toISOString(),
      metadata
    });
  }, []);

  // Track form submissions
  const trackFormSubmit = useCallback((formName: string, metadata?: Record<string, any>) => {
    monitor.trackInteraction({
      type: 'form_submit',
      target: formName,
      url: window.location.href,
      timestamp: new Date().toISOString(),
      metadata
    });
  }, []);

  // Track custom metrics
  const trackMetric = useCallback((name: string, value: number, metadata?: Record<string, any>) => {
    monitor.recordMetric(name, value, metadata);
  }, []);

  // Track errors manually
  const trackError = useCallback((error: Error | string, metadata?: Record<string, any>) => {
    const errorMessage = error instanceof Error ? error.message : error;
    const errorStack = error instanceof Error ? error.stack : undefined;

    monitor.reportError({
      message: errorMessage,
      stack: errorStack,
      url: window.location.href,
      userAgent: navigator.userAgent,
      timestamp: new Date().toISOString(),
      errorType: 'unhandled',
      metadata
    });
  }, []);

  return {
    trackClick,
    trackFormSubmit,
    trackMetric,
    trackError
  };
}

// HOC for performance monitoring of components
export function withPerformanceMonitoring<P extends object>(
  Component: React.ComponentType<P>,
  componentName: string
) {
  return function PerformanceMonitoredComponent(props: P) {
    useEffect(() => {
      const startTime = performance.now();

      return () => {
        const renderTime = performance.now() - startTime;
        if (renderTime > 100) {
          // Only track slow renders
          monitor.recordMetric('SLOW_RENDER', renderTime, {
            component: componentName,
            url: window.location.href
          });
        }
      };
    }, []);

    return <Component {...props} />;
  };
}