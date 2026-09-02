import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { errorHandler } from './middleware/error';
import { syncRouter } from './routes/sync';
import { healthRouter } from './routes/health';
import { authRouter } from './routes/auth';
import { memberRouter } from './routes/member';
import { notificationsRouter } from './routes/notifications';
import { cronRouter } from './routes/cron';

const app = new Hono();

// CORS: allow all origins. The API is protected by the Bearer API key for sync
// and by JWT for member routes, so origin allowlisting is not required.
// Hono's cors middleware replies to OPTIONS preflight requests automatically,
// so preflight requests never hit auth.
app.use('*', cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Authorization', 'Content-Type'],
}));

// Health check is public (no auth)
app.route('/api', healthRouter);

// Member auth routes (login, refresh) — public, no API key needed
app.route('/api', authRouter);

// Sync routes require Bearer API key (officer desktop push)
app.route('/api', syncRouter);

// Notification processor trigger — external cron / manual (protected inside the router)
// Must be mounted BEFORE member-facing routers because those routers apply
// JWT middleware globally, which would reject the cron secret as an invalid token.
app.route('/api', cronRouter);

// Member-facing routes — JWT auth (handled inside the router middleware)
app.route('/api', memberRouter);
app.route('/api', notificationsRouter);

// 404 handler for unmatched routes
app.notFound((c) => {
  return c.json({ code: 'NOT_FOUND', message: 'The requested resource was not found.' }, 404);
});

// Error handler (must be registered last)
app.onError(errorHandler);

export default app;
