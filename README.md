# PS5 Arena — Gaming Lounge Booking Site

A production-ready booking site for a PS5 gaming lounge (₹200/hour, pay at
the lounge, 1–5 hour sessions, free cancellation before start). Fully
serverless, deployed on Vercel, backed by Supabase — everything runs on
free tiers.

## Stack

- **Frontend:** React 18 + Vite, deployed as a static site
- **API:** Vercel Serverless Functions (`/api/*.js`, plain Node — no framework)
- **Database:** Supabase (Postgres), with a DB-level `EXCLUDE` constraint
  making double-booking impossible even under concurrent requests
- **Booking flow:** manual approval — every new booking is created as
  `pending` and blocks the slot immediately; the lounge owner reviews it in
  `/admin` and confirms or rejects it
- **Email:** Gmail SMTP via `nodemailer` (owner notification on every new
  request, customer emails for request-received / confirmed / cancelled,
  each with a signed, expiring cancel link where relevant)
- **Bot/abuse protection:** Cloudflare Turnstile CAPTCHA, a honeypot field,
  and Postgres-backed rate limiting (no extra Redis service needed)
- **Admin:** `/admin`, password-protected, not linked anywhere public

## Project structure

```
├── api/                     # Vercel serverless functions
│   ├── _lib/                # Shared helpers (excluded from routing by Vercel's "_" convention)
│   │   ├── auth.js          # Admin session cookie + constant-time password compare
│   │   ├── bookingRules.js  # Business hours / duration / overlap validation
│   │   ├── cors.js          # CORS + security headers
│   │   ├── email.js         # Gmail SMTP (nodemailer) — owner + customer emails
│   │   ├── games-data.js    # Static game library
│   │   ├── hmac.js          # Signed, expiring token helper (cancel links, sessions)
│   │   ├── rateLimit.js      # Supabase-backed fixed-window rate limiter
│   │   ├── sms.js           # NOT implemented — commented hook for a future paid provider
│   │   ├── supabase.js      # Supabase client (service role — server only)
│   │   └── turnstile.js     # Cloudflare Turnstile server-side verification
│   ├── admin/
│   │   ├── login.js         # POST — admin login
│   │   ├── logout.js        # POST — clear admin session
│   │   ├── bookings.js      # GET  — list bookings (protected)
│   │   └── bookings/[id].js # PATCH — confirm/reject/cancel a booking (protected)
│   ├── availability.js      # GET  — free slots for a given date/duration
│   ├── book.js               # POST — create a pending booking
│   ├── cancel.js              # GET  — customer self-service cancel via signed link
│   └── games.js                # GET  — game library
├── frontend/                # React + Vite app
│   └── src/
│       ├── App.jsx           # Public site
│       ├── AdminApp.jsx      # Admin dashboard (mounted at /admin)
│       └── components/
├── supabase/schema.sql       # Run once in the Supabase SQL editor
├── vercel.json
├── package.json               # API dependencies (@supabase/supabase-js, nodemailer)
└── .env.example
```

## Local development

Local dev uses the Vercel CLI so the serverless functions and the Vite
frontend run together, proxied through one origin (matching production).

```bash
npm install -g vercel        # once
npm install                  # installs API deps (Supabase, nodemailer)
cd frontend && npm install && cd ..
cp .env.example .env         # fill in real values (see checklist below)
vercel dev
```

This serves the whole site (frontend + `/api/*`) on one local URL (Vercel
will print the port, typically `http://localhost:3000`). Set
`PUBLIC_SITE_URL=http://localhost:3000` in `.env` for local testing so CORS
and cancel links work correctly.

## Deploying to Vercel

1. Push this repo to GitHub.
2. In the Vercel dashboard: **Add New → Project → Import Git Repository**,
   select this repo. Vercel auto-detects `vercel.json` (build command,
   output directory, functions) — no manual framework config needed.
3. Before the first deploy, add every environment variable from
   `.env.example` under **Project Settings → Environment Variables**
   (see the full checklist below for where to get each value).
4. Click **Deploy**.
5. Once deployed, set `PUBLIC_SITE_URL` to the real `https://your-site.vercel.app`
   URL Vercel gives you (Project Settings → Environment Variables), then
   redeploy so CORS/cancel-links point at the live domain.

## Deployment checklist — every environment variable

