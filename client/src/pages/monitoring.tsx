import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertCircle, Activity, Clock, Users, Zap, TrendingUp, TrendingDown, AlertTriangle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuthContext } from '@/contexts/AuthContext';
import Sidebar from "@/components/sidebar";
import MobileNav from "@/components/mobile-nav";
import { useResponsive } from "@/hooks/useResponsive";
import { useIsMobile } from "@/hooks/use-mobile";

interface MonitoringData {
  timeRange: string;
  errors: {
    summary: Array<{
      errorType: string;
      count: number;
      latestError: string;
    }>;
    recent: Array<{
      id: number;
      message: string;
      url: string;
      errorType: string;
      timestamp: string;
      userId?: string;
    }>;
  };
  performance: {
    summary: Array<{
      name: string;
      avgValue: number;
      minValue: number;
      maxValue: number;
      count: number;
    }>;
    webVitals: Array<{
      name: string;
      value: number;
      p75: number;
      p95: number;
    }>;
  };
  interactions: Array<{
    type: string;
    count: number;
    uniqueUsers: number;
  }>;
  network: {
    stats: {
      totalRequests: number;
      avgDuration: number;
      failedRequests: number;
      slowRequests: number;
    };
    failingEndpoints: Array<{
      url: string;
      method: string;
      failureCount: number;
      avgDuration: number;
    }>;
  };
}

export default function MonitoringDashboard() {
  const { user, isAuthenticated } = useAuthContext();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { isDesktop } = useResponsive();
  const isMobile = useIsMobile();
  const [data, setData] = useState<MonitoringData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState('24h');
  const [selectedError, setSelectedError] = useState<any>(null);

  // Check admin access
  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center h-64">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Access Denied</AlertTitle>
          <AlertDescription>Please log in to access monitoring dashboard.</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!(user?.isAdmin)) {
    return (
      <div className="flex items-center justify-center h-64">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Admin Access Required</AlertTitle>
          <AlertDescription>Only administrators can access the monitoring dashboard.</AlertDescription>
        </Alert>
      </div>
    );
  }

  useEffect(() => {
    fetchMonitoringData();
  }, [timeRange]);

  const fetchMonitoringData = async () => {
    setLoading(true);
    try {
      // Get the current session from Supabase
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        throw new Error('No active session - please log in');
      }

      const response = await fetch(`/api/monitoring/dashboard?timeRange=${timeRange}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch monitoring data: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      setData(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const fetchErrorDetails = async (errorId: number) => {
    try {
      // Get the current session from Supabase
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        throw new Error('No active session');
      }

      const response = await fetch(`/api/monitoring/errors/${errorId}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch error details');
      }

      const details = await response.json();
      setSelectedError(details);
    } catch (err) {
      console.error('Failed to fetch error details:', err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <div className={`min-h-screen bg-gradient-to-br from-slate-50/30 to-blue-50/20 ${isDesktop ? 'ml-64' : ''}`}>
          <div className="flex items-center justify-center h-64">
            <div className="text-lg text-muted-foreground">Loading monitoring data...</div>
          </div>
        </div>
        {isMobile && <MobileNav />}
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <div className={`min-h-screen bg-gradient-to-br from-slate-50/30 to-blue-50/20 ${isDesktop ? 'ml-64' : ''}`}>
          <div className="p-4 md:p-6">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          </div>
        </div>
        {isMobile && <MobileNav />}
      </div>
    );
  }

  if (!data) return null;

  // Mobile layout
  if (isMobile) {
    return (
      <div className="min-h-screen bg-background">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <main className="p-4 space-y-6 pb-20">
          <MonitoringContent
            data={data}
            timeRange={timeRange}
            setTimeRange={setTimeRange}
            selectedError={selectedError}
            setSelectedError={setSelectedError}
            fetchErrorDetails={fetchErrorDetails}
          />
        </main>
        <MobileNav />
      </div>
    );
  }

  // Desktop layout
  return (
    <div className="min-h-screen bg-background">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main Content */}
      <div className={`min-h-screen bg-gradient-to-br from-slate-50/30 to-blue-50/20 ${isDesktop ? 'ml-64' : ''}`}>
        <div className="p-4 md:p-6">
          <div className="max-w-7xl mx-auto">
            <main className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-4 md:p-6 space-y-4 md:space-y-6">
              <MonitoringContent
                data={data}
                timeRange={timeRange}
                setTimeRange={setTimeRange}
                selectedError={selectedError}
                setSelectedError={setSelectedError}
                fetchErrorDetails={fetchErrorDetails}
              />
            </main>
          </div>
        </div>
      </div>
    </div>
  );
}

