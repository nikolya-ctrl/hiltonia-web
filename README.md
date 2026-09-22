# Hiltonia Website

A rental platform for apartments and villas in Sri Lanka: a public site backed by Supabase
(database, auth, storage), a small Express API for Stripe checkout and email, and an admin
dashboard for managing properties, bookings and enquiries.

## How it fits together

```
hiltonia-web/
├── index.html, style.css, main.js   — public site (static, no build step)
├── admin.html, admin.css, admin.js  — admin dashboard (Supabase Auth + direct DB access)
├── js/
│   ├── config.example.js            — template for frontend config (copy → config.js)
│   └── config.js                    — your real Supabase URL/key + backend URL (gitignored)
├── supabase/
│   └── schema.sql                   — tables, RLS policies, storage bucket, seed data
└── server/                          — Node/Express API
    ├── src/index.js                 — app entrypoint
    ├── src/routes/bookings.js       — POST /api/bookings/checkout (creates Stripe session)
    ├── src/routes/webhook.js        — POST /api/webhook/stripe (confirms booking, sends email)
    ├── src/routes/contact.js        — POST /api/contact (stores enquiry, notifies admin)
    └── .env.example                 — template for server/.env
```

**Why a backend at all, if Supabase is the database?** Two things need a secret key that must
never reach the browser: creating a Stripe Checkout session (Stripe secret key) and sending
email (Resend API key). Everything else — reading properties, and all of the admin panel's
CRUD — talks to Supabase directly from the browser, protected by Row Level Security (RLS).

## One-time setup

### 1. Supabase (database, auth, storage)

1. Create a project at [supabase.com](https://supabase.com).
2. Open **SQL Editor** → paste the contents of `supabase/schema.sql` → run it. This creates the
   `properties`, `bookings`, `enquiries` tables, their RLS policies, the `property-images`
   storage bucket, and seeds the 5 current listings.
3. Go to **Authentication → Users** and manually create your one admin user (email + password).
   Public sign-up is not exposed anywhere in this app — the admin account only exists because
   you created it here.
4. Go to **Project Settings → API** and note down:
   - `Project URL` → `SUPABASE_URL`
   - `anon public` key → `SUPABASE_ANON_KEY` (frontend)
   - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY` (backend only — **never** put this in
     frontend code, it bypasses RLS)

### 2. Stripe (payments)

1. Create a [Stripe](https://stripe.com) account. Use test mode while developing.
2. **Developers → API keys** → copy the secret key → `STRIPE_SECRET_KEY`.
3. **Developers → Webhooks** → add an endpoint pointing at your deployed backend:
   `https://your-backend.onrender.com/api/webhook/stripe`, listening for
   `checkout.session.completed`. Copy its signing secret → `STRIPE_WEBHOOK_SECRET`.
   (For local testing, use the [Stripe CLI](https://stripe.com/docs/stripe-cli):
   `stripe listen --forward-to localhost:4000/api/webhook/stripe`.)

### 3. Resend (email)

1. Create a [Resend](https://resend.com) account, verify a sending domain (or use their test
   domain while developing).
2. **API Keys** → create one → `RESEND_API_KEY`.
3. Pick a `FROM_EMAIL` (e.g. `Hiltonia <bookings@yourdomain.com>`) and an `ADMIN_NOTIFY_EMAIL`
   (where booking/enquiry notifications land — e.g. your real inbox).

### 4. Configure the frontend

```bash
cp js/config.example.js js/config.js
```

Edit `js/config.js` with your `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and the URL where the
backend is reachable (`http://localhost:4000` locally, your Render URL in production). The
anon key is safe to ship in the browser — it only grants what the RLS policies in
`supabase/schema.sql` allow.

### 5. Configure the backend

```bash
cd server
cp .env.example .env
```

Fill in `.env` with the Supabase, Stripe and Resend values gathered above, plus `FRONTEND_URL`
(where the public site is served — used for CORS and for Stripe's redirect back to the site).

## Local development

```bash
# Terminal 1 — backend
cd server
npm install
npm run dev          # http://localhost:4000

# Terminal 2 — frontend (any static server works)
npx serve .           # or: python3 -m http.server 5500
```

Open the static site's URL, and `/admin.html` for the dashboard (sign in with the admin user
you created in Supabase).

## Deployment

**Backend → Render or Railway**
- New Web Service, root directory `server/`, build command `npm install`, start command
  `npm start`.
- Add all the variables from `server/.env.example` as environment variables in the dashboard.
- Once deployed, update the Stripe webhook endpoint URL and `FRONTEND_URL` to match reality.

**Frontend → Render (Static Site), Netlify, or Vercel**
- Publish directory: repo root. No build command needed.
- Make sure `js/config.js` exists in the deployed build with the production Supabase project
  and backend URL (it's gitignored, so set it via your host's file/secret mechanism, or
  simply commit a production copy if you're comfortable — the anon key is public-safe).

## How a booking works

1. Guest fills in the booking form → frontend calls `POST /api/bookings/checkout` on the
   backend with property + dates + guest details.
2. Backend checks for overlapping bookings, inserts a `pending` booking row, creates a Stripe
   Checkout session, and returns its URL.
3. Guest pays on Stripe's hosted checkout page.
4. Stripe calls `POST /api/webhook/stripe` → backend marks the booking `confirmed` and emails
   both the guest and `ADMIN_NOTIFY_EMAIL`.
5. Guest is redirected back to the site with `?booking=success`, which shows a confirmation
   banner under the booking form.

Enquiries from the contact form skip Stripe entirely: they're inserted straight into
`enquiries` and trigger a notification email to the admin.

## Managing the site day-to-day

Go to `/admin.html`, sign in, and you can:
- Add, edit, deactivate or delete properties (including uploading a photo — this replaces the
  gradient placeholders automatically once a property has an `image_url`).
- View bookings and cancel one if needed.
- View enquiries and mark them responded.

No code changes or redeploys needed for any of that — it's all reading/writing Supabase
directly from the browser.

## Notes

- Prices are in USD; Stripe Checkout is configured for `usd`. Change the `currency` in
  `server/src/routes/bookings.js` if you need something else.
- A `pending` booking (checkout started but not completed) still blocks those dates for other
  guests. Stripe Checkout sessions expire after 24 hours; there's no automatic cleanup of
  stale `pending` rows beyond that — cancel them manually from the admin panel if needed.
- For a `.lk` domain, register at [nic.lk](https://www.nic.lk).
