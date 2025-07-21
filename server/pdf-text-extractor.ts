import PDFParser from 'pdf2json';

export async function extractTextFromPDF(pdfBuffer: Buffer): Promise<string> {
  return new Promise((resolve, reject) => {
    try {
      console.log('📄 Extracting text from PDF buffer, size:', pdfBuffer.length);
      
      const pdfParser = new PDFParser();
      
      pdfParser.on('pdfParser_dataError', (errData: any) => {
        console.error('📄 PDF parser error:', errData);
        reject(new Error(`PDF parsing failed: ${errData.parserError}`));
      });
      
      pdfParser.on('pdfParser_dataReady', (pdfData: any) => {
        try {
          // Extract text from all pages
          let fullText = '';
          
          if (pdfData.Pages && Array.isArray(pdfData.Pages)) {
            for (const page of pdfData.Pages) {
              if (page.Texts && Array.isArray(page.Texts)) {
                for (const textObj of page.Texts) {
                  if (textObj.R && Array.isArray(textObj.R)) {
                    for (const textRun of textObj.R) {
                      if (textRun.T) {
                        // Decode URI component to get proper text
                        fullText += decodeURIComponent(textRun.T) + ' ';
                      }
                    }
                  }
                }
              }
            }
          }
          
          // Clean up text
          fullText = fullText.replace(/\s+/g, ' ').trim();
          
          console.log('📄 Text extraction successful, length:', fullText.length);
          
          if (!fullText || fullText.length === 0) {
            reject(new Error('No text content found in PDF'));
          } else {
            resolve(fullText);
          }
        } catch (error) {
          console.error('📄 Text processing error:', error);
          reject(new Error(`Text processing failed: ${error.message}`));
        }
      });
      
      // Parse the PDF buffer
      pdfParser.parseBuffer(pdfBuffer);
      
    } catch (error) {
      console.error('📄 PDF extraction setup failed:', error);
      reject(new Error(`PDF extraction failed: ${error.message}`));
    }
  });
}