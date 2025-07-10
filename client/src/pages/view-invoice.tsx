import { useQuery } from '@tanstack/react-query';
import { useParams, useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Download, FileText, Loader2, Home } from 'lucide-react';
import { useState } from 'react';
import Sidebar from '@/components/sidebar';

interface Invoice {
  id: number;
  invoiceNumber: string;
  clientName: string;
  clientEmail: string;
  clientAddress: string;
  amount: number;
  dueDate: string;
  status: string;
  description: string;
  createdAt: string;
}

export default function ViewInvoice() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const [pdfLoading, setPdfLoading] = useState(false);

  const { data: invoice, isLoading, error } = useQuery<Invoice>({
    queryKey: [`/api/invoices/${id}/view`],
    enabled: !!id,
  });

  const handleDownload = async () => {
    if (!id) return;
    
    setPdfLoading(true);
    try {
      const response = await fetch(`/api/invoices/${id}/download`);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `invoice-${invoice?.invoiceNumber || id}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download failed:', error);
    } finally {
      setPdfLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <Sidebar />
        <div className="md:ml-64 flex items-center justify-center min-h-screen">
          <div className="text-center">
            <Loader2 className="w-12 h-12 text-blue-500 dark:text-blue-400 mx-auto mb-4 animate-spin" />
            <p className="text-gray-600 dark:text-gray-300">Loading invoice...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <Sidebar />
        <div className="md:ml-64 flex items-center justify-center min-h-screen">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle className="text-center text-red-600 dark:text-red-400">Invoice Not Found</CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                The invoice you're looking for could not be found.
              </p>
              <div className="flex flex-col sm:flex-row gap-2 justify-center">
                <Button onClick={() => setLocation('/')} variant="outline">
                  <Home className="w-4 h-4 mr-2" />
                  Dashboard
                </Button>
                <Button onClick={() => setLocation('/invoices')} variant="outline">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Invoices
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Sidebar />
      <div className="md:ml-64">
        <div className="container mx-auto px-4 py-8">
          {/* Navigation Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <Button onClick={() => setLocation('/')} variant="outline" size="sm">
                <Home className="w-4 h-4 mr-2" />
                Dashboard
              </Button>
              <Button onClick={() => setLocation('/invoices')} variant="outline" size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Invoices
              </Button>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              Invoice #{invoice?.invoiceNumber}
            </h1>
          </div>

          <div className="flex flex-col lg:flex-row gap-6">
            {/* Invoice Details Panel */}
            <Card className="w-full lg:w-96">
              <CardHeader>
                <CardTitle>Invoice Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Invoice Number</label>
                <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">#{invoice.invoiceNumber}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Client</label>
                <p className="text-gray-900 dark:text-gray-100">{invoice.clientName}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Amount</label>
                <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">£{Number(invoice.amount).toLocaleString()}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Status</label>
                <p className="text-gray-900 dark:text-gray-100 capitalize">{invoice.status}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Due Date</label>
                <p className="text-gray-900 dark:text-gray-100">{new Date(invoice.dueDate).toLocaleDateString()}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Created</label>
                <p className="text-gray-900 dark:text-gray-100">{new Date(invoice.createdAt).toLocaleDateString()}</p>
              </div>
              <Button onClick={handleDownload} className="w-full" disabled={pdfLoading}>
                {pdfLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4 mr-2" />
                    Download PDF
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* PDF Viewer */}
          <Card className="flex-1">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Invoice Preview
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="w-full h-[800px] border rounded-b-lg overflow-hidden bg-white">
                <iframe
                  src={`/api/invoices/${id}/download`}
                  className="w-full h-full border-0"
                  title={`Invoice ${invoice.invoiceNumber}`}
                />
              </div>
            </CardContent>
          </Card>
          </div>
        </div>
      </div>
    </div>
  );
}