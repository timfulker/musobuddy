# GPT-5 Email Parsing Issue - Technical Synopsis

## Problem Overview
The MusoBuddy email processing system is failing to correctly extract client names and event dates from booking inquiry emails. Despite using GPT-5 with explicit instructions, the AI is not parsing critical information from email content.

## Expected vs Actual Behavior

### Test Email Content:
```
Subject: 50th wedding anniversary party
From: Tim Fulker <tim@saxweddings.com>
Body:
Dear Tim,
We are having our 50th wedding anniversary party on the 17th of March 2026. We would love it if you could come and play for us. We are having our reception at the Carlton Hotel in Bournemouth.

Kind Regards
Patrick Head
Peahead@gmail.com
07751718011
```

### Expected Results:
- **Client Name**: "Patrick Head" (from email signature)
- **Client Email**: "Peahead@gmail.com" (from email content)
- **Event Date**: "2026-03-17" (from "17th of March 2026")
- **Venue**: "the Carlton Hotel in Bournemouth"
- **Event Type**: "party" (from context)

### Actual Results:
- **Client Name**: "Tim Fulker" (incorrectly using From field instead of signature)
- **Client Email**: Correctly extracted
- **Event Date**: null (failed to parse "17th of March 2026")
- **Venue**: "the Carlton Hotel in Bournemouth" (correct)
- **Event Type**: "party" (correct)

## Core Technical Files Involved

### 1. Primary AI Processing
- **`server/ai/booking-message-parser.ts`** (Lines 131-220)
  - Contains GPT-5 system prompt and user prompt construction
  - Handles OpenAI API calls and response parsing
  - Current date context: August 17, 2025

### 2. Email Queue Processing
- **`server/core/email-queue-enhanced.ts`** (Lines 510-535)
  - Maps GPT-5 parsed data to booking object
  - Contains fallback logic for client name/email extraction
  - Line 516: `clientName: parsedData.clientName || fromField.split('<')[0].trim() || 'Unknown Client'`

### 3. Email Processing Engine
- **`server/core/email-processing-engine.ts`**
  - Handles Mailgun webhook data extraction
  - Passes email fields to AI parser

### 4. Webhook Handler
- **`server/index.ts`** (Mailgun webhook endpoint)
  - Receives incoming emails from Mailgun
  - Extracts From, Subject, Body fields

## Current GPT-5 System Prompt Analysis

### Strengths:
- Clear JSON output format specification
- Multiple date format handling instructions
- Geographic context for ambiguous dates (DD/MM vs MM/DD)
- Current date context provided (August 17, 2025)

### Potential Issues:
1. **Overly complex instructions** - May be confusing GPT-5
2. **Priority order unclear** - Body vs From field extraction not explicit enough
3. **Example mismatch** - Examples don't match actual test case format
4. **Input format** - GPT-5 receives email body and From field separately, may not see full context

## Data Flow Analysis

```
Mailgun Webhook → Email Processing Engine → AI Parser → Booking Creation
     ↓                    ↓                   ↓            ↓
 Raw email data    Extract fields      GPT-5 parsing   Map to database
```

**Current Input to GPT-5:**
```
EMAIL BODY: "Dear Tim, We are having our 50th wedding anniversary party..."
FROM: "Tim Fulker <tim@saxweddings.com>"
```

**Missing Context:**
- GPT-5 may not be connecting the signature "Patrick Head" with the From field
- Date parsing may be affected by complex instructions

## Debugging Evidence

### Console Logs Show:
1. Email successfully received and processed
2. GPT-5 API call completed without errors
3. Parsed data contains incorrect client name
4. Event date returned as null from GPT-5

### Key Log Entries:
- `🔍 [CONTAMINATION DEBUG: Parsed data from AI]` shows actual GPT-5 output
- `📧 [BOOKING DATA MAPPING]` shows final booking object construction

## Recommended Investigation Areas

### 1. GPT-5 Response Analysis
- **File**: `server/ai/booking-message-parser.ts` (Line 220+)
- **Action**: Add detailed logging of raw GPT-5 response before JSON parsing
- **Goal**: See exactly what GPT-5 returns

### 2. Prompt Simplification
- **File**: `server/ai/booking-message-parser.ts` (Lines 131-175)
- **Action**: Test with minimal, clear instructions
- **Example**: "Extract client name from email signature, date from content"

### 3. Input Format Testing
- **File**: `server/ai/booking-message-parser.ts` (Lines 180-186)
- **Action**: Try providing full email as single block instead of separate fields
- **Goal**: Let GPT-5 see complete context

### 4. Date Context Verification
- **Current**: "Today's date is 2025-08-17"
- **Test**: Verify GPT-5 understands "17th of March 2026" is in the future
- **Alternative**: Provide year range context

## Test Cases for Validation

### 1. Simple Date Formats
- "March 17, 2026"
- "17/03/2026" 
- "2026-03-17"

### 2. Client Name Variations
- Email signature at bottom
- Name in email header
- Multiple names in content

### 3. Minimal Prompt Test
```
Extract: client name, event date (YYYY-MM-DD), venue
Email: [full email content]
Return JSON only.
```

## Success Criteria
1. Client name "Patrick Head" correctly extracted from signature
2. Event date "2026-03-17" correctly parsed from "17th of March 2026"
3. Venue remains correctly identified
4. System maintains existing functionality for other email types

## Risk Assessment
- **Low Risk**: Prompt modifications (easily reversible)
- **Medium Risk**: Input format changes (may affect other email types)
- **High Risk**: Model changes (GPT-5 to different model)

---

**Files to Review:**
- `server/ai/booking-message-parser.ts`
- `server/core/email-queue-enhanced.ts`
- `server/core/email-processing-engine.ts`
- `server/index.ts` (webhook handler)

**Current Status**: GPT-5 parsing logic needs refinement for accurate client name and date extraction.