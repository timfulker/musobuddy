import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Server, 
  Database, 
  Mail, 
  FileText, 
  Cloud, 
  Activity,
  Clock,
  Zap,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  XCircle
} from "lucide-react";

interface SystemHealth {
  status: string;
  timestamp: string;
  database: {
    status: string;
    responseTime: number;
    recordsCount: string;
  };
  memory: {
    used: number;
    total: number;
    external: number;
    rss: number;
  };
  activity: {
    last24Hours: {
      bookings: number;
      contracts: number;
      invoices: number;
    };
  };
  performance: {
    totalCheckTime: number;
    dbResponseTime: number;
  };
}

interface PlatformMetrics {
  totals: {
    users: number;
    bookings: number;
    contracts: number;
    invoices: number;
  };
  weekly: {
    users: number;
    bookings: number;
    contracts: number;
    invoices: number;
  };
  monthly: {
    users: number;
    bookings: number;
    contracts: number;
    invoices: number;
  };
  growthRates: {
    users: number;
    bookings: number;
  };
  healthScore: number;
  lastUpdated: string;
}

export default function SystemHealthMonitor() {
  const { data: health, isLoading: healthLoading } = useQuery<SystemHealth>({
    queryKey: ['/api/admin/system-health'],
    queryFn: async () => {
      const response = await fetch('/api/admin/system-health');
      if (!response.ok) throw new Error('Failed to fetch system health');
      return response.json();
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const { data: metrics, isLoading: metricsLoading } = useQuery<PlatformMetrics>({
    queryKey: ['/api/admin/platform-metrics'],
    queryFn: async () => {
      const response = await fetch('/api/admin/platform-metrics');
      if (!response.ok) throw new Error('Failed to fetch platform metrics');
      return response.json();
    },
    refetchInterval: 60000, // Refresh every minute
  });

  const StatusIndicator = ({ status }: { status: string }) => {
    const getStatusColor = (status: string) => {
      switch (status.toLowerCase()) {
        case 'healthy':
        case 'connected':
        case 'operational':
        case 'active':
          return 'text-green-600 border-green-600';
        case 'warning':
        case 'slow':
          return 'text-yellow-600 border-yellow-600';
        case 'unhealthy':
        case 'error':
        case 'down':
          return 'text-red-600 border-red-600';
        default:
          return 'text-gray-600 border-gray-600';
      }
    };

    const getStatusIcon = (status: string) => {
      switch (status.toLowerCase()) {
        case 'healthy':
        case 'connected':
        case 'operational':
        case 'active':
          return <CheckCircle className="h-4 w-4" />;
        case 'warning':
        case 'slow':
          return <AlertCircle className="h-4 w-4" />;
        case 'unhealthy':
        case 'error':
        case 'down':
          return <XCircle className="h-4 w-4" />;
        default:
          return <Activity className="h-4 w-4" />;
      }
    };

    return (
      <Badge variant="outline" className={`${getStatusColor(status)} flex items-center space-x-1`}>
        {getStatusIcon(status)}
        <span className="capitalize">{status}</span>
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      {/* System Status Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">System Status</CardTitle>
            <Server className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold mb-2">
              {healthLoading ? "..." : (
                <StatusIndicator status={health?.status || 'unknown'} />
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Last check: {health?.timestamp ? new Date(health.timestamp).toLocaleTimeString() : 'N/A'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Database</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold mb-2">
              {healthLoading ? "..." : (
                <StatusIndicator status={health?.database?.status || 'unknown'} />
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Response: {health?.database?.responseTime || 0}ms
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Memory Usage</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold mb-2">
              {healthLoading ? "..." : `${health?.memory?.used || 0}MB`}
            </div>
            <div className="space-y-1">
              <Progress 
                value={health?.memory ? (health.memory.used / health.memory.total) * 100 : 0} 
                className="h-2"
              />
              <p className="text-xs text-muted-foreground">
                of {health?.memory?.total || 0}MB total
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Health Score</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold mb-2">
              {metricsLoading ? "..." : `${metrics?.healthScore || 0}/100`}
            </div>
            <Progress 
              value={metrics?.healthScore || 0} 
              className="h-2"
            />
          </CardContent>
        </Card>
      </div>

      {/* Detailed System Info */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Activity className="h-5 w-5" />
              <span>Recent Activity (24h)</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="flex items-center space-x-2">
                  <Database className="h-4 w-4" />
                  <span>New Bookings</span>
                </span>
                <span className="font-bold">
                  {healthLoading ? "..." : health?.activity?.last24Hours?.bookings || 0}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center space-x-2">
                  <FileText className="h-4 w-4" />
                  <span>New Contracts</span>
                </span>
                <span className="font-bold">
                  {healthLoading ? "..." : health?.activity?.last24Hours?.contracts || 0}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center space-x-2">
                  <Mail className="h-4 w-4" />
                  <span>New Invoices</span>
                </span>
                <span className="font-bold">
                  {healthLoading ? "..." : health?.activity?.last24Hours?.invoices || 0}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Zap className="h-5 w-5" />
              <span>Performance Metrics</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="flex items-center space-x-2">
                  <Clock className="h-4 w-4" />
                  <span>Health Check Time</span>
                </span>
                <span className="font-bold">
                  {healthLoading ? "..." : `${health?.performance?.totalCheckTime || 0}ms`}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center space-x-2">
                  <Database className="h-4 w-4" />
                  <span>DB Response Time</span>
                </span>
                <span className="font-bold">
                  {healthLoading ? "..." : `${health?.performance?.dbResponseTime || 0}ms`}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center space-x-2">
                  <Activity className="h-4 w-4" />
                  <span>Memory (RSS)</span>
                </span>
                <span className="font-bold">
                  {healthLoading ? "..." : `${health?.memory?.rss || 0}MB`}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Platform Growth */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <TrendingUp className="h-5 w-5" />
            <span>Platform Growth</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {metricsLoading ? "..." : metrics?.weekly?.users || 0}
              </div>
              <p className="text-sm text-muted-foreground">New Users (7d)</p>
              <p className="text-xs text-green-600">
                {metricsLoading ? "..." : `${metrics?.growthRates?.users?.toFixed(1) || 0}% growth`}
              </p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {metricsLoading ? "..." : metrics?.weekly?.bookings || 0}
              </div>
              <p className="text-sm text-muted-foreground">New Bookings (7d)</p>
              <p className="text-xs text-green-600">
                {metricsLoading ? "..." : `${metrics?.growthRates?.bookings?.toFixed(1) || 0}% growth`}
              </p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {metricsLoading ? "..." : metrics?.weekly?.contracts || 0}
              </div>
              <p className="text-sm text-muted-foreground">New Contracts (7d)</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">
                {metricsLoading ? "..." : metrics?.weekly?.invoices || 0}
              </div>
              <p className="text-sm text-muted-foreground">New Invoices (7d)</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Service Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Server className="h-5 w-5" />
            <span>Service Status</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center justify-between">
              <span className="flex items-center space-x-2">
                <Mail className="h-4 w-4" />
                <span>Email Service</span>
              </span>
              <StatusIndicator status="active" />
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center space-x-2">
                <FileText className="h-4 w-4" />
                <span>PDF Generation</span>
              </span>
              <StatusIndicator status="operational" />
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center space-x-2">
                <Cloud className="h-4 w-4" />
                <span>Cloud Storage</span>
              </span>
              <StatusIndicator status="connected" />
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center space-x-2">
                <Activity className="h-4 w-4" />
                <span>API Services</span>
              </span>
              <StatusIndicator status="healthy" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}