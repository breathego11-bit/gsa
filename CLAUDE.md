# GSA — Growth Sales Academy LMS

## Project Overview

Self-hosted Learning Management System (LMS) built with Next.js, PostgreSQL (Prisma), and Docker.

---

## Repository Structure

```
growth-sales-academy/
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

## Running Locally

```bash
cd growth-sales-academy
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

- `growth-sales-academy/.env.example` — PostgreSQL + NextAuth + Cloudinary

See the file for required values and descriptions.

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
cd gsa/growth-sales-academy

# Configure Caddyfile with real domain
# Configure docker-compose.yml environment variables (NEXTAUTH_URL, NEXTAUTH_SECRET, DB password)

cd docker
docker compose up -d --build app db caddy
docker compose exec app npx prisma migrate deploy
```
