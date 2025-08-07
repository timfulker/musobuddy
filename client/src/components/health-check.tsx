import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Activity, CheckCircle, XCircle, AlertCircle } from "lucide-react";

interface HealthCheckResult {
  endpoint: string;
  status: 'success' | 'error' | 'testing';
  message: string;
  details?: any;
  responseTime?: number;
}

interface HealthCheck {
  name: string;
  url: string;
}

export function HealthCheckComponent() {
  const [results, setResults] = useState<HealthCheckResult[]>([]);
  const [testing, setTesting] = useState(false);
  const { toast } = useToast();

  const healthChecks: HealthCheck[] = [
    { name: 'Basic Health', url: '/api/health' },
    { name: 'Detailed Health', url: '/api/health/detailed' },
    { name: 'Session Debug', url: '/api/debug/session' },
    { name: 'Contracts List', url: '/api/contracts' }
  ];

  const runHealthCheck = async (check: HealthCheck): Promise<HealthCheckResult> => {
    const startTime = Date.now();
    
    try {
      console.log(`Testing ${check.name} at ${check.url}`);
      
      const response = await fetch(check.url, {
        credentials: 'include',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        }
      });

      const responseTime = Date.now() - startTime;
      const contentType = response.headers.get('content-type');
      
      console.log(`${check.name} response:`, {
        status: response.status,
        contentType,
        responseTime: `${responseTime}ms`
      });

      let responseData: any;
      const responseText = await response.text();
      
      // Check if response is HTML
      const isHTML = responseText.trim().toLowerCase().startsWith('<!doctype') || 
                    responseText.trim().toLowerCase().startsWith('<html');

      if (isHTML) {
        return {
          endpoint: check.url,
          status: 'error',
          message: `Received HTML instead of JSON (${response.status})`,
          responseTime,
          details: {
            status: response.status,
            contentType,
            isHTML: true,
            preview: responseText.substring(0, 200) + '...'
          }
        };
      }

      // Try to parse as JSON
      try {
        responseData = responseText ? JSON.parse(responseText) : {};
      } catch (parseError) {
        return {
          endpoint: check.url,
          status: 'error',
          message: `Invalid JSON response (${response.status})`,
          responseTime,
          details: {
            status: response.status,
            contentType,
            parseError: parseError instanceof Error ? parseError.message : String(parseError),
            rawResponse: responseText.substring(0, 500)
          }
        };
      }

      if (!response.ok) {
        return {
          endpoint: check.url,
          status: 'error',
          message: `HTTP ${response.status}: ${responseData?.message || response.statusText}`,
          responseTime,
          details: responseData
        };
      }

      return {
        endpoint: check.url,
        status: 'success',
        message: `OK (${responseTime}ms)`,
        responseTime,
        details: responseData
      };

    } catch (error) {
      console.error(`Error testing ${check.name}:`, error);
      const responseTime = Date.now() - startTime;
      
      return {
        endpoint: check.url,
        status: 'error',
        message: `Network error: ${error instanceof Error ? error.message : String(error)}`,
        responseTime,
        details: { error: error instanceof Error ? error.message : String(error) }
      };
    }
  };

  const runAllTests = async () => {
    setTesting(true);
    setResults([]);
    
    const initialResults: HealthCheckResult[] = healthChecks.map(check => ({
      endpoint: check.url,
      status: 'testing' as const,
      message: 'Testing...'
    }));
    
    setResults(initialResults);

    try {
      console.log('Starting health checks...');
      
      const testResults = await Promise.all(
        healthChecks.map(check => runHealthCheck(check))
      );
      
      setResults(testResults);
      
      const successCount = testResults.filter(r => r.status === 'success').length;
      const errorCount = testResults.filter(r => r.status === 'error').length;
      
      toast({
        title: "Health Check Complete",
        description: `${successCount} passed, ${errorCount} failed`,
        variant: errorCount > 0 ? "destructive" : "default"
      });
      
    } catch (error) {
      console.error('Health check failed:', error);
      toast({
        title: "Health Check Failed",
        description: error instanceof Error ? error.message : 'Unknown error occurred',
        variant: "destructive"
      });
    } finally {
      setTesting(false);
    }
  };

  const getStatusIcon = (status: HealthCheckResult['status']) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'error':
        return <XCircle className="w-4 h-4 text-red-600" />;
      case 'testing':
        return <Activity className="w-4 h-4 text-blue-600 animate-spin" />;
      default:
        return <AlertCircle className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStatusColor = (status: HealthCheckResult['status']) => {
    switch (status) {
      case 'success':
        return 'border-green-200 bg-green-50';
      case 'error':
        return 'border-red-200 bg-red-50';
      case 'testing':
        return 'border-blue-200 bg-blue-50';
      default:
        return 'border-gray-200 bg-gray-50';
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5" />
            System Health Check
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Button 
              onClick={runAllTests} 
              disabled={testing}
              className="w-full"
            >
              {testing ? (
                <>
                  <Activity className="w-4 h-4 mr-2 animate-spin" />
                  Running Tests...
                </>
              ) : (
                <>
                  <Activity className="w-4 h-4 mr-2" />
                  Run Health Checks
                </>
              )}
            </Button>

            {results.length > 0 && (
              <div className="space-y-3">
                {results.map((result, index) => (
                  <div
                    key={result.endpoint}
                    className={`p-4 border rounded-lg ${getStatusColor(result.status)}`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(result.status)}
                        <span className="font-medium">
                          {healthChecks[index]?.name || result.endpoint}
                        </span>
                      </div>
                      <div className="text-sm text-gray-600">
                        {result.responseTime && `${result.responseTime}ms`}
                      </div>
                    </div>
                    
                    <div className="mt-2">
                      <div className="text-sm">
                        <span className="font-medium">Endpoint:</span> {result.endpoint}
                      </div>
                      <div className="text-sm mt-1">
                        <span className="font-medium">Status:</span> {result.message}
                      </div>
                    </div>
                    
                    {result.details && result.status !== 'testing' && (
                      <details className="mt-2">
                        <summary className="text-sm font-medium cursor-pointer text-gray-600 hover:text-gray-800">
                          View Details
                        </summary>
                        <pre className="text-xs mt-2 p-2 bg-gray-100 rounded overflow-auto max-h-40">
                          {JSON.stringify(result.details, null, 2)}
                        </pre>
                      </details>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}