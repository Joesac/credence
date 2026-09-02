import { serve } from '@hono/node-server';
import app from './index';

/**
 * Local development server. Kept separate from src/index.ts so the Workers
 * entry point stays free of Node-only imports (@hono/node-server uses the
 * Node http module).
 *
 * Run with: npm run dev
 */
const PORT = Number(process.env.PORT ?? 3001);

serve({ fetch: app.fetch, port: PORT }, (info) => {
  console.log(`Credence Cloud API running on http://localhost:${info.port}`);
});
