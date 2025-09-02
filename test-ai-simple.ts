import Anthropic from '@anthropic-ai/sdk';

// Simple test to check if AI system works
async function testAIBasic() {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.log('❌ ANTHROPIC_API_KEY not found');
    process.exit(1);
  }

  const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  });

  try {
    console.log('🧪 Testing basic AI functionality...');
    
    const response = await anthropic.messages.create({
      model: "claude-3-5-haiku-20241022",
      max_tokens: 100,
      temperature: 0.1,
      system: "You are a contract HTML generator. Generate only clean, professional HTML.",
      messages: [
        {
          role: 'user',
          content: `Generate a simple HTML contract for:
- Client: Kelly Boyd  
- Venue: Kelly's House
- Date: August 30, 2025
- Fee: £310.00

Return only clean HTML, no explanations.`
        }
      ]
    });

    const html = response.content[0].text;
    console.log('✅ AI Response received');
    console.log('📏 HTML Length:', html.length, 'characters');
    console.log('🔍 HTML Preview (first 200 chars):', html.substring(0, 200) + '...');
    
    // Check if it contains expected elements
    const hasKelly = html.toLowerCase().includes('kelly');
    const hasFee = html.includes('310');
    const hasHTML = html.includes('<html>') || html.includes('<!DOCTYPE');
    
    console.log('\n📋 Basic Validation:');
    console.log('- Contains client name:', hasKelly ? '✅' : '❌');  
    console.log('- Contains fee:', hasFee ? '✅' : '❌');
    console.log('- Is HTML format:', hasHTML ? '✅' : '❌');
    
    if (hasKelly && hasFee && hasHTML) {
      console.log('\n🎉 AI contract generation working! Haiku is producing good HTML.');
    } else {
      console.log('\n⚠️ AI output may need improvement');
    }
    
  } catch (error) {
    console.error('❌ AI test failed:', error.message);
    process.exit(1);
  }
}

testAIBasic().then(() => {
  console.log('\n✅ Test completed');
}).catch((error) => {
  console.error('💥 Test failed:', error);
  process.exit(1);
});