import React from 'react';
import { Button } from '@/components/ui/button';

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('🔥 ERROR BOUNDARY - Error caught:', error.message);
    console.error('🔥 ERROR BOUNDARY - Error stack:', error.stack);
    console.error('🔥 ERROR BOUNDARY - Component stack:', errorInfo.componentStack);
    console.error('🔥 ERROR BOUNDARY - Full error:', error);
    console.error('🔥 ERROR BOUNDARY - Current URL:', window.location.href);
    console.error('🔥 ERROR BOUNDARY - Current pathname:', window.location.pathname);
    console.error('🔥 ERROR BOUNDARY - Auth status checking...');
    
    // Check if this is an auth-related error
    fetch('/api/auth/user')
      .then(response => {
        console.error('🔥 ERROR BOUNDARY - Auth response status:', response.status);
        if (!response.ok) {
          console.error('🔥 ERROR BOUNDARY - Auth failed, redirecting to login...');
          window.location.href = '/api/login';
        }
      })
      .catch(authError => {
        console.error('🔥 ERROR BOUNDARY - Auth check failed:', authError);
      });
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex min-h-screen items-center justify-center bg-background">
          <div className="text-center max-w-md mx-auto p-6">
            <h2 className="text-2xl font-bold text-red-600 mb-4">Something went wrong</h2>
            <p className="text-gray-600 mb-6">
              The application encountered an error. Please try refreshing the page.
            </p>
            <div className="space-y-4">
              <Button 
                onClick={() => window.location.reload()}
                className="w-full"
              >
                Refresh Page
              </Button>
              <Button 
                onClick={() => this.setState({ hasError: false })}
                variant="outline"
                className="w-full"
              >
                Try Again
              </Button>
            </div>
            {this.state.error && (
              <details className="mt-4 text-left">
                <summary className="cursor-pointer text-sm text-gray-500">
                  Technical Details
                </summary>
                <pre className="mt-2 text-xs text-gray-400 bg-gray-100 p-2 rounded overflow-auto">
                  {this.state.error.toString()}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;