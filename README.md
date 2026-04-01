# GSA — Growth Sales Academy

Plataforma de cursos (LMS) self-hosted para Growth Sales Academy. Profesores (admins) suben cursos con módulos y lecciones. Los alumnos se registran públicamente, ven previsualizaciones de cursos (estilo Coursera), se inscriben y siguen su progreso.

---

## Características

- Autenticación JWT con NextAuth (email + contraseña)
- Roles: `ADMIN` (profesor) y `STUDENT` (alumno)
- CRUD completo de cursos, módulos y lecciones (solo admins)
- Inscripción de alumnos y seguimiento de progreso por lección
- Notas privadas por lección (auto-guardado)
- Catálogo público de cursos
- Vista previa pública de cursos (estilo Coursera): temario, instructor, duración y precio visibles sin registro. Contenido de lecciones protegido.
- SEO dinámico por curso (Open Graph metadata)
- Exámenes y formularios interactivos
- Panel de administración con estadísticas
- UI profesional paleta navy/negro/blanco

---

## Stack

- **Framework:** Next.js 15 (App Router, Server Components)
- **Auth:** NextAuth.js 4 — JWT + credenciales
- **Base de datos:** PostgreSQL 15 via Prisma ORM
- **Estilos:** Tailwind CSS
- **Infra:** Docker Compose (db + app + caddy)
- **Node:** 20 Alpine (Docker)

---

## Arranque

```bash
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

Los admins **solo se crean vía seed** — no hay registro público de administradores. Para agregar más (máx. 3), editar `prisma/seed.ts`.

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

### Variables de entorno (`.env`)

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
├── src/
│   ├── app/                     # App Router (páginas + API routes)
│   │   ├── (auth)/              # Login, Register
│   │   ├── admin/               # Panel de administrador
│   │   ├── course/[courseId]/   # Detalle de curso
│   │   ├── courses/             # Catálogo público
│   │   ├── dashboard/           # Dashboard del alumno
│   │   ├── lesson/[lessonId]/   # Reproductor de lección
│   │   └── api/                 # API routes (REST)
│   ├── components/
│   │   ├── ui/                  # Button, Card, Input, Modal...
│   │   ├── layout/              # Sidebar, Providers
│   │   ├── admin/               # Modales CRUD del admin
│   │   ├── courses/             # EnrollButton
│   │   ├── lesson/              # MarkCompleteButton, PrivateNotes
│   │   └── video/               # VideoPlaceholder
│   ├── lib/
│   │   ├── auth.ts              # Configuración NextAuth
│   │   └── prisma.ts            # Cliente Prisma singleton
│   ├── hooks/                   # useToast, useDebounce
│   └── types/                   # Tipos TypeScript compartidos
├── prisma/
│   ├── schema.prisma            # Esquema de BD (9 modelos)
│   ├── seed.ts                  # Seed de usuarios admin
│   └── migrations/
├── docker/
│   ├── docker-compose.yml       # PostgreSQL + App + Caddy
│   ├── Dockerfile               # Imagen producción
│   ├── Dockerfile.dev           # Imagen desarrollo
│   └── caddy/Caddyfile          # Reverse proxy + TLS automático
├── public/                      # Assets estáticos
├── package.json
├── tsconfig.json
├── next.config.js
├── postcss.config.js
├── tailwind.config.js
└── .env.example
```

---

## Comandos rápidos

```bash
npm install
npx prisma generate          # Regenerar cliente Prisma
npx prisma migrate dev       # Crear migración nueva
npx prisma migrate deploy    # Aplicar migraciones
npx prisma db seed           # Seed de admins
npx prisma studio            # UI de base de datos
npm run dev                  # Desarrollo (puerto 3000)
npm run build                # Build de producción
```
