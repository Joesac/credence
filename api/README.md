# Credence Cloud API

Express + Drizzle ORM + Neon Postgres API for Credence cloud sync.
Deployed on Vercel (free Hobby tier).

## Setup

### 1. Create a Neon project

1. Go to [neon.tech](https://neon.tech) and create a free project
2. Copy the connection string (looks like `postgresql://user:pass@host/db?sslmode=require`)

### 2. Install dependencies

```bash
cd api
npm install
```

### 3. Configure environment

```bash
cp .env.example .env
```

Edit `.env`:
- `DATABASE_URL` — your Neon connection string
- `API_KEY` — generate a strong random key (e.g. `openssl rand -hex 32`)

### 4. Apply database schema

```bash
npx drizzle-kit push
```

This creates all tables in Neon (users, members, deposits, withdrawals, loans, loan_repayments, fund_distributions, notifications, member_notification_prefs, notification_events, member_push_subscriptions).

For applying individual migrations instead of `push` (recommended when the live DB has drift), see the SQL files under `drizzle/` and the Schema Management section below.

### 5. Run locally

```bash
npm run dev
```

The API runs on `http://localhost:3001`.

## Deploy to Vercel

1. Push the `credence/` folder to a Git repository
2. Import the project in Vercel
3. Set environment variables in Vercel dashboard:
   - `DATABASE_URL` — Neon connection string
   - `API_KEY` — same key you configured in the desktop app
   - `JWT_SECRET` — secret for member JWT auth
   - `ONESIGNAL_APP_ID` — OneSignal app ID (server-side only)
   - `ONESIGNAL_REST_API_KEY` — OneSignal REST API key (server-side only)
   - `NOTIFICATIONS_CRON_SECRET` — secret authorizing manual cron invocations (falls back to `API_KEY`; Vercel cron also forwards `CRON_SECRET` as `Authorization: Bearer`)
   - `NOTIFICATIONS_MAX_ATTEMPTS` — max delivery attempts before an event is marked `FAILED` (default `5`)
4. Deploy

The `vercel.json` routes all `/api/*` requests to the Express app.

## API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/health` | None | Health check + DB connectivity |
| POST | `/api/sync/:table` | Bearer | Upsert a batch of rows (max 100) |
| POST | `/api/auth/login` | None | Member login (account number + password) |
| POST | `/api/auth/refresh` | None | Refresh member access token |
| GET | `/api/members/me/notification-preferences` | Member JWT | Read push notification preferences |
| PATCH | `/api/members/me/notification-preferences` | Member JWT | Update push notification preferences |
| POST | `/api/notifications/subscription` | Member JWT | Register/refresh OneSignal push subscription |
| DELETE | `/api/notifications/subscription` | Member JWT | Remove OneSignal push subscription (logout) |
| GET | `/api/cron/notifications` | Cron secret | Process pending notification events and dispatch to OneSignal |

Member-scoped routes (`/api/members/me/*` — dashboard, deposits, withdrawals, loans, notifications, password) are defined in `src/routes/member.ts`.

### Notification preferences

The `member_notification_prefs` table stores per-member push preferences. The notification processor checks these server-side before dispatching so members who opted out of a category are never pinged.

### Push notifications (transactional outbox)

Durable push delivery is implemented as a transactional outbox so that OneSignal failures can never roll back a successfully persisted financial transaction.

Flow:
1. Desktop sync upserts a deposit/withdrawal into Postgres.
2. In the **same transaction**, a row is inserted into `notification_events` (`type`, `entity_id`, `member_id`, `payload`). A `UNIQUE (type, entity_id)` constraint prevents duplicate events when sync is retried.
3. A Vercel cron job (`/api/cron/notifications`, configured in `vercel.json`) claims pending events with `FOR UPDATE SKIP LOCKED`, checks member preferences, and dispatches to OneSignal using `include_aliases.external_id` + `target_channel: push` (current OneSignal API).
4. Transient failures (HTTP 429 / 5xx) are retried with backoff up to `NOTIFICATIONS_MAX_ATTEMPTS`; other 4xx errors are treated as permanent. Exhausted events are marked `FAILED`.

Tables:
- `notification_events` — the outbox queue (statuses: `PENDING`, `PROCESSING`, `SENT`, `SKIPPED`, `FAILED`)
- `member_push_subscriptions` — OneSignal subscription IDs registered by the mobile app via JWT-protected endpoints. The member ID is always derived from the session, never from the request body.

The mobile app calls `OneSignal.login(member.id)` after authentication and `OneSignal.logout()` on logout, so OneSignal groups all of a member's devices under one external ID.

### Sync Request

```http
POST /api/sync/users
Authorization: Bearer <API_KEY>
Content-Type: application/json

{
  "rows": [
    { "id": "uuid", "fullname": "John", "username": "john", ... }
  ]
}
```

### Sync Response

```json
{
  "success": true,
  "syncedIds": ["uuid1", "uuid2"]
}
```

## Syncable Tables

- `users`
- `members`
- `deposits`
- `withdrawals`
- `loans`
- `loan_repayments`
- `fund_distributions`

## Security Notes

- The `users.password` and `members.password` columns store **scrypt-salted hashes** (not plaintext). The desktop app hashes passwords before storing them locally, and sync pushes the hash to the cloud.
- The API key is sent as a Bearer token over HTTPS only.
- The API key is compared using `timingSafeEqual` to prevent timing attacks.

## Schema Management

```bash
# Generate a migration from schema changes
npx drizzle-kit generate

# Apply schema changes directly (dev only)
npx drizzle-kit push

# Open Drizzle Studio to browse data
npx drizzle-kit studio
```
