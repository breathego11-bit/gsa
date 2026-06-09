# Closers — Spec Técnico

## Contexto

Hoy el sistema sólo distingue entre `ADMIN` y `STUDENT`, con un boolean `closer_enabled` que da/quita acceso al CRM de ventas a un estudiante puntual. El cliente quiere formalizar el rol de "Closer" con dos variantes:

- **CRM-only**: usa el CRM + Método. **Sin acceso a la formación** (cursos / lecciones).
- **CRM + Formación**: usa el CRM + Método + **todos los cursos publicados** de la academia.

Cualquiera de los dos puede entrar **gratis** (complimentary) o **pagando** (igual que un estudiante). El sistema actual de invitaciones (pre-pagado externamente, URL única) debe extenderse para crear closers directamente con la configuración correcta en un solo paso, sin que el admin tenga que tocarlos manualmente después.

## Decisiones clave (cerradas con el cliente)

1. **Método para todos**: cualquiera autenticado lo ve, incluidos CRM-only closers.
2. **Acceso a cursos automático** para CRM + Formación: ven **todos los cursos publicados** dinámicamente — sin necesidad de `Enrollment` individual ni de auto-crearlos al redimir la invitación. Si más adelante se publica un curso nuevo, lo ven automáticamente.
3. **Gratis vs pago**: nuevo valor en `payment_status` → `complimentary` (regalado). Distingue contablemente de un `active` pagado, pero a efectos de permisos cuenta como activo.
4. **Promoción**: un closer puede subir de CRM-only a CRM+Formación con un toggle del admin. Sin histórico de cambios (no es requirement).
5. **`closer_enabled` se mantiene** como master switch de elegibilidad. `closer_type` es la subdivisión dentro de "es closer". Si `closer_enabled = false`, no es closer (y `closer_type` debe ser null).

## Modelo de datos

### Schema

```prisma
enum CloserType {
  CRM_ONLY
  CRM_AND_COURSES
}

model User {
  // ... existente
  closer_enabled Boolean    @default(false)   // SE MANTIENE — master switch
  closer_type    CloserType?                  // nuevo — sub-tipo cuando enabled = true
  // payment_status: ahora acepta también 'complimentary'
  // (sigue siendo String, sin enum, para no romper código existente)
}

model Invitation {
  // ... existente
  closer_type    CloserType?  // null = invitación de estudiante regular
  is_free        Boolean      @default(false)  // true = no genera Payment records
}
```

### Reglas de integridad

- Si `User.closer_enabled = false` → `User.closer_type` debe ser `null` (enforced en la API de toggle del admin).
- Si `User.closer_enabled = true` → `closer_type` puede ser null transitoriamente (admin acaba de activar pero no eligió tipo), pero la UI siempre obliga a elegir uno al guardar.
- `payment_status` válidos: `none | active | past_due | cancelled | complimentary` (no se enforza con CHECK constraint para no migrar enum; se valida en el código).

### Matriz resultante

| `role` | `closer_enabled` | `closer_type` | `payment_status` | Quién es |
|---|---|---|---|---|
| STUDENT | false | null | active | Alumno regular (estado actual) |
| STUDENT | true | CRM_ONLY | complimentary | Closer externo gratis (sólo CRM + Método) |
| STUDENT | true | CRM_ONLY | active | Closer externo que paga (raro pero válido) |
| STUDENT | true | CRM_AND_COURSES | active | Alumno-closer típico (paga y vende) |
| STUDENT | true | CRM_AND_COURSES | complimentary | Closer del equipo con beca completa |
| ADMIN | — | — | — | Admin |

## Helpers de acceso (single source of truth)

**Nuevo archivo**: [src/lib/access.ts](src/lib/access.ts)

