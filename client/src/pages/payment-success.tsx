import { useEffect } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, FileText } from "lucide-react";

export default function PaymentSuccess() {
  const [location] = useLocation();
  const urlParams = new URLSearchParams(window.location.search);
  const invoiceNumber = urlParams.get('invoice');

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
            <CheckCircle className="w-10 h-10 text-green-600" />
          </div>
          <CardTitle className="text-2xl text-green-700">Payment Successful!</CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          {invoiceNumber && (
            <p className="text-gray-600">
              Your payment for <strong>Invoice {invoiceNumber}</strong> has been processed successfully.
            </p>
          )}
          <p className="text-sm text-gray-500">
            You should receive a confirmation email shortly.
          </p>
          <div className="flex flex-col gap-2 pt-4">
            <Button 
              onClick={() => window.close()}
              className="w-full"
            >
              Close Window
            </Button>
            <Button 
              variant="outline" 
              onClick={() => window.location.href = 'https://www.musobuddy.com'}
              className="w-full"
            >
              <FileText className="w-4 h-4 mr-2" />
              Back to MusoBuddy
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}