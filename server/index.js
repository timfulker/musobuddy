import express from 'express';

const app = express();
const PORT = process.env.PORT || 5000;

app.use(express.json());

// Simple health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'MusoBuddy server is running' });
});

// Basic root endpoint
app.get('/', (req, res) => {
  res.json({ 
    message: 'Welcome to MusoBuddy', 
    version: '1.0.0',
    endpoints: ['/api/health']
  });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`MusoBuddy server running on port ${PORT}`);
});