import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { sendToMember, classifyStatus, OneSignalError, classifyOneSignalError } from './onesignal-service';

const APP_ID = process.env.ONESIGNAL_APP_ID as string;
const API_KEY = process.env.ONESIGNAL_REST_API_KEY as string;

const params = {
  externalUserId: 'member-123',
  headings: { en: 'Deposit received' },
  contents: { en: 'A deposit of GHS 500.00 has been recorded on your account.' },
  data: { type: 'DEPOSIT_CREATED', entityType: 'deposit', entityId: 'dep-1', transactionId: 'DEP-2026-0001' },
};

describe('OneSignalService.sendToMember', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('posts to /notifications with app id, external id alias and payload', async () => {
    const fetchMock = vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({ id: 'os-1' }), { status: 200, headers: { 'Content-Type': 'application/json' } }),
    );

    await sendToMember(params);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api.onesignal.com/notifications');

    const headers = init?.headers as Record<string, string>;
    expect(headers.Authorization).toBe(`Key ${API_KEY}`);
    expect(headers['Content-Type']).toContain('application/json');

    const body = JSON.parse(String(init?.body)) as Record<string, unknown>;
    expect(body.app_id).toBe(APP_ID);
    expect(body.target_channel).toBe('push');
    expect(body.include_aliases).toEqual({ external_id: ['member-123'] });
    expect(body.headings).toEqual({ en: 'Deposit received' });
    expect(body.contents).toEqual({ en: 'A deposit of GHS 500.00 has been recorded on your account.' });
    expect(body.data).toEqual(params.data);
  });

  it('targets the member id (not email or device id) so all subscriptions receive it', async () => {
    const fetchMock = vi.mocked(fetch).mockResolvedValue(new Response('{}', { status: 200 }));

    await sendToMember(params);

    const body = JSON.parse(String(fetchMock.mock.calls[0][1]?.body)) as Record<string, unknown>;
    expect(body.include_aliases).toEqual({ external_id: ['member-123'] });
    expect(body).not.toHaveProperty('include_player_ids');
    expect(body).not.toHaveProperty('include_email_tokens');
    expect(body).not.toHaveProperty('include_external_user_ids');
  });

  it('resolves when OneSignal accepts the request (2xx)', async () => {
    vi.mocked(fetch).mockResolvedValue(new Response('{"id":"os-2"}', { status: 201 }));
    await expect(sendToMember(params)).resolves.toBeUndefined();
  });

  it('still resolves when a 2xx response reports partial-failure errors', async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({ id: 'os-3', errors: { invalid_external_user_ids: [] } }), { status: 200 }),
    );
    await expect(sendToMember(params)).resolves.toBeUndefined();
  });

  it('classifies network errors as transient', async () => {
    vi.mocked(fetch).mockRejectedValue(new TypeError('fetch failed'));
    await expect(sendToMember(params)).rejects.toMatchObject({ kind: 'transient' });
  });

  it('classifies timeouts as transient', async () => {
    vi.mocked(fetch).mockRejectedValue(new DOMException('The operation was aborted', 'TimeoutError'));
    await expect(sendToMember(params)).rejects.toMatchObject({ kind: 'transient' });
  });
});

describe('OneSignalService error classification', () => {
  it('treats 429 and 5xx as transient', () => {
    expect(classifyStatus(429, 'rate limited').kind).toBe('transient');
    expect(classifyStatus(500, 'boom').kind).toBe('transient');
    expect(classifyStatus(503, 'unavailable').kind).toBe('transient');
  });

  it('treats 4xx as permanent', () => {
    expect(classifyStatus(400, 'bad request').kind).toBe('permanent');
    expect(classifyStatus(401, 'invalid key').kind).toBe('permanent');
    expect(classifyStatus(403, 'forbidden').kind).toBe('permanent');
    expect(classifyStatus(404, 'not found').kind).toBe('permanent');
  });

  it('preserves the status code', () => {
    const err = classifyStatus(500, 'boom') as OneSignalError;
    expect(err.status).toBe(500);
  });

  it('classifyOneSignalError passes through OneSignalError instances', () => {
    const original = new OneSignalError('x', 'permanent', 400);
    expect(classifyOneSignalError(original)).toBe(original);
  });

  it('classifyOneSignalError maps generic errors to transient', () => {
    expect(classifyOneSignalError(new Error('network down')).kind).toBe('transient');
  });
});
