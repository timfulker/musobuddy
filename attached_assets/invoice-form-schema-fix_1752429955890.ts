const invoiceFormSchema = z.object({
  contractId: z.number().optional().nullable(), // Allow null for no contract selected
  clientName: z.string().min(1, "Client name is required"),
  clientEmail: z.string().email("Please enter a valid email address").or(z.literal("")).optional(),
  clientAddress: z.string().optional(),
  venueAddress: z.string().optional(),
  amount: z.string().min(1, "Amount is required").refine((val) => {
    const num = parseFloat(val);
    return !isNaN(num) && num > 0;
  }, "Amount must be a valid number greater than 0"),
  dueDate: z.string().min(1, "Due date is required"),
  performanceDate: z.string().optional(),
  performanceFee: z.string().optional(),
  depositPaid: z.string().optional(),
});