/**
 * Debug incoming webhook requests to see what's actually being received
 */

import express from 'express';

const app = express();
const port = 3001;

// Capture ALL incoming requests
app.use((req, res, next) => {
  console.log(`\n🔍 INCOMING REQUEST: ${req.method} ${req.url}`);
  console.log('Headers:', JSON.stringify(req.headers, null, 2));
  console.log('Query:', req.query);
  next();
});

// Parse different content types
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.raw({ type: 'application/x-www-form-urlencoded' }));

// Catch webhook requests
app.post('/api/webhook/mailgun', (req, res) => {
  console.log('\n📧 WEBHOOK REQUEST RECEIVED');
  console.log('Content-Type:', req.headers['content-type']);
  console.log('Body keys:', Object.keys(req.body));
  console.log('Raw body:', JSON.stringify(req.body, null, 2));
  
  // Check specific fields
  const fromField = req.body.From || req.body.from || req.body.sender;
  const subjectField = req.body.Subject || req.body.subject;
  const bodyField = req.body['body-plain'] || req.body['stripped-text'] || req.body.text;
  
  console.log('\n📋 EXTRACTED FIELDS:');
  console.log('From:', fromField);
  console.log('Subject:', subjectField);
  console.log('Body:', bodyField);
  
  res.json({ success: true, received: true });
});

// Catch all other routes
app.use('*', (req, res) => {
  console.log(`\n❓ UNHANDLED REQUEST: ${req.method} ${req.originalUrl}`);
  res.json({ error: 'Route not found' });
});

app.listen(port, () => {
  console.log(`🔍 Debug server listening on port ${port}`);
  console.log('Send webhook requests to: http://localhost:3001/api/webhook/mailgun');
});