const form = useForm<z.infer<typeof invoiceFormSchema>>({
    resolver: zodResolver(invoiceFormSchema),
    defaultValues: {
      contractId: null, // Start with null instead of undefined
      clientName: "", 
      clientEmail: "",
      clientAddress: "",
      venueAddress: "",
      amount: "",
      dueDate: "",
      performanceDate: "",
      performanceFee: "",
      depositPaid: "",
    },
  });