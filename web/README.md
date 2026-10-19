# Everyday

A production-grade e-commerce storefront — search, category browsing, product pages with variants and reviews, a persistent cart, secure checkout, order history, and account management. The UI is modeled on a modern marketplace and the data layer is hardened with row-level security, server-authoritative pricing, and idempotent checkout.

**Live demo:** https://everyday-8x-amazon.vercel.app
**Repository:** https://github.com/of-Mushahid/8x-Amazon

## Features

- 64 products across 8 categories with product imagery
- Search with autocomplete + recent searches; filter by category, price, rating, delivery; sort; paginate
- Product pages with image gallery, variants, stock states, and reviews
- Guest cart persisted in the browser; merges into the server cart on sign-in
- Saved-for-later / favorites
- Sign-in and account pages, saved addresses, and order history
- Checkout with server-side validation, idempotency, and inventory locking
- Accessible, responsive UI with loading, empty, and error states

## Tech stack

- **Next.js 16** (App Router, Turbopack) + **React 19**
- **TypeScript** (strict)
- **Tailwind CSS v4** + shadcn/ui
- **Supabase** — Postgres, Auth, Storage, Row-Level Security
- **Zustand** (persisted cart / favorites)
- **React Hook Form** + **Zod**
- **Vercel** hosting

## Prerequisites

- **Node.js 20+** (tested on 24)
- A free **Supabase** account — https://supabase.com

## Run it locally

### 1. Clone and install

```bash
git clone https://github.com/of-Mushahid/8x-Amazon.git
cd 8x-Amazon/web
npm install
```

### 2. Create a Supabase project

1. In the Supabase dashboard, **New project** (any name, strong DB password).
2. Grab your keys from **Project Settings → API**:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon / public key** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role key** → `SUPABASE_SERVICE_ROLE_KEY` (server-only — never expose to the browser)

### 3. Configure auth URLs

In **Authentication → URL Configuration**:
- **Site URL**: `http://localhost:3000`
- **Additional Redirect URLs**: add `http://localhost:3000/**`

(When you deploy, repeat this with your production URL so sign-up confirmation emails return to your app.)

### 4. Apply the database schema

Open **SQL Editor** in Supabase, paste the contents of [`supabase/migrations/001_store.sql`](supabase/migrations/001_store.sql), and **Run**. This creates all tables, RLS policies, storage bucket, and the checkout RPC.

> Tip: paste the file in one go. If a function is created with a mangled regex the checkout will fail — after running, confirm `select public.store_valid_address('{"fullName":"A B","street":"1 Main","city":"Austin","state":"TX","zip":"78701","country":"US"}'::jsonb);` returns `true`.

### 5. Set environment variables

```bash
cp .env.example .env.local
```

Then edit `.env.local` and fill in the three values from step 2.

### 6. Seed the catalog and run

```bash
npm run seed     # uploads product images to Storage and inserts 64 products / 8 categories / reviews
npm run dev      # http://localhost:3000
```

Sign up with any email/password to test the account, cart, and checkout flows. (If you want instant sign-up while testing locally, you can turn off **Authentication → Sign In / Providers → Email → Confirm email**.)

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the dev server (Turbopack) |
| `npm run build` | Production build + type check |
| `npm start` | Serve the production build |
| `npm run typecheck` | TypeScript check only |
| `npm run lint` | ESLint |
| `npm run test` | Backend validation + cart logic tests |
| `npm run seed` | Populate Supabase with the demo catalog (resets stock) |

## Deploying to Vercel

1. Import the repo in Vercel (framework preset **Next.js**, root directory `web`).
2. Add the same three environment variables from step 2 under **Project → Settings → Environment Variables**.
3. Set the Supabase **Site URL** and **Redirect URLs** to your `*.vercel.app` domain (step 3).
4. Deploy. On Vercel, if **Deployment Protection** is on, disable it (Settings → Deployment Protection) so the site is publicly reachable.

CLI alternative:

```bash
npx vercel link
npx vercel env add NEXT_PUBLIC_SUPABASE_URL production
npx vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production
npx vercel env add SUPABASE_SERVICE_ROLE_KEY production
npx vercel deploy --prod
```

## How it works (security & data)

- **Money is integer cents** everywhere; totals are recomputed server-side from catalog prices, never trusted from the client.
- **Checkout is a single `SECURITY DEFINER` RPC** (`checkout_store`) that validates the address and items, locks the referenced product/variant rows with `FOR UPDATE` (in sorted order to avoid deadlocks), re-prices from the database, checks stock, and inserts the order atomically.
- **Idempotency**: each checkout carries a retry key; replays return the original order and never decrement stock twice.
- **Row-Level Security** on every table; orders are visible only to their owner. The browser has no write access to orders or inventory — only the service role can call the write RPCs.
- **Guest checkout** is protected by a hashed session cookie and per-order HMAC receipt cookies scoped to the order's API path.
- **Auth** is verified server-side with `getUser()` on every privileged route; the client session is never trusted for authorization.

## Project structure

```
web/
├── app/                      # App Router pages + API route handlers
│   ├── api/                  # /checkout, /orders, /addresses, /cart
│   └── auth/callback/        # OAuth / email-confirmation code exchange
├── components/shop/          # Storefront UI (header, cart, catalog, PDP, flows)
├── content/pages.ts          # Copy for informational pages (sell, help, shipping, …)
├── data/catalog.ts           # Generated 64-product catalog (stable UUIDs)
├── lib/                      # checkout logic, Zustand store, Supabase clients
├── scripts/seed.ts           # Database + Storage seeder
├── supabase/migrations/      # 001_store.sql — schema, RLS, RPC functions
└── tests/                    # backend + cart logic tests
```

## Notes

- Payments are simulated (`payment_method = 'demo'`); no card data is collected and nothing is charged or shipped.
- Product imagery and sample reviews are demonstration data; replace them with your own licensed content before any real-world use.
- This is an independent project and is not affiliated with, or endorsed by, Amazon or any brand shown.

## License

MIT
