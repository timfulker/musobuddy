const onSubmit = (data: z.infer<typeof invoiceFormSchema>) => {
    console.log("🔍 RAW FORM DATA:", JSON.stringify(data, null, 2));
    console.log("🔍 Form watch values:", form.watch());
    console.log("🔍 Form getValues():", form.getValues());
    console.log("🔍 Selected contract ID:", selectedContractId);
    
    // Client-side validation with user-friendly prompts
    const validationIssues = [];
    
    if (!data.clientName || !data.clientName.trim()) {
      validationIssues.push("Client name cannot be empty");
      console.log("🔍 CLIENT NAME ISSUE:", {
        clientName: data.clientName,
        type: typeof data.clientName,
        trimmed: data.clientName?.trim(),
        length: data.clientName?.length
      });
    }
    
    if (!data.amount || !data.amount.trim()) {
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
    
    // Show validation issues as a prompt instead of failing
    if (validationIssues.length > 0) {
      console.log("🔍 VALIDATION ISSUES:", validationIssues);
      toast({
        title: "Please fix the following issues:",
        description: validationIssues.join(", "),
        variant: "destructive",
      });
      return; // Don't submit the form
    }
    
    // Warn if no client email provided
    if (!data.clientEmail || !data.clientEmail.trim()) {
      toast({
        title: "Note",
        description: "No client email provided. You won't be able to send this invoice via email until you add one.",
      });
      // Still allow creation but warn the user
    }
    
    // Send data exactly as expected by the API with proper type handling
    const finalData = {
      // Handle contractId - convert empty/undefined to null for optional integer field
      contractId: selectedContractId && selectedContractId > 0 ? selectedContractId : null,
      
      // Required fields - add extra safety checks
      clientName: (data.clientName || "").trim(),
      amount: (data.amount || "").trim(), // Keep as string for decimal handling
      dueDate: data.dueDate || "", // Backend expects string and will convert to Date
      
      // Optional string fields - convert empty strings to null
      clientEmail: data.clientEmail?.trim() || null,
      clientAddress: data.clientAddress?.trim() || null,
      venueAddress: data.venueAddress?.trim() || null,
      
      // Optional date fields - convert empty strings to null
      performanceDate: data.performanceDate?.trim() || null,
      
      // Optional decimal fields - convert empty strings to null
      performanceFee: data.performanceFee?.trim() || null,
      depositPaid: data.depositPaid?.trim() || null,
      
      // Status defaults to 'draft' in backend, don't send it
    };
    
    console.log("🔍 FINAL DATA BEING SENT:", JSON.stringify(finalData, null, 2));
    
    // Additional validation check before sending
    if (!finalData.clientName) {
      console.error("🔍 CRITICAL: clientName is still empty after processing!");
      toast({
        title: "Error",
        description: "Client name is required but appears to be empty. Please try typing it again.",
        variant: "destructive",
      });
      return;
    }
    
    if (editingInvoice) {
      // Update existing invoice
      updateInvoiceMutation.mutate({ id: editingInvoice.id, data: finalData });
    } else {
      // Create new invoice
      createInvoiceMutation.mutate(finalData);
    }
  };