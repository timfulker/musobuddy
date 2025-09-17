
# PDF Contract Import & AI Extraction Implementation Plan

## Research Findings

### Existing Infrastructure ✅
Your codebase has excellent infrastructure for this feature:

1. **AI Integration**: OpenAI integration exists in `server/routes.ts` for gig suggestions
2. **PDF Generation**: Working PDF generation system in `server/pdf-generator.ts` using Puppeteer
3. **File Upload**: Multer-based file upload system for contract imports
4. **Cloud Storage**: Cloudflare R2 integration in `server/cloud-storage.ts`
5. **Form Integration**: BookingDetailsDialog has contract copying functionality
6. **Database Schema**: Complete contract learning system tables exist in schema

### Database Infrastructure ✅
Your `server/storage.ts` has methods for:
- `createImportedContract()` - Store uploaded PDFs
- `saveContractExtraction()` - Store manual training data
- `getContractExtractionPatterns()` - Retrieve learning patterns

## Implementation Plan

### Phase 1: PDF Text Extraction Service (Day 1)

#### 1.1 Install Dependencies
```bash
npm install pdf-parse@1.1.1
```

#### 1.2 Create PDF Text Extraction Service
Create `server/pdf-text-extractor.ts`:
```typescript
import pdf from 'pdf-parse';

export async function extractTextFromPDF(pdfBuffer: Buffer): Promise<string> {
  try {
    const data = await pdf(pdfBuffer);
    return data.text;
  } catch (error) {
    throw new Error(`PDF extraction failed: ${error.message}`);
  }
}
```

### Phase 2: AI Contract Parser (Day 2)

#### 2.1 Create AI Contract Parser
Create `server/contract-ai-parser.ts`:
```typescript
import OpenAI from 'openai';
import type { Booking } from '@shared/schema';

interface ExtractedContractData {
  clientName?: string;
  clientEmail?: string;
  clientPhone?: string;
  clientAddress?: string;
  venue?: string;
  venueAddress?: string;
  eventDate?: string;
  eventTime?: string;
  eventEndTime?: string;
  fee?: string;
  equipmentRequirements?: string;
  specialRequirements?: string;
  confidence: number;
}

export async function parseContractWithAI(contractText: string): Promise<ExtractedContractData> {
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_INSTRUMENT_MAPPING_KEY, // Reuse existing key
  });

  const prompt = `
You are analyzing a Musicians' Union standard performance contract. Extract the following information:

IMPORTANT: The musician/performer is "Tim Fulker" - DO NOT extract his information as the client.
Extract information about the HIRER/CLIENT who is booking Tim Fulker's services.

Contract text:
${contractText}

Return JSON with these fields (null if not found):
- clientName: Name of person/organization hiring the musician
- clientEmail: Client's email
- clientPhone: Client's phone
- clientAddress: Client's address
- venue: Performance venue name
- venueAddress: Venue address
- eventDate: Event date (YYYY-MM-DD format)
- eventTime: Start time (HH:MM format)
- eventEndTime: End time (HH:MM format)  
- fee: Performance fee amount (number only)
- equipmentRequirements: Equipment needed
- specialRequirements: Special requests
- confidence: Confidence score 0-100

Focus on hirer/client details, NOT Tim Fulker's information.
`;

  const response = await openai.chat.completions.create({
    model: "gpt-3.5-turbo",
    messages: [{ role: "user", content: prompt }],
    response_format: { type: "json_object" },
    max_tokens: 800
  });

  return JSON.parse(response.choices[0].message.content || '{"confidence": 0}');
}
```

### Phase 3: API Endpoints (Day 3)

