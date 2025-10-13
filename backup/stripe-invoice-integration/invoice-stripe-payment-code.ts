// BACKUP: Stripe Invoice Payment Integration
// This code can be reactivated when implementing Stripe Connect
// for direct payments to individual users

// Payment creation endpoint (lines 60-126 from invoice-routes.ts)
export const createStripePayment = `
  // Create Stripe payment link for invoice
  app.post('/api/invoice/:token/pay', async (req: any, res) => {
    try {
      const { token } = req.params;
      
      // Get invoice by token
      const invoice = await storage.getInvoiceByToken(token);
      if (!invoice) {
        return res.status(404).json({ error: 'Invoice not found' });
      }

      // Check if already paid
      if (invoice.status === 'paid') {
        return res.status(400).json({ error: 'Invoice already paid' });
      }

      console.log(\`💳 Creating payment with key type: \${stripeKey?.startsWith('sk_test') ? 'TEST' : 'LIVE'}\`);
      console.log(\`🔧 Full key used: \${stripeKey}\`);
      console.log(\`💰 Amount: £\${invoice.amount} (\${Math.round(parseFloat(invoice.amount) * 100)} pence)\`);
      
      // Determine correct domain for success URL
      const baseUrl = process.env.REPLIT_DEPLOYMENT ? 'https://www.musobuddy.com' : req.headers.origin;
      const successUrl = \`\${baseUrl}/payment-success?invoice=\${invoice.invoiceNumber}&session_id={CHECKOUT_SESSION_ID}\`;
      console.log(\`🔗 Success URL: \${successUrl}\`);
      
      // Create Stripe checkout session
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [{
          price_data: {
            currency: 'gbp',
            product_data: {
              name: \`Invoice \${invoice.invoiceNumber}\`,
              description: \`Payment for services - \${invoice.clientName}\`,
            },
            unit_amount: Math.round(parseFloat(invoice.amount) * 100), // Convert to pence
          },
          quantity: 1,
        }],
        mode: 'payment',
        success_url: successUrl,
        cancel_url: \`\${req.headers.origin}/invoice/\${token}\`,
        metadata: {
          invoiceId: invoice.id.toString(),
          invoiceToken: token,
        },
        after_completion: {
          type: 'redirect',
          redirect: {
            url: \`\${process.env.REPLIT_DEV_DOMAIN || 'https://www.musobuddy.com'}/payment-success?invoice=\${invoice.invoiceNumber}\`,
          },
        },
      });
      
      // Update invoice with payment link
      await storage.updateInvoicePaymentLink(parseInt(invoice.id), session.url || '');
      
      res.json({ url: session.url });
    } catch (error: any) {
      console.error('❌ Error creating payment link:', error);
      res.status(500).json({ error: 'Failed to create payment link' });
    }
  });
`;

// Webhook handler (lines 128-200 from invoice-routes.ts)
export const stripeWebhookHandler = \`
  // Stripe webhook handler for payment completion
  app.post('/api/stripe/webhook', async (req: any, res) => {
    try {
      const sig = req.headers['stripe-signature'];
      let event;

      try {
        event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
      } catch (err: any) {
        console.error('❌ Webhook signature verification failed:', err.message);
        return res.status(400).send(\`Webhook Error: \${err.message}\`);
      }

      if (event.type === 'checkout.session.completed') {
        const session = event.data.object as any;
        const invoiceId = session.metadata?.invoiceId;
        
        console.log(\`🎉 WEBHOOK FIRED: Payment completed for session \${session.id}\`);
        console.log(\`📋 Session metadata:\`, session.metadata);
        
        if (invoiceId) {
          console.log(\`💰 Processing payment for invoice ID: \${invoiceId}\`);
          
          // Mark invoice as paid
          await storage.updateInvoiceStatus(parseInt(invoiceId), 'paid');
          
          // Get updated invoice details
          const invoice = await storage.getInvoice(parseInt(invoiceId));
          if (invoice) {
            console.log(\`📧 Sending confirmation email for invoice \${invoice.invoiceNumber}\`);
            
            // Regenerate PDF with PAID status
            const pdfBuffer = await generateInvoicePDF(invoice);
            
            // Upload updated PDF to cloud storage
            const pdfUrl = await uploadInvoiceToCloud(invoice.invoiceNumber, pdfBuffer);
            
            // Send confirmation emails
            await sendInvoiceEmail(invoice, 'paid');
            
            console.log(\`✅ Payment processed successfully for invoice \${invoice.invoiceNumber}\`);
          }
        }
      }

      res.json({ received: true });
    } catch (error: any) {
      console.error('❌ Error processing webhook:', error);
      res.status(500).json({ error: 'Failed to process webhook' });
    }
  });
\`;

// Future Stripe Connect implementation notes:
// 1. Add Stripe Connect onboarding for users
// 2. Store user's Stripe Connect account ID in database
// 3. Route invoice payments to user's connected account
// 4. Optional: Take platform fee for MusoBuddy
// 5. Update invoice generation to use user's Stripe account