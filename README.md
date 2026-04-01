# GSA — Growth Sales Academy

Repositorio monorepo que contiene **dos aplicaciones** independientes para el ecosistema de Growth Sales Academy.

---

## Aplicaciones

| App | Directorio | Stack | Puerto |
|---|---|---|---|
| **Sales OS** | `sales-os/` | Vite + React 19, Airtable, Supabase | 5173 |
| **LMS Academy** | `growth-sales-academy/` | Next.js 15, PostgreSQL, Prisma | 3000 |

---

## 1. Sales OS

Dashboard de operaciones de ventas. Integra el CRM de Airtable y Supabase para gestión de leads, closers, pagos y llamadas.

### Características
- Kanban de pipeline de leads
- Dashboard de closers con comisiones (tiers: 9% / 11% / 13%)
- Panel de setter y manager
- AI Coach (vía Supabase Edge Functions)
- Módulo de academia integrado
- Fallback a mock data cuando no hay credenciales de Airtable

### Stack
- **Framework:** React 19 + Vite 7
- **Routing:** React Router 7
- **Estilos:** TailwindCSS 4
- **CRM:** Airtable
- **Backend:** Supabase (auth + edge functions)
- **Charts:** Recharts

### Arranque

```bash
# Variables de entorno
cp sales-os/.env.example sales-os/.env
# Llenar con claves de Airtable y Supabase

# Instalar e iniciar (desde la raíz)
npm install
npm run dev
```

### Variables de entorno (`sales-os/.env`)

| Variable | Descripción |
|---|---|
| `VITE_AIRTABLE_API_KEY` | API Key de Airtable |
| `VITE_AIRTABLE_BASE_ID` | ID de la base de Airtable |
| `VITE_SUPABASE_URL` | URL del proyecto Supabase |
| `VITE_SUPABASE_ANON_KEY` | Anon key de Supabase |

> Sin estas variables la app funciona con **mock data** — seguro para desarrollo local.

### Tablas de Airtable

| Tabla | Uso |
|---|---|
| `CLOSERS` | Estado de certificación y comisiones |
| `LEADS` | Pipeline de leads |
| `PAGOS` | Registros de pagos |
| `LLAMADAS` | Logs de llamadas |

---

## 2. Growth Sales Academy — LMS

Plataforma de cursos interna. Profesores (admins) suben cursos con módulos y lecciones. Los alumnos se registran públicamente, se inscriben y siguen su progreso.

### Características
- Autenticación JWT con NextAuth (email + contraseña)
- Roles: `ADMIN` (profesor) y `STUDENT` (alumno)
- CRUD completo de cursos, módulos y lecciones (solo admins)
- Inscripción de alumnos y seguimiento de progreso por lección
- Notas privadas por lección (auto-guardado)
- Catálogo público de cursos
- Vista previa pública de cursos (estilo Coursera): temario, instructor, duración y precio visibles sin registro. Contenido de lecciones protegido.
- SEO dinámico por curso (Open Graph metadata)
- Panel de administración con estadísticas
- UI profesional paleta navy/negro/blanco

### Stack
- **Framework:** Next.js 15 (App Router, Server Components)
- **Auth:** NextAuth.js 4 — JWT + credenciales
- **Base de datos:** PostgreSQL 15 via Prisma ORM
- **Estilos:** Tailwind CSS 3
- **Infra:** Docker Compose (db + app + caddy)

### Arranque

```bash
cd growth-sales-academy

# Variables de entorno
cp .env.example .env
# Editar .env si es necesario

# Levantar base de datos
cd docker && docker compose up -d db && cd ..

# Instalar dependencias
npm install

# Migraciones y seed
npx prisma migrate deploy
npx prisma db seed

# Correr app
npm run dev
```

App en `http://localhost:3000`

> **Nota:** El DB corre en el puerto **5433** del host para evitar conflictos con instalaciones nativas de PostgreSQL.

### Usuario Admin

| Campo | Valor |
|---|---|
| Email | `admin@gsa.com` |
| Contraseña | `Admin@GSA2024!` |
| Rol | `ADMIN` |

Los admins **solo se crean vía seed** — no hay registro público de administradores. Para agregar más (máx. 3), editar `growth-sales-academy/prisma/seed.ts`.

### Rutas del LMS

