#!/bin/bash

echo "🧪 Testing email migration at 10%..."
echo "Expected: ~1 email processed by NEW system, ~9 by OLD system"
echo ""

# Test new inquiries
echo "📧 Testing NEW INQUIRIES (prefix@enquiries.musobuddy.com)..."
for i in {1..5}; do
  echo "Sending inquiry $i..."
  curl -X POST https://musobuddy.replit.app/api/webhook/mailgun \
    -F "From=client$i@example.com" \
    -F "To=jake@enquiries.musobuddy.com" \
    -F "Subject=Need a DJ - Test $i $(date +%H:%M:%S)" \
    -F "body-plain=Looking for a DJ for my event on June 15th" \
    -F "Message-Id=<inquiry$i.$(date +%s)@example.com>" \
    -s -o /dev/null
  echo "✓ Sent"
  sleep 1
done

echo ""
echo "📧 Testing BOOKING REPLIES (user.booking@mg.musobuddy.com)..."
for i in {1..5}; do
  echo "Sending booking reply $i..."
  curl -X POST https://musobuddy.replit.app/api/webhook/mailgun \
    -F "From=client$i@example.com" \
    -F "To=user1754488522516.booking7317@mg.musobuddy.com" \
    -F "Subject=Re: Your booking - Test $i" \
    -F "body-plain=Yes, confirmed for 8pm. Looking forward to it!" \
    -F "Message-Id=<reply$i.$(date +%s)@example.com>" \
    -s -o /dev/null
  echo "✓ Sent"
  sleep 1
done

echo ""
echo "✅ All 10 test emails sent!"
echo ""
echo "Check migration status:"
curl https://musobuddy.replit.app/api/migration/status -H "x-admin-key: musobuddy-admin-2024"