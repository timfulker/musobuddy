// Emergency production server - bypasses all complexity
import express from 'express';
import { createServer } from 'http';

// Set production environment
process.env.NODE_ENV = 'production';
process.env.USE_VITE = 'true';

console.log('🚀 MusoBuddy Emergency Production Server');
console.log('Environment: production');

// Create express app
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Basic logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    if (req.path.startsWith('/api')) {
      console.log(`${req.method} ${req.path} ${res.statusCode} in ${duration}ms`);
    }
  });
  next();
});

// Basic health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', env: process.env.NODE_ENV });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err.message);
  res.status(500).json({ message: 'Internal Server Error' });
});

// Handle all other routes
app.use('*', (req, res) => {
  res.status(404).json({ message: 'Not Found' });
});

// Create HTTP server
const server = createServer(app);

// Start server
const port = 5000;
server.listen(port, '0.0.0.0', () => {
  console.log(`✅ Emergency server running on port ${port}`);
  console.log('This is a basic server to test deployment');
});

// Handle shutdown
process.on('SIGINT', () => {
  console.log('Shutting down emergency server...');
  server.close(() => {
    process.exit(0);
  });
});

process.on('SIGTERM', () => {
  console.log('Shutting down emergency server...');
  server.close(() => {
    process.exit(0);
  });
});