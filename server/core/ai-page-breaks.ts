import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface ContentSection {
  title: string;
  content: string;
}

export async function optimizePageBreaks(sections: ContentSection[]): Promise<ContentSection[]> {
  console.log('🤖 Optimizing page breaks for', sections.length, 'sections');
  
  const systemPrompt = `You are an expert document formatter specializing in page break optimization for PDF generation.

Your task is to analyze content sections and optimize them to prevent awkward page breaks in the middle of sentences, paragraphs, or related content.

RULES:
1. Never break sentences across sections
2. Keep related content together (like payment terms and amounts)
3. Ensure signature sections remain grouped
4. Add strategic breaks between major sections
5. Preserve all original content exactly - only adjust section boundaries
6. Return the EXACT same content, just reorganized for better page flow

Input: Array of sections with title and content
Output: Optimized array with better section boundaries for clean page breaks

Return valid JSON only: { "sections": [{"title": "...", "content": "..."}] }`;

  const userPrompt = `Optimize these contract sections for clean page breaks:

${JSON.stringify({ sections }, null, 2)}

Ensure no sentences are split awkwardly and keep related information together.`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      max_tokens: 2000,
      temperature: 0.1, // Very low temperature for consistent formatting
      response_format: { type: "json_object" }
    });

    const result = completion.choices[0]?.message?.content;
    if (!result) {
      throw new Error('No content returned from AI');
    }

    const parsed = JSON.parse(result);
    console.log('✅ Page breaks optimized successfully');
    return parsed.sections;
  } catch (error) {
    console.error('❌ Page break optimization failed:', error);
    console.log('🔄 Returning original sections unchanged');
    return sections; // Return original if AI fails
  }
}