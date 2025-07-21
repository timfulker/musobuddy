
# PDF Contract Import & AI Extraction Implementation Plan

## Research Findings

### Existing Infrastructure
Your codebase has excellent infrastructure for this feature:

1. **AI Integration**: OpenAI integration already exists in `server/routes.ts` for gig suggestions
2. **PDF Generation**: Working PDF generation system in `server/pdf-generator.ts` using Puppeteer
3. **File Upload**: Multer-based file upload system for contract imports in `server/routes.ts`
4. **Cloud Storage**: Cloudflare R2 integration in `server/cloud-storage.ts`
5. **Form Integration**: BookingDetailsDialog has contract copying functionality
6. **Schema Consistency**: Standardized field names across booking, contract, and invoice schemas

### Previously Removed System
From `replit.md`, I found that a complete contract parsing system was removed on 2025-07-21, including:
- `contract-service.ts`
- `contract-parser-simple.ts` 
- `musicians-union-field-mapping.ts`
- API endpoints for contract parsing
- Frontend parsing components

### Why This Feature Will Work
1. **Consistent Format**: Musicians' Union contracts have standardized layouts
2. **Existing AI**: OpenAI integration already proven working
3. **Field Mapping**: Your schemas are well-structured with consistent field names
4. **File Handling**: Upload infrastructure exists

## Implementation Plan

### Phase 1: Backend PDF Processing Service

#### 1.1 Create PDF Text Extraction Service
Create `server/pdf-text-extractor.ts`:
- Use pdf-parse library for text extraction
- Handle multi-page documents
- Clean and normalize extracted text

#### 1.2 Create AI Contract Parser
Create `server/contract-ai-parser.ts`:
- OpenAI GPT-3.5/4 integration for text analysis
- Structured prompts for Musicians' Union contract format
- Field mapping to your booking schema
- Validation and error handling

#### 1.3 Create Contract Import Service
Create `server/contract-import-service.ts`:
- Orchestrate PDF extraction and AI parsing
- Handle file validation and security
- Return structured data matching booking schema

### Phase 2: API Endpoints

#### 2.1 Add Contract Parsing Endpoint
In `server/routes.ts`:
- `POST /api/contracts/parse` - Main parsing endpoint
- File upload with validation
- AI processing pipeline
- Return extracted booking data

#### 2.2 Add Test Endpoint
- `POST /api/contracts/test-parse` - For development/debugging
- Direct text input for testing AI prompts

### Phase 3: Frontend Integration

#### 3.1 Add Upload Component to BookingDetailsDialog
In `client/src/components/BookingDetailsDialog.tsx`:
- File upload button for PDF contracts
- Upload progress indicator
- Parse and populate form fields
- Preserve existing data (non-destructive)

#### 3.2 Add Visual Feedback
- Loading states during parsing
- Success/error notifications
- Field highlighting for populated data

### Phase 4: Enhanced Features

#### 4.1 Learning System
- Store successful extractions for training
- Manual correction interface
- Confidence scoring

#### 4.2 Validation & Safety
- Field validation before population
- User confirmation for overwrites
- Backup/undo functionality

## Technical Implementation Details

### Required Dependencies
```json
{
  "pdf-parse": "^1.1.1",
  "multer": "^1.4.5-lts.1"
}
```

### AI Prompt Strategy
Use structured prompts specifically for Musicians' Union contracts:
1. Identify contract parties (musician vs client)
2. Extract standard fields (date, venue, fee, etc.)
3. Handle common variations in format
4. Validate extracted data

### Security Considerations
1. File type validation (PDF only)
2. File size limits (10MB max)
3. Virus scanning integration
4. User authentication required
5. Rate limiting on AI API calls

### Data Flow
```
PDF Upload → Text Extraction → AI Analysis → Field Mapping → Form Population
```

### Error Handling
1. Graceful degradation if AI fails
2. Partial extraction support
3. Manual override options
4. Detailed error logging

## Implementation Priority

### High Priority (Core Functionality)
1. PDF text extraction
2. Basic AI parsing
3. Form population
4. Upload interface

### Medium Priority (Enhanced UX)
1. Progress indicators
2. Field validation
3. Confidence scoring
4. Error recovery

### Low Priority (Advanced Features)
1. Learning system
2. Manual training interface
3. Batch processing
4. Analytics dashboard

## Risk Assessment

### Technical Risks
- **Low Risk**: PDF text extraction (proven technology)
- **Medium Risk**: AI accuracy (mitigated by consistent format)
- **Low Risk**: Form integration (existing patterns)

### Mitigation Strategies
1. Extensive testing with real Musicians' Union contracts
2. Fallback to manual entry if parsing fails
3. User review/confirmation before applying changes
4. Gradual rollout with feature flags

## Success Metrics
1. Parsing accuracy > 90% for standard fields
2. Processing time < 10 seconds per document
3. User satisfaction with auto-population
4. Reduction in manual data entry time

## Estimated Timeline
- **Phase 1**: 2-3 days (Backend services)
- **Phase 2**: 1 day (API endpoints)
- **Phase 3**: 2-3 days (Frontend integration)
- **Phase 4**: 1-2 days (Polish and testing)

**Total: 6-9 days**

## Next Steps
1. Install required dependencies
2. Create PDF text extraction service
3. Implement AI parsing with OpenAI
4. Add API endpoints
5. Integrate with BookingDetailsDialog
6. Test with real Musicians' Union contracts
7. Iterate based on accuracy results

This feature is definitely achievable with your existing infrastructure and will significantly improve your workflow efficiency.
