import express from 'express';

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.static('public'));

// Routes
app.get('/', (req, res) => {
  res.json({ 
    message: 'MusoBuddy API is running!',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy',
    uptime: process.uptime(),
    memory: process.memoryUsage()
  });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`MusoBuddy server running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
});