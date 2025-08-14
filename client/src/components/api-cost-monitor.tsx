import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  DollarSign, 
  Activity, 
  Mail, 
  Bot, 
  CreditCard,
  Cloud,
  MapPin,
  MessageSquare,
  Smartphone,
  Brain,
  AlertCircle,
  CheckCircle,
  ExternalLink,
  RefreshCw
} from "lucide-react";

interface APIStatus {
  configured: boolean;
  keyPresent: boolean;
  domain?: string;
  bucket?: string;
  webhook_configured?: boolean;
  estimated_monthly_emails?: number;
  estimated_monthly_tokens?: number;
}

interface APIUsageEstimate {
  monthly_emails?: number;
  monthly_tokens?: number;
  monthly_storage_gb?: number;
  monthly_requests?: number;
  monthly_sms?: number;
  estimated_cost: number;
}

interface APICostData {
  api_status: {
    mailgun: APIStatus;
    openai: APIStatus;
    stripe: APIStatus;
    cloudflareR2: APIStatus;
    googleMaps: APIStatus;
    twilio: APIStatus;
    what3words: APIStatus;
    anthropic: APIStatus;
  };
  usage_estimates: {
    mailgun: APIUsageEstimate;
    openai: APIUsageEstimate;
    cloudflareR2: APIUsageEstimate;
    googleMaps: APIUsageEstimate;
    twilio: APIUsageEstimate;
  };
  total_estimated_monthly_cost: number;
  user_metrics: {
    total_users: number;
    total_bookings: number;
    total_contracts: number;
    total_invoices: number;
  };
  last_updated: string;
  error?: string;
}

const ServiceIcon = ({ service }: { service: string }) => {
  const iconMap: Record<string, React.ComponentType<any>> = {
    mailgun: Mail,
    openai: Bot,
    stripe: CreditCard,
    cloudflareR2: Cloud,
    googleMaps: MapPin,
    twilio: Smartphone,
    what3words: MapPin,
    anthropic: Brain,
    subscriptions: CreditCard,
  };
  
  const Icon = iconMap[service] || Activity;
  return <Icon className="h-4 w-4" />;
};

const ServiceLinks = {
  mailgun: "https://app.mailgun.com/mg/statistics",
  openai: "https://platform.openai.com/usage",
  stripe: "https://dashboard.stripe.com/dashboard",
  cloudflareR2: "https://dash.cloudflare.com/",
  googleMaps: "https://console.cloud.google.com/google/maps-apis/metrics",
  twilio: "https://console.twilio.com/us1/monitor/usage",
  what3words: "https://developer.what3words.com/",
  anthropic: "https://console.anthropic.com/workbench/",
  subscriptions: "https://replit.com/account"
};

