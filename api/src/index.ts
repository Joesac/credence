import express, { type Request, type Response, type NextFunction } from 'express';
import { errorHandler } from './middleware/error';
import { syncRouter } from './routes/sync';
import { healthRouter } from './routes/health';
import { authRouter } from './routes/auth';
import { memberRouter } from './routes/member';

const app = express();

// CORS: allow all origins. The API is protected by the Bearer API key for sync
// and by JWT for member routes, so origin allowlisting is not required..
// We handle OPTIONS manually to guarantee preflight requests never hit auth.
app.use((req: Request, res: Response, next: NextFunction) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  next();
});

// JSON body parser with 1MB limit (100 rows max per batch)
app.use(express.json({ limit: '1mb' }));

// Health check is public (no auth)
app.use('/api', healthRouter);

// Member auth routes (login, refresh) — public, no API key needed
app.use('/api', authRouter);

// Sync routes require Bearer API key (officer desktop push)
app.use('/api', syncRouter);

// Member-facing routes — JWT auth (handled inside the router middleware)
app.use('/api', memberRouter);

// 404 handler for unmatched routes
app.use((_req: Request, res: Response) => {
  res.status(404).json({ code: 'NOT_FOUND', message: 'The requested resource was not found.' });
});

// Error handler (must be last)
app.use(errorHandler);

// For local development: start HTTP server
const PORT = process.env.PORT ?? 3001;
if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`Credence Cloud API running on http://localhost:${PORT}`);
  });
}

// For Vercel: export the app as a serverless handler
export default app;
