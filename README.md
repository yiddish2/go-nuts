# Go Nuts Web App

Production-ready Vite + React storefront connected to Supabase for:
- catalog (`nuts`, `containers`)
- checkout (`orders`, `order_items`)
- admin management

## Stack

- React + TypeScript + Vite
- Tailwind + shadcn/ui
- Supabase (Auth, Postgres, Storage)

## Quick Start

```bash
cd /Users/suchy/Desktop/kernel-cart-corner-main
npm install
npm run dev
```

Default local URL: `http://localhost:8080`

## Environment

Create `.env` from `.env.example`:

```bash
cp .env.example .env
```

Required vars:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`

Validate env:

```bash
npm run check:env
```

## Database Checks

This project expects Supabase schema from `supabase/migrations`.

If you use Supabase CLI:

```bash
supabase db push
```

Then verify app reads/writes:
1. open `/build` and add items
2. checkout flow creates records in `orders` and `order_items`
3. `/admin` can read/edit data with admin role

## Safe Rebuild (Backup -> Rebuild -> Restore Selected Data)

Use this flow when you want a clean schema but keep selected business data.

1. Install Supabase CLI (if missing):
```bash
brew install supabase/tap/supabase
```

2. Login and link this project:
```bash
supabase login
supabase link --project-ref rrbmylhmxcgyxzaegrlc
```

3. Export service key only for this terminal session:
```bash
export SUPABASE_SERVICE_ROLE_KEY='YOUR_SERVICE_ROLE_KEY'
```

4. Backup selected tables (defaults are preconfigured in script):
```bash
npm run db:backup:selected
```

Optional: choose exactly which tables to backup:
```bash
BACKUP_TABLES='nuts,containers,allowed_emails,orders,order_items' npm run db:backup:selected
```

5. Rebuild schema from migrations:
```bash
supabase db reset --linked
```

6. Restore selected data from backup JSON:
```bash
BACKUP_FILE='backups/<timestamp>/selected-data.json' npm run db:restore:selected
```

7. Security cleanup:
```bash
unset SUPABASE_SERVICE_ROLE_KEY
```

Notes:
- Backups are saved under `backups/<timestamp>/selected-data.json`.
- Restore uses upsert by `id`, in foreign-key-safe order.
- Storage bucket files (for `nut-images`) are not included in this JSON backup. Re-upload or back up storage separately.

## Production Build

```bash
npm run build
npm run preview
```

## Deployment

### Vercel

- `vercel.json` is included.
- Build command: `npm run build`
- Output directory: `dist`
- Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` in project env vars.

### Netlify

- `netlify.toml` is included.
- Build command: `npm run build`
- Publish directory: `dist`
- SPA redirects are preconfigured.

## Stripe Checkout (Local First)

This project now uses a Supabase Edge Function for Stripe Checkout:
- `supabase/functions/create-checkout-session/index.ts`

Setup:

1. Add Stripe secret in Supabase:
```bash
supabase secrets set STRIPE_SECRET_KEY=sk_test_xxx --project-ref rbwbzqusurjzaypxunak
```

2. Deploy function:
```bash
supabase functions deploy create-checkout-session --project-ref rbwbzqusurjzaypxunak
```

3. Run app locally and test checkout:
```bash
npm run dev
```

Notes:
- Checkout page now redirects users to Stripe hosted checkout.
- Card fields were removed from frontend (no raw card data stored in your DB).
- Order rows are created with `payment_method = stripe_checkout` and `status = pending`.

## Notes

- Route code-splitting is enabled in `src/App.tsx`.
- Vendor chunk splitting is configured in `vite.config.ts`.
- Never commit real `.env`; only `.env.example` should be tracked.
