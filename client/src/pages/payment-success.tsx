import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, Download, ArrowLeft } from "lucide-react";

export default function PaymentSuccess() {
  const [location] = useLocation();
  const [invoiceNumber, setInvoiceNumber] = useState<string | null>(null);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const invoice = urlParams.get('invoice');
    if (invoice) {
      setInvoiceNumber(invoice);
    }
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-8">
      <div className="max-w-md w-full px-4">
        <Card className="text-center">
          <CardHeader>
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <CardTitle className="text-2xl font-bold text-gray-900">
              Payment Successful!
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-gray-600">
              <p>Thank you for your payment.</p>
              {invoiceNumber && (
                <p className="font-medium mt-2">
                  Invoice {invoiceNumber} has been paid successfully.
                </p>
              )}
            </div>
            
            <div className="pt-4 space-y-3">
              <p className="text-sm text-gray-500">
                You will receive a payment confirmation email shortly.
              </p>
              
              <div className="flex flex-col gap-2">
                <Button
                  onClick={() => window.close()}
                  className="w-full"
                >
                  Close Window
                </Button>
                
                <Button
                  variant="outline"
                  onClick={() => window.history.back()}
                  className="w-full flex items-center gap-2"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Go Back
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}