import { useLocation } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, FileText, Mail } from 'lucide-react';
import { useEffect, useState } from 'react';

export default function PaymentSuccess() {
  const [location] = useLocation();
  const [invoiceNumber, setInvoiceNumber] = useState<string>('');
  
  useEffect(() => {
    // Extract invoice number from URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const invoice = urlParams.get('invoice');
    const sessionId = urlParams.get('session_id');
    
    console.log('🎯 Payment Success Page - URL params:', { invoice, sessionId });
    
    if (invoice) {
      setInvoiceNumber(invoice);
    }
  }, [location]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md mx-auto shadow-lg">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <CardTitle className="text-2xl font-bold text-green-800">
            Payment Successful!
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <p className="text-gray-600">
            Thank you for your payment. Your transaction has been processed successfully.
          </p>
          
          {invoiceNumber && (
            <div className="bg-blue-50 p-3 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>Invoice:</strong> {invoiceNumber}
              </p>
            </div>
          )}

          <div className="space-y-3 pt-4">
            <div className="flex items-center justify-center space-x-2 text-sm text-gray-600">
              <Mail className="w-4 h-4" />
              <span>A confirmation email has been sent to you</span>
            </div>
            
            <div className="flex items-center justify-center space-x-2 text-sm text-gray-600">
              <FileText className="w-4 h-4" />
              <span>Your paid invoice is available via the link in the email</span>
            </div>
          </div>

          <div className="pt-6">
            <Button 
              onClick={() => window.close()} 
              className="w-full bg-green-600 hover:bg-green-700"
            >
              Close Window
            </Button>
          </div>

          <p className="text-xs text-gray-500 pt-2">
            You can safely close this window. If you have any questions, 
            please contact the business that sent you this invoice.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}