# R2 Public Access Configuration Required

## Issue
Contract signing pages return 400 Bad Request because R2 bucket is not configured for public access.

## Root Cause
During the architecture rebuild, the R2 bucket lost its public access configuration. The bucket `musobuddy-documents` exists and files upload successfully, but public URLs return 400 errors.

## Solution Required in Cloudflare Dashboard

### Steps to Fix:
1. Go to **Cloudflare Dashboard** → **R2 Object Storage**
2. Click on bucket: **`musobuddy-documents`**
3. Go to **Settings** tab
4. Find **"Public Access"** section
5. Click **"Allow Access"** or **"Connect Domain"**
6. This will enable public URL access for the bucket

### Alternative: Custom Domain
1. In bucket settings, go to **Custom Domains**
2. Add domain like `contracts.musobuddy.com`
3. Configure DNS as instructed
4. Update code to use custom domain

## Current URLs (Not Working):
- `https://musobuddy-documents.a730a594e40d8b46295554074c8e4413.r2.cloudflarestorage.com/...`

## Expected URLs After Fix:
- `https://pub-[hash].r2.dev/...` (if using public access)
- `https://contracts.musobuddy.com/...` (if using custom domain)

## Test File:
- `test-contract-debug.html` is uploaded and ready to test public access
- Once R2 is configured, this URL should work: 
  `https://musobuddy-documents.a730a594e40d8b46295554074c8e4413.r2.cloudflarestorage.com/test-contract-debug.html`

## Status:
- ✅ R2 credentials working
- ✅ File uploads successful
- ✅ Contract email sending working
- ✅ PDF attachments restored
- ❌ Public access blocked (needs dashboard configuration)

This is a Cloudflare dashboard configuration issue, not a code issue.