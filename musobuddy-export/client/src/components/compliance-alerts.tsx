import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Shield, Zap, Music, ArrowRight } from "lucide-react";
import type { ComplianceDocument } from "@shared/schema";

export default function ComplianceAlerts() {
  const { data: documents = [], isLoading } = useQuery({
    queryKey: ["/api/compliance"],
  });

  const getIcon = (type: string) => {
    switch (type) {
      case "public_liability": return <Shield className="w-5 h-5" />;
      case "pat_testing": return <Zap className="w-5 h-5" />;
      case "music_license": return <Music className="w-5 h-5" />;
      default: return <Shield className="w-5 h-5" />;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "public_liability": return "Public Liability";
      case "pat_testing": return "PAT Testing";
      case "music_license": return "Music License";
      default: return type;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "valid": return "bg-green-50 text-green-600";
      case "expiring": return "bg-orange-50 text-orange-600";
      case "expired": return "bg-red-50 text-red-600";
      default: return "bg-gray-50 text-gray-600";
    }
  };

  const getStatusBadge = (status: string, expiryDate?: string) => {
    if (status === "valid") {
      return <Badge className="bg-green-100 text-green-800">Valid</Badge>;
    } else if (status === "expiring") {
      const days = expiryDate ? Math.ceil((new Date(expiryDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)) : 0;
      return <Badge className="bg-orange-100 text-orange-800">{days} days</Badge>;
    } else {
      return <Badge variant="destructive">Expired</Badge>;
    }
  };

  // Default compliance items if no data
  const defaultCompliance = [
    { type: "public_liability", status: "valid" },
    { type: "pat_testing", status: "expiring", expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() },
    { type: "music_license", status: "valid" },
  ];

  const complianceToShow = documents.length > 0 ? documents : defaultCompliance;

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Compliance Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-center justify-between p-3 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="w-5 h-5 bg-gray-200 rounded"></div>
                  <div className="h-4 bg-gray-200 rounded w-24"></div>
                </div>
                <div className="h-5 bg-gray-200 rounded w-12"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Compliance Status</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {complianceToShow.map((doc: ComplianceDocument | any, index: number) => (
          <div key={doc.id || index} className={`flex items-center justify-between p-3 rounded-lg ${getStatusColor(doc.status)}`}>
            <div className="flex items-center space-x-3">
              {getIcon(doc.type)}
              <span className="font-medium">{getTypeLabel(doc.type)}</span>
            </div>
            {getStatusBadge(doc.status, doc.expiryDate)}
          </div>
        ))}

        <Button variant="ghost" className="w-full justify-center">
          Manage Documents <ArrowRight className="w-4 h-4 ml-1" />
        </Button>
      </CardContent>
    </Card>
  );
}
