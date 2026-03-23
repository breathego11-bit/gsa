# Growth Sales Academy - SaaS Architecture Document

## 1. System Overview
Growth Sales Academy is a modern, self-hosted Learning Management System (LMS) designed for high-performance sales training and personal development. The system uses a standard modern web stack (Next.js, NextAuth, Prisma, PostgreSQL) containerized via Docker and served through a Caddy reverse proxy on a Linux VPS.

## 2. Tech Stack Definition
- **Frontend & Backend Framework:** Next.js (App Router recommended for modern architectures, using React Server Components and Route Handlers)
- **Styling:** TailwindCSS + Shadcn/ui (for premium minimal components)
- **Database:** PostgreSQL
- **ORM:** Prisma
- **Authentication:** NextAuth.js (Credentials provider for custom email/password with hashed passwords via bcrypt)
- **Media/Video:** HTML5 Video Player or integrated streaming player wrapper
- **Infrastructure:** Docker Compose (Node.js app, PostgreSQL DB), Caddy (Auto-HTTPS, reverse proxy)

## 3. Database Schema (Prisma)
Below is the clean, normalized schema outlining the MVP entities.

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

enum Role {
  ADMIN
  STUDENT
}

model User {
  id            String    @id @default(cuid())
  name          String
  last_name     String
  username      String    @unique
  phone         String?
  email         String    @unique
  password      String    // Hashed with bcrypt
  profile_image String?
  role          Role      @default(STUDENT)
  created_at    DateTime  @default(now())
  updated_at    DateTime  @updatedAt

  enrollments   Enrollment[]
  progress      LessonProgress[]
  notes         LessonNote[]
}

model Course {
  id          String    @id @default(cuid())
  title       String
  description String    @db.Text
  thumbnail   String?
  hero_image  String?
  price       Float?    // For future billing, optional for now
  published   Boolean   @default(false)
  created_at  DateTime  @default(now())
  updated_at  DateTime  @updatedAt

  modules     Module[]
  enrollments Enrollment[]
}

model Module {
  id          String   @id @default(cuid())
  course_id   String
  title       String
  order       Int
  created_at  DateTime @default(now())
  updated_at  DateTime @updatedAt

  course      Course   @relation(fields: [course_id], references: [id], onDelete: Cascade)
  lessons     Lesson[]
}

model Lesson {
  id          String   @id @default(cuid())
  module_id   String
  title       String
  description String?  @db.Text
  video_url   String
  thumbnail   String?
  order       Int
  duration    Int?     // In seconds
  created_at  DateTime @default(now())
  updated_at  DateTime @updatedAt

  module      Module   @relation(fields: [module_id], references: [id], onDelete: Cascade)
  progress    LessonProgress[]
  notes       LessonNote[]
}

model Enrollment {
  id          String   @id @default(cuid())
  user_id     String
  course_id   String
  created_at  DateTime @default(now())

  user        User     @relation(fields: [user_id], references: [id], onDelete: Cascade)
  course      Course   @relation(fields: [course_id], references: [id], onDelete: Cascade)
  
  @@unique([user_id, course_id])
}

model LessonProgress {
  id           String    @id @default(cuid())
  user_id      String
  lesson_id    String
  completed    Boolean   @default(false)
  completed_at DateTime?

  user         User     @relation(fields: [user_id], references: [id], onDelete: Cascade)
  lesson       Lesson   @relation(fields: [lesson_id], references: [id], onDelete: Cascade)

  @@unique([user_id, lesson_id])
}

