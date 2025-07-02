import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, FileText, DollarSign, CalendarPlus } from "lucide-react";

export default function QuickActions() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Quick Actions</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <Button 
          variant="outline" 
          className="w-full justify-start bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100"
        >
          <Plus className="w-4 h-4 mr-3" />
          New Enquiry
        </Button>
        <Button variant="outline" className="w-full justify-start hover:bg-gray-50">
          <FileText className="w-4 h-4 mr-3" />
          Generate Contract
        </Button>
        <Button variant="outline" className="w-full justify-start hover:bg-gray-50">
          <DollarSign className="w-4 h-4 mr-3" />
          Create Invoice
        </Button>
        <Button variant="outline" className="w-full justify-start hover:bg-gray-50">
          <CalendarPlus className="w-4 h-4 mr-3" />
          Block Calendar
        </Button>
      </CardContent>
    </Card>
  );
}