#### 3.1 Add Contract Parsing Endpoints
Add to `server/routes.ts`:
```typescript
// Contract parsing endpoint
app.post('/api/contracts/parse-pdf', isAuthenticated, upload.single('file'), async (req: any, res) => {
  try {
    const userId = req.user.id;
    const file = req.file;
    
    if (!file || file.mimetype !== 'application/pdf') {
      return res.status(400).json({ error: 'Please upload a PDF file' });
    }

    // Extract text from PDF
    const { extractTextFromPDF } = await import('./pdf-text-extractor');
    const contractText = await extractTextFromPDF(file.buffer);
    
    // Parse with AI
    const { parseContractWithAI } = await import('./contract-ai-parser');
    const extractedData = await parseContractWithAI(contractText);
    
    // Store uploaded contract
    const contractRecord = await storage.createImportedContract({
      userId,
      filename: file.originalname,
      fileSize: file.size,
      mimeType: file.mimetype,
      contractType: 'musicians_union',
      uploadedAt: new Date()
    });

    // Store extraction for learning
    await storage.saveContractExtraction({
      importedContractId: contractRecord.id,
      extractedData: extractedData,
      userId,
      extractionTimeSeconds: 0 // Auto extraction
    });

    res.json({
      success: true,
      data: extractedData,
      contractId: contractRecord.id
    });
    
  } catch (error) {
    console.error('Contract parsing error:', error);
    res.status(500).json({ error: 'Failed to parse contract' });
  }
});
```

### Phase 4: Frontend Integration (Day 4)

#### 4.1 Add Upload Component to BookingDetailsDialog
Update `client/src/components/BookingDetailsDialog.tsx`:

Add import:
```typescript
import { Upload, FileText, Loader2 } from "lucide-react";
```

Add state variables after existing useState declarations:
```typescript
const [contractFile, setContractFile] = useState<File | null>(null);
const [isParsingContract, setIsParsingContract] = useState(false);
const [parseResult, setParseResult] = useState<any>(null);
```

Add file upload component in the form (after Equipment & Special Requests card):
```typescript
{/* PDF Contract Import */}
<Card>
  <CardHeader>
    <CardTitle className="flex items-center gap-2">
      <FileText className="h-5 w-5" />
      Import PDF Contract
    </CardTitle>
  </CardHeader>
  <CardContent className="space-y-4">
    <div className="space-y-2">
      <Label htmlFor="contract-upload">Upload Musicians' Union Contract</Label>
      <Input
        id="contract-upload"
        type="file"
        accept=".pdf"
        onChange={(e) => setContractFile(e.target.files?.[0] || null)}
      />
    </div>
    
    {contractFile && (
      <div className="flex gap-2">
        <Button
          type="button"
          onClick={handleParseContract}
          disabled={isParsingContract}
          className="flex items-center gap-2"
        >
          {isParsingContract ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Parsing...
            </>
          ) : (
            <>
              <Upload className="h-4 w-4" />
              Parse & Import Data
            </>
          )}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => setContractFile(null)}
        >
          Clear
        </Button>
      </div>
    )}
    
    {parseResult && (
      <div className="bg-green-50 p-3 rounded-md">
        <p className="text-sm text-green-700">
          Contract parsed successfully! {parseResult.fieldsUpdated || 0} fields updated.
          Confidence: {parseResult.confidence || 0}%
        </p>
      </div>
    )}
  </CardContent>
</Card>
```

