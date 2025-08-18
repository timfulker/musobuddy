import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Zap, AlertTriangle, Crown } from "lucide-react";

interface AITokenUsageProps {
  usage: {
    percentage: number;
    status: 'good' | 'warning' | 'exceeded';
    message: string;
    responsesUsed: number;
    monthlyLimit: number;
  } | null;
  onUpgrade?: () => void;
}

export function AITokenUsage({ usage, onUpgrade }: AITokenUsageProps) {
  if (!usage) return null;

  const getStatusColor = () => {
    switch (usage.status) {
      case 'good': return 'bg-green-500';
      case 'warning': return 'bg-yellow-500';
      case 'exceeded': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusIcon = () => {
    switch (usage.status) {
      case 'good': return <Zap className="h-4 w-4 text-green-600" />;
      case 'warning': return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
      case 'exceeded': return <AlertTriangle className="h-4 w-4 text-red-600" />;
      default: return <Zap className="h-4 w-4" />;
    }
  };

  return (
    <Card className="mb-4">
      <CardContent className="pt-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            {getStatusIcon()}
            <span className="text-sm font-medium">Bookings This Month</span>
          </div>
          {usage.status === 'exceeded' && onUpgrade && (
            <Button size="sm" onClick={onUpgrade} className="h-7">
              <Crown className="h-3 w-3 mr-1" />
              Upgrade
            </Button>
          )}
        </div>
        
        <Progress 
          value={usage.percentage} 
          className="h-2 mb-2"
          style={{ 
            backgroundColor: '#f1f5f9',
          }}
        />
        
        <p className="text-xs text-muted-foreground">
          {Math.floor(usage.responsesUsed / 4)} / {Math.floor(usage.monthlyLimit / 4)} bookings (~{usage.responsesUsed.toLocaleString()} responses)
        </p>
        
        {usage.status !== 'good' && (
          <Alert className="mt-3 py-2">
            <AlertDescription className="text-xs">
              {usage.message}
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}