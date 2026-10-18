# Everyday Shopping Demo

A production-grade e-commerce storefront built as an independent simulation. No real payments, no real inventory — but every security boundary, data flow, and user journey behaves like the real thing.

**Live demo:** https://everyday-8x-amazon-4e54ey3p3-danger17.vercel.app

## What this is

- **64 products** across 8 categories with realistic imagery
- **Guest and signed-in checkout** with idempotency, advisory locks, and FOR UPDATE inventory serialization
- **Persistent guest cart** that merges on sign-in
- **Row-level security** on every table; service-role-only RPC functions for writes
- **Integer cents** throughout — no floating-point money
- **Mock payment** (`demo` only) with guest receipt cookies scoped to order paths

## Stack

- **Next.js 16.4.2** (App Router, Turbopack) + React 19.3.0
- **TypeScript** strict mode
- **Tailwind CSS v4** + shadcn/ui (base-ui)
- **Supabase** Postgres, Auth, Storage, RLS
- **Zustand** for client state (persisted cart, saved items)
- **React Hook Form** + **Zod** for checkout validation
- **Vercel** for hosting

## Local development

```bash
cd web
npm install
```

Copy `.env.example` to `.env.local` and fill in your Supabase credentials:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

Apply the database migration in the Supabase SQL Editor (`supabase/migrations/001_store.sql`), then seed the demo catalog:

```bash
npm run seed
```

Start the dev server:

```bash
npm run dev
```

Open http://localhost:3000.

## Scripts

- `npm run dev` — development server with Turbopack
- `npm run build` — production build with type checking
- `npm run typecheck` — TypeScript only
- `npm run test` — backend validation tests + store logic tests
- `npm run seed` — populate Supabase with 64 products, 8 categories, sample reviews

## Architecture notes

### Security

- All monetary values are `INTEGER` cents; server-side totals are recomputed from catalog prices, never trusted from the client
- Idempotency keys are scoped to user or guest session; replays return the original order without decrementing stock twice
- `pg_advisory_xact_lock` serializes checkouts for the same identity/key pair
- `FOR UPDATE` locks on products and variants in sorted order prevent deadlocks during concurrent multi-product checkouts
- Guest receipts are HMAC-SHA256 secrets stored in HttpOnly, order-path-scoped cookies
- RLS policies restrict order visibility to owners; no anon SELECT on orders or order_items

### Cart

- Guest carts live in Zustand with `localStorage` persistence
- On sign-in, the server merges the guest cart into the user's server-side cart
- Cart contents do not reserve inventory; stock is only decremented at checkout under locks

### Checkout

- Two paths: guest (session cookie + receipt cookie) and signed-in (user ID from JWT)
- `checkout_store` RPC validates address, items, stock, and totals server-side
- Shipping: free for orders ≥ $50 or empty carts; $4.95 otherwise
- Tax: 8% floor((subtotal × 8 + 50) / 100)

## Project structure

```
web/
── app/                    # Next.js App Router pages and API routes
├── components/
│   └── shop/              # Storefront UI components
├── data/
│   └── catalog.ts         # Generated 64-product catalog (stable UUIDs)
├── lib/
│   ├── checkout.ts        # Server-side validation and totals
│   ├── store.ts           # Zustand cart store
│   └── supabase/          # Supabase client factories
── public/images/         # Product imagery
├── scripts/
│   └── seed.ts            # Database seeder
├── supabase/migrations/
│   └── 001_store.sql      # Full schema with RLS and RPC functions
└── tests/
    ├── backend.test.ts    # Pure validation tests
    └── store.test.ts      # Cart logic tests
```

## Demo limitations

- **No real payments** — `payment_method` is always `'demo'`
- **No real shipping** — address validation is format-only; no carrier integration
- **Sample reviews** — all reviews are marked `is_sample = true` with synthetic authors
- **DummyJSON imagery** — product images are sourced from DummyJSON (check their license for production use)

## License

MIT
