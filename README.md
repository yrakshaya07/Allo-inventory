# Allo Inventory — Take-Home Exercise

A Next.js inventory and order-fulfillment platform with race-condition-safe
reservations for multi-warehouse retail brands.

## Live URL
https://allo-inventory-iota.vercel.app/

## GitHub
https://github.com/yrakshaya07/Allo-inventory

---

## How to run locally

### 1. Clone the repo
```bash
git clone https://github.com/yrakshaya07/Allo-inventory.git
cd Allo-inventory
```

### 2. Install dependencies
```bash
npm install
```

### 3. Set up environment variables

Create a `.env` file in the project root:

```env
DATABASE_URL="your-neon-postgres-connection-string"
UPSTASH_REDIS_REST_URL="your-upstash-redis-url"
UPSTASH_REDIS_REST_TOKEN="your-upstash-redis-token"
```

- **Neon** → [neon.tech](https://neon.tech) — free hosted Postgres
- **Upstash** → [upstash.com](https://upstash.com) — free hosted Redis

### 4. Run database migrations
```bash
npx prisma migrate dev
```

### 5. Seed the database
```bash
npx tsx prisma/seed.ts
```

This creates **3 warehouses** (Mumbai, Delhi, Bangalore) and **8 products**
(iPhone 15 Pro, Samsung Galaxy S24 Ultra, Sony WH-1000XM5, MacBook Pro 14",
iPad Pro 12.9", DJI Mini 4 Pro, PlayStation 5, Samsung 65" OLED TV) with
realistic stock levels across all warehouses.

### 6. Start the development server
```bash
npm run dev
```

Visit **http://localhost:3000**

---

## What I built — and what I added beyond the spec

The assignment asked for the five core API routes, a product listing page,
a reservation/checkout page, and expiry handling. I built all of that, and
added a few things on top that I felt made the demo significantly better:

**Required by the spec:**
- All 5 API routes (`GET /api/products`, `GET /api/warehouses`,
  `POST /api/reservations`, `POST /api/reservations/:id/confirm`,
  `POST /api/reservations/:id/release`)
- Product listing page with available stock per warehouse and Reserve button
- Reservation page with live countdown, Confirm and Cancel buttons
- UI updates after confirm/cancel without a page refresh
- 409 and 410 errors shown visibly to the user
- Reservation expiry with lazy cleanup on read
- Idempotency bonus on `POST /api/reservations`

**Added beyond the spec:**
- **My Reservations tab** — a dedicated tab on the homepage showing all your
  reservations with their current status (pending / confirmed / released),
  live countdown timers for pending ones, and one-click navigation to manage
  any reservation. This makes the debrief demo much smoother.
- **Search** — instant client-side filtering of products by name
- **Stock progress bars** — visual indicator of how much stock remains per
  warehouse, with colour coding (green → orange → red as stock depletes)
- **3 warehouses instead of the minimum 2** — Mumbai, Delhi, and Bangalore,
  each with independent stock levels
- **8 products instead of the minimum 3** — gives a more realistic demo
  with variety across categories
- **Animated loading states** — spinner on the Reserve button while the
  request is in flight, so the user knows something is happening

---

## Data model
Product → Stock (per warehouse) → Reservation

- **Product** — name and description.
- **Warehouse** — name and location. Stock is modelled per product per
  warehouse, not as a single global count.
- **Stock** — tracks `total` and `reserved` units per product per warehouse.
  Available = `total − reserved`. Stock is never permanently decremented
  until a reservation is confirmed, so inventory counts stay accurate during
  the payment window.
- **Reservation** — has a status (`pending` → `confirmed` or `released`),
  a quantity, and an `expiresAt` timestamp set to 10 minutes from creation.

---

## How the reservation flow works

1. Customer clicks **Reserve** → `POST /api/reservations` is called
2. Server acquires a Redis distributed lock on `lock:{productId}:{warehouseId}`
3. Inside an interactive Prisma transaction, it reads available stock and —
   if sufficient — creates the reservation and increments `reserved` atomically
4. Lock is released
5. Customer has **10 minutes** to confirm
6. **Confirm** → status becomes `confirmed`, stock stays decremented permanently
7. **Cancel** → status becomes `released`, `reserved` is decremented back
8. **Expiry** → lazy cleanup on read releases the stock automatically

---

## How expiry works in production

I use **lazy cleanup on read**. Every time a reservation is fetched via
`GET /api/reservations/:id`, the server checks:
if reservation.status === "pending" AND reservation.expiresAt < now

If true, it atomically updates the status to `released` and decrements
`reserved` in a single Prisma transaction — stock is returned to available
inventory in the same request that detected the expiry.

**Why lazy cleanup instead of a cron job?**

- Zero extra infrastructure — no background worker or scheduler needed
- Atomic — the expiry check and stock release happen in one database
  transaction with no window for a race condition
- Fits naturally on Vercel's serverless architecture where persistent
  background processes are not available

**The limitation:** if a reservation expires and is never accessed again,
the `reserved` count stays inflated until some future read triggers the
cleanup. For a production system I would add a Vercel Cron job at
`/api/cron/release-expired` running every minute as a safety net to sweep
orphaned reservations, so stock is never locked for more than 10 minutes
regardless of whether the reservation is ever read again.

---

## How race conditions are prevented

The core problem: two customers click Reserve simultaneously for the last
unit of a SKU.

**Two layers of protection:**

**Layer 1 — Redis distributed lock**
SET lock:{productId}:{warehouseId} 1 NX EX 10

Only one request acquires the lock at a time. Any request that cannot
acquire it gets a `429` immediately and can safely retry. This serialises
access to the stock check at the application layer.

**Layer 2 — Prisma interactive transaction**

The stock availability check and the `reserved` increment both happen inside
a single interactive Prisma transaction
(`prisma.$transaction(async (tx) => { ... })`). The read and the write share
the same transaction context, so no other write can interleave between them.
Even if the Redis lock were to fail (e.g. Upstash is temporarily unavailable),
the database transaction alone guarantees atomicity.

**Result:** if two requests arrive simultaneously for the last unit, exactly
one succeeds with `201 Created`. The other receives either a `429` (lock
contention — transient, retry safe) or a `409` (genuine stock exhaustion —
do not retry). These are intentionally distinct status codes because the
client should handle them differently.

---

## Bonus: Idempotency

`POST /api/reservations` supports idempotency via an optional
`idempotencyKey` field in the request body.

**How it works:**

1. Client sends a request with `"idempotencyKey": "<uuid>"` in the JSON body
2. Server checks Redis for `idem:{key}`
3. If found → return the cached response immediately, no side effects
4. If not found → process normally and cache the response in Redis for 24 hours

This makes retries safe. If a customer's connection drops after the server
processed the request but before the response arrived, retrying with the
same key returns the original reservation rather than creating a duplicate.

---

## API reference

| Method | Path | Behaviour |
|--------|------|-----------|
| GET | `/api/products` | List all products with available stock per warehouse |
| GET | `/api/warehouses` | List all warehouses |
| POST | `/api/reservations` | Reserve units. Returns `409` if not enough stock, `429` if lock contention |
| POST | `/api/reservations/:id/confirm` | Confirm reservation. Returns `410` if expired |
| POST | `/api/reservations/:id/release` | Release reservation early |
| GET | `/api/reservations/:id` | Fetch reservation details (triggers lazy expiry check) |
| GET | `/api/reservations/all` | List all reservations (used by My Reservations tab) |

---

## Frontend features

| Feature | Detail |
|---------|--------|
| Product listing | All products with per-warehouse stock, availability badges, progress bars |
| Search | Instant client-side filter by product name |
| Reserve button | Holds 1 unit for 10 minutes, disabled and greyed out when out of stock |
| Stock indicators | Green / orange / red colour coding with "Only N left!" warnings |
| My Reservations tab | All reservations in one place with live countdowns and status badges |
| Reservation detail page | Countdown timer, Confirm and Cancel buttons, instant status update |
| Error visibility | 409 and 410 errors shown as banners — never swallowed silently |

---

## Stack

| Technology | Purpose |
|------------|---------|
| Next.js 15 (App Router) | Full-stack framework |
| TypeScript | End-to-end type safety |
| Prisma | ORM + migrations |
| Neon | Hosted Postgres |
| Upstash Redis | Distributed locking + idempotency cache |
| Zod | API request validation |
| Tailwind CSS | Styling |

---

## Trade-offs and what I'd do differently with more time

**1. Expiry sweep for orphaned reservations**
Lazy cleanup handles the common case but leaves `reserved` counts inflated
if a checkout is abandoned entirely and the reservation is never accessed
again. I'd add a Vercel Cron job running every minute to sweep any `pending`
reservations past their `expiresAt`, so stock is never locked longer than
10 minutes regardless of access patterns.

**2. No authentication**
Reservations are not tied to a user account — anyone with a reservation ID
can confirm or cancel it. In production each reservation would be associated
with an authenticated session, and the confirm/release endpoints would verify
ownership before acting.

**3. No per-user scoping on the reservations list**
`/api/reservations/all` currently returns all reservations in the system.
In production this would be scoped to the current user's session so customers
only see their own reservations.

**4. Quantity hardcoded to 1 in the UI**
The API accepts any quantity, but the frontend always sends `quantity: 1`.
A production UI would let the customer choose how many units to reserve
before proceeding to checkout.

**5. No automated concurrency tests**
The most important test for this exercise would fire 10 simultaneous POST
requests for the last unit of a SKU and assert exactly one returns `201`
and the rest return `409` or `429`. I'd add this with Jest and Supertest.

**6. Redis as a single point of failure**
If Upstash is unavailable, all reservation attempts fail because the lock
cannot be acquired. A more resilient fallback would be Postgres advisory
locks, which keep the system functional without Redis at the cost of slightly
reduced throughput under high concurrency.

**7. Real payment integration**
The confirm button simulates a successful payment. In production,
confirmation would be triggered by a webhook from a payment provider
(Stripe, Razorpay) after settlement — not by a client-side button click.