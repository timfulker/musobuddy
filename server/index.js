import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import apiRoutes from './routes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(express.json());
app.use(cors());

// API routes
app.use('/api', apiRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'MusoBuddy server is running',
    timestamp: new Date().toISOString()
  });
});

// Check if client dist exists and serve it
const clientDistPath = path.join(__dirname, '../client/dist');
try {
  // Try to serve the built frontend if it exists
  app.use(express.static(clientDistPath));
  
  // Handle React router - send all non-API requests to index.html
  app.get('*', (req, res, next) => {
    // Skip API routes
    if (req.path.startsWith('/api')) {
      return next();
    }
    res.sendFile(path.join(clientDistPath, 'index.html'));
  });
} catch (error) {
  // Fallback to development page if no build exists
  // Development - serve a simple HTML page with links to start the frontend
  app.get('/', (req, res) => {
    res.send(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>MusoBuddy Development Server</title>
        <style>
          body { font-family: system-ui, sans-serif; margin: 40px; line-height: 1.6; }
          .container { max-width: 800px; margin: 0 auto; }
          .status { background: #f0f9ff; padding: 20px; border-radius: 8px; border-left: 4px solid #0ea5e9; }
          .api-list { background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0; }
          .api-list a { display: block; color: #0ea5e9; text-decoration: none; padding: 4px 0; }
          .api-list a:hover { text-decoration: underline; }
          .instructions { background: #fefce8; padding: 20px; border-radius: 8px; border-left: 4px solid #eab308; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>🎵 MusoBuddy Development Server</h1>
          
          <div class="status">
            <h2>✅ Backend Server Running</h2>
            <p><strong>Status:</strong> API server is running successfully on port ${PORT}</p>
            <p><strong>Environment:</strong> ${process.env.NODE_ENV || 'development'}</p>
          </div>

          <div class="instructions">
            <h2>🚀 Start the Frontend</h2>
            <p>To see the full MusoBuddy application, start the React frontend:</p>
            <ol>
              <li>Open a new terminal</li>
              <li>Navigate to the client directory: <code>cd client</code></li>
              <li>Install dependencies: <code>npm install</code></li>
              <li>Start the dev server: <code>npm run dev</code></li>
              <li>Open the frontend URL (usually http://localhost:3000)</li>
            </ol>
          </div>

          <div class="api-list">
            <h2>📡 Available API Endpoints</h2>
            <a href="/api/health" target="_blank">/api/health</a>
            <a href="/api/enquiries" target="_blank">/api/enquiries</a>
            <a href="/api/contracts" target="_blank">/api/contracts</a>
            <a href="/api/invoices" target="_blank">/api/invoices</a>
            <a href="/api/bookings" target="_blank">/api/bookings</a>
            <a href="/api/compliance" target="_blank">/api/compliance</a>
          </div>

          <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e2e8f0; color: #64748b; font-size: 14px;">
            <p>MusoBuddy v1.0.0 - AI-Powered Musician Admin Platform</p>
          </div>
        </div>
      </body>
      </html>
    `);
  });
}

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ 
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`MusoBuddy server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});