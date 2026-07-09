# GSA — Growth Sales Academy LMS

## Project Overview

Self-hosted Learning Management System (LMS) built with Next.js 15, PostgreSQL (Prisma), and Docker.
This is the **main/central repo** of a three-repo ecosystem, all hosted on a single Hostinger VPS
behind one Caddy reverse proxy.

---

## Three-Repo Ecosystem

| Repo | URL | VPS path | Purpose |
|---|---|---|---|
| `gsa` (this repo) | `growthsalessacademy.com` | `/opt/gsa` | LMS + CRM + Google Calendar + DB |
| `gsa-landing` | `aplica.growthsalessacademy.com` | `/opt/gsa-landing` | Stateless lead-capture funnel |
| `gsa-vsl` | `vsl.growthsalessacademy.com` | `/opt/gsa-vsl` | VSL (Video Sales Letter) page |

**Single ingress:** Caddy lives in THIS repo (`docker/caddy/Caddyfile`) and reverse-proxies all
three domains. The LMS must be brought up first — it creates the `gsa_shared` Docker network and
owns TLS. Landing and VSL join that network.

**Rule:** Only the LMS has a database and auth. Landing and VSL are stateless — they call the LMS
API for anything that needs persistence.

```
Internet → Caddy (443/80)
  ├── growthsalessacademy.com      → app:3000        (LMS)
  ├── aplica.growthsalessacademy.com → landing:3000  (gsa-landing)
  └── vsl.growthsalessacademy.com  → vsl:3000        (gsa-vsl)
```

---

## Repository Structure

```
gsa/
├── src/
│   ├── app/                     # Next.js App Router (routes + API)
│   ├── components/              # UI, layout, admin, courses, lesson components
│   ├── lib/                     # Auth (NextAuth) + Prisma client + calendar logic
│   │   └── calendar/            # crypto, tz, google, tokens, availability, assignment, state
│   ├── hooks/                   # useToast, useDebounce
│   └── types/                   # Shared TypeScript types
├── prisma/
│   ├── schema.prisma            # PostgreSQL schema
│   ├── seed.ts                  # Admin user seed
│   └── migrations/
└── docker/
    ├── Dockerfile               # Multi-stage Node 20 Alpine build
    ├── Dockerfile.dev           # Development image
    ├── docker-compose.yml       # PostgreSQL + Next.js + Caddy (+ gsa_shared network)
    └── caddy/Caddyfile          # Single ingress for all three domains (auto-HTTPS)
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
| `Lead` | Lead from landing form + booked meeting data |
| `CalendarConnection` | Per-member Google OAuth tokens (AES-256-GCM encrypted at rest) |
| `Testimonial` | Student testimonials shown on landing page |

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
| Admin | `/admin`, `/admin/courses`, `/admin/courses/[id]/builder`, `/admin/users`, `/admin/leads` |

### Public Course Preview

`/course/[id]` is publicly accessible (Coursera-style). Visitors see the full curriculum structure
(module names, lesson titles, durations, types) with lock icons, instructor profile, price, and
enrollment stats. Lesson content (video_url, content, form_schema, exam_schema) is never exposed —
queries use explicit `select` clauses. Unauthenticated users see a "Register to enroll" CTA. Each
course page has dynamic SEO metadata (Open Graph).

---

## Leads CRM + Google Calendar Booking

The LMS owns the lead-capture CRM and the Google Calendar booking engine. The **landing**
(`gsa-landing`, `aplica.growthsalessacademy.com`) captures leads and forwards them here via API.
It has no database. **Google lives entirely in the LMS** (OAuth + encrypted refresh tokens +
event creation) — the landing is stateless.

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
- `availability.ts` — per-member working hours (in their `booking_timezone`) minus Google free/busy → `duration`-min slots; a slot is offered if ≥1 member is free; output in the lead's tz. DST-correct via `tz.ts` (no luxon, uses `Intl`). Search range padded ±1 day to handle cross-timezone edge cases.
- `assignment.ts` — round-robin: among members free at the slot, pick fewest future meetings, tie-break oldest `assigned_at`.
- `/api/leads/[id]/book` — re-checks free/busy live, **atomic claim** (`updateMany where google_event_id=null`) to prevent double-booking, best-effort orphan-event cleanup on race.
- Layer: `crypto` (token AES-256-GCM), `tz`, `google` (OAuth + events + freebusy), `tokens` (load/refresh/persist), `assignment`, `availability`, `state` (CSRF), `types`.

### Admin CRM
`/admin/leads` (gated `ADMIN`): leads table with status badges, **filter by assignee**, Meet links, and the per-member Google connect card. Sidebar shows a badge with the count of `NUEVO` leads.

---

## GSA Coach AI (planned)

An AI coach that evaluates sales call transcripts against the GSA method. Students paste a call
transcription and the coach gives structured feedback: what was applied correctly, what needs
improvement, score per phase.

**Implementation plan (pending client materials):**
- New sidebar section: `/dashboard/coach`
- API endpoint: `/api/coach/evaluate` — calls OpenAI API with streaming
- Stack: Vercel AI SDK (`streamText`) + `gpt-4o` with client's API key (`OPENAI_API_KEY`)
- System prompt built from: GSA methodology doc + real annotated transcription examples from client
- No DB needed initially (session-only history)

**Pending from client before implementation:**
- Minimum 10 call transcriptions (used to extract GSA methodology patterns)
- Description of what the coach evaluates and how it scores calls
- Export of ChatGPT conversation history where Iván evaluated transcriptions (gold-standard examples)

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

Local dev ports:
- LMS: `http://localhost:3001` (leave :3000 free for gsa-landing)
- DB: `localhost:5433`

