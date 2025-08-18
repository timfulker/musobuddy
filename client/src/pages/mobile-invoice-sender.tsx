import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useQuery } from '@tanstack/react-query';
import { Send, Search, Loader2, CheckCircle } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';

export default function MobileInvoiceSender() {
  const [invoiceId, setInvoiceId] = useState('');
  const [sending, setSending] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const { toast } = useToast();
  const isMobile = useIsMobile();

  // Fetch recent invoices
  const { data: invoices, isLoading } = useQuery({
    queryKey: ['/api/invoices'],
    select: (data: any[]) => 
      data
        ?.filter(invoice => invoice.status !== 'Paid')
        ?.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        ?.slice(0, 10) || []
  });

  const sendInvoiceDirectly = async (id: string) => {
    setSending(true);
    
    // Find token the same way the console command does
    let token = null;
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.includes('auth')) {
        const stored = localStorage.getItem(key);
        if (stored) {
          try {
            const parsed = JSON.parse(stored);
            if (parsed.token) {
              token = parsed.token;
              break;
            }
          } catch {
            if (typeof stored === 'string' && stored.length > 20) {
              token = stored;
              break;
            }
          }
        }
      }
    }

    if (!token) {
      toast({
        title: "No authentication found",
        description: "Please log in first",
        variant: "destructive"
      });
      setSending(false);
      return;
    }

    try {
      const response = await fetch('/api/invoices/send-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ invoiceId: parseInt(id) })
      });

      const data = await response.json();
      
      if (data.error) {
        toast({
          title: "Error sending invoice",
          description: data.error,
          variant: "destructive"
        });
      } else {
        toast({
          title: "Invoice sent successfully!",
          description: `Invoice ${id} has been emailed to the client`
        });
        setInvoiceId('');
      }
    } catch (error) {
      toast({
        title: "Network error",
        description: "Failed to send invoice",
        variant: "destructive"
      });
    }
    
    setSending(false);
  };

  // Filter invoices based on search
  const filteredInvoices = invoices?.filter(invoice => 
    invoice.clientName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    invoice.invoiceNumber?.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  return (
    <div className={`${isMobile ? 'p-4' : 'max-w-2xl mx-auto p-6'} space-y-6`}>
      {/* Header Card */}
      <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950 border-blue-200 dark:border-blue-800">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-blue-900 dark:text-blue-100">
            <Send className="h-5 w-5" />
            Quick Invoice Sender
          </CardTitle>
          <p className="text-sm text-blue-700 dark:text-blue-300">
            Perfect for sending invoices at gigs or on-the-go
          </p>
        </CardHeader>
      </Card>

      {/* Manual Invoice ID Entry */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Send by Invoice ID</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              value={invoiceId}
              onChange={(e) => setInvoiceId(e.target.value)}
              placeholder="Enter invoice ID (e.g. 197)"
              type="number"
              className="text-center text-lg font-mono"
            />
            <Button 
              onClick={() => sendInvoiceDirectly(invoiceId)}
              disabled={!invoiceId || sending}
              size="lg"
              className="px-6"
            >
              {sending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Send
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Recent Invoices */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Recent Unpaid Invoices</CardTitle>
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search by client name or invoice number..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {isLoading ? (
            <div className="text-center py-8">
              <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-gray-400" />
              <p className="text-sm text-gray-500">Loading invoices...</p>
            </div>
          ) : filteredInvoices.length > 0 ? (
            filteredInvoices.map((invoice) => (
              <div key={invoice.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">
                    {invoice.clientName}
                  </p>
                  <p className="text-xs text-gray-500">
                    {invoice.invoiceNumber} • £{invoice.amount}
                  </p>
                  <p className="text-xs text-gray-400">
                    ID: {invoice.id}
                  </p>
                </div>
                <Button
                  onClick={() => sendInvoiceDirectly(invoice.id.toString())}
                  disabled={sending}
                  size="sm"
                  className="ml-3 flex-shrink-0"
                >
                  {sending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </Button>
              </div>
            ))
          ) : (
            <div className="text-center py-8">
              <Send className="w-8 h-8 mx-auto mb-2 text-gray-300" />
              <p className="text-sm text-gray-500">
                {searchTerm ? 'No invoices match your search' : 'No unpaid invoices found'}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Usage Tip */}
      <Card className="bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800">
        <CardContent className="pt-6">
          <div className="flex gap-3">
            <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-green-900 dark:text-green-100">
                Perfect for gigs!
              </p>
              <p className="text-xs text-green-700 dark:text-green-300 mt-1">
                Send invoices instantly when clients ask for immediate payment. Works great during or right after performances.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}