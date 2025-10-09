import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, FileText, DollarSign, CalendarPlus, Zap } from "lucide-react";
import { Link } from "wouter";

export default function QuickActions() {
  return (
    <Card className="bg-white rounded-2xl shadow-soft border-0">
      <CardHeader className="pb-4">
        <CardTitle className="text-2xl font-bold text-slate-800">Quick Actions</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <Link href="/new-booking">
          <Button
            className="w-full justify-start bg-yellow-400 hover:bg-yellow-500 text-slate-900 font-semibold py-4 rounded-xl shadow-soft transition-all border-0 text-sm sm:text-base"
          >
            <Plus className="w-4 h-4 sm:w-5 sm:h-5 mr-2 sm:mr-3 flex-shrink-0" />
            <span className="truncate">New Enquiry</span>
          </Button>
        </Link>
        <Link href="/contracts?action=new">
          <Button
            variant="outline"
            className="w-full justify-start bg-white hover:bg-slate-50 text-slate-800 border-slate-200 py-4 rounded-xl font-medium transition-all text-sm sm:text-base"
          >
            <FileText className="w-4 h-4 sm:w-5 sm:h-5 mr-2 sm:mr-3 flex-shrink-0" />
            <span className="truncate">Generate Contract</span>
          </Button>
        </Link>
        <Link href="/invoices?action=create">
          <Button
            variant="outline"
            className="w-full justify-start bg-white hover:bg-slate-50 text-slate-800 border-slate-200 py-4 rounded-xl font-medium transition-all text-sm sm:text-base"
          >
            <DollarSign className="w-4 h-4 sm:w-5 sm:h-5 mr-2 sm:mr-3 flex-shrink-0" />
            <span className="truncate">Create Invoice</span>
          </Button>
        </Link>
        <Link href="/bookings?action=block">
          <Button
            variant="outline"
            className="w-full justify-start bg-white hover:bg-slate-50 text-slate-800 border-slate-200 py-4 rounded-xl font-medium transition-all text-sm sm:text-base"
          >
            <CalendarPlus className="w-4 h-4 sm:w-5 sm:h-5 mr-2 sm:mr-3 flex-shrink-0" />
            <span className="truncate">Mark Unavailable</span>
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}
