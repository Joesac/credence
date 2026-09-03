import { Hono } from 'hono';
import { z } from 'zod';
import { eq, sql } from 'drizzle-orm';
import { db } from '../../db';
import { members } from '../../db/schema';
import { requireApiKey } from '../middleware/auth';
import { hashPassword } from '../utils/password';

const router = new Hono();

const setMobilePasswordSchema = z.object({
  password: z.string().min(6),
});

const bulkSetMobilePasswordSchema = z.object({
  members: z.array(
    z.object({
      id: z.string().uuid(),
      password: z.string().min(6),
    })
  ).min(1),
});

/**
 * POST /api/admin/members/:id/mobile-password
 *
 * Sets (or resets) a member's mobile-app password. Intended to be called
 * by the desktop admin app after generating a temporary password. The
 * member will be required to change it on first login.
 */
router.post('/admin/members/:id/mobile-password', requireApiKey, async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json().catch(() => ({}));
  const parsed = setMobilePasswordSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ code: 'VALIDATION_ERROR', message: parsed.error.message }, 400);
  }

  const result = await db
    .update(members)
    .set({
      password: await hashPassword(parsed.data.password),
      must_change_password: true,
      date_updated: new Date(),
    })
    .where(eq(members.id, id));

  if (!result.rowCount) {
    return c.json({ code: 'NOT_FOUND', message: 'Member not found.' }, 404);
  }

  return c.json({ success: true });
});

/**
 * POST /api/admin/members/mobile-passwords
 *
 * Bulk version of the above. The desktop admin app generates temporary
 * passwords for many members and sends them in one request.
 */
router.post('/admin/members/mobile-passwords', requireApiKey, async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const parsed = bulkSetMobilePasswordSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ code: 'VALIDATION_ERROR', message: parsed.error.message }, 400);
  }

  // Hash all passwords first so a hashing failure doesn't leave partial updates.
  const updates = await Promise.all(
    parsed.data.members.map(async (item) => ({
      id: item.id,
      password: await hashPassword(item.password),
    })),
  );

  // Neon HTTP driver does not support transactions, so use a single
  // CASE-based UPDATE statement to apply all changes atomically at the SQL level.
  const ids = updates.map((u) => u.id);
  const caseClauses = updates.map(
    (u) => sql`WHEN ${u.id} THEN ${u.password}`,
  );

  await db
    .update(members)
    .set({
      password: sql`CASE id ${sql.join(caseClauses, sql` `)} END`,
      must_change_password: true,
      date_updated: new Date(),
    })
    .where(sql`${members.id} = ANY(${sql`ARRAY[${sql.join(ids.map((id) => sql`${id}`), sql`, `)}]::uuid[]`})`);

  return c.json({ success: true });
});

export { router as adminRouter };