#### 4.2 Add Parse Contract Function
Add function before the return statement:
```typescript
const handleParseContract = async () => {
  if (!contractFile || !booking) return;
  
  setIsParsingContract(true);
  
  try {
    const formData = new FormData();
    formData.append('file', contractFile);
    
    const response = await fetch('/api/contracts/parse-pdf', {
      method: 'POST',
      body: formData,
      credentials: 'include'
    });
    
    if (!response.ok) {
      throw new Error('Failed to parse contract');
    }
    
    const result = await response.json();
    const extractedData = result.data;
    
    // Only update empty fields to preserve existing data
    const currentData = form.getValues();
    let fieldsUpdated = 0;
    const updates: any = {};
    
    // Map extracted data to form fields (only if current field is empty)
    if (extractedData.clientName && !currentData.clientName?.trim()) {
      updates.clientName = extractedData.clientName;
      fieldsUpdated++;
    }
    if (extractedData.clientEmail && !currentData.clientEmail?.trim()) {
      updates.clientEmail = extractedData.clientEmail;
      fieldsUpdated++;
    }
    if (extractedData.clientPhone && !currentData.clientPhone?.trim()) {
      updates.clientPhone = extractedData.clientPhone;
      fieldsUpdated++;
    }
    if (extractedData.venue && !currentData.venue?.trim()) {
      updates.venue = extractedData.venue;
      fieldsUpdated++;
    }
    if (extractedData.eventDate && !currentData.eventDate) {
      updates.eventDate = extractedData.eventDate;
      fieldsUpdated++;
    }
    if (extractedData.eventTime && !currentData.eventTime?.trim()) {
      updates.eventTime = extractedData.eventTime;
      fieldsUpdated++;
    }
    if (extractedData.fee && (!currentData.fee || currentData.fee === '0')) {
      updates.fee = extractedData.fee;
      fieldsUpdated++;
    }
    
    if (fieldsUpdated > 0) {
      form.reset({ ...currentData, ...updates });
      setHasChanges(true);
    }
    
    setParseResult({
      fieldsUpdated,
      confidence: extractedData.confidence
    });
    
    toast({
      title: "Contract Parsed",
      description: `Successfully extracted data from contract. ${fieldsUpdated} fields updated.`,
    });
    
  } catch (error) {
    console.error('Parse error:', error);
    toast({
      title: "Parse Error",
      description: "Failed to parse contract. Please try again.",
      variant: "destructive",
    });
  } finally {
    setIsParsingContract(false);
  }
};
```

### Phase 5: Testing & Refinement (Day 5)

#### 5.1 Test with Real Contracts
1. Upload sample Musicians' Union contracts
2. Verify extraction accuracy
3. Refine AI prompts based on results
4. Add validation for extracted data

#### 5.2 Add Manual Correction Interface
Create endpoint for manual corrections to improve AI learning:
```typescript
app.post('/api/contracts/manual-correction', isAuthenticated, async (req: any, res) => {
  const { contractId, correctedData } = req.body;
  const userId = req.user.id;
  
  // Store manual correction for learning
  await storage.saveContractExtraction({
    importedContractId: contractId,
    extractedData: correctedData,
    userId,
    extractionTimeSeconds: 0 // Manual correction
  });
  
  res.json({ success: true });
});
```

## Technical Specifications

### Security Measures
1. File type validation (PDF only)
2. File size limit (10MB max)
3. User authentication required
4. Rate limiting on AI API calls

### Error Handling
1. Graceful degradation if AI fails
2. Partial extraction support
3. Preserve existing form data
4. Detailed error logging

### Data Protection
- Only populate empty fields
- User confirmation before applying changes
- Backup original data
- Manual override capability

## Success Metrics
1. Parsing accuracy > 90% for standard fields
2. Processing time < 30 seconds per document
3. User satisfaction with auto-population
4. Reduction in manual data entry time

## Estimated Timeline
- **Phase 1**: 1 day (PDF extraction)
- **Phase 2**: 1 day (AI parsing)
- **Phase 3**: 1 day (API endpoints)
- **Phase 4**: 1 day (Frontend integration)
- **Phase 5**: 1 day (Testing & refinement)

**Total: 5 days**

## Risk Assessment

### Technical Risks
- **Low Risk**: PDF text extraction (proven technology)
- **Medium Risk**: AI accuracy (mitigated by consistent format)
- **Low Risk**: Form integration (existing patterns)

### Mitigation Strategies
1. Extensive testing with real contracts
2. Fallback to manual entry if parsing fails
3. User review before applying changes
4. Gradual rollout with validation

## Next Steps
1. Install pdf-parse dependency
2. Create PDF text extraction service
3. Implement AI parsing with OpenAI
4. Add API endpoints to routes.ts
5. Update BookingDetailsDialog with upload UI
6. Test with real Musicians' Union contracts
7. Iterate based on accuracy results

This implementation leverages your existing infrastructure and will significantly improve workflow efficiency for contract data entry.
