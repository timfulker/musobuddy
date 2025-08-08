import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';

export default function MobileInvoiceSender() {
  const [invoiceId, setInvoiceId] = useState('');
  const [sending, setSending] = useState(false);
  const { toast } = useToast();

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

  const quickSendButtons = [
    { id: '197', label: 'INV-284 (Natalie Freeman)' },
    { id: '81', label: '00261 (Harry Charles Tamplin)' },
    { id: '79', label: '00259 (Rick Stein)' },
    { id: '78', label: '00258 (Rick Stein)' }
  ];

  return (
    <div className="max-w-md mx-auto p-4 space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>📱 Mobile Invoice Sender</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="invoiceId" className="text-sm font-medium">
              Invoice Database ID
            </label>
            <div className="flex gap-2">
              <Input
                id="invoiceId"
                value={invoiceId}
                onChange={(e) => setInvoiceId(e.target.value)}
                placeholder="Enter invoice ID (e.g. 197)"
                type="number"
              />
              <Button 
                onClick={() => sendInvoiceDirectly(invoiceId)}
                disabled={!invoiceId || sending}
              >
                {sending ? 'Sending...' : 'Send'}
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium">Quick Send:</p>
            {quickSendButtons.map((invoice) => (
              <Button
                key={invoice.id}
                onClick={() => sendInvoiceDirectly(invoice.id)}
                disabled={sending}
                variant="outline"
                className="w-full text-left justify-start"
              >
                ID {invoice.id}: {invoice.label}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}