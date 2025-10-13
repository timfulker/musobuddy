import { Router } from 'express';

const router = Router();

// Diagnostic endpoint to check environment settings in production
router.get('/env-check', (req, res) => {
  const isDevelopment = process.env.NODE_ENV !== 'production';

  const supabaseUrl = isDevelopment
    ? process.env.SUPABASE_URL_DEV
    : process.env.SUPABASE_URL_PROD;

  const projectId = supabaseUrl?.split('.')[0].split('//')[1];

  res.json({
    NODE_ENV: process.env.NODE_ENV,
    REPLIT_DEPLOYMENT: process.env.REPLIT_DEPLOYMENT,
    REPLIT_ENVIRONMENT: process.env.REPLIT_ENVIRONMENT,
    isDevelopment,
    selectedDatabase: projectId,
    expectedProd: 'dknmckqaraedpimxdsqq',
    expectedDev: 'soihodadevudjohibmbw',
    isCorrect: process.env.NODE_ENV === 'production'
      ? projectId === 'dknmckqaraedpimxdsqq'
      : projectId === 'soihodadevudjohibmbw',
    timestamp: new Date().toISOString()
  });
});

export default router;