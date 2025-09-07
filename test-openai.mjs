import OpenAI from 'openai';

const apiKey = process.env.OPENAI_API_KEY;
console.log('API Key exists:', !!apiKey);
console.log('API Key length:', apiKey?.length);
console.log('API Key prefix:', apiKey?.substring(0, 20) + '...');

try {
  const openai = new OpenAI({ apiKey });
  console.log('✅ OpenAI client created successfully');
  
  // Try a simple test
  const response = await openai.models.list();
  console.log('✅ API connection successful');
} catch (error) {
  console.error('❌ Error:', error.message);
  if (error.response) {
    console.error('Response status:', error.response.status);
  }
}