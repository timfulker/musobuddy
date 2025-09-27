import express, { Express } from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export function serveStaticFixed(app: Express) {
  // Use absolute path to workspace
  const clientDistPath = '/home/runner/workspace/dist/public';
  const uploadsPath = '/home/runner/workspace/uploads';

  console.log('🏭 Static serving setup:', {
    clientDistPath,
    distExists: existsSync(clientDistPath),
    uploadsPath,
    uploadsExists: existsSync(uploadsPath)
  });

  // Serve uploaded files before other static assets
  if (existsSync(uploadsPath)) {
    app.use('/uploads', express.static(uploadsPath));
    console.log('📁 Serving uploads from:', uploadsPath);
  }

  if (existsSync(clientDistPath)) {
    // Serve static files from dist/public directory
    app.use(express.static(clientDistPath));
    
    // Catch-all handler for client-side routing
    app.get('*', (req, res, next) => {
      // Skip API routes and uploads
      if (req.path.startsWith('/api/') || req.path.startsWith('/uploads/')) {
        return next();
      }
      
      const indexPath = join(clientDistPath, 'index.html');
      if (existsSync(indexPath)) {
        res.sendFile(indexPath);
      } else {
        res.status(404).send('Frontend build not found');
      }
    });
    
    console.log('✅ Static files configured successfully');
  } else {
    console.error('❌ Frontend build directory not found:', clientDistPath);
    
    // Fallback route
    app.get('*', (req, res) => {
      if (!req.path.startsWith('/api/')) {
        res.status(503).send('Frontend build not available');
      }
    });
  }
}