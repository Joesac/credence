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

This creates all tables in Neon (users, members, deposits, withdrawals, loans, loan_repayments, fund_distributions, notifications, member_notification_prefs).

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

Member-scoped routes (`/api/members/me/*` — dashboard, deposits, withdrawals, loans, notifications, password, device-token) are defined in `src/routes/member.ts`.

### Notification preferences

The `member_notification_prefs` table stores per-member push preferences. The push sender **must** call `shouldNotify(type, prefs)` from `src/utils/notification-prefs.ts` before dispatching a push so members who opted out of a category are never pinged.

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