model LessonNote {
  id          String   @id @default(cuid())
  user_id     String
  lesson_id   String
  content     String   @db.Text
  created_at  DateTime @default(now())
  updated_at  DateTime @updatedAt

  user        User     @relation(fields: [user_id], references: [id], onDelete: Cascade)
  lesson      Lesson   @relation(fields: [lesson_id], references: [id], onDelete: Cascade)
}
```

## 4. Architectural Folder Structure (Next.js)
The project will use a feature-driven or layered structure inside `src/`.

```
/
├── prisma/
│   └── schema.prisma         # Database schema
├── docker-compose.yml        # Docker composition (DB, App, Caddy)
├── Dockerfile                # Next.js application container blueprint
├── Caddyfile                 # Auto SSL & Reverse Proxy config
├── src/
│   ├── app/                  # Next.js App Router (Frontend Routes & API)
│   │   ├── (auth)/           # Route group for login/register
│   │   │   ├── login/page.tsx
│   │   │   └── register/page.tsx
│   │   ├── (dashboard)/      # Protected Route group for students
│   │   │   ├── layout.tsx    # Sidebar/Header layout
│   │   │   ├── dashboard/page.tsx
│   │   │   ├── courses/[courseId]/page.tsx
│   │   │   ├── courses/[courseId]/lessons/[lessonId]/page.tsx
│   │   │   └── profile/page.tsx
│   │   ├── (admin)/          # Protected Admin group
│   │   │   ├── admin/layout.tsx
│   │   │   ├── admin/dashboard/page.tsx
│   │   │   ├── admin/courses/page.tsx
│   │   │   ├── admin/users/page.tsx
│   │   │   └── ...
│   │   ├── api/              # Backend API Routes
│   │   │   ├── auth/[...nextauth]/route.ts
│   │   │   ├── courses/route.ts
│   │   │   ├── users/route.ts
│   │   │   ├── notes/route.ts
│   │   │   └── upload/route.ts
│   │   └── page.tsx          # Public Landing Page
│   ├── components/
│   │   ├── ui/               # Reusable UI components (Buttons, Inputs, Cards)
│   │   ├── layout/           # Navbar, Sidebar, Footers
│   │   ├── video/            # Custom Video Player component
│   │   ├── dashboard/        # Circular progress indicators, course cards
│   │   └── notes/            # Private notes editor component
│   ├── lib/                  # Utilities, DB Connection, Auth config
│   │   ├── prisma.ts         # Singleton Prisma client
│   │   └── auth.ts           # NextAuth configuration options
│   └── middleware.ts         # Route protection logic (Admin vs Student)
```

## 5. Frontend Route Definitions
### *Public Routes*
- `/` - **Landing Page**: Premium hero section, program info, layout split with embedded login/register card.
- `/login` - Custom layout for login.
- `/register` - Registration form w/ uniqueness validation for username/email.

### *Student Protected Routes (`/dashboard` equivalent)*
- `/dashboard` - Overview, enrolled courses, last lesson continued, circular progress per course.
- `/courses/[courseId]` - Course details, thumbnail, module accordion, lesson list w/ completion checks.
- `/courses/[courseId]/lessons/[lessonId]` - **Lesson Player System.**
  - Left/Main pane: Video Player, Title, Description, Prev/Next buttons, Complete button.
  - Right pane or Tab: **Private Notes** (CRUD via API, tied to user + lesson).
- `/profile` - Profile settings (Update name, avatar, username, password).

### *Admin Protected Routes (`/admin`)*
- `/admin` - Overall stats.
- `/admin/courses` - Course CRUD.
- `/admin/courses/[id]/builder` - Drag-and-drop or ordered list approach for Modules & Lessons. Image upload integration.
- `/admin/users` - Table of students with search.
- `/admin/users/[userId]` - View student progress.

## 6. Backend API Structure
Using Next.js Route Handlers (`app/api/...`), all secured via NextAuth session verification.

- **Auth**
  - `POST /api/auth/register` - Validate request, hash password, check unique constraints, create `User`.
- **Courses**
  - `GET /api/courses` - Fetch published courses (Student) or All courses (Admin).
  - `GET /api/courses/[id]` - Get course details + modules + lessons.
  - `POST /api/courses` (Admin) - Create new course.
  - `PATCH /api/courses/[id]` (Admin) - Update course metadata.
- **Content Management (Admin)**
  - `POST /api/modules`, `PATCH /api/modules/[id]`, `DELETE /api/modules/[id]`
  - `POST /api/lessons`, `PATCH /api/lessons/[id]`, `DELETE /api/lessons/[id]`
- **Progress Tracking**
  - `POST /api/progress/toggle` - Mark lesson as complete/incomplete. Re-calculate overall course completion percentage.
  - `GET /api/progress?courseId=123` - Get completion map for student UI.
- **Notes System**
  - `GET /api/notes?lessonId=XYZ` - Fetch student's note for a specific lesson.
  - `POST/PATCH /api/notes` - Upsert private notes for the session user.
- **User Profile**
  - `PATCH /api/users/profile` - Update own details. Ensure username uniqueness checks.

## 7. Deployment Structure & Infrastructure
The system targets a Linux VPS instance.

### `docker-compose.yml` Architecture
- **Service: `db`**
  - Image: `postgres:15-alpine`
  - Volumes: Persistent data mount for DB storage. Ensure it doesn't wipe on restart.
- **Service: `app`**
  - Build: Uses `Dockerfile`. Multistage build optimizing Next.js standalone output.
  - Environment: `DATABASE_URL`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL` passed securely.
  - Port: `3000` (internal).
- **Service: `caddy`**
  - Image: `caddy:latest`
  - Ports: `80`, `443` (Exposed to public web).
  - Volumes: `Caddyfile` bind mount and certificates mount.
  - Function: Automatically manages Let's Encrypt SSL and proxies traffic to the `app` container.

### `Dockerfile` Optimization
Next.js should be built using the `output: 'standalone'` configuration in `next.config.js` to minimize the container size.

### Storage Context
Course images and thumbnails will need to be stored efficiently. In a self-hosted MVP setup, Docker volumes mapping a `/public/uploads` folder can be used, alongside an API route handling `multipart/form-data` uploads, serving images statically.

## 8. Development & Implementation Phases (Action Plan)
1. **Init:** Scaffold Next.js app, install TailwindCSS + Shadcn/ui.
2. **Database:** Initialize Prisma, push schema to a local Postgres, generate types.
3. **Auth:** Setup NextAuth credentials provider, implement Register/Login UI, handle JWT persistence.
4. **Landing & Profile:** Build out root page and user profile editing.
5. **Admin Hub:** Build Admin CRUD for Courses, Modules, Lessons, and image uploading.
6. **Student Hub:** Build Dashboard course grid, progress calculation logic, and the Lesson Player view.
7. **Interactivity:** Add Private Notes API and visual completion indicators.
8. **Deployment:** Write `Dockerfile`, `docker-compose.yml`, `Caddyfile`. Deploy to VPS.