// Extract the monitoring content into a separate component
function MonitoringContent({ data, timeRange, setTimeRange, selectedError, setSelectedError, fetchErrorDetails }: {
  data: MonitoringData;
  timeRange: string;
  setTimeRange: (range: string) => void;
  selectedError: any;
  setSelectedError: (error: any) => void;
  fetchErrorDetails: (id: number) => Promise<void>;
}) {
  const getWebVitalStatus = (name: string, value: number): 'good' | 'needs-improvement' | 'poor' => {
    const thresholds: Record<string, { good: number; poor: number }> = {
      LCP: { good: 2500, poor: 4000 },
      FID: { good: 100, poor: 300 },
      CLS: { good: 0.1, poor: 0.25 },
      TTFB: { good: 800, poor: 1800 }
    };

    const threshold = thresholds[name];
    if (!threshold) return 'good';

    if (value <= threshold.good) return 'good';
    if (value >= threshold.poor) return 'poor';
    return 'needs-improvement';
  };

  const getStatusColor = (status: 'good' | 'needs-improvement' | 'poor') => {
    switch (status) {
      case 'good': return 'text-green-600';
      case 'needs-improvement': return 'text-yellow-600';
      case 'poor': return 'text-red-600';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Front-End Monitoring</h1>
          <p className="text-muted-foreground">Real-time application performance and error tracking</p>
        </div>
        <Select value={timeRange} onValueChange={setTimeRange}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1h">Last Hour</SelectItem>
            <SelectItem value="6h">Last 6 Hours</SelectItem>
            <SelectItem value="24h">Last 24 Hours</SelectItem>
            <SelectItem value="7d">Last 7 Days</SelectItem>
            <SelectItem value="30d">Last 30 Days</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              Total Errors
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {data.errors.summary.reduce((sum, e) => sum + e.count, 0)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Activity className="h-4 w-4" />
              API Requests
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {data.network.stats.totalRequests}
            </div>
            <p className="text-xs text-muted-foreground">
              {data.network.stats.failedRequests} failed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Avg Response Time
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Math.round(data.network.stats.avgDuration)}ms
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Users className="h-4 w-4" />
              User Interactions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {data.interactions.reduce((sum, i) => sum + i.count, 0)}
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="errors" className="space-y-4">
        <TabsList>
          <TabsTrigger value="errors">Errors</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="network">Network</TabsTrigger>
          <TabsTrigger value="interactions">User Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="errors" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Error Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {data.errors.summary.map((error) => (
                  <div key={error.errorType} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <Badge variant={error.count > 10 ? 'destructive' : 'secondary'}>
                        {error.errorType}
                      </Badge>
                      <span className="text-sm">{error.count} errors</span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      Last: {new Date(error.latestError).toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recent Errors</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {data.errors.recent.map((error) => (
                  <div
                    key={error.id}
                    className="p-3 border rounded-lg cursor-pointer hover:bg-accent"
                    onClick={() => fetchErrorDetails(error.id)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="space-y-1 flex-1">
                        <p className="text-sm font-medium">{error.message}</p>
                        <p className="text-xs text-muted-foreground">{error.url}</p>
                      </div>
                      <Badge variant="outline">{error.errorType}</Badge>
                    </div>
                    <div className="mt-2 flex items-center gap-4 text-xs text-muted-foreground">
                      <span>{new Date(error.timestamp).toLocaleString()}</span>
                      {error.userId && <span>User: {error.userId}</span>}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Core Web Vitals</CardTitle>
              <CardDescription>Key metrics for user experience</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {data.performance.webVitals.map((vital) => {
                  const status = getWebVitalStatus(vital.name, vital.value);
                  return (
                    <div key={vital.name} className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">{vital.name}</span>
                        <Zap className={`h-4 w-4 ${getStatusColor(status)}`} />
                      </div>
                      <div className={`text-2xl font-bold ${getStatusColor(status)}`}>
                        {vital.name === 'CLS' ? vital.value.toFixed(3) : `${Math.round(vital.value)}ms`}
                      </div>
                      <div className="mt-2 text-xs text-muted-foreground">
                        <div>P75: {vital.name === 'CLS' ? vital.p75.toFixed(3) : `${Math.round(vital.p75)}ms`}</div>
                        <div>P95: {vital.name === 'CLS' ? vital.p95.toFixed(3) : `${Math.round(vital.p95)}ms`}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Performance Metrics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {data.performance.summary.map((metric) => (
                  <div key={metric.name} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium">{metric.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {metric.count} measurements
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{Math.round(metric.avgValue)}ms avg</p>
                      <p className="text-xs text-muted-foreground">
                        {Math.round(metric.minValue)}ms - {Math.round(metric.maxValue)}ms
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="network" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Network Statistics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span>Total Requests</span>
                  <span className="font-medium">{data.network.stats.totalRequests}</span>
                </div>
                <div className="flex justify-between">
                  <span>Failed Requests</span>
                  <span className="font-medium text-red-600">{data.network.stats.failedRequests}</span>
                </div>
                <div className="flex justify-between">
                  <span>Slow Requests (&gt;3s)</span>
                  <span className="font-medium text-yellow-600">{data.network.stats.slowRequests}</span>
                </div>
                <div className="flex justify-between">
                  <span>Average Duration</span>
                  <span className="font-medium">{Math.round(data.network.stats.avgDuration)}ms</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Failing Endpoints</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {data.network.failingEndpoints.slice(0, 5).map((endpoint, idx) => (
                    <div key={idx} className="p-2 border rounded">
                      <div className="flex items-center gap-2">
                        <Badge variant="destructive">{endpoint.method}</Badge>
                        <span className="text-xs truncate flex-1">{endpoint.url}</span>
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        {endpoint.failureCount} failures • {Math.round(endpoint.avgDuration)}ms avg
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="interactions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>User Interaction Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {data.interactions.map((interaction) => (
                  <div key={interaction.type} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium capitalize">{interaction.type.replace('_', ' ')}</p>
                      <p className="text-sm text-muted-foreground">
                        {interaction.uniqueUsers} unique users
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold">{interaction.count}</p>
                      <p className="text-xs text-muted-foreground">total events</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Error Details Modal */}
      {selectedError && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-2xl max-h-[80vh] overflow-y-auto">
            <CardHeader>
              <CardTitle>Error Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <p className="text-sm font-medium">Message</p>
                  <p className="mt-1">{selectedError.error.message}</p>
                </div>
                {selectedError.error.stack && (
                  <div>
                    <p className="text-sm font-medium">Stack Trace</p>
                    <pre className="mt-1 p-2 bg-muted rounded text-xs overflow-x-auto">
                      {selectedError.error.stack}
                    </pre>
                  </div>
                )}
                {selectedError.similarErrors.length > 0 && (
                  <div>
                    <p className="text-sm font-medium">Similar Errors</p>
                    <div className="mt-2 space-y-1">
                      {selectedError.similarErrors.map((err: any) => (
                        <div key={err.id} className="text-xs text-muted-foreground">
                          {new Date(err.timestamp).toLocaleString()} - {err.url}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <div className="mt-6">
                <Button onClick={() => setSelectedError(null)}>Close</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}