```ts
type AccessUser = Pick<User, 'role' | 'closer_enabled' | 'closer_type' | 'payment_status'>

export function hasActivePayment(u: AccessUser): boolean {
    return u.payment_status === 'active' || u.payment_status === 'complimentary'
}

export function isCloser(u: AccessUser): boolean {
    return u.closer_enabled && u.closer_type !== null
}

export function canAccessCRM(u: AccessUser): boolean {
    return u.role === 'ADMIN' || isCloser(u)
}

/** Closers CRM+Formación ven todos los cursos publicados; estudiantes regulares
 *  necesitan Enrollment (la lógica que ya existe sigue funcionando). */
export function hasUniversalCourseAccess(u: AccessUser): boolean {
    return u.role === 'ADMIN' || u.closer_type === 'CRM_AND_COURSES'
}

export function canAccessMethod(_u: AccessUser): boolean {
    return true  // todos los autenticados
}
```

JWT/session callback ([src/lib/auth.ts](src/lib/auth.ts)) — ya refresca campos dinámicos desde DB en cada request. Hay que **añadir `closer_type` y `payment_status='complimentary'` al token** para que el cliente y el sidebar lo lean sin re-fetch.

## Sidebars y gating

| Sección | STUDENT puro | CRM_ONLY | CRM_AND_COURSES | ADMIN |
|---|---|---|---|---|
| Dashboard / Cursos / Lecciones | ✅ | ❌ | ✅ | ✅ |
| Método | ✅ | ✅ | ✅ | ✅ |
| Ventas (CRM) | ❌ | ✅ | ✅ | ✅ |
| Admin (Studs, Settings, etc.) | ❌ | ❌ | ❌ | ✅ |

**Archivos a tocar**:
- [Sidebar.tsx](src/components/layout/Sidebar.tsx) y [MobileSidebar.tsx](src/components/layout/MobileSidebar.tsx): aceptan ya prop `closerEnabled`. Cambiar a aceptar el objeto user (o `closerType`) y aplicar la matriz.
- [dashboard/layout.tsx](src/app/dashboard/layout.tsx) y [admin/layout.tsx](src/app/admin/layout.tsx): pasan el campo nuevo.
- Lesson page ([lesson/[lessonId]/page.tsx](src/app/lesson/[lessonId]/page.tsx)): el check actual de `enrollment` debe extenderse con `|| hasUniversalCourseAccess(user)`.
- Course detail ([course/[id]](src/app/course/[id]), [dashboard/courses/[id]](src/app/dashboard/courses/[id])): mismo cambio en los gates.

## Flujo de invitación extendido

### Admin crea invitación

**Endpoint**: [POST /api/admin/invitations](src/app/api/admin/invitations/route.ts) — extender el body con:
- `closer_type: CloserType | null` (default null = estudiante regular)
- `is_free: boolean` (default false)

**Validaciones**:
- Si `is_free === true`: `payment_type` y `amount_paid` se ignoran (se setean a `null` y `0` internamente). `installments` también ignorado.
- Si `closer_type === 'CRM_ONLY'` y `is_free === false`: válido, pero raro (usualmente serán gratis).
- Si `closer_type === null` (invitación de estudiante): comportamiento actual sin cambios.

**UI** ([CreateInvitationModal.tsx](src/components/admin/CreateInvitationModal.tsx) — necesito verificar nombre exacto):
- Sección nueva "Tipo de usuario": radio con 3 opciones:
  - Estudiante regular
  - Closer · CRM only
  - Closer · CRM + Formación
- Sección "Pago": añadir opción "Gratis" como primer toggle. Cuando "Gratis" está activo, oculta los campos de monto/cuotas.

### Usuario redime

[POST /api/auth/register](src/app/api/auth/register/route.ts) ya valida `invite`. Hay que añadir:

```ts
// Después de crear el User:
const userData: any = {
    name, last_name, username, email, phone,
    password: hashedPassword,
    role: 'STUDENT',
    payment_status: invitation
        ? (invitation.is_free ? 'complimentary' : 'active')
        : 'none',
    closer_enabled: invitation?.closer_type !== null && invitation?.closer_type !== undefined,
    closer_type: invitation?.closer_type ?? null,
}
```