| Ruta | Acceso | Descripción |
|---|---|---|
| `/` | Público | Landing page |
| `/courses` | Público | Catálogo de cursos |
| `/login` | Público | Inicio de sesión |
| `/register` | Público | Registro de alumnos |
| `/dashboard` | Alumno | Mis cursos y progreso |
| `/course/[id]` | Público | Vista previa del curso (temario, instructor, precio). Inscripción requiere registro |
| `/lesson/[id]` | Alumno inscrito | Reproductor de lección |
| `/admin` | Admin | Estadísticas generales |
| `/admin/courses` | Admin | CRUD de cursos |
| `/admin/modules` | Admin | CRUD de módulos |
| `/admin/lessons` | Admin | CRUD de lecciones |
| `/admin/students` | Admin | Lista de estudiantes |

### Variables de entorno (`growth-sales-academy/.env`)

| Variable | Descripción |
|---|---|
| `DATABASE_URL` | Cadena de conexión PostgreSQL |
| `NEXTAUTH_URL` | URL base de la app |
| `NEXTAUTH_SECRET` | Secreto JWT — `openssl rand -base64 32` |
| `ADMIN_SEED_PASSWORD` | Contraseña del seed de admins (opcional) |

---

## Estructura del repositorio

```
gsa/
├── sales-os/                        # App Sales OS (Vite/React)
│   ├── src/
│   │   ├── components/              # Componentes reutilizables
│   │   ├── pages/                   # Vistas principales
│   │   │   ├── Dashboard.jsx
│   │   │   ├── Pipeline.jsx
│   │   │   ├── AICoach.jsx
│   │   │   ├── Training.jsx
│   │   │   └── academy/
│   │   ├── services/
│   │   │   ├── airtableService.js   # Integración Airtable
│   │   │   └── supabaseClient.js    # Cliente Supabase
│   │   └── context/
│   ├── supabase/
│   │   └── functions/               # Edge Functions (AI Coach)
│   └── .env.example
│
├── growth-sales-academy/            # LMS (Next.js)
│   ├── src/
│   │   ├── app/                     # App Router (páginas + API routes)
│   │   │   ├── (auth)/              # Login, Register
│   │   │   ├── admin/               # Panel de administrador
│   │   │   ├── course/[courseId]/   # Detalle de curso
│   │   │   ├── courses/             # Catálogo público
│   │   │   ├── dashboard/           # Dashboard del alumno
│   │   │   ├── lesson/[lessonId]/   # Reproductor de lección
│   │   │   └── api/                 # API routes (REST)
│   │   ├── components/
│   │   │   ├── ui/                  # Button, Card, Input, Modal...
│   │   │   ├── layout/              # Sidebar, Providers
│   │   │   ├── admin/               # Modales CRUD del admin
│   │   │   ├── courses/             # EnrollButton
│   │   │   ├── lesson/              # MarkCompleteButton, PrivateNotes
│   │   │   └── video/               # VideoPlaceholder
│   │   ├── lib/
│   │   │   ├── auth.ts              # Configuración NextAuth
│   │   │   └── prisma.ts            # Cliente Prisma singleton
│   │   ├── hooks/                   # useToast, useDebounce
│   │   └── types/                   # Tipos TypeScript compartidos
│   ├── prisma/
│   │   ├── schema.prisma            # Esquema de BD (7 modelos)
│   │   ├── seed.ts                  # Seed de usuarios admin
│   │   └── migrations/
│   ├── docker/
│   │   ├── docker-compose.yml       # PostgreSQL + App + Caddy
│   │   ├── Dockerfile               # Imagen producción
│   │   ├── Dockerfile.dev           # Imagen desarrollo
│   │   └── caddy/Caddyfile          # Reverse proxy + TLS automático
│   └── .env.example
│
├── CLAUDE.md                        # Instrucciones para AI agents
├── GSA_Architecture.md              # Referencia de arquitectura
└── README.md                        # Este archivo
```

---

## Comandos rápidos

### Sales OS
```bash
npm install          # Instalar dependencias
npm run dev          # Desarrollo (puerto 5173)
npm run build        # Build de producción
```

### LMS
```bash
cd growth-sales-academy
npm install
npx prisma generate          # Regenerar cliente Prisma
npx prisma migrate dev       # Crear migración nueva
npx prisma migrate deploy    # Aplicar migraciones
npx prisma db seed           # Seed de admins
npx prisma studio            # UI de base de datos
npm run dev                  # Desarrollo (puerto 3000)
npm run build                # Build de producción
```
