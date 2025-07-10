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
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 dark:from-gray-900 dark:via-purple-900/20 dark:to-blue-900/20">
        {/* Decorative background pattern */}
        <div className="absolute inset-0 opacity-5 dark:opacity-10">
          <div className="absolute top-20 left-20 w-96 h-96 bg-gradient-to-r from-blue-400 to-purple-500 rounded-full blur-3xl"></div>
          <div className="absolute bottom-20 right-20 w-80 h-80 bg-gradient-to-r from-purple-400 to-pink-500 rounded-full blur-3xl"></div>
        </div>
        
        <Sidebar />
        <div className="md:ml-64 flex items-center justify-center min-h-screen relative z-10">
          <div className="text-center backdrop-blur-sm bg-white/80 dark:bg-gray-800/80 rounded-xl p-8 shadow-xl">
            <Loader2 className="w-12 h-12 text-purple-500 dark:text-purple-400 mx-auto mb-4 animate-spin" />
            <p className="text-gray-700 dark:text-gray-200 font-medium">Loading invoice...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 dark:from-gray-900 dark:via-purple-900/20 dark:to-blue-900/20">
        {/* Decorative background pattern */}
        <div className="absolute inset-0 opacity-5 dark:opacity-10">
          <div className="absolute top-20 left-20 w-96 h-96 bg-gradient-to-r from-blue-400 to-purple-500 rounded-full blur-3xl"></div>
          <div className="absolute bottom-20 right-20 w-80 h-80 bg-gradient-to-r from-purple-400 to-pink-500 rounded-full blur-3xl"></div>
        </div>
        
        <Sidebar />
        <div className="md:ml-64 flex items-center justify-center min-h-screen relative z-10">
          <Card className="w-full max-w-md backdrop-blur-sm bg-white/95 dark:bg-gray-800/95 shadow-xl border-0">
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 dark:from-gray-900 dark:via-purple-900/20 dark:to-blue-900/20">
      {/* Decorative background pattern */}
      <div className="absolute inset-0 opacity-5 dark:opacity-10">
        <div className="absolute top-20 left-20 w-96 h-96 bg-gradient-to-r from-blue-400 to-purple-500 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 right-20 w-80 h-80 bg-gradient-to-r from-purple-400 to-pink-500 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-gradient-to-r from-pink-400 to-blue-500 rounded-full blur-3xl"></div>
      </div>
      
      <Sidebar />
      <div className="md:ml-64 relative z-10">
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
            <Card className="w-full lg:w-96 backdrop-blur-sm bg-white/95 dark:bg-gray-800/95 shadow-xl border-0">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full"></div>
                  Invoice Details
                </CardTitle>
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
          <Card className="flex-1 backdrop-blur-sm bg-white/95 dark:bg-gray-800/95 shadow-xl border-0">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                Invoice Preview
                <div className="w-2 h-2 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full ml-auto"></div>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 relative">
              <div className="w-full h-[800px] border rounded-b-lg overflow-hidden bg-white shadow-inner">
                <iframe
                  src={`/api/invoices/${id}/download`}
                  className="w-full h-full border-0"
                  title={`Invoice ${invoice.invoiceNumber}`}
                />
              </div>
              {/* MusoBuddy Branding */}
              <div className="absolute bottom-2 right-2 text-xs text-gray-400 dark:text-gray-500 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm px-2 py-1 rounded">
                Powered by MusoBuddy
              </div>
            </CardContent>
          </Card>
          </div>
        </div>
      </div>
    </div>
  );
}