| Variable | Where to get it | Notes |
|---|---|---|
| `SUPABASE_URL` | Supabase project → Settings → API → Project URL | |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase project → Settings → API → `service_role` key | **Secret.** Server-side only, never in frontend code. |
| `GMAIL_USER` | The Gmail address emails are sent from | |
| `GMAIL_APP_PASSWORD` | Google Account → Security → 2-Step Verification → App passwords | **Secret.** Not your normal Gmail password — see setup below. |
| `OWNER_EMAIL` | Your own inbox | Every new (pending) booking is emailed here |
| `TURNSTILE_SECRET_KEY` | [Cloudflare dash](https://dash.cloudflare.com/) → Turnstile → Add site (free) | Secret, server-side |
| `VITE_TURNSTILE_SITE_KEY` | Same Turnstile site → Site Key | Public, safe for the frontend bundle |
| `CANCEL_LINK_SECRET` | Generate: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` | Long random string |
| `ADMIN_PASSWORD` | Choose one | Used at `/admin`, constant-time compared |
| `ADMIN_SESSION_SECRET` | Generate the same way as `CANCEL_LINK_SECRET` (use a **different** value) | Signs the admin session cookie |
| `PUBLIC_SITE_URL` | Your deployed URL, no trailing slash | Used for CORS allow-list + email links |
| `BUSINESS_START_TIME` / `BUSINESS_END_TIME` | Optional, default `10:00`/`22:00` | 24h `HH:mm`, IST |
| `BOOKING_BUFFER_MINUTES` | Optional, default `15` | Gap required between sessions; `0` disables it |

### Supabase setup (free tier)

1. Create a project at [supabase.com](https://supabase.com) (free tier).
2. Open **SQL Editor → New query**, paste the contents of
   `supabase/schema.sql`, and run it. This creates the `bookings` table
   (with the atomic overlap-prevention constraint) and the `rate_limits`
   table + helper function.
3. Copy the Project URL and `service_role` key into your env vars (above).

### Gmail SMTP setup (free)

1. Use (or create) a Gmail account you're happy to send booking emails
   from — this can be your personal account or a dedicated one.
2. Enable **2-Step Verification**: Google Account → **Security** →
   **2-Step Verification** → turn it on (required before app passwords are
   available).
3. Google Account → **Security** → **2-Step Verification** →
   **App passwords** → create one (name it e.g. "PS5 Arena") → copy the
   16-character code into `GMAIL_APP_PASSWORD`.
4. Set `GMAIL_USER` to that Gmail address.
5. Gmail's free sending limit is ~500 emails/day — more than enough for a
   single-lounge booking site.

### Cloudflare Turnstile setup (free)

1. [Cloudflare dashboard](https://dash.cloudflare.com/) → **Turnstile** →
   **Add a site**. Domain = your Vercel domain (and `localhost` for dev).
2. Copy the **Site Key** → `VITE_TURNSTILE_SITE_KEY`, and the **Secret Key**
   → `TURNSTILE_SECRET_KEY`.

### Testing one booking end-to-end

1. Visit your deployed site (or `vercel dev` locally) → **Book now**.
2. Fill the form, solve the Turnstile challenge, pick an available slot,
   select at least one game, and submit.
3. You should land on the confirmation screen: **"Request received —
   pending lounge confirmation"** with a `PS5-XXXXXX` reference.
4. Check `OWNER_EMAIL` inbox for the "New booking request" email with full
   details.
5. If you entered your own email, check that inbox for the "Request
   received" email + cancel link.
6. Visit `/admin`, log in with `ADMIN_PASSWORD`. The booking should appear
   highlighted as **pending** with **Confirm** / **Reject** buttons.
7. Click **Confirm** — the customer should receive a "Booking confirmed"
   email, and the row should update to `confirmed` with a **Cancel**
   button.
8. Click **Cancel** (or use the emailed cancel link) — the customer should
   receive a "Booking cancelled" email, and
   `GET /api/availability?date=...&durationHours=...` should show the slot
   free again (only `cancelled` bookings free up a slot; `pending` and
   `confirmed` both still block it).
9. Try submitting the booking form twice in the same minute more than 5
   times — the 6th should return `429 Too many booking attempts`.

## Security notes

- CORS is restricted to `PUBLIC_SITE_URL` only — no wildcard `*`.
- Rate limiting: 5 req/min/IP on `/api/book`, 30 req/min/IP on
  `/api/availability`, backed by an atomic Postgres upsert (no separate
  Redis service required).
- The hidden `website` field in the booking form is a honeypot; bots that
  fill it get a fake success response instead of a real booking.
- Overlap prevention is enforced by a Postgres `EXCLUDE` constraint, not
  application code — it is correct even under concurrent/racing requests,
  and treats `pending` and `confirmed` bookings identically (both block
  the slot; only `cancelled` frees it).
- `/admin` is not linked from any public page and requires
  `ADMIN_PASSWORD` (constant-time compared) plus a signed, httpOnly,
  `SameSite=Strict` session cookie.
- SMS is intentionally **not implemented** (no reliable free SMS option
  for Indian numbers) — see the commented hook in `api/_lib/sms.js` for
  wiring up a paid provider later.

## Pricing

₹200/hour · 1–5 hours per session · pay at the lounge · free cancellation
before the session starts.
