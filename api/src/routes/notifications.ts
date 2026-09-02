import { Hono, type Context } from 'hono';
import { z } from 'zod';
import { eq, and } from 'drizzle-orm';
import { db } from '../../db';
import { member_push_subscriptions } from '../../db/schema';
import { requireMember, MEMBER_CONTEXT, type MemberPayload, type MemberVariables } from '../middleware/member-auth';
import { notifLogger } from '../notifications/logger';

const router = new Hono<{ Variables: MemberVariables }>();

// All routes require member JWT auth.
router.use(requireMember);

/**
 * Authenticated OneSignal subscription registry.
 *
 * The member id ALWAYS comes from the verified JWT — the client cannot
 * choose whose device it registers, so a member can never associate another
 * member's subscription.
 */

const subscriptionSchema = z.object({
  subscriptionId: z.string().min(1).max(200),
  pushToken: z.string().max(500).optional().nullable(),
  platform: z.enum(['ios', 'android', 'web']).optional().nullable(),
});

function getMember(c: Context<{ Variables: MemberVariables }>): MemberPayload {
  return c.get(MEMBER_CONTEXT);
}

/**
 * POST /api/members/me/notifications/subscriptions
 *
 * Body: { subscriptionId: string, pushToken?: string, platform?: string }
 * Upserts the member's OneSignal subscription. Idempotent per
 * (member_id, subscription_id) — duplicates are impossible at the DB level.
 */
router.post('/members/me/notifications/subscriptions', async (c) => {
  const member = getMember(c);
  if (!member?.memberId) {
    return c.json({ code: 'UNAUTHORIZED', message: 'Member identity missing.' }, 401);
  }

  const body = await c.req.json().catch(() => ({}));
  const parsed = subscriptionSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ code: 'VALIDATION_ERROR', message: parsed.error.message }, 400);
  }

  const { subscriptionId, pushToken, platform } = parsed.data;
  const now = new Date();

  await db
    .insert(member_push_subscriptions)
    .values({
      member_id: member.memberId,
      subscription_id: subscriptionId,
      push_token: pushToken ?? null,
      platform: platform ?? null,
      status: 'active',
      updated_at: now,
    })
    .onConflictDoUpdate({
      target: [member_push_subscriptions.member_id, member_push_subscriptions.subscription_id],
      set: { push_token: pushToken ?? null, platform: platform ?? null, status: 'active', updated_at: now },
    });

  notifLogger.info('push_subscription_registered', {
    memberId: member.memberId,
    subscriptionId,
    platform: platform ?? null,
  });

  return c.json({ success: true });
});

/**
 * DELETE /api/members/me/notifications/subscriptions/:subscriptionId
 *
 * Removes a subscription record (e.g. on logout). OneSignal itself is the
 * source of truth for the device ↔ user mapping; this row is observability.
 */
router.delete('/members/me/notifications/subscriptions/:subscriptionId', async (c) => {
  const member = getMember(c);
  if (!member?.memberId) {
    return c.json({ code: 'UNAUTHORIZED', message: 'Member identity missing.' }, 401);
  }

  const subscriptionId = c.req.param('subscriptionId');
  await db
    .delete(member_push_subscriptions)
    .where(
      and(
        eq(member_push_subscriptions.member_id, member.memberId),
        eq(member_push_subscriptions.subscription_id, subscriptionId),
      ),
    );

  notifLogger.info('push_subscription_removed', { memberId: member.memberId, subscriptionId });

  return c.json({ success: true });
});

export { router as notificationsRouter };
