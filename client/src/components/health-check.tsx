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

export function HealthCheckComponent() {
  const [results, setResults] = useState<HealthCheckResult[]>([]);
  const [testing, setTesting] = useState(false);
  const { toast } = useToast();

  const healthChecks = [
    { name: 'Basic Health', url: '/api/health' },
    { name: 'Detailed Health', url: '/api/health/detailed' },
    { name: 'Session Debug', url: '/api/debug/session' },
    { name: 'Contracts List', url: '/api/contracts' }
  ];

  const runHealthCheck = async (check: { name: string; url: string }): Promise<HealthCheckResult> => {
    const startTime = Date.now();
    
    try {
      console.log(`🧪 Testing ${check.name} at ${check.url}`);
      
      const response = await fetch(check.url, {
        credentials: 'include',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        }
      });

      const responseTime = Date.now() - startTime;
      const contentType = response.headers.get('content-type');
      
      console.log(`📊 ${check.name} response:`, {
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

      try {
        responseData = JSON.parse(responseText);
      } catch (parseError) {
        return {
          endpoint: check.url,
          status: 'error',
          message: `Failed to parse JSON (${response.status})`,
          responseTime,
          details: {
            status: response.status,
            contentType,
            parseError: parseError.message,
            preview: responseText.substring(0, 200) + '...'
          }
        };
      }

      if (response.ok) {
        return {
          endpoint: check.url,
          status: 'success',
          message: `✅ Success (${response.status}) - ${responseTime}ms`,
          responseTime,
          details: responseData
        };
      } else {
        return {
          endpoint: check.url,
          status: 'error',
          message: `HTTP ${response.status}: ${responseData.error || response.statusText}`,
          responseTime,
          details: responseData
        };
      }

    } catch (error: any) {
      const responseTime = Date.now() - startTime;
      return {
        endpoint: check.url,
        status: 'error',
        message: `Network error: ${error.message}`,
        responseTime,
        details: { error: error.message }
      };
    }
  };

  const runAllHealthChecks = async () => {
    setTesting(true);
    setResults([]);

    console.log('🔍 Starting comprehensive health checks...');

    const newResults: HealthCheckResult[] = [];

    for (const check of healthChecks) {
      // Add testing state
      const testingResult: HealthCheckResult = {
        endpoint: check.url,
        status: 'testing',
        message: 'Testing...'
      };
      newResults.push(testingResult);
      setResults([...newResults]);

      // Run the actual test
      const result = await runHealthCheck(check);
      
      // Replace testing result with actual result
      newResults[newResults.length - 1] = result;
      setResults([...newResults]);

      // Small delay between tests
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    setTesting(false);

    // Show summary toast
    const successCount = newResults.filter(r => r.status === 'success').length;
    const totalCount = newResults.length;

    toast({
      title: "Health Check Complete",
      description: `${successCount}/${totalCount} checks passed`,
      variant: successCount === totalCount ? "default" : "destructive",
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'error':
        return <XCircle className="w-4 h-4 text-red-600" />;
      case 'testing':
        return <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />;
      default:
        return <AlertCircle className="w-4 h-4 text-gray-400" />;
    }
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="w-5 h-5" />
          System Health Check
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex justify-between items-center">
          <p className="text-sm text-gray-600">
            Test server connectivity and API endpoints
          </p>
          <Button 
            onClick={runAllHealthChecks}
            disabled={testing}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {testing ? "Testing..." : "Run Health Checks"}
          </Button>
        </div>

        {results.length > 0 && (
          <div className="space-y-2">
            {results.map((result, index) => (
              <div 
                key={`${result.endpoint}-${index}`}
                className={`p-3 rounded-lg border ${
                  result.status === 'success' ? 'bg-green-50 border-green-200' :
                  result.status === 'error' ? 'bg-red-50 border-red-200' :
                  'bg-blue-50 border-blue-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(result.status)}
                    <span className="font-medium">{result.endpoint}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-sm text-gray-600">{result.message}</span>
                    {result.responseTime && (
                      <div className="text-xs text-gray-500">{result.responseTime}ms</div>
                    )}
                  </div>
                </div>

                {result.details && process.env.NODE_ENV === 'development' && (
                  <details className="mt-2">
                    <summary className="text-xs text-gray-500 cursor-pointer">
                      Show Details
                    </summary>
                    <pre className="text-xs bg-gray-100 p-2 rounded mt-1 overflow-auto">
                      {JSON.stringify(result.details, null, 2)}
                    </pre>
                  </details>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="text-xs text-gray-500 bg-gray-50 p-3 rounded">
          <strong>Troubleshooting Tips:</strong>
          <ul className="mt-1 space-y-1">
            <li>• If "Received HTML instead of JSON" - Server routing issue</li>
            <li>• If "Network error" - Server is down or unreachable</li>
            <li>• If "HTTP 401" - Authentication problem</li>
            <li>• If "HTTP 502/503" - Server temporarily unavailable</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}