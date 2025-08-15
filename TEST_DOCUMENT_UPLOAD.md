# Document Upload Feature - Testing Guide

## ✅ Implementation Complete

The document upload feature has been fully implemented with the following components:

### Backend Setup
1. **Database Schema** - Added fields to bookings table:
   - `documentUrl` - URL to the uploaded document in R2
   - `documentKey` - Storage key for the document
   - `documentName` - Original filename
   - `documentUploadedAt` - Upload timestamp

2. **API Endpoints** (in `/server/routes/booking-document-routes.ts`):
   - `POST /api/bookings/:bookingId/upload-document` - Upload PDF
   - `GET /api/bookings/:bookingId/document` - Get document info
   - `DELETE /api/bookings/:bookingId/document` - Remove document

3. **Storage**: Uses Cloudflare R2 (already configured for invoices/contracts)

### Frontend Components
1. **Upload Dialog** (`/client/src/components/booking-document-upload.tsx`)
   - PDF validation (type and size)
   - Upload progress indicator
   - View/Download/Remove options

2. **UI Integration**:
   - "Upload Document" option in booking card menu
   - Document indicator badge on booking cards
   - Full dialog for document management

## 🔧 Troubleshooting Upload Issues

If you're experiencing connection reset errors during upload:

### 1. Check Environment Variables
Ensure these are set in your `.env` file:
```bash
R2_ACCESS_KEY_ID=your_key_id
R2_SECRET_ACCESS_KEY=your_secret_key
R2_ACCOUNT_ID=your_account_id
R2_BUCKET_NAME=musobuddy-storage
```

### 2. Database Migration
Run the database migration to add the new fields:
```bash
npm run db:push
```
When prompted, select option 1 (create column) for each new field.

### 3. Server Configuration
The server needs to be restarted after changes:
```bash
npm run dev
```

### 4. Authentication
The upload uses JWT authentication. Make sure you're logged in and the auth token is being sent with requests.

### 5. File Size Limits
- Maximum file size: 10MB
- Only PDF files are accepted
- The server has a 50MB body limit for all requests

## 📋 How to Use

1. **Upload a Document**:
   - Navigate to the Bookings page
   - Click "Respond" dropdown on any booking card
   - Select "Upload Document"
   - Choose a PDF file (max 10MB)
   - Click "Upload Document"

2. **View/Download Document**:
   - Open the upload dialog for a booking with a document
   - Click "View" to open in new tab
   - Click "Download" to save locally

3. **Replace Document**:
   - Open the upload dialog
   - Select a new PDF file
   - Click "Upload Document" to replace

4. **Remove Document**:
   - Open the upload dialog
   - Click "Remove" button
   - Confirm deletion

## 🎯 Visual Indicators

- Bookings with documents show a paperclip badge
- The badge appears in all views (list, calendar, etc.)
- Document name and upload date are shown in the dialog

## 🚨 Known Issues & Solutions

### Issue: "Failed to fetch" or Connection Reset
**Solution**: 
1. Check that the server is running (`npm run dev`)
2. Verify authentication is working (check browser console for auth token logs)
3. Ensure the file is under 10MB and is a PDF

### Issue: "Not authenticated"
**Solution**:
1. Log out and log back in
2. Check that auth token is being stored in localStorage
3. Verify JWT secret is set in environment variables

### Issue: Upload succeeds but document doesn't appear
**Solution**:
1. Refresh the page
2. Check browser console for errors
3. Verify R2 credentials are correct

## 🔄 Next Steps

If uploads continue to fail:
1. Check server logs for detailed error messages
2. Verify R2 bucket permissions
3. Test with a small PDF file (< 1MB)
4. Check network tab in browser DevTools for response details

The feature is fully implemented and should work once the server is running with proper authentication.