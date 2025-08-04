# MusoBuddy Professional Contract Template - AI Design Instructions

## TASK OVERVIEW
Create a professional HTML/CSS contract template for MusoBuddy, a music business management platform. The template will be used with Puppeteer to generate high-quality PDF contracts for musicians.

## TECHNICAL REQUIREMENTS

### PDF Generation Specifications
- **Paper Size**: A4 (210mm × 297mm)
- **Margins**: 20mm top/bottom, 15mm left/right
- **Font Requirements**: Use web-safe fonts (Arial, Times New Roman, Helvetica) or Google Fonts
- **Print Optimization**: Include CSS print styles with `print-background: true` and `color-adjust: exact`
- **Page Breaks**: Handle multi-page contracts gracefully with proper breaks

### HTML Structure Requirements
- Complete HTML document with DOCTYPE, head, and body
- Embedded CSS (no external stylesheets)
- Responsive design that works in headless browser
- Professional business document layout

## DESIGN SPECIFICATIONS

### Brand Identity - MusoBuddy
- **Primary Colors**: Purple gradient (#9333ea to #7c3aed)
- **Secondary Colors**: Blue (#2563eb), Green (#059669 to #047857)
- **Professional Tone**: Clean, modern, trustworthy business aesthetic
- **Typography**: Professional, readable fonts suitable for legal documents

### Visual Elements Required
1. **Header Section**: Purple gradient background with white text
2. **Section Headers**: Blue background with white text
3. **Fee Highlights**: Green gradient background for performance fees
4. **Signature Areas**: Professional signature boxes with purple borders
5. **Footer**: MusoBuddy branding with purple background

### Layout Structure
```
1. Contract Header (Purple gradient)
   - "PERFORMANCE CONTRACT" title
   - Contract number and date subtitle

2. Parties Section (Two columns)
   - Performer Details (left)
   - Client Details (right)

3. Event Details Section (Blue header)
   - Date, time, venue, fee in professional table format

4. Terms & Conditions Section
   - Payment terms, cancellation policy, insurance, etc.

5. Signature Section
   - Client signature box (left)
   - Performer signature box (right)
   - Both with purple borders

6. Footer (Purple background)
   - MusoBuddy branding and contract reference
```

## DATA FIELD INTEGRATION

You have been provided with the complete data fields reference document. Use these exact field names in your template:

### Essential Fields to Include
- `contract.contractNumber`
- `contract.clientName`, `contract.clientEmail`, `contract.clientPhone`, `contract.clientAddress`
- `contract.venue`, `contract.venueAddress`, `contract.eventDate`, `contract.eventTime`, `contract.eventEndTime`
- `contract.fee`, `contract.deposit`
- `contract.equipmentRequirements`, `contract.specialRequirements`
- `userSettings.businessName`, `userSettings.businessEmail`, `userSettings.phone`
- `userSettings.addressLine1`, `userSettings.city`, `userSettings.postcode`

### Required Conditional Logic
```javascript
// Handle optional fields safely
${contract.clientPhone ? `Phone: ${contract.clientPhone}` : 'Phone not provided'}
${contract.specialRequirements ? `<p>${contract.specialRequirements}</p>` : ''}

// Format dates for UK
${new Date(contract.eventDate).toLocaleDateString('en-GB', {
  weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
})}

// Format money
£${contract.fee || '0.00'}
```

## PROFESSIONAL CONTENT REQUIREMENTS

### Terms & Conditions to Include
1. **Payment Terms**: Payment due within 30 days unless otherwise agreed
2. **Cancellation Policy**: Tiered refund structure based on notice period
3. **Force Majeure**: Standard force majeure clause for unforeseen circumstances
4. **Performance Standards**: Professional entertainment standards
5. **Insurance**: Public liability insurance coverage
6. **Equipment**: Equipment requirements and responsibilities

### Signature Section Requirements
- Client signature box with date line
- Performer signature box with date line
- Clear labels and professional styling
- Space for digital signature integration
- Signed status indicator for completed contracts

## CSS STYLING REQUIREMENTS

### Print Optimization
```css
@media print {
  body { margin: 0; }
  .header, .footer { 
    background: #9333ea !important; 
    -webkit-print-color-adjust: exact;
    color-adjust: exact;
  }
  .fee-highlight {
    background: linear-gradient(135deg, #059669 0%, #047857 100%) !important;
    -webkit-print-color-adjust: exact;
    color-adjust: exact;
  }
}
```

### Color Specifications
- **Purple Gradient**: `linear-gradient(135deg, #9333ea 0%, #7c3aed 100%)`
- **Blue Headers**: `#2563eb`
- **Green Fee Highlight**: `linear-gradient(135deg, #059669 0%, #047857 100%)`
- **Background Colors**: Light grays (#f8f9fa, #f1f5f9) for sections
- **Text Colors**: Dark grays (#1e293b, #475569) for readability

### Typography
- **Headers**: Bold, 18-24px for main titles
- **Section Headers**: Bold, 14-16px
- **Body Text**: Regular, 12-14px
- **Fine Print**: 10-11px for terms and conditions
- **Line Height**: 1.4-1.6 for readability

## RESPONSIVE DESIGN CONSIDERATIONS
- Must render correctly in headless Chrome/Puppeteer
- Fixed layout suitable for PDF generation
- No JavaScript dependencies
- All styling must be inline or embedded CSS

## QUALITY REQUIREMENTS
- Professional business document appearance
- Clean, organized layout with proper spacing
- High contrast for readability and printing
- Consistent branding throughout
- Legal document formatting standards
- Print-ready with proper margins and page breaks

## OUTPUT FORMAT
Provide a complete HTML document with:
1. Full HTML structure (DOCTYPE, html, head, body)
2. Embedded CSS styles in `<style>` tags
3. All MusoBuddy branding elements
4. Professional contract content and terms
5. Proper data field integration using the provided reference
6. Print optimization styles
7. Responsive layout for PDF generation

## SUCCESS CRITERIA
The final template should:
- Generate professional PDFs indistinguishable from commercial contract templates
- Include all required MusoBuddy branding and colors
- Handle all data fields from the reference document
- Be print-ready with proper A4 formatting
- Work flawlessly with Puppeteer PDF generation
- Meet legal document presentation standards

Generate a complete, production-ready HTML contract template that meets all these specifications.