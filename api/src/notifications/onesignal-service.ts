import { ONESIGNAL_API_URL, ONESIGNAL_TIMEOUT_MS } from './constants';
import { notifLogger } from './logger';

/**
 * OneSignal REST API client.
 *
 * The ONLY place in the codebase that knows about OneSignal's API, auth
 * header, request shape and error semantics. Everything else works with
 * domain concepts (member id, title, body, data).
 */

export type OneSignalErrorKind = 'transient' | 'permanent';

export class OneSignalError extends Error {
  constructor(
    message: string,
    public readonly kind: OneSignalErrorKind,
    public readonly status?: number,
  ) {
    super(message);
    this.name = 'OneSignalError';
  }
}

interface SendToMemberParams {
  externalUserId: string;
  headings: { en: string };
  contents: { en: string };
  data: Record<string, unknown>;
}

function getConfig(): { appId: string; apiKey: string } {
  const appId = process.env.ONESIGNAL_APP_ID;
  const apiKey = process.env.ONESIGNAL_REST_API_KEY;
  if (!appId || !apiKey) {
    throw new OneSignalError(
      'OneSignal is not configured (missing ONESIGNAL_APP_ID or ONESIGNAL_REST_API_KEY)',
      'permanent',
    );
  }
  return { appId, apiKey };
}

/**
 * Classify an HTTP status / thrown error for the retry policy.
 * 5xx, 429 and network failures are transient; anything else is permanent.
 */
export function classifyOneSignalError(err: unknown): OneSignalError {
  if (err instanceof OneSignalError) return err;

  if (err instanceof Error) {
    // fetch threw — network failure or timeout
    return new OneSignalError(err.message, 'transient');
  }
  return new OneSignalError('Unknown OneSignal error', 'permanent');
}

export function classifyStatus(status: number, body: string): OneSignalError {
  const detail = body.length > 0 ? body.slice(0, 300) : `HTTP ${status}`;
  if (status === 429 || status >= 500) {
    return new OneSignalError(detail, 'transient', status);
  }
  return new OneSignalError(detail, 'permanent', status);
}

/**
 * Sends a push notification to every subscription of the given user
 * (OneSignal resolves all of the member's devices). Resolves when OneSignal
 * ACCEPTS the request — this is not proof of device delivery.
 *
 * Targeting uses the current external-id alias mechanism:
 *   include_aliases: { external_id: [<memberId>] } + target_channel: "push"
 * (see OneSignal API v11.6 "Push notification" reference).
 */
export async function sendToMember(params: SendToMemberParams): Promise<void> {
  const { appId, apiKey } = getConfig();
  const { externalUserId, headings, contents, data } = params;

  let res: Response;
  try {
    res = await fetch(ONESIGNAL_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        Authorization: `Key ${apiKey}`,
      },
      body: JSON.stringify({
        app_id: appId,
        target_channel: 'push',
        include_aliases: { external_id: [externalUserId] },
        headings,
        contents,
        data,
        priority: 10,
      }),
      signal: AbortSignal.timeout(ONESIGNAL_TIMEOUT_MS),
    });
  } catch (err) {
    throw classifyOneSignalError(err);
  }

  const body = await res.text().catch(() => '');

  if (!res.ok) {
    throw classifyStatus(res.status, body);
  }

  // 2xx: OneSignal accepted the notification. A 200 with an empty `id` means
  // no matching recipients — still "accepted". A 200 with an `errors` object
  // means partial failures (invalid identifiers); we log it but keep the
  // event SENT, since retrying cannot fix an invalid identifier.
  let resultId: string | null = null;
  let responseErrors: unknown = null;
  try {
    const parsed = JSON.parse(body) as { id?: string; errors?: unknown };
    resultId = parsed.id ?? null;
    responseErrors = parsed.errors ?? null;
  } catch {
    // non-JSON success body — nothing to extract
  }

  if (responseErrors) {
    notifLogger.warn('onesignal_request_partial_failure', {
      externalUserId,
      onesignalResultId: resultId,
    });
    return;
  }

  notifLogger.info('onesignal_request_accepted', {
    externalUserId,
    onesignalResultId: resultId,
  });
}