export default function APICostMonitor() {
  const { data: costData, isLoading, error, refetch } = useQuery<{ success: boolean; data: APICostData }>({
    queryKey: ["/api/admin/api-costs"],
    refetchInterval: 60000, // Refetch every minute
    staleTime: 0, // Always consider data stale
    cacheTime: 0, // Don't cache for debugging
  });

  const data = costData?.data;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-US').format(num);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8 text-foreground">
        <RefreshCw className="h-6 w-6 animate-spin mr-2" />
        Loading API cost data...
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex flex-col items-center justify-center p-8">
        <AlertCircle className="h-12 w-12 text-destructive mb-4" />
        <h3 className="text-lg font-semibold mb-2 text-foreground">Failed to Load API Cost Data</h3>
        <p className="text-muted-foreground text-center mb-4">
          Unable to retrieve API usage and cost estimates
        </p>
        <Button onClick={() => refetch()}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Try Again
        </Button>
      </div>
    );
  }

  const highCostServices = Object.entries(data.usage_estimates || {})
    .filter(([_, estimate]) => estimate.estimated_cost > 10)
    .sort(([_, a], [__, b]) => b.estimated_cost - a.estimated_cost);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">API Cost Monitor</h2>
          <p className="text-muted-foreground">
            Monitor usage and costs for external APIs
          </p>
        </div>
        <Button onClick={() => refetch()} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {data.error && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="pt-6">
            <div className="flex items-center">
              <AlertCircle className="h-5 w-5 text-yellow-600 mr-2" />
              <p className="text-yellow-800">{data.error}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Total Cost Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 justify-between">
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Monthly Cost Estimate
            </div>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="h-3 w-3" />
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-green-600">
            {formatCurrency(data.total_estimated_monthly_cost)}
          </div>
          <p className="text-muted-foreground">
            Based on current usage patterns
          </p>
          {highCostServices.length > 0 && (
            <div className="mt-4">
              <p className="text-sm font-medium mb-2">Highest Cost Services:</p>
              <div className="flex gap-2 flex-wrap">
                {highCostServices.slice(0, 3).map(([service, estimate]) => (
                  <Badge key={service} variant="secondary">
                    {service}: {formatCurrency(estimate.estimated_cost)}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Platform Metrics */}
      <Card>
        <CardHeader>
          <CardTitle>Platform Metrics</CardTitle>
          <CardDescription>Current usage driving API costs</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold">{formatNumber(data.user_metrics.total_users)}</div>
              <p className="text-sm text-muted-foreground">Users</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{formatNumber(data.user_metrics.total_bookings)}</div>
              <p className="text-sm text-muted-foreground">Bookings</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{formatNumber(data.user_metrics.total_contracts)}</div>
              <p className="text-sm text-muted-foreground">Contracts</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{formatNumber(data.user_metrics.total_invoices)}</div>
              <p className="text-sm text-muted-foreground">Invoices</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* API Services Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {/* Regular API Services */}
        {Object.entries(data.api_status).map(([service, status]) => {
          const estimate = data.usage_estimates[service as keyof typeof data.usage_estimates];
          const serviceUrl = ServiceLinks[service as keyof typeof ServiceLinks];
          
          return (
            <Card key={service}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 capitalize text-base">
                    <ServiceIcon service={service} />
                    {service === 'cloudflareR2' ? 'Cloudflare R2' : 
                     service === 'googleMaps' ? 'Google Maps' : 
                     service === 'what3words' ? 'what3words' : 
                     service === 'openai' ? 'OpenAI' :
                     service === 'anthropic' ? 'Anthropic Claude' :
                     service === 'mailgun' ? 'Mailgun' :
                     service}
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    {status.configured ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-red-500" />
                    )}
                    {serviceUrl && (
                      <Button asChild variant="ghost" size="sm">
                        <a href={serviceUrl} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Status:</span>
                    <Badge variant={status.configured ? "default" : "destructive"}>
                      {status.configured ? "Configured" : "Not Configured"}
                    </Badge>
                  </div>
                  
                  {status.domain && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Domain:</span>
                      <span className="text-sm font-mono">{status.domain}</span>
                    </div>
                  )}
                  
                  {status.bucket && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Bucket:</span>
                      <span className="text-sm font-mono">{status.bucket}</span>
                    </div>
                  )}
                  
                  {estimate && (
                    <>
                      <div className="border-t pt-2 mt-2">
                        <div className="flex justify-between items-center">
                          <span className="text-sm">Est. Monthly Cost:</span>
                          <span className="font-semibold text-green-600">
                            {formatCurrency(estimate.estimated_cost)}
                          </span>
                        </div>
                        
                        {estimate.monthly_emails && (
                          <div className="flex justify-between items-center text-xs text-muted-foreground">
                            <span>Emails:</span>
                            <span>{formatNumber(estimate.monthly_emails)}/month</span>
                          </div>
                        )}
                        
                        {estimate.monthly_tokens && (
                          <div className="flex justify-between items-center text-xs text-muted-foreground">
                            <span>Tokens:</span>
                            <span>{formatNumber(estimate.monthly_tokens)}/month</span>
                          </div>
                        )}
                        
                        {estimate.monthly_requests && (
                          <div className="flex justify-between items-center text-xs text-muted-foreground">
                            <span>Requests:</span>
                            <span>{formatNumber(estimate.monthly_requests)}/month</span>
                          </div>
                        )}
                        
                        {estimate.monthly_storage_gb && (
                          <div className="flex justify-between items-center text-xs text-muted-foreground">
                            <span>Storage:</span>
                            <span>{estimate.monthly_storage_gb} GB</span>
                          </div>
                        )}
                        
                        {estimate.monthly_sms && (
                          <div className="flex justify-between items-center text-xs text-muted-foreground">
                            <span>SMS:</span>
                            <span>{formatNumber(estimate.monthly_sms)}/month</span>
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
        
        {/* Subscription Services Card */}
        {data.usage_estimates.subscriptions && (
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 capitalize text-base">
                  <ServiceIcon service="subscriptions" />
                  Service Subscriptions
                </CardTitle>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <Button asChild variant="ghost" size="sm">
                    <a href={ServiceLinks.subscriptions} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm">Status:</span>
                  <Badge variant="default">Active</Badge>
                </div>
                
                <div className="border-t pt-2 mt-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Est. Monthly Cost:</span>
                    <span className="font-semibold text-green-600">
                      {formatCurrency(data.usage_estimates.subscriptions.estimated_cost)}
                    </span>
                  </div>
                  
                  {data.usage_estimates.subscriptions.services && (
                    <div className="mt-2 space-y-1">
                      {data.usage_estimates.subscriptions.services.map((sub: any, index: number) => (
                        <div key={index} className="flex justify-between items-center text-xs text-muted-foreground">
                          <span>{sub.name}:</span>
                          <span>{formatCurrency(sub.monthly_cost)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Footer */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>Last updated: {new Date(data.last_updated).toLocaleString()}</span>
            <span>Estimates based on current usage patterns</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}