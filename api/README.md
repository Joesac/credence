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

This creates all 7 tables in Neon (users, members, deposits, withdrawals, loans, loan_repayments, fund_distributions).

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
