import app from './index';

/**
 * Cloudflare Workers entry point.
 *
 * - `fetch`: all HTTP routes served by the Hono app.
 * - `scheduled`: Cloudflare Cron Trigger that drains the notification outbox
 *   by calling the same handler used by external schedulers. With
 *   nodejs_compat_v2 (default for the 2026 compatibility date) `process.env`
 *   is populated with the Worker's environment variables.
 */
export default {
  fetch: app.fetch,
  scheduled: async (_controller: unknown, _env: unknown, _ctx: unknown) => {
    const secret = process.env.NOTIFICATIONS_CRON_SECRET ?? process.env.API_KEY;
    if (!secret) return;
    const request = new Request('https://internal/api/cron/notifications', {
      headers: { authorization: `Bearer ${secret}` },
    });
    await app.fetch(request);
  },
};
