// Emergency simple webhook handler
const express = require('express');
const router = express.Router();

router.post('/webhook/mailgun', (req, res) => {
  console.log('📧 Webhook received:', new Date().toISOString());
  
  // Just acknowledge all webhooks with 200 OK
  res.status(200).json({ success: true, acknowledged: true });
});

module.exports = router;