// Fix for invoices.tsx - Update the createInvoiceMutation around line 134

const createInvoiceMutation = useMutation({
  mutationFn: async (data: any) => {
    console.log("🔥 Frontend: Making invoice creation request");
    console.log("🔥 Frontend: Request data:", JSON.stringify(data, null, 2));
    console.log("🔥 Frontend: Request URL:", '/api/invoices');
    
    // Use fetch directly to ensure we hit the priority route
    const response = await fetch('/api/invoices', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include', // Important for session handling
      body: JSON.stringify(data),
    });
    
    console.log("🔥 Frontend: Response status:", response.status);
    console.log("🔥 Frontend: Response ok:", response.ok);
    
    if (!response.ok) {
      const errorData = await response.text();
      console.error("🔥 Frontend: Error response:", errorData);
      throw new Error(errorData || 'Failed to create invoice');
    }
    
    const result = await response.json();
    console.log("🔥 Frontend: Success response:", result);
    return result;
  },
  onSuccess: (data) => {
    console.log("🔥 Frontend: Mutation success:", data);
    queryClient.invalidateQueries({ queryKey: ['/api/invoices'] });
    form.reset();
    setIsDialogOpen(false);
    setEditingInvoice(null);
    toast({
      title: "Success",
      description: "Invoice created successfully!",
    });
  },
  onError: (error: any) => {
    console.error("🔥 Frontend: Mutation error:", error);
    console.error("🔥 Frontend: Error message:", error.message);
    console.error("🔥 Frontend: Error stack:", error.stack);
    
    // Show specific error message if available
    const errorMessage = error.message || "Failed to create invoice. Please try again.";
    
    toast({
      title: "Error Creating Invoice",
      description: errorMessage,
      variant: "destructive",
    });
  },
});

// Also update the onSubmit function to ensure proper data formatting
const onSubmit = (data: z.infer<typeof invoiceFormSchema>) => {
  console.log("🔥 Frontend: Form submission started");
  console.log("🔥 Frontend: Form data:", JSON.stringify(data, null, 2));
  console.log("🔥 Frontend: Selected contract ID:", selectedContractId);
  
  // Client-side validation
  const validationIssues = [];
  
  if (!data.clientName.trim()) {
    validationIssues.push("Client name cannot be empty");
  }
  
  if (!data.amount.trim()) {
    validationIssues.push("Amount is required");
  } else {
    const amount = parseFloat(data.amount);
    if (isNaN(amount) || amount <= 0) {
      validationIssues.push("Amount must be a valid number greater than 0");
    }
  }
  
  if (!data.dueDate) {
    validationIssues.push("Due date is required");
  }
  
  if (data.clientEmail && data.clientEmail.trim() && !data.clientEmail.includes('@')) {
    validationIssues.push("Please enter a valid email address");
  }
  
  if (validationIssues.length > 0) {
    console.log("🔥 Frontend: Validation issues:", validationIssues);
    toast({
      title: "Please fix the following issues:",
      description: validationIssues.join(", "),
      variant: "destructive",
    });
    return;
  }
  
  // Prepare data exactly as backend expects
  const finalData = {
    contractId: selectedContractId || null,
    clientName: data.clientName.trim(),
    clientEmail: data.clientEmail?.trim() || null,
    clientAddress: data.clientAddress?.trim() || null,
    venueAddress: data.venueAddress?.trim() || null,
    amount: data.amount.trim(),
    dueDate: data.dueDate,
    performanceDate: data.performanceDate || null,
    performanceFee: data.performanceFee?.trim() || null,
    depositPaid: data.depositPaid?.trim() || null,
  };
  
  console.log("🔥 Frontend: Final data for API:", JSON.stringify(finalData, null, 2));
  
  if (editingInvoice) {
    console.log("🔥 Frontend: Updating existing invoice:", editingInvoice.id);
    updateInvoiceMutation.mutate({ id: editingInvoice.id, data: finalData });
  } else {
    console.log("🔥 Frontend: Creating new invoice");
    createInvoiceMutation.mutate(finalData);
  }
};