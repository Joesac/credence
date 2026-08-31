import { describe, it, expect } from 'vitest';
import { CONTENT_PROVIDERS, formatMoney } from './content';

describe('formatMoney (matches mobile formatGHS)', () => {
  it('formats whole amounts with two decimals', () => {
    expect(formatMoney('500.00')).toBe('GHS 500.00');
    expect(formatMoney(200)).toBe('GHS 200.00');
  });

  it('groups thousands and keeps two decimals', () => {
    expect(formatMoney('1234.5')).toBe('GHS 1,234.50');
    expect(formatMoney(1500000)).toBe('GHS 1,500,000.00');
  });

  it('falls back to zero for invalid input', () => {
    expect(formatMoney('not-a-number')).toBe('GHS 0.00');
  });
});

describe('content providers', () => {
  const depositRow = { id: 'dep-1', transaction_id: 'DEP-2026-0001', amount: '500.00', is_cancelled: false };
  const withdrawalRow = { id: 'wdr-1', transaction_id: 'WDR-2026-0001', amount: '200.00', is_cancelled: false };

  it('builds deposit content from the authoritative row', () => {
    const provider = CONTENT_PROVIDERS.DEPOSIT_CREATED;
    const { title, body, data } = provider.build(depositRow);

    expect(title).toBe('Deposit received');
    expect(body).toBe('A deposit of GHS 500.00 has been recorded on your account.');
    expect(data).toEqual({
      type: 'DEPOSIT_CREATED',
      entityType: 'deposit',
      entityId: 'dep-1',
      transactionId: 'DEP-2026-0001',
    });
  });

  it('builds withdrawal content from the authoritative row', () => {
    const provider = CONTENT_PROVIDERS.WITHDRAWAL_CREATED;
    const { title, body, data } = provider.build(withdrawalRow);

    expect(title).toBe('Withdrawal recorded');
    expect(body).toBe('A withdrawal of GHS 200.00 has been recorded on your account.');
    expect(data).toEqual({
      type: 'WITHDRAWAL_CREATED',
      entityType: 'withdrawal',
      entityId: 'wdr-1',
      transactionId: 'WDR-2026-0001',
    });
  });

  it('never puts the amount into the navigation payload', () => {
    const { data } = CONTENT_PROVIDERS.DEPOSIT_CREATED.build(depositRow);
    expect(data).not.toHaveProperty('amount');
    expect(data).not.toHaveProperty('member_id');
  });

  it('maps event types to the correct preference key', () => {
    expect(CONTENT_PROVIDERS.DEPOSIT_CREATED.prefsKey).toBe('deposit');
    expect(CONTENT_PROVIDERS.WITHDRAWAL_CREATED.prefsKey).toBe('withdrawal');
  });
});
