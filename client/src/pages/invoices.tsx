// Replace the invoice cards section (around lines 850-950) with this improved layout:

{filteredInvoices.map((invoice: Invoice) => {
  const isSelected = selectedInvoices.includes(invoice.id);
  return (
    <Card key={invoice.id} className={`hover:shadow-md transition-shadow ${isSelected ? 'ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-900/20' : ''}`}>
      <CardContent className="p-6">
        <div className="space-y-4">
          {/* Header with title, status, and checkbox */}
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={isSelected}
              onChange={(e) => handleSelectInvoice(invoice.id, e.target.checked)}
              className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
            />
            <h3 className="font-semibold text-lg text-gray-900 dark:text-gray-100">
              Invoice #{invoice.invoiceNumber}
            </h3>
            <Badge className={getStatusColor(invoice.status)}>
              {invoice.status}
            </Badge>
          </div>

          {/* Desktop Layout */}
          <div className="hidden lg:block">
            <div className="grid grid-cols-12 gap-4 items-center">
              {/* Invoice details - fixed columns */}
              <div className="col-span-8">
                <div className="grid grid-cols-4 gap-4 text-sm">
                  <div className="min-w-0">
                    <span className="font-medium text-gray-600 dark:text-gray-400 block">Client:</span>
                    <p className="text-gray-900 dark:text-gray-100 truncate" title={invoice.clientName}>
                      {invoice.clientName}
                    </p>
                  </div>
                  <div className="min-w-0">
                    <span className="font-medium text-gray-600 dark:text-gray-400 block">Amount:</span>
                    <p className="text-gray-900 dark:text-gray-100 font-semibold">
                      £{Number(invoice.amount).toLocaleString()}
                    </p>
                  </div>
                  <div className="min-w-0">
                    <span className="font-medium text-gray-600 dark:text-gray-400 block">Due:</span>
                    <p className="text-gray-900 dark:text-gray-100">
                      {formatDate(invoice.dueDate)}
                    </p>
                  </div>
                  <div className="min-w-0">
                    <span className="font-medium text-gray-600 dark:text-gray-400 block">Created:</span>
                    <p className="text-gray-900 dark:text-gray-100">
                      {formatDate(invoice.createdAt)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Action buttons - fixed column */}
              <div className="col-span-4">
                <div className="flex items-center justify-end gap-2 flex-wrap">
                  {/* View button - available for all statuses */}
                  <Button 
                    size="sm" 
                    className="text-xs whitespace-nowrap bg-green-600 hover:bg-green-700 text-white min-w-[70px]"
                    onClick={() => handleViewInvoice(invoice)}
                  >
                    <Eye className="w-3 h-3 mr-1" />
                    View
                  </Button>

                  {invoice.status === "draft" && (
                    <>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="text-xs whitespace-nowrap text-gray-600 hover:text-gray-700 min-w-[60px]"
                        onClick={() => handleEditInvoice(invoice)}
                      >
                        <Edit className="w-3 h-3 mr-1" />
                        Edit
                      </Button>
                      <Button 
                        size="sm" 
                        className="text-xs whitespace-nowrap bg-blue-600 hover:bg-blue-700 text-white min-w-[65px]" 
                        onClick={() => handleSendInvoice(invoice)}
                        disabled={sendInvoiceMutation.isPending}
                      >
                        <Send className="w-3 h-3 mr-1" />
                        {sendInvoiceMutation.isPending ? 'Sending...' : 'Send'}
                      </Button>
                    </>
                  )}

                  {invoice.status === "sent" && (
                    <>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="text-xs text-green-600 hover:text-green-700 whitespace-nowrap min-w-[85px]" 
                        onClick={() => handleMarkAsPaid(invoice)}
                        disabled={markPaidMutation.isPending}
                      >
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Mark Paid
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="text-xs text-blue-600 hover:text-blue-700 whitespace-nowrap min-w-[70px]" 
                        onClick={() => handleResendInvoice(invoice)}
                        disabled={resendInvoiceMutation.isPending}
                      >
                        <RefreshCw className="w-3 h-3 mr-1" />
                        Resend
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="text-xs text-purple-600 hover:text-purple-700 whitespace-nowrap min-w-[100px]" 
                        onClick={() => handleEditAndResend(invoice)}
                      >
                        <Edit className="w-3 h-3 mr-1" />
                        Edit & Resend
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="text-xs text-gray-600 hover:text-gray-700 whitespace-nowrap min-w-[85px]" 
                        onClick={() => handleDownloadInvoice(invoice)}
                      >
                        <Download className="w-3 h-3 mr-1" />
                        Download
                      </Button>
                    </>
                  )}

                  {invoice.status === "overdue" && (
                    <>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="text-xs text-green-600 hover:text-green-700 whitespace-nowrap min-w-[85px]" 
                        onClick={() => handleMarkAsPaid(invoice)}
                        disabled={markPaidMutation.isPending}
                      >
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Mark Paid
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="text-xs text-blue-600 hover:text-blue-700 whitespace-nowrap min-w-[70px]" 
                        onClick={() => handleResendInvoice(invoice)}
                        disabled={resendInvoiceMutation.isPending}
                      >
                        <RefreshCw className="w-3 h-3 mr-1" />
                        Resend
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="text-xs text-purple-600 hover:text-purple-700 whitespace-nowrap min-w-[100px]" 
                        onClick={() => handleEditAndResend(invoice)}
                      >
                        <Edit className="w-3 h-3 mr-1" />
                        Edit & Resend
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="text-xs text-red-600 hover:text-red-700 whitespace-nowrap min-w-[110px]" 
                        onClick={() => handleSendReminder(invoice)}
                        disabled={sendReminderMutation.isPending}
                      >
                        <AlertTriangle className="w-3 h-3 mr-1" />
                        Overdue Notice
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="text-xs text-gray-600 hover:text-gray-700 whitespace-nowrap min-w-[85px]" 
                        onClick={() => handleDownloadInvoice(invoice)}
                      >
                        <Download className="w-3 h-3 mr-1" />
                        Download
                      </Button>
                    </>
                  )}

                  {invoice.status === "paid" && (
                    <>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="text-xs text-blue-600 hover:text-blue-700 whitespace-nowrap min-w-[95px]" 
                        onClick={() => handleResendInvoice(invoice)}
                        disabled={resendInvoiceMutation.isPending}
                      >
                        <RefreshCw className="w-3 h-3 mr-1" />
                        Resend Copy
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="text-xs text-purple-600 hover:text-purple-700 whitespace-nowrap min-w-[100px]" 
                        onClick={() => handleEditAndResend(invoice)}
                      >
                        <Edit className="w-3 h-3 mr-1" />
                        Edit & Resend
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="text-xs text-gray-600 hover:text-gray-700 whitespace-nowrap min-w-[85px]" 
                        onClick={() => handleDownloadInvoice(invoice)}
                      >
                        <Download className="w-3 h-3 mr-1" />
                        Download
                      </Button>
                    </>
                  )}

                  {invoice.status === "archived" && (
                    <>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="text-xs text-green-600 hover:text-green-700 whitespace-nowrap min-w-[75px]" 
                        onClick={() => handleRestoreInvoice(invoice)}
                        disabled={restoreInvoiceMutation.isPending}
                      >
                        <RefreshCw className="w-3 h-3 mr-1" />
                        Restore
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="text-xs text-gray-600 hover:text-gray-700 whitespace-nowrap min-w-[85px]" 
                        onClick={() => handleDownloadInvoice(invoice)}
                      >
                        <Download className="w-3 h-3 mr-1" />
                        Download
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Mobile Layout */}
          <div className="lg:hidden space-y-4">
            {/* Invoice details in mobile-friendly layout */}
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium text-gray-600 dark:text-gray-400">Client:</span>
                <p className="text-gray-900 dark:text-gray-100">{invoice.clientName}</p>
              </div>
              <div>
                <span className="font-medium text-gray-600 dark:text-gray-400">Amount:</span>
                <p className="text-gray-900 dark:text-gray-100 font-semibold">£{Number(invoice.amount).toLocaleString()}</p>
              </div>
              <div>
                <span className="font-medium text-gray-600 dark:text-gray-400">Due:</span>
                <p className="text-gray-900 dark:text-gray-100">{formatDate(invoice.dueDate)}</p>
              </div>
              <div>
                <span className="font-medium text-gray-600 dark:text-gray-400">Created:</span>
                <p className="text-gray-900 dark:text-gray-100">{formatDate(invoice.createdAt)}</p>
              </div>
            </div>

            {/* Mobile action buttons */}
            <div className="flex flex-wrap gap-2">
              {/* View button - available for all statuses */}
              <Button 
                size="sm" 
                className="text-xs bg-green-600 hover:bg-green-700 text-white"
                onClick={() => handleViewInvoice(invoice)}
              >
                <Eye className="w-3 h-3 mr-1" />
                View
              </Button>

              {invoice.status === "draft" && (
                <>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="text-xs text-gray-600 hover:text-gray-700"
                    onClick={() => handleEditInvoice(invoice)}
                  >
                    <Edit className="w-3 h-3 mr-1" />
                    Edit
                  </Button>
                  <Button 
                    size="sm" 
                    className="text-xs bg-blue-600 hover:bg-blue-700 text-white" 
                    onClick={() => handleSendInvoice(invoice)}
                    disabled={sendInvoiceMutation.isPending}
                  >
                    <Send className="w-3 h-3 mr-1" />
                    {sendInvoiceMutation.isPending ? 'Sending...' : 'Send'}
                  </Button>
                </>
              )}

              {invoice.status === "sent" && (
                <>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="text-xs text-green-600 hover:text-green-700" 
                    onClick={() => handleMarkAsPaid(invoice)}
                    disabled={markPaidMutation.isPending}
                  >
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Mark Paid
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="text-xs text-blue-600 hover:text-blue-700" 
                    onClick={() => handleResendInvoice(invoice)}
                    disabled={resendInvoiceMutation.isPending}
                  >
                    <RefreshCw className="w-3 h-3 mr-1" />
                    Resend
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="text-xs text-purple-600 hover:text-purple-700" 
                    onClick={() => handleEditAndResend(invoice)}
                  >
                    <Edit className="w-3 h-3 mr-1" />
                    Edit & Resend
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="text-xs text-gray-600 hover:text-gray-700" 
                    onClick={() => handleDownloadInvoice(invoice)}
                  >
                    <Download className="w-3 h-3 mr-1" />
                    Download
                  </Button>
                </>
              )}

              {invoice.status === "overdue" && (
                <>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="text-xs text-green-600 hover:text-green-700" 
                    onClick={() => handleMarkAsPaid(invoice)}
                    disabled={markPaidMutation.isPending}
                  >
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Mark Paid
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="text-xs text-blue-600 hover:text-blue-700" 
                    onClick={() => handleResendInvoice(invoice)}
                    disabled={resendInvoiceMutation.isPending}
                  >
                    <RefreshCw className="w-3 h-3 mr-1" />
                    Resend
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="text-xs text-purple-600 hover:text-purple-700" 
                    onClick={() => handleEditAndResend(invoice)}
                  >
                    <Edit className="w-3 h-3 mr-1" />
                    Edit & Resend
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="text-xs text-red-600 hover:text-red-700" 
                    onClick={() => handleSendReminder(invoice)}
                    disabled={sendReminderMutation.isPending}
                  >
                    <AlertTriangle className="w-3 h-3 mr-1" />
                    Overdue Notice
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="text-xs text-gray-600 hover:text-gray-700" 
                    onClick={() => handleDownloadInvoice(invoice)}
                  >
                    <Download className="w-3 h-3 mr-1" />
                    Download
                  </Button>
                </>
              )}

              {invoice.status === "paid" && (
                <>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="text-xs text-blue-600 hover:text-blue-700" 
                    onClick={() => handleResendInvoice(invoice)}
                    disabled={resendInvoiceMutation.isPending}
                  >
                    <RefreshCw className="w-3 h-3 mr-1" />
                    Resend Copy
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="text-xs text-purple-600 hover:text-purple-700" 
                    onClick={() => handleEditAndResend(invoice)}
                  >
                    <Edit className="w-3 h-3 mr-1" />
                    Edit & Resend
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="text-xs text-gray-600 hover:text-gray-700" 
                    onClick={() => handleDownloadInvoice(invoice)}
                  >
                    <Download className="w-3 h-3 mr-1" />
                    Download
                  </Button>
                </>
              )}

              {invoice.status === "archived" && (
                <>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="text-xs text-green-600 hover:text-green-700" 
                    onClick={() => handleRestoreInvoice(invoice)}
                    disabled={restoreInvoiceMutation.isPending}
                  >
                    <RefreshCw className="w-3 h-3 mr-1" />
                    Restore
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="text-xs text-gray-600 hover:text-gray-700" 
                    onClick={() => handleDownloadInvoice(invoice)}
                  >
                    <Download className="w-3 h-3 mr-1" />
                    Download
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
})}