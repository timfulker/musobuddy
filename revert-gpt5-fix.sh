#!/bin/bash

# Revert GPT-5 parsing fixes
echo "Reverting GPT-5 parsing changes..."

if [ -f "server/ai/booking-message-parser.ts.backup" ]; then
    cp server/ai/booking-message-parser.ts.backup server/ai/booking-message-parser.ts
    echo "✅ Reverted server/ai/booking-message-parser.ts to original version"
else
    echo "❌ Backup file not found at server/ai/booking-message-parser.ts.backup"
    exit 1
fi

echo "✅ All changes have been reverted successfully!"
echo "You may need to restart your application for changes to take effect."