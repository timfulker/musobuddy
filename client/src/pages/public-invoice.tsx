import { useState, useEffect } from "react";
import { useParams } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CreditCard, Download, FileText, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface PublicInvoice {
  id: number;
  invoiceNumber: string;
  clientName: string;
  amount: string;
  dueDate: string;
  status: string;
  cloudStorageUrl: string;
  businessName?: string;
  businessEmail?: string;
  bankDetails?: {
    sortCode?: string;
    accountNumber?: string;
    accountName?: string;
  };
}

export default function PublicInvoice() {
  const { token } = useParams<{ token: string }>();
  const { toast } = useToast();
  const [invoice, setInvoice] = useState<PublicInvoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchInvoice = async () => {
      if (!token) {
        setError("Invalid invoice link");
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(`/api/public/invoice/${token}`);
        if (!response.ok) {
          throw new Error('Invoice not found');
        }
        
        const invoiceData = await response.json();
        setInvoice(invoiceData);
      } catch (err: any) {
        setError(err.message || 'Failed to load invoice');
      } finally {
        setLoading(false);
      }
    };

    fetchInvoice();
  }, [token]);

  const handleDownloadInvoice = () => {
    if (invoice?.cloudStorageUrl) {
      window.open(invoice.cloudStorageUrl, '_blank');
    } else {
      toast({
        title: "Download unavailable",
        description: "Invoice PDF is not available for download",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <AlertCircle className="h-5 w-5" />
              Invoice Not Found
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600">{error || "This invoice link is invalid or has expired."}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isPaid = invoice.status === 'paid';
  const canPay = ['sent', 'overdue'].includes(invoice.status);

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-2xl font-bold text-gray-900">
                  Invoice {invoice.invoiceNumber}
                </CardTitle>
                <p className="text-gray-600 mt-1">
                  From: {invoice.businessName || 'MusoBuddy User'}
                </p>
                <p className="text-gray-600">
                  To: {invoice.clientName}
                </p>
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold text-gray-900">
                  £{invoice.amount}
                </div>
                <div className="text-sm text-gray-500">
                  Due: {new Date(invoice.dueDate).toLocaleDateString()}
                </div>
                <div className={`inline-block px-2 py-1 rounded-full text-xs font-medium mt-2 ${
                  isPaid ? 'bg-green-100 text-green-800' :
                  invoice.status === 'overdue' ? 'bg-red-100 text-red-800' :
                  'bg-yellow-100 text-yellow-800'
                }`}>
                  {isPaid ? 'Paid' : invoice.status === 'overdue' ? 'Overdue' : 'Pending'}
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex gap-3">
              <Button
                onClick={handleDownloadInvoice}
                variant="outline"
                className="flex items-center gap-2"
              >
                <Download className="h-4 w-4" />
                Download PDF
              </Button>
              
              {isPaid && (
                <div className="flex items-center gap-2 text-green-600 font-medium">
                  <span className="w-2 h-2 bg-green-600 rounded-full"></span>
                  Payment Received
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Payment Instructions */}
        {!isPaid && invoice.bankDetails && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Payment Instructions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-blue-50 p-4 rounded-lg">
                <p className="text-sm text-gray-700 mb-3">
                  Please transfer payment to the following bank account:
                </p>
                <div className="grid gap-2 text-sm">
                  {invoice.bankDetails.accountName && (
                    <div>
                      <span className="font-medium">Account Name:</span> {invoice.bankDetails.accountName}
                    </div>
                  )}
                  {invoice.bankDetails.sortCode && (
                    <div>
                      <span className="font-medium">Sort Code:</span> {invoice.bankDetails.sortCode}
                    </div>
                  )}
                  {invoice.bankDetails.accountNumber && (
                    <div>
                      <span className="font-medium">Account Number:</span> {invoice.bankDetails.accountNumber}
                    </div>
                  )}
                  <div>
                    <span className="font-medium">Reference:</span> Invoice {invoice.invoiceNumber}
                  </div>
                  <div>
                    <span className="font-medium">Amount:</span> £{invoice.amount}
                  </div>
                </div>
                <p className="text-xs text-gray-600 mt-3">
                  Please include the invoice number as your payment reference.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* PDF Viewer */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Invoice Details
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="h-[800px] w-full">
              <iframe
                src={invoice.cloudStorageUrl}
                className="w-full h-full border-0"
                title={`Invoice ${invoice.invoiceNumber}`}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}