# GSA — Growth Sales Academy LMS

## Project Overview

Self-hosted Learning Management System (LMS) built with Next.js, PostgreSQL (Prisma), and Docker.

---

## Repository Structure

```
gsa/
├── src/
│   ├── app/                     # Next.js App Router (routes + API)
│   ├── components/              # UI, layout, admin, courses, lesson components
│   ├── lib/                     # Auth (NextAuth) + Prisma client
│   ├── hooks/                   # useToast, useDebounce
│   └── types/                   # Shared TypeScript types
├── prisma/
│   ├── schema.prisma            # PostgreSQL schema
│   ├── seed.ts                  # Admin user seed
│   └── migrations/
└── docker/
    ├── Dockerfile               # Multi-stage Node 20 Alpine build
    ├── Dockerfile.dev           # Development image
    ├── docker-compose.yml       # PostgreSQL + Next.js + Caddy
    └── caddy/Caddyfile          # Reverse proxy (auto-HTTPS)
```

---

## Tech Stack

- **Framework:** Next.js 15 (App Router, standalone output)
- **Auth:** NextAuth.js 4 — JWT sessions, custom credentials provider, bcrypt
- **Database:** PostgreSQL 15 via Prisma ORM
- **Deployment:** Docker Compose (db + app + caddy)
- **Image hosting:** Cloudinary (optional, configured in next.config.js)
- **Node:** 20 Alpine (Docker)

---

## Database Schema

| Model | Purpose |
|---|---|
| `User` | Students and admins (role: ADMIN \| STUDENT) |
| `Course` | Training courses with title, description, price, published flag |
| `Module` | Ordered sections within a course |
| `Lesson` | Individual lessons with video_url, duration, thumbnail. Types: VIDEO, TEXT, FORM, EXAM |
| `Enrollment` | Links users to courses, tracks approval status |
| `LessonProgress` | Tracks completion per lesson per user (score + pass/fail for exams) |
| `LessonNote` | Private notes per lesson per user |
| `FormSubmission` | Stores form lesson submissions per user |
| `ExamAttempt` | Records exam attempts with answers and scoring |

---

## Authentication

- Provider: NextAuth Credentials (email + password)
- Passwords: bcrypt hashed
- Sessions: stateless JWT
- Roles: `ADMIN` and `STUDENT` — enforced via session callbacks

---

## Routes

| Type | Routes |
|---|---|
| Public | `/`, `/login`, `/register`, `/courses`, `/course/[id]` (public preview) |
| Student (auth required) | `/dashboard`, `/dashboard/courses`, `/lesson/[id]` (enrollment required) |
| Admin | `/admin`, `/admin/courses`, `/admin/courses/[id]/builder`, `/admin/users` |

### Public Course Preview

`/course/[id]` is publicly accessible (Coursera-style). Visitors see the full curriculum structure (module names, lesson titles, durations, types) with lock icons, instructor profile, price, and enrollment stats. Lesson content (video_url, content, form_schema, exam_schema) is never exposed — queries use explicit `select` clauses. Unauthenticated users see a "Register to enroll" CTA. Each course page has dynamic SEO metadata (Open Graph).

---

## Leads CRM + Google Calendar Booking

The LMS owns the lead-capture CRM and the Google Calendar booking engine. A separate
**landing** repo (`gsa-landing`, served at `aplica.growthsalessacademy.com`) captures leads and
forwards them here; it has no database. **Google lives entirely in the LMS** (OAuth + encrypted
refresh tokens + event creation) — the landing is stateless.

### Data models (added)
| Model | Purpose |
|---|---|
| `Lead` | Landing-form lead + its booked meeting (`meeting_at`, `meeting_tz_iana`, `meeting_link`, `google_event_id`, `assigned_to`, `status`) |
| `CalendarConnection` | Per-member Google OAuth tokens — **refresh/access encrypted at rest** (AES-256-GCM) |
| `User` (new fields) | `lead_booking_enabled`, `booking_timezone`, `working_hours` — defines the bookable pool |

