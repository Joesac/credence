import { describe, it, expect } from 'vitest';
import { sql } from 'drizzle-orm';
import { PgDialect } from 'drizzle-orm/pg-core';
import { buildUpsertWithEvents, isNotifiableTable, NOTIFIABLE_TABLES } from './events';

const dialect = new PgDialect();

function render(chunk: ReturnType<typeof sql>) {
  return dialect.sqlToQuery(chunk);
}

const sampleColumns = ['id', 'member_id', 'received_by', 'payment_method', 'amount', 'transaction_id', 'is_cancelled'];
const sampleValues = [
  sql`('a', 'm1', 'u1', 'cash', '500.00', 'DEP-2026-0001', false)`,
];

describe('notification outbox event creation', () => {
  it('maps notifiable tables to event types', () => {
    expect(isNotifiableTable('deposits')).toBe(true);
    expect(isNotifiableTable('withdrawals')).toBe(true);
    expect(isNotifiableTable('users')).toBe(false);
    expect(isNotifiableTable('members')).toBe(false);
    expect(NOTIFIABLE_TABLES.deposits.eventType).toBe('DEPOSIT_CREATED');
    expect(NOTIFIABLE_TABLES.withdrawals.eventType).toBe('WITHDRAWAL_CREATED');
  });

  it('builds one atomic statement: upsert + outbox insert in a single CTE', () => {
    const chunk = buildUpsertWithEvents({ tableName: 'deposits', columns: sampleColumns, valuesChunks: sampleValues });
    const { sql: rendered, params } = render(chunk);

    // The whole statement is one unit — there is no separate transaction boundary.
    expect(rendered).toContain('WITH upserted AS');
    expect(rendered).toContain('INSERT INTO "deposits"');
    expect(rendered).toContain('ON CONFLICT ("id") DO UPDATE');
    expect(rendered).toContain('INSERT INTO "notification_events"');
    expect(rendered).toContain('FROM upserted u');
    expect(rendered).toContain('WHERE u."__inserted" AND u."is_cancelled" = false');
    expect(rendered).toContain('ON CONFLICT ("type", "entity_id") DO NOTHING');
  });

  it('detects freshly inserted rows via (xmax = 0)', () => {
    const chunk = buildUpsertWithEvents({ tableName: 'deposits', columns: sampleColumns, valuesChunks: sampleValues });
    const { sql: rendered } = render(chunk);
    expect(rendered).toContain('(xmax = 0) AS "__inserted"');
  });

  it('uses the correct event type and entity type per table', () => {
    const deposit = render(buildUpsertWithEvents({ tableName: 'deposits', columns: sampleColumns, valuesChunks: sampleValues }));
    expect(deposit.params).toContain('DEPOSIT_CREATED');
    expect(deposit.params).toContain('deposit');

    const withdrawal = render(buildUpsertWithEvents({ tableName: 'withdrawals', columns: ['id', 'member_id', 'amount'], valuesChunks: [sql`('w', 'm1', '200.00')`] }));
    expect(withdrawal.params).toContain('WITHDRAWAL_CREATED');
    expect(withdrawal.params).toContain('withdrawal');
  });

  it('keeps the payload free of sensitive financial data (navigation metadata only)', () => {
    const chunk = buildUpsertWithEvents({ tableName: 'deposits', columns: sampleColumns, valuesChunks: sampleValues });
    const { sql: rendered } = render(chunk);
    // Payload is built server-side from the row: entityType, entityId, transactionId.
    expect(rendered).toContain("jsonb_build_object('entityType'");
    expect(rendered).toContain("'entityId'");
    expect(rendered).toContain("'transactionId'");
    // The raw amount never enters the payload builder.
    expect(rendered).not.toContain("'amount'");
  });

  it('does not create events for cancelled rows', () => {
    const chunk = buildUpsertWithEvents({ tableName: 'withdrawals', columns: ['id', 'member_id', 'amount', 'is_cancelled'], valuesChunks: [sql`('w', 'm1', '200.00', true)`] });
    const { sql: rendered } = render(chunk);
    expect(rendered).toContain('u."is_cancelled" = false');
  });
});