**No** se crea Enrollment al redimir un invite de CRM_AND_COURSES — el acceso se da dinámicamente via `hasUniversalCourseAccess`.

**Solo** se crean `Payment` records si `is_free === false` (mantiene la lógica existente para invitaciones pagadas).

## Admin UI — toggle de tipo de closer

[StudentDetailClient.tsx](src/app/admin/students/[id]/StudentDetailClient.tsx):

El toggle actual "Habilitar como closer" sigue siendo el master. Cuando está ON, aparece debajo un **selector de tipo** (radio o select):
- `CRM only`
- `CRM + Formación`

Cambios en el endpoint [/api/admin/students/[id]/closer](src/app/api/admin/students/[id]/closer/route.ts):
- Body extendido: `{ closer_enabled: boolean, closer_type?: CloserType }`
- Si `closer_enabled = false` → setea `closer_type = null` automáticamente.
- Si `closer_enabled = true` → `closer_type` es requerido (default 'CRM_ONLY' si no se manda).

## Migración de usuarios existentes

Migración Prisma `add_closer_type_and_complimentary`:

```sql
CREATE TYPE "CloserType" AS ENUM ('CRM_ONLY', 'CRM_AND_COURSES');

ALTER TABLE "User" ADD COLUMN "closer_type" "CloserType";

-- Backfill: usuarios con closer_enabled = true asumimos CRM + Formación
-- (porque hoy todos los closers existentes son alumnos que también ven sus cursos)
UPDATE "User" SET "closer_type" = 'CRM_AND_COURSES' WHERE "closer_enabled" = true;

ALTER TABLE "Invitation"
    ADD COLUMN "closer_type" "CloserType",
    ADD COLUMN "is_free" BOOLEAN NOT NULL DEFAULT false;
```

No se migra `payment_status` — `'complimentary'` simplemente entra como valor válido nuevo desde el código.

## Archivos a crear / modificar

**Crear**:
- [prisma/migrations/<ts>_add_closer_type_and_complimentary/migration.sql](prisma/migrations)
- [src/lib/access.ts](src/lib/access.ts) — helpers

**Modificar (schema-side)**:
- [prisma/schema.prisma](prisma/schema.prisma) — enum + columnas

**Modificar (backend)**:
- [src/lib/auth.ts](src/lib/auth.ts) — JWT propaga `closer_type` + `payment_status`
- [src/types/next-auth.d.ts](src/types/next-auth.d.ts) — tipos del session
- [src/app/api/auth/register/route.ts](src/app/api/auth/register/route.ts) — lógica de redemption extendida
- [src/app/api/admin/invitations/route.ts](src/app/api/admin/invitations/route.ts) — POST acepta `closer_type` + `is_free`
- [src/app/api/admin/students/[id]/closer/route.ts](src/app/api/admin/students/[id]/closer/route.ts) — body extendido con `closer_type`
- [src/app/lesson/[lessonId]/page.tsx](src/app/lesson/[lessonId]/page.tsx) — gate de acceso
- [src/app/dashboard/courses/[id]/page.tsx](src/app/dashboard/courses/[id]/page.tsx) — gate de enrollment
- [src/app/course/[id]/page.tsx](src/app/course/[id]/page.tsx) — preview público (si hay gate aquí)
- [src/middleware.ts](src/middleware.ts) — si tiene gates basados en rol

**Modificar (frontend)**:
- [src/components/layout/Sidebar.tsx](src/components/layout/Sidebar.tsx)
- [src/components/layout/MobileSidebar.tsx](src/components/layout/MobileSidebar.tsx)
- [src/app/dashboard/layout.tsx](src/app/dashboard/layout.tsx) — pasa el closer_type al sidebar
- [src/app/admin/layout.tsx](src/app/admin/layout.tsx) — idem
- [src/components/admin/CreateInvitationModal.tsx](src/components/admin/) — UI nueva (3 tipos + toggle gratis)
- [StudentDetailClient.tsx](src/app/admin/students/[id]/StudentDetailClient.tsx) — toggle de tipo cuando enabled = ON

