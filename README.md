# Allo Inventory — Take-Home Exercise

A Next.js inventory and order-fulfillment platform with race-condition-safe reservations for multi-warehouse retail brands.

## Live URL
https://allo-inventory-iota.vercel.app/

## GitHub
https://github.com/yrakshaya07/allo-inventory

---

## How to run locally

### 1. Clone the repo
```bash
git clone https://github.com/yrakshaya07/allo-inventory.git
cd allo-inventory
```

### 2. Install dependencies
```bash
npm install
```

### 3. Set up environment variables
Create a `.env` file in the root:
```env
DATABASE_URL="your-neon-postgres-connection-string"
UPSTASH_REDIS_REST_URL="your-upstash-redis-url"
UPSTASH_REDIS_REST_TOKEN="your-upstash-redis-token"
```

You can get these from:
- **Neon** → [neon.tech](https://neon.tech) (free hosted Postgres)
- **Upstash** → [upstash.com](https://upstash.com) (free hosted Redis)

### 4. Run database migrations
```bash
npx prisma migrate dev
```

### 5. Seed the database
```bash
npx tsx prisma/seed.ts
```

This creates 2 warehouses (Mumbai, Delhi) and 3 products (iPhone 15 Pro, Samsung Galaxy S24, Sony WH-1000XM5) with realistic stock levels.

### 6. Start the development server
```bash
npm run dev
```

Visit **http://localhost:3000**

---

## Data Model
Product → Stock (per warehouse) → Reservation

- **Stock** tracks `total` and `reserved` units per product per warehouse. Available = total − reserved.
- **Reservation** has a status (`pending` → `confirmed` or `released`) and an `expiresAt` timestamp.
- Stock is never permanently decremented until a reservation is confirmed — this keeps inventory accurate during the payment window.

---

## How the reservation flow works

1. Customer clicks **Reserve** → `POST /api/reservations` is called
2. Server acquires a Redis distributed lock on `{productId}:{warehouseId}`
3. Inside the lock, it checks available stock (`total - reserved`)
4. If enough stock exists, it atomically creates the reservation and increments `reserved` in a single Prisma transaction
5. Lock is released — other requests can now proceed
6. Customer has **10 minutes** to confirm payment
7. On **Confirm** → status becomes `confirmed`, stock remains decremented
8. On **Cancel** → status becomes `released`, `reserved` is decremented back
9. On **Expiry** → lazy cleanup releases the stock automatically

---

## How expiry works in production

I use **lazy cleanup on read**. When any API route fetches a reservation, it checks:
if reservation.status === "pending" AND reservation.expiresAt < now

If true, it atomically updates status to `released` and decrements `reserved` in a single Prisma transaction — so stock is returned to available inventory immediately.

**Why lazy cleanup instead of a cron job?**
- Zero infrastructure overhead — no background worker needed
- Atomic — the check and update happen in one transaction, no race conditions
- Works perfectly on Vercel's serverless architecture where persistent background processes aren't possible

**Trade-off:** If a reservation expires and is never accessed again, the stock stays locked until someone reads it. For a production system at scale, I'd add a Vercel Cron job running every minute as a safety net to sweep up any orphaned reservations.

---

## How race conditions are prevented

This is the core of the exercise. The problem: two customers click Reserve simultaneously for the last unit.

**My approach — two layers of protection:**

**Layer 1 — Redis distributed lock:**
SET lock:{productId}:{warehouseId} 1 NX EX 10
Only one request acquires the lock. The other gets a 429 and can retry. This serializes access at the application level.

**Layer 2 — Prisma transaction:**
The stock check and `reserved` increment happen inside a single atomic transaction. Even if the Redis lock somehow fails (e.g. Redis is down), the database transaction ensures consistency.

This means: if two requests come in simultaneously for the last unit, exactly one succeeds with a 201, and the other gets a 409 (not enough stock).

---

## Bonus: Idempotency

Both `POST /api/reservations` and `POST /api/reservations/:id/confirm` support idempotency via an optional `Idempotency-Key` header.

**How it works:**
1. Client sends request with header `Idempotency-Key: <unique-uuid>`
2. Server checks Redis for `idem:{key}`
3. If found → return cached response immediately (no side effect)
4. If not found → process normally, cache response in Redis for 24 hours

This means network retries are safe — a customer won't accidentally create two reservations if their connection drops.

---

## API Reference

| Method | Path | Behaviour |
|--------|------|-----------|
| GET | `/api/products` | List products with available stock per warehouse |
| GET | `/api/warehouses` | List warehouses |
| POST | `/api/reservations` | Reserve units. Returns 409 if not enough stock |
| POST | `/api/reservations/:id/confirm` | Confirm reservation. Returns 410 if expired |
| POST | `/api/reservations/:id/release` | Release reservation early |

---

## Stack

| Technology | Purpose |
|------------|---------|
| Next.js 15 (App Router) | Full-stack framework |
| TypeScript | End-to-end type safety |
| Prisma | ORM + migrations |
| Neon | Hosted Postgres |
| Upstash Redis | Distributed locking + idempotency |
| Zod | API request validation |
| Tailwind CSS | Styling |

---

## Trade-offs and what I'd do differently with more time

**1. Expiry mechanism**
Lazy cleanup works well but isn't perfect. With more time I'd add a Vercel Cron job (`/api/cron/release-expired`) running every minute to sweep orphaned reservations — especially important if a reservation is never accessed again after expiry.

**2. No authentication**
Reservations aren't tied to a user account. In production, you'd associate each reservation with a logged-in user and prevent them from reserving the same item twice simultaneously.

**3. Quantity selection**
Currently hardcoded to quantity=1. The API supports any quantity, but the UI doesn't expose it. A production UI would let customers choose quantity before reserving.

**4. No automated tests**
The most important test would be a concurrency test — firing 10 simultaneous requests for the last unit and asserting exactly one succeeds. With more time I'd add this using Jest + Supertest.

**5. Redis as single point of failure**
If Upstash goes down, reservations fail. A more resilient approach would be to fall back to Postgres advisory locks when Redis is unavailable.

**6. Real payment integration**
The confirm endpoint simulates payment success. In production this would be a webhook from a payment provider (Razorpay, Stripe) rather than a button click.
