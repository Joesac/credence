import { pgTable, uuid, text, boolean, timestamp, numeric, integer, pgEnum } from 'drizzle-orm/pg-core';

/**
 * Drizzle schema mirroring the local SQLite tables in Credence.
 * Each table uses the same UUID `id` as the local DB — this is the
 * conflict target for idempotent upserts during sync.
 *
 * The cloud DB is the destination of a one-way push sync. The local
 * desktop DB is the source of truth.
 */

export const users = pgTable('users', {
  id: uuid('id').primaryKey(),
  fullname: text('fullname').notNull(),
  username: text('username').notNull().unique(),
  password: text('password').notNull(),
  is_disabled: boolean('is_disabled').notNull().default(false),
  last_login: timestamp('last_login', { withTimezone: true }),
  date_created: timestamp('date_created', { withTimezone: true }).notNull().defaultNow(),
  date_updated: timestamp('date_updated', { withTimezone: true }).notNull().defaultNow(),
  is_synced: boolean('is_synced').notNull().default(true),
});

export const members = pgTable('members', {
  id: uuid('id').primaryKey(),
  fullname: text('fullname').notNull(),
  account_number: text('account_number').notNull(),
  telephoneNumber: text('telephoneNumber').notNull(),
  location: text('location').notNull(),
  password: text('password'),
  creator_id: uuid('creator_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  date_created: timestamp('date_created', { withTimezone: true }).notNull().defaultNow(),
  date_updated: timestamp('date_updated', { withTimezone: true }).notNull().defaultNow(),
  is_deleted: boolean('is_deleted').notNull().default(false),
  is_disabled: boolean('is_disabled').notNull().default(false),
  is_synced: boolean('is_synced').notNull().default(true),
});

export const deposits = pgTable('deposits', {
  id: uuid('id').primaryKey(),
  transaction_id: text('transaction_id').unique(),
  member_id: uuid('member_id').notNull().references(() => members.id, { onDelete: 'cascade' }),
  received_by: uuid('received_by').notNull().references(() => users.id, { onDelete: 'cascade' }),
  payment_method: text('payment_method').notNull(),
  amount: numeric('amount').notNull(),
  refreshment_token: integer('refreshment_token').notNull().default(0),
  notes: text('notes'),
  is_cancelled: boolean('is_cancelled').notNull().default(false),
  date_created: timestamp('date_created', { withTimezone: true }).notNull().defaultNow(),
  date_updated: timestamp('date_updated', { withTimezone: true }).notNull().defaultNow(),
  is_synced: boolean('is_synced').notNull().default(true),
});

export const withdrawals = pgTable('withdrawals', {
  id: uuid('id').primaryKey(),
  transaction_id: text('transaction_id').unique(),
  member_id: uuid('member_id').notNull().references(() => members.id, { onDelete: 'cascade' }),
  issuer_id: uuid('issuer_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  amount: numeric('amount').notNull(),
  notes: text('notes'),
  is_cancelled: boolean('is_cancelled').notNull().default(false),
  date_created: timestamp('date_created', { withTimezone: true }).notNull().defaultNow(),
  date_updated: timestamp('date_updated', { withTimezone: true }).notNull().defaultNow(),
  is_synced: boolean('is_synced').notNull().default(true),
});

export const loans = pgTable('loans', {
  id: uuid('id').primaryKey(),
  member_id: uuid('member_id').notNull().references(() => members.id, { onDelete: 'cascade' }),
  issuer_id: uuid('issuer_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  amount: numeric('amount').notNull(),
  interest_rate: numeric('interest_rate').notNull(),
  repayment_frequency: text('repayment_frequency').notNull(),
  due_date: text('due_date').notNull(),
  notes: text('notes'),
  is_cancelled: boolean('is_cancelled').notNull().default(false),
  date_created: timestamp('date_created', { withTimezone: true }).notNull().defaultNow(),
  date_updated: timestamp('date_updated', { withTimezone: true }).notNull().defaultNow(),
  is_synced: boolean('is_synced').notNull().default(true),
});

export const loan_repayments = pgTable('loan_repayments', {
  id: uuid('id').primaryKey(),
  loan_id: uuid('loan_id').references(() => loans.id, { onDelete: 'cascade' }),
  receiver_id: uuid('receiver_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  amount: numeric('amount').notNull(),
  notes: text('notes'),
  is_cancelled: boolean('is_cancelled').notNull().default(false),
  date_created: timestamp('date_created', { withTimezone: true }).notNull().defaultNow(),
  is_synced: boolean('is_synced').notNull().default(true),
});

export const fund_distributions = pgTable('fund_distributions', {
  id: uuid('id').primaryKey(),
  member_id: uuid('member_id').notNull().references(() => members.id, { onDelete: 'cascade' }),
  giver_id: uuid('giver_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  amount: numeric('amount').notNull(),
  date_received: text('date_received').notNull(),
  notes: text('notes'),
  date_created: timestamp('date_created', { withTimezone: true }).notNull().defaultNow(),
  is_synced: boolean('is_synced').notNull().default(true),
});

export const notifications = pgTable('notifications', {
  id: uuid('id').primaryKey(),
  member_id: uuid('member_id').notNull().references(() => members.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  body: text('body').notNull(),
  type: text('type').notNull(),
  related_id: uuid('related_id'),
  is_read: boolean('is_read').notNull().default(false),
  date_created: timestamp('date_created', { withTimezone: true }).notNull().defaultNow(),
});

/**
 * Maps table names to their Drizzle table objects.
 * Used by the sync route to resolve the target table dynamically.
 */
export const TABLE_REGISTRY = {
  users,
  members,
  deposits,
  withdrawals,
  loans,
  loan_repayments,
  fund_distributions,
  notifications,
} as const;

export type SyncableTableName = keyof typeof TABLE_REGISTRY;