**NO se toca**:
- `Enrollment` model — sigue siendo la única vía de acceso para estudiantes regulares. Los CRM+Formación closers cortan por otro camino (helper) sin tocar la tabla.
- `closer_enabled` se mantiene como columna.
- Layouts visuales — sólo cambia qué items renderizan los sidebars según los nuevos permisos.

## Fases sugeridas

| Fase | Alcance | Tiempo estimado |
|---|---|---|
| **1. Schema + access helpers + JWT** | Migración con CloserType + helpers + tipos session. Cambios mínimos en código existente para usar helpers donde se chequeaba closer_enabled o enrollment. | ~3h |
| **2. Sidebars + route gating** | Aplicar matriz de permisos. Reemplazar checks de `closer_enabled` por `canAccessCRM`. Lesson/course gates con `hasUniversalCourseAccess`. | ~2h |
| **3. Invitaciones extendidas** | UI del modal (3 tipos + toggle gratis) + endpoint POST + redemption logic en /api/auth/register. | ~3h |
| **4. Admin UI del estudiante** | Selector de tipo en StudentDetailClient + endpoint /closer extendido. | ~1.5h |
| **5. Testing + verificación** | E2E manual de los 5 casos de la matriz, regresión de estudiante regular y closer existente. | ~1h |

Total estimado: **~10-11h**.

## Verificación

1. **Backfill correcto**: tras aplicar migración, todos los `User` con `closer_enabled = true` quedan con `closer_type = 'CRM_AND_COURSES'`. Verificar contra producción con un SELECT antes de hacer push.
2. **Estudiante regular** (no closer): ve Dashboard + Cursos + Método. NO ve Ventas.
3. **CRM_ONLY** (gratis): ve Ventas + Método. NO ve Dashboard ni Cursos. Si va manualmente a `/lesson/X`, redirect.
4. **CRM_AND_COURSES** (gratis): ve TODO menos sección Admin. Entra a un curso al que NUNCA estuvo enrolled → tiene acceso (acceso universal por tipo).
5. **CRM_AND_COURSES** (pago): mismo que (4) + sus Payment records existen.
6. **Closer existente** (pre-migración): se comporta igual que antes (es CRM_AND_COURSES por backfill).
7. **Invitación CRM_ONLY gratis**: admin crea invitación → redime → usuario nuevo nace con `payment_status = 'complimentary'`, `closer_type = 'CRM_ONLY'`, sin Payment records.
8. **Invitación CRM_AND_COURSES con cuotas**: usuario nace con `payment_status = 'active'`, `closer_type = 'CRM_AND_COURSES'`, Payment de la cuota inicial + Payments pendientes creados.
9. **Promoción CRM_ONLY → CRM_AND_COURSES**: admin cambia el selector → al recargar dashboard ve los cursos sin haberse enrollado.
10. **Bajada a no-closer**: admin pone `closer_enabled = false` → `closer_type` se borra automáticamente. Sidebar de Ventas desaparece.
11. **`npx tsc --noEmit`** pasa limpio.

## Fuera de scope (siguientes pasos posibles)

- **Histórico de cambios de tipo** de closer (audit log).
- **Notificación por email** al closer cuando lo promueven a CRM+Formación (usando el sistema de Resend que ya tenemos).
- **Filtros por tipo de closer** en la vista `/admin/students` y en `/admin/sales` (segmentar listas por categoría).
- **Reportes financieros** que diferencien usuarios `active` vs `complimentary` (para entender cuántos accesos son becados).
- **Onboarding diferenciado**: que los CRM_ONLY no vean la card del video de bienvenida (no aplica para ellos) ni el banner del dashboard.
- **Auto-revocación**: si un CRM_AND_COURSES pasa a `payment_status='past_due'`, ¿pierde acceso a los cursos? Decidir con el cliente.
