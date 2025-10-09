// System Health Monitoring Dashboard (Admin Only)
import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { CheckCircle2, XCircle, AlertCircle, RefreshCw, Activity, Database, Mail, FileText, Shield, Lock } from 'lucide-react';
import { useAuthContext } from '@/contexts/AuthContext';
import { useLocation } from 'wouter';

interface ServiceStatus {
  name: string;
  status: 'healthy' | 'unhealthy' | 'checking';
  message?: string;
  lastChecked?: string;
  responseTime?: number;
  icon: React.ReactNode;
}

export default function SystemHealth() {
  const { user, isLoading } = useAuthContext();
  const [, navigate] = useLocation();
  const [services, setServices] = useState<ServiceStatus[]>([
    { name: 'Database', status: 'checking', icon: <Database className="w-5 h-5" /> },
    { name: 'Authentication', status: 'checking', icon: <Shield className="w-5 h-5" /> },
    { name: 'Contract Service', status: 'checking', icon: <FileText className="w-5 h-5" /> },
    { name: 'Email Service', status: 'checking', icon: <Mail className="w-5 h-5" /> },
    { name: 'Cloud Storage (R2)', status: 'checking', icon: <Database className="w-5 h-5" /> }
  ]);
  
  const [isChecking, setIsChecking] = useState(false);
  const [lastFullCheck, setLastFullCheck] = useState<Date | null>(null);
  const [criticalIssues, setCriticalIssues] = useState<string[]>([]);

  // Admin-only access check
  useEffect(() => {
    if (!isLoading && (!user || !user.isAdmin)) {
      navigate('/dashboard');
    }
  }, [user, isLoading, navigate]);

  // Show loading while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Admin-only guard
  if (!user?.isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="p-8 max-w-md">
          <div className="flex flex-col items-center text-center gap-4">
            <Lock className="w-12 h-12 text-gray-400" />
            <h2 className="text-xl font-semibold">Admin Access Required</h2>
            <p className="text-gray-600">This page is restricted to administrators only.</p>
            <Button onClick={() => navigate('/dashboard')}>
              Return to Dashboard
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  // Check individual services
  const checkDatabase = async () => {
    const start = Date.now();
    try {
      const response = await fetch('/api/health/database');
      const responseTime = Date.now() - start;
      
      if (response.ok) {
        return { status: 'healthy' as const, message: 'Connected', responseTime };
      }
      return { status: 'unhealthy' as const, message: 'Connection failed', responseTime };
    } catch (error) {
      return { status: 'unhealthy' as const, message: 'Database unreachable' };
    }
  };

  const checkAuth = async () => {
    const start = Date.now();
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        return { status: 'unhealthy' as const, message: 'No auth token' };
      }
      
      const response = await fetch('/api/auth/verify', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const responseTime = Date.now() - start;
      
      if (response.ok) {
        return { status: 'healthy' as const, message: 'Token valid', responseTime };
      }
      return { status: 'unhealthy' as const, message: 'Token invalid', responseTime };
    } catch (error) {
      return { status: 'unhealthy' as const, message: 'Auth service error' };
    }
  };

  const checkContractService = async () => {
    const start = Date.now();
    try {
      const response = await fetch('/api/contracts/health');
      const responseTime = Date.now() - start;
      const data = await response.json();
      
      if (response.ok && data.status === 'healthy') {
        return { status: 'healthy' as const, message: 'All services operational', responseTime };
      }
      return { status: 'unhealthy' as const, message: data.error || 'Service degraded', responseTime };
    } catch (error) {
      return { status: 'unhealthy' as const, message: 'Contract service unreachable' };
    }
  };

  const checkEmailService = async () => {
    const start = Date.now();
    try {
      const response = await fetch('/api/health/email');
      const responseTime = Date.now() - start;
      
      if (response.ok) {
        return { status: 'healthy' as const, message: 'Mailgun connected', responseTime };
      }
      return { status: 'unhealthy' as const, message: 'Email service unavailable', responseTime };
    } catch (error) {
      return { status: 'unhealthy' as const, message: 'Email check failed' };
    }
  };

  const checkCloudStorage = async () => {
    const start = Date.now();
    try {
      const response = await fetch('/api/health/storage');
      const responseTime = Date.now() - start;
      
      if (response.ok) {
        return { status: 'healthy' as const, message: 'R2 connected', responseTime };
      }
      return { status: 'unhealthy' as const, message: 'Storage unavailable', responseTime };
    } catch (error) {
      return { status: 'unhealthy' as const, message: 'Storage check failed' };
    }
  };

  const runHealthChecks = async () => {
    setIsChecking(true);
    setCriticalIssues([]);
    
    const checks = [
      { name: 'Database', check: checkDatabase },
      { name: 'Authentication', check: checkAuth },
      { name: 'Contract Service', check: checkContractService },
      { name: 'Email Service', check: checkEmailService },
      { name: 'Cloud Storage (R2)', check: checkCloudStorage }
    ];
    
    const results = await Promise.all(
      checks.map(async ({ name, check }) => {
        const result = await check();
        return {
          name,
          ...result,
          lastChecked: new Date().toISOString(),
          icon: services.find(s => s.name === name)?.icon
        };
      })
    );
    
    // Identify critical issues
    const issues: string[] = [];
    results.forEach(result => {
      if (result.status === 'unhealthy') {
        if (result.name === 'Database' || result.name === 'Authentication') {
          issues.push(`CRITICAL: ${result.name} - ${result.message}`);
        } else {
          issues.push(`WARNING: ${result.name} - ${result.message}`);
        }
      }
    });
    
    setCriticalIssues(issues);
    setServices(results as ServiceStatus[]);
    setLastFullCheck(new Date());
    setIsChecking(false);
  };

  // Run health checks on mount and every 60 seconds
  useEffect(() => {
    runHealthChecks();
    const interval = setInterval(runHealthChecks, 60000);
    return () => clearInterval(interval);
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'bg-green-500';
      case 'unhealthy': return 'bg-red-500';
      default: return 'bg-gray-400';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy': return <CheckCircle2 className="w-5 h-5 text-green-500" />;
      case 'unhealthy': return <XCircle className="w-5 h-5 text-red-500" />;
      default: return <AlertCircle className="w-5 h-5 text-gray-400" />;
    }
  };

  const overallHealth = services.every(s => s.status === 'healthy') ? 'healthy' : 
                        services.some(s => s.status === 'unhealthy') ? 'degraded' : 'checking';

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">System Health Monitor</h1>
          <p className="text-gray-600">Real-time monitoring of critical MusoBuddy services</p>
        </div>

        {/* Overall Status */}
        <Card className="mb-6 p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Activity className={`w-8 h-8 ${overallHealth === 'healthy' ? 'text-green-500' : 'text-yellow-500'}`} />
              <div>
                <h2 className="text-xl font-semibold">System Status</h2>
                <p className="text-gray-600">
                  {overallHealth === 'healthy' ? 'All systems operational' : 
                   overallHealth === 'degraded' ? 'Some services degraded' : 'Checking services...'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {lastFullCheck && (
                <span className="text-sm text-gray-500">
                  Last check: {lastFullCheck.toLocaleTimeString()}
                </span>
              )}
              <Button 
                onClick={runHealthChecks} 
                disabled={isChecking}
                variant="outline"
                size="sm"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${isChecking ? 'animate-spin' : ''}`} />
                {isChecking ? 'Checking...' : 'Refresh'}
              </Button>
            </div>
          </div>
        </Card>

        {/* Critical Issues Alert */}
        {criticalIssues.length > 0 && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>System Issues Detected</AlertTitle>
            <AlertDescription>
              <ul className="mt-2 space-y-1">
                {criticalIssues.map((issue, index) => (
                  <li key={index} className="text-sm">{issue}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        {/* Service Status Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          {services.map((service) => (
            <Card key={service.name} className="p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  {service.icon}
                  <h3 className="font-semibold">{service.name}</h3>
                </div>
                {getStatusIcon(service.status)}
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Status:</span>
                  <Badge className={`${getStatusColor(service.status)} text-white`}>
                    {service.status === 'healthy' ? 'Healthy' : 
                     service.status === 'unhealthy' ? 'Unhealthy' : 'Checking'}
                  </Badge>
                </div>
                
                {service.message && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Message:</span>
                    <span className="text-sm font-medium">{service.message}</span>
                  </div>
                )}
                
                {service.responseTime !== undefined && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Response:</span>
                    <span className="text-sm font-medium">{service.responseTime}ms</span>
                  </div>
                )}
                
                {service.lastChecked && (
                  <div className="text-xs text-gray-500 pt-2 border-t">
                    Last checked: {new Date(service.lastChecked).toLocaleTimeString()}
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>

        {/* Performance Metrics */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Performance Metrics</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <p className="text-2xl font-bold text-blue-600">
                {services.filter(s => s.status === 'healthy').length}/{services.length}
              </p>
              <p className="text-sm text-gray-600">Healthy Services</p>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <p className="text-2xl font-bold text-green-600">
                {services.reduce((acc, s) => acc + (s.responseTime || 0), 0) / services.length || 0}ms
              </p>
              <p className="text-sm text-gray-600">Avg Response Time</p>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <p className="text-2xl font-bold text-purple-600">
                {((services.filter(s => s.status === 'healthy').length / services.length) * 100).toFixed(0)}%
              </p>
              <p className="text-sm text-gray-600">System Uptime</p>
            </div>
          </div>
        </Card>

        {/* Quick Actions */}
        <Card className="mt-6 p-6">
          <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
          <div className="flex flex-wrap gap-3">
            <Button variant="outline" size="sm">
              View Logs
            </Button>
            <Button variant="outline" size="sm">
              Database Metrics
            </Button>
            <Button variant="outline" size="sm">
              Email Queue
            </Button>
            <Button variant="outline" size="sm">
              Storage Usage
            </Button>
            <Button variant="outline" size="sm">
              Clear Cache
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}