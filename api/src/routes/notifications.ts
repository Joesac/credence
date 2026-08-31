import { Router } from 'express';
import { z } from 'zod';
import { eq, and } from 'drizzle-orm';
import { db } from '../../db';
import { member_push_subscriptions } from '../../db/schema';
import { requireMember } from '../middleware/member-auth';
import { notifLogger } from '../notifications/logger';

const router = Router();

// All routes require member JWT auth.
router.use(requireMember);

/**
 * Authenticated OneSignal subscription registry.
 *
 * The member id ALWAYS comes from the verified JWT (req.member.memberId) —
 * the client cannot choose whose device it registers, so a member can never
 * associate another member's subscription.
 */

const subscriptionSchema = z.object({
  subscriptionId: z.string().min(1).max(200),
  pushToken: z.string().max(500).optional().nullable(),
  platform: z.enum(['ios', 'android', 'web']).optional().nullable(),
});

/**
 * POST /api/members/me/notifications/subscriptions
 *
 * Body: { subscriptionId: string, pushToken?: string, platform?: string }
 * Upserts the member's OneSignal subscription. Idempotent per
 * (member_id, subscription_id) — duplicates are impossible at the DB level.
 */
router.post('/members/me/notifications/subscriptions', async (req, res, next) => {
  try {
    const memberId = req.member?.memberId;
    if (!memberId) {
      res.status(401).json({ code: 'UNAUTHORIZED', message: 'Member identity missing.' });
      return;
    }

    const parsed = subscriptionSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ code: 'VALIDATION_ERROR', message: parsed.error.message });
      return;
    }

    const { subscriptionId, pushToken, platform } = parsed.data;
    const now = new Date();

    await db
      .insert(member_push_subscriptions)
      .values({
        member_id: memberId,
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
      memberId,
      subscriptionId,
      platform: platform ?? null,
    });

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/members/me/notifications/subscriptions/:subscriptionId
 *
 * Removes a subscription record (e.g. on logout). OneSignal itself is the
 * source of truth for the device ↔ user mapping; this row is observability.
 */
router.delete('/members/me/notifications/subscriptions/:subscriptionId', async (req, res, next) => {
  try {
    const memberId = req.member?.memberId;
    if (!memberId) {
      res.status(401).json({ code: 'UNAUTHORIZED', message: 'Member identity missing.' });
      return;
    }

    const subscriptionId = req.params.subscriptionId;
    await db
      .delete(member_push_subscriptions)
      .where(
        and(
          eq(member_push_subscriptions.member_id, memberId),
          eq(member_push_subscriptions.subscription_id, subscriptionId),
        ),
      );

    notifLogger.info('push_subscription_removed', { memberId, subscriptionId });

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

export { router as notificationsRouter };