### Landing → LMS contract (auth: header `x-api-key: $LEADS_API_KEY`)
- `POST /api/leads` — create the lead (status `NUEVO`). Honeypot + enum validation.
- `GET  /api/leads/availability?from&days&tz_iana&duration` — real free/busy slots (RFC3339 in the lead's tz).
- `POST /api/leads/[id]/book {start_at, tz_iana, duration}` — round-robin assign + create the Google event (Meet, lead invited) → `AGENDADO`.
- `PATCH /api/leads/[id]` — manual CRM edit (status / assignment). **Auth = NextAuth session + `canAccessCRM`**, NOT x-api-key.

### How the Google connection works
1. An admin goes to `/admin/leads` → **"Conectar Google Calendar"** → `GET /api/integrations/google/connect` (HMAC-signed `state`, anti-CSRF) → Google consent.
2. `GET /api/integrations/google/callback` exchanges the code, **encrypts** the refresh token with `CALENDAR_TOKEN_ENC_KEY`, upserts the `CalendarConnection`, and sets `lead_booking_enabled = true` (connecting = joining the pool). The post-OAuth redirect base is **`NEXTAUTH_URL`** (behind Caddy, `req.url` is the container's internal `0.0.0.0:3000`).
3. **Scopes:** `calendar.events` (create events) **+** `calendar.freebusy` (availability) + `openid email`. `calendar.events` alone does NOT permit `freebusy.query`.
4. **GCP:** OAuth **Web application** client; consent screen in **Testing** with the members as test users (no verification — note: Testing refresh tokens expire after 7 days; publish the app or use a Workspace "Internal" app for permanence). Authorized redirect URI = `https://growthsalessacademy.com/api/integrations/google/callback`.

### Booking logic (`src/lib/calendar/`)
- `availability.ts` — per-member working hours (in their `booking_timezone`) minus Google free/busy → `duration`-min slots; a slot is offered if ≥1 member is free; output in the lead's tz. DST-correct via `tz.ts` (no luxon, uses `Intl`).
- `assignment.ts` — round-robin: among members free at the slot, pick fewest future meetings, tie-break oldest `assigned_at`.
- `/api/leads/[id]/book` — re-checks free/busy live, **atomic claim** (`updateMany where google_event_id=null`) to prevent double-booking, best-effort orphan-event cleanup on race.
- Layer: `crypto` (token AES-256-GCM), `tz`, `google` (OAuth + events + freebusy), `tokens` (load/refresh/persist), `assignment`, `availability`, `state` (CSRF), `types`.

### Admin CRM
`/admin/leads` (gated `ADMIN`): leads table with status badges, **filter by assignee**, Meet links, and the per-member Google connect card. Sidebar shows a badge with the count of `NUEVO` leads.

---

## Running Locally

```bash
cp .env.example .env
# fill in secrets, then:
cd docker
docker compose up -d
```

First run: run migrations
```bash
docker compose exec app npx prisma migrate deploy
```

---

## Environment Files

- `.env.example` — PostgreSQL + NextAuth + Stripe + Bunny + Resend + Cloudinary + **Leads/Google Calendar**

See the file for required values and descriptions.

Leads/booking vars (also GitHub secrets for CI deploy):
- `LEADS_API_KEY` — shared secret the landing uses to call the LMS.
- `GOOGLE_OAUTH_CLIENT_ID` / `GOOGLE_OAUTH_CLIENT_SECRET` / `GOOGLE_OAUTH_REDIRECT_URI`.
- `CALENDAR_TOKEN_ENC_KEY` — 32-byte base64. **Never rotate in prod** or every saved Google connection becomes undecryptable (members must reconnect).
- `NEXTAUTH_SECRET` — must be a real strong secret (signs NextAuth JWTs **and** the OAuth `state`). Was a placeholder before; now injected from a secret.

---

## Deployment Notes

- **VPS:** Hostinger VPS (Ubuntu)
- **Domain:** Configured via DNS A record pointing to VPS IP
- Caddy handles TLS automatically — update `Caddyfile` with your domain before deploying
- Next.js uses `output: 'standalone'` — optimized Docker image
- PostgreSQL data persists via named volume `gsa_pgdata`
- Production services: `app`, `db`, `caddy` (do NOT start `app-dev` in production)
- Never commit `.env` files — they are git-ignored

### Deploy Steps

```bash
# On VPS
cd /opt
git clone https://github.com/breathego11-bit/gsa.git
cd gsa

# Configure Caddyfile with real domain
# Configure docker-compose.yml environment variables (NEXTAUTH_URL, NEXTAUTH_SECRET, DB password)

cd docker
docker compose up -d --build app db caddy
docker compose exec app npx prisma migrate deploy
```

### Two-repo deployment (LMS + landing)

- **LMS** → `growthsalessacademy.com` (apex). **Landing** → `aplica.growthsalessacademy.com` (separate `gsa-landing` repo, cloned at `/opt/gsa-landing` on the VPS).
- **One Caddy** (this repo) is the single ingress (ports 80/443); it reverse-proxies both `app:3000` and `landing:3000`. The landing joins the **external Docker network `gsa_shared`** that this repo's `docker-compose.yml` defines. Bring the LMS up first (it creates `gsa_shared` + owns TLS), then the landing.
- **CI/CD:** `.github/workflows/ci-deploy.yml` — build job runs `tsc --noEmit` + `next build`, then SSH-deploys to the VPS (`git pull` + writes `.env` from secrets + `docker compose up -d --build app` + `prisma migrate deploy`). Each repo deploys independently on push to `main`.
- **VPS OOM gotcha:** the Docker `next build` ran out of memory on the VPS during type-check. Fix: `next.config.js` skips type-check/lint (`eslint.ignoreDuringBuilds` + `typescript.ignoreBuildErrors` — already validated by CI's `tsc`) and the Dockerfile raises `NODE_OPTIONS=--max-old-space-size`. If it still OOMs, add swap on the VPS.
- **GitHub secrets (LMS repo):** `VPS_HOST/USER/SSH_KEY/PORT` + `LEADS_API_KEY`, `GOOGLE_OAUTH_CLIENT_ID/SECRET`, `CALENDAR_TOKEN_ENC_KEY`, `NEXTAUTH_SECRET`.
- **Prod first-time:** after deploy, each member connects their Google at `/admin/leads` (the prod DB starts with no `CalendarConnection`).
