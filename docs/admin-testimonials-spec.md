# Spec técnico — Vista admin de Testimonios

Status: Pendiente de implementación
Owner: a definir
Última actualización: 2026-04-28

---

## 1. Contexto y objetivo

Los testimonios del landing (sección renderizada por [src/components/landing/TestimonialsSection.tsx](../src/components/landing/TestimonialsSection.tsx) a partir del modelo `Testimonial` en [prisma/schema.prisma](../prisma/schema.prisma)) hoy se gestionan vía **Prisma Studio** o SQL manual. Esto bloquea al cliente para editar testimonios sin asistencia del equipo técnico.

**Objetivo:** dar al rol `ADMIN` una pantalla completa para crear, editar, eliminar, reordenar y publicar/despublicar testimonios, sin tocar la base directamente.

**Out of scope:** rol "manager" intermedio, multi-idioma, analytics de plays. Quedan como follow-ups en §11.

---

## 2. Modelo de datos (sin cambios)

Reutilizar el modelo existente `Testimonial` en [prisma/schema.prisma:208-225](../prisma/schema.prisma#L208-L225):

```prisma
model Testimonial {
  id            String   @id @default(cuid())
  name          String
  role          String?
  metric        String?
  quote         String   @db.Text
  duration      String?
  video_url     String?
  hue           Int?
  poster_bg     String?  @db.Text
  poster_accent String?
  order         Int      @default(0)
  published     Boolean  @default(true)
  created_at    DateTime @default(now())
  updated_at    DateTime @updatedAt

  @@index([published, order])
}
```

No requiere migración. Si después se quiere ligar testimonios a estudiantes existentes, agregar `user_id String? @relation(...)` en una migración separada. Fuera de alcance ahora.

---

## 3. Routes (App Router)

Seguir el patrón establecido en [src/app/admin/courses/](../src/app/admin/courses/) — server component (`page.tsx`) que hace fetch + autorización y delega UI interactiva a `*Client.tsx`.

| Route | Tipo | Propósito |
|---|---|---|
| `/admin/testimonials` | Server | Lista paginada + búsqueda + acciones inline (toggle publish, delete, reorder) |
| `/admin/testimonials/new` | Server | Form de creación |
| `/admin/testimonials/[id]/edit` | Server | Form de edición |

Archivos a crear:
- [src/app/admin/testimonials/page.tsx](../src/app/admin/testimonials/page.tsx)
- [src/app/admin/testimonials/AdminTestimonialsClient.tsx](../src/app/admin/testimonials/AdminTestimonialsClient.tsx)
- [src/app/admin/testimonials/new/page.tsx](../src/app/admin/testimonials/new/page.tsx)
- [src/app/admin/testimonials/[id]/edit/page.tsx](../src/app/admin/testimonials/[id]/edit/page.tsx)
- [src/app/admin/testimonials/TestimonialForm.tsx](../src/app/admin/testimonials/TestimonialForm.tsx) — form compartido new/edit

---

## 4. API endpoints

| Method | Path | Acción | Auth |
|---|---|---|---|
| `POST` | `/api/admin/testimonials` | Crear | ADMIN |
| `PATCH` | `/api/admin/testimonials/[id]` | Editar (full update) | ADMIN |
| `DELETE` | `/api/admin/testimonials/[id]` | Borrar | ADMIN |
| `PATCH` | `/api/admin/testimonials/[id]/publish` | Toggle published | ADMIN |
| `POST` | `/api/admin/testimonials/reorder` | Body: `[{id, order}, ...]` para drag&drop | ADMIN |
| `POST` | `/api/admin/testimonials/upload-video` | Generar credenciales Bunny tus para subir un mp4 | ADMIN |

Reusar el helper [src/lib/bunny.ts:47](../src/lib/bunny.ts#L47) `generateTusUploadCredentials` que ya existe para `Lesson.video_url`. No se duplica lógica de upload.

Archivos:
- [src/app/api/admin/testimonials/route.ts](../src/app/api/admin/testimonials/route.ts) — POST
- [src/app/api/admin/testimonials/[id]/route.ts](../src/app/api/admin/testimonials/[id]/route.ts) — PATCH, DELETE
- [src/app/api/admin/testimonials/[id]/publish/route.ts](../src/app/api/admin/testimonials/[id]/publish/route.ts) — PATCH toggle
- [src/app/api/admin/testimonials/reorder/route.ts](../src/app/api/admin/testimonials/reorder/route.ts) — POST batch
- [src/app/api/admin/testimonials/upload-video/route.ts](../src/app/api/admin/testimonials/upload-video/route.ts) — POST proxy a Bunny

Tras `POST/PATCH/DELETE/reorder` llamar `revalidatePath('/')` para que el landing tome los cambios sin esperar `dynamic = 'force-dynamic'`.

---

## 5. Auth & autorización

Cada API route + server component:
```ts
const session = await getServerSession(authOptions)
if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
if (session.user.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
```

Patrón ya usado en [src/app/api/upload-video/route.ts:7-9](../src/app/api/upload-video/route.ts#L7-L9). El `middleware.ts` ya redirige `/admin/*` a `/login` si no hay sesión, así que las páginas server solo verifican el rol.

---

## 6. UI — Lista (`/admin/testimonials`)

**Layout:** sidebar admin existente ([src/app/admin/layout.tsx](../src/app/admin/layout.tsx)) + main con tabla.

**Columnas:**
- Drag handle (≡)
- Order (Int, sortable)
- Avatar preview (círculo oklch usando `hue`)
- Name + role
- Metric chip
- Quote (truncado a 60 chars)
- Video (ícono ✓ si `video_url`, ✕ si null)
- Published (toggle switch que llama `/publish`)
- Acciones: editar, eliminar (confirmación)

**Búsqueda:** input por `name` y `quote` (server-side, `mode: 'insensitive'` ILIKE).

**Reorder:** `@dnd-kit` (verificar si ya está en `package.json`, si no agregar) sobre las filas. Al soltar, POST a `/reorder` con la lista nueva. Optimistic update + revalidate.

**Empty state:** card glass con copy "Aún no hay testimonios. Crea el primero." + botón → `/admin/testimonials/new`.

---

## 7. UI — Form (`/new` y `/[id]/edit`)

Form compartido en `TestimonialForm.tsx`. Usar `react-hook-form` + `zod` (verificar versiones del repo) o el patrón existente de admin courses (formularios controlados con `useState`).

**Campos:**
| Campo | UI | Validación |
|---|---|---|
| `name` | text | required, max 100 |
| `role` | text | optional, max 120 |
| `metric` | text | optional, max 30, hint "+180% cierres" |
| `quote` | textarea (4 rows) | required, max 500 |
| `duration` | text | optional, regex `^\d+:\d{2}$` (ej. "0:46") |
| `video_url` | upload widget + text fallback | optional |
| `hue` | slider 0-360 + número | optional, 0-360 |
| `poster_bg` | text + preview swatch | optional, default helper "linear-gradient(160deg, #2a3547, #1a1f2e)" |
| `poster_accent` | color picker | optional, hex |
| `order` | number input | required, default = max(order)+1 |
| `published` | switch | default true |

**Live preview:** panel a la derecha (en desktop) que renderiza una `VideoCard` aislada del componente público con los valores del form en tiempo real. Reusar el subcomponente `VideoCard` exportándolo desde [TestimonialsSection.tsx](../src/components/landing/TestimonialsSection.tsx) (extraerlo a un archivo propio si crece).

**Upload widget** (`video_url`):
1. Click "Subir video" → POST a `/api/admin/testimonials/upload-video` que devuelve credenciales tus
2. tus-js-client sube el `.mp4` a Bunny (mismo flujo de [src/components/admin/lesson-builder/](../src/components/admin/lesson-builder/) si existe ya)
3. Al terminar, `video_url` se setea a la URL del CDN de Bunny (`https://iframe.mediadelivery.net/embed/{lib}/{guid}` o el formato de stream)
4. Alternativamente: input de texto plano para pegar una URL externa o ruta local `/testimonio-X.mp4`

---

## 8. Validación (Zod)

Compartido entre cliente y server:
```ts
// src/lib/validators/testimonial.ts
import { z } from 'zod'

export const testimonialSchema = z.object({
  name: z.string().min(1).max(100),
  role: z.string().max(120).nullable().optional(),
  metric: z.string().max(30).nullable().optional(),
  quote: z.string().min(1).max(500),
  duration: z.string().regex(/^\d+:\d{2}$/).nullable().optional(),
  video_url: z.string().nullable().optional(),
  hue: z.number().int().min(0).max(360).nullable().optional(),
  poster_bg: z.string().nullable().optional(),
  poster_accent: z.string().regex(/^#[0-9a-fA-F]{6}$/).nullable().optional(),
  order: z.number().int().min(0).default(0),
  published: z.boolean().default(true),
})
```

API routes parsean con `testimonialSchema.parse(await req.json())`. El form usa `zodResolver`.

---

## 9. Cache & revalidación

[src/app/page.tsx:11](../src/app/page.tsx#L11) tiene `export const dynamic = 'force-dynamic'` → cada hit re-fetcha. Los cambios admin se ven inmediatamente.

Si en el futuro se quita `force-dynamic` para mejorar TTFB, llamar `revalidatePath('/')` en cada mutación de API. Patrón:
```ts
import { revalidatePath } from 'next/cache'
// ... después del prisma.testimonial.create/update/delete
revalidatePath('/')
```

---

## 10. Testing manual checklist

- [ ] Login como ADMIN → ver `/admin/testimonials` con los 3 testimonios seed
- [ ] Crear nuevo: ver aparecer en landing tras refresh
- [ ] Editar: cambios reflejados en landing
- [ ] Toggle published off: desaparece del landing
- [ ] Reorder por drag: el orden en `/` matchea
- [ ] Subir video nuevo vía Bunny: aparece en card con primer frame correcto
- [ ] Borrar: confirma → desaparece de DB y landing
- [ ] Acceso sin login → redirect a `/login`
- [ ] Acceso como STUDENT → 403

---

## 11. Follow-ups (no implementar ahora)

- **Bulk publish/unpublish** desde la lista
- **Multi-idioma**: campos `quote_en`, `quote_es`, etc., con selector
- **Analytics**: contar plays por testimonio (requiere endpoint `/api/track-testimonial-play` + columna `play_count`)
- **Asignar a estudiante real** (`user_id` con relación a User) y autocompletar avatar/name desde el perfil
- **Plantillas de poster_bg**: dropdown con 5-6 gradientes prediseñados en lugar de pegar string libre
- **Fechas de publicación programada** (campo `publish_at: DateTime?`)

---

## 12. Estimación

- API routes + Zod validators: ~3h
- Lista + drag&drop + filtros: ~5h
- Form + live preview: ~5h
- Upload Bunny widget (si se reusa el de lessons): ~2h, si se crea de cero ~6h
- QA + ajustes: ~2h

**Total estimado: 2-3 días de trabajo enfocado**, asumiendo familiaridad con el repo y reuso del Bunny upload.