---

## Environment Files

- `.env.example` — PostgreSQL + NextAuth + Stripe + Bunny + Resend + Cloudinary + **Leads/Google Calendar**

See the file for required values and descriptions.

Critical vars:
- `LEADS_API_KEY` — shared secret the landing uses to call the LMS.
- `GOOGLE_OAUTH_CLIENT_ID` / `GOOGLE_OAUTH_CLIENT_SECRET` / `GOOGLE_OAUTH_REDIRECT_URI`.
- `CALENDAR_TOKEN_ENC_KEY` — 32-byte base64. **Never rotate in prod** or every saved Google connection becomes undecryptable (members must reconnect).
- `NEXTAUTH_SECRET` — must be a real strong secret (signs NextAuth JWTs **and** the OAuth `state` HMAC anti-CSRF).
- `OPENAI_API_KEY` — for the GSA Coach AI feature (pending implementation).

---

## Deployment Notes

- **VPS:** Hostinger VPS (Ubuntu)
- **Domain:** DNS A records for apex + `aplica` + `vsl` all point to the same VPS IP
- Caddy handles TLS automatically for all three domains — config is in `docker/caddy/Caddyfile`
- Next.js uses `output: 'standalone'` — optimized Docker image
- PostgreSQL data persists via named volume `gsa_pgdata`
- Production services: `app`, `db`, `caddy` (do NOT start `app-dev` in production)
- Never commit `.env` files — they are git-ignored

### CI/CD

`.github/workflows/ci-deploy.yml` — on push to `main`:
1. Build job: `tsc --noEmit` + `next build` (type-check runs in CI, NOT in Docker build to avoid VPS OOM)
2. Deploy job: SSH to VPS → `git fetch origin main && git reset --hard origin/main` → write `.env` from secrets → `docker compose build --no-cache app` → `docker compose up -d app` → `prisma migrate deploy`

**Important:** `git reset --hard` (not `git pull`) makes deploys robust against any local VPS edits that would block a pull.

**VPS OOM gotcha:** Docker `next build` can run out of memory on the VPS. Fix already applied:
- `Dockerfile` sets `NODE_OPTIONS=--max-old-space-size=4096`
- `next.config.js` skips type-check/lint during build (`eslint.ignoreDuringBuilds` + `typescript.ignoreBuildErrors`)

### Three-repo VPS layout

```
/opt/gsa          ← this repo (LMS) — bring up FIRST (creates gsa_shared network + owns TLS)
/opt/gsa-landing  ← landing repo (aplica subdomain)
/opt/gsa-vsl      ← VSL repo (vsl subdomain)
```

All three Docker Compose stacks join the external network `gsa_shared`. Caddy (in the LMS stack)
is the single ingress and routes to each service by hostname.

### First-time VPS setup

```bash
# 1. LMS (creates network + starts Caddy)
cd /opt && git clone https://github.com/breathego11-bit/gsa.git
cd /opt/gsa/docker
docker compose up -d --build app db caddy
docker compose exec app npx prisma migrate deploy

# 2. Landing (joins gsa_shared)
# Clone with PAT (private repo — GitHub no longer accepts passwords):
git clone https://PERSONAL_ACCESS_TOKEN@github.com/joen-ao/gsa-landing.git /opt/gsa-landing
cd /opt/gsa-landing/docker
docker compose up -d --build landing

# 3. VSL (joins gsa_shared)
cd /opt/gsa-vsl/docker
docker compose up -d --build vsl
```

After deploy, each team member connects their Google Calendar at `/admin/leads`
(the prod DB starts with no `CalendarConnection`).

### GitHub Secrets (LMS repo)

| Secret | Purpose |
|---|---|
| `VPS_HOST` | VPS IP address |
| `VPS_USER` | SSH username (usually `root`) |
| `VPS_SSH_KEY` | Private SSH key (with newlines preserved) |
| `VPS_PORT` | SSH port (usually `22`) |
| `NEXTAUTH_SECRET` | Strong random secret — signs JWTs + OAuth state HMAC |
| `LEADS_API_KEY` | Shared secret with landing for API auth |
| `GOOGLE_OAUTH_CLIENT_ID` | GCP Web application OAuth client |
| `GOOGLE_OAUTH_CLIENT_SECRET` | GCP OAuth client secret |
| `CALENDAR_TOKEN_ENC_KEY` | 32-byte base64 — **never rotate in prod** |
| `STRIPE_SECRET_KEY` | Stripe payments |
| `BUNNY_API_KEY` / `BUNNY_LIBRARY_ID` etc. | Bunny CDN for video hosting |
| `RESEND_API_KEY` | Transactional email |
