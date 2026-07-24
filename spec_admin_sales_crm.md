# Spec — CRM de ventas para administradores (registrar ventas propias)

## Objetivo

El cliente quiere que **los administradores puedan registrar y gestionar sus propias ventas**,
igual que un closer, **habilitado por defecto** (sin tener que marcar al admin como closer).

Hoy la experiencia de "CRM de ventas personal" (registrar una venta, ver comisión propia,
pipeline propio) es **exclusiva de los closers** vía la sección `/dashboard/sales`. El admin solo
tiene vistas de supervisión (`/admin/leads`, `/admin/sales`) y **no tiene forma de registrar una
venta desde la UI**.

## Estado actual (análisis)

- `canAccessCRM(u)` → `role === 'ADMIN' || isCloser(u)` — [src/lib/access.ts:35](src/lib/access.ts#L35).
  **El backend ya autoriza al admin.**
- `GET/POST /api/sales` — gateado por `canAccessCRM`; el `POST` crea la venta con
  `closer_id = session.user.id` — [src/app/api/sales/route.ts:100-147](src/app/api/sales/route.ts#L100).
  **Un admin ya puede crear/listar sus propias ventas por API.**
- `GET/PATCH/DELETE /api/sales/[id]` — `authorize()` permite `isOwner || isAdmin`
  — [src/app/api/sales/[id]/route.ts](src/app/api/sales/[id]/route.ts). **Ya funciona para admin.**
- `/dashboard/sales` (page) — gateado por `canAccessCRM`; **el admin ya pasa**, pero el layout
  `/dashboard` **hardcodea `role="STUDENT"`** ([src/app/dashboard/layout.tsx:48](src/app/dashboard/layout.tsx#L48)),
  así que si un admin entra ahí pierde su navegación de admin. → No reutilizar esa ruta para admins.
- Sidebar admin: muestra "Ventas" → `/admin/sales` (vista global del equipo, solo lectura).
  **No hay enlace ni botón para registrar una venta propia.**
- El botón flotante "Nueva venta" del sidebar es `role === 'STUDENT' && isCloser`
  — [src/components/layout/Sidebar.tsx:361](src/components/layout/Sidebar.tsx#L361).

**Conclusión:** el único faltante es **UI/navegación dentro del área admin**. El backend
(`/api/sales`, `SalesDashboardClient`) ya soporta al admin sin cambios.

## Diseño (mínimo, sin romper nada)

Reutilizar el CRM personal existente (`SalesDashboardClient` + `/api/sales`) exponiéndolo en una
**ruta nueva dentro del área admin**, para que el admin conserve su layout/navegación.

No se toca:
- El flujo de closers (`/dashboard/sales`, sidebar de estudiante, gating por `isCloser`).
- El backend de ventas (`/api/sales`, `/api/sales/[id]`) — ya autoriza admin.
- La vista de equipo `/admin/sales` ni sus agregados.
- El modelo de datos / Prisma (sin migraciones).

### Cambios

1. **Nueva página** `src/app/admin/my-sales/page.tsx`
   - Gate: `session.user.role === 'ADMIN'` (mismo patrón que `/admin/sales/page.tsx`).
   - Renderiza `<SalesDashboardClient />` (el mismo componente del closer). Consume `/api/sales`,
     que devuelve las ventas y la comisión **del usuario en sesión** (el admin).

2. **`src/components/layout/Sidebar.tsx`** (desktop, `buildAdminGroups`)
   - Añadir en el grupo **GESTIÓN**, justo debajo de "Ventas", el ítem:
     `{ href: '/admin/my-sales', label: 'Mis ventas', Icon: Wallet }` con badge opcional
     `salesCount` (nº de ventas propias del mes).
   - Extender el botón flotante "Nueva venta" para que aparezca también para admins,
     enlazando a `/admin/my-sales` (closers siguen a `/dashboard/sales`).

3. **`src/components/layout/MobileSidebar.tsx`** (móvil, `buildAdminGroups`)
   - Mismo ítem "Mis ventas" y misma extensión del botón "Nueva venta" (paridad con desktop).

4. **`src/app/admin/layout.tsx`**
   - Calcular `salesCount` = ventas propias del admin en el mes en curso (un `prisma.sale.count`
     barato) y pasarlo en `badges` para el badge de "Mis ventas".
   - Añadir `/admin/my-sales` a `fullBleedPaths` de `MainContent` (igual que `/admin/sales`,
     porque `SalesDashboardClient` trae su propio padding).

### Semántica de "Ventas" (equipo) vs "Mis ventas" (propio)

| Ruta | Qué muestra | Alcance |
|---|---|---|
| `/admin/sales` (**Ventas**) | Vista global del equipo, filtro por closer, agregados | Todas las ventas |
| `/admin/my-sales` (**Mis ventas**) | CRM personal: registrar venta, comisión propia, pipeline | Solo `closer_id = admin` |

## Comportamiento conocido / decisiones abiertas (no bloquean)

- Las ventas creadas por un admin llevan `closer_id = <adminId>` y, por diseño de
  `/api/admin/sales`, **aparecen en la lista y en los totales del equipo** (`/admin/sales`),
  aunque el admin **no** figure en el dropdown de closers (ese dropdown filtra
  `closer_enabled = true`). No es un crash (el lookup está guardado con `if (!closer) return null`).
  → Si el cliente quiere excluir las ventas de admins de los totales de comisión del equipo,
  es un ajuste posterior en `/api/admin/sales`. **Por defecto se deja el comportamiento actual.**

## No-objetivos

- No convertir al admin en closer (`closer_enabled`/`closer_type` siguen intactos).
- No meter al admin en el round-robin de leads (`lead_booking_enabled`).
- Sin cambios de schema ni migraciones.

## Verificación

- `tsc --noEmit` limpio.
- Admin ve "Mis ventas" en sidebar (desktop y móvil) y el botón "Nueva venta".
- Admin puede crear una venta, verla listada, editar/borrar (owner) y ver su comisión.
- Un closer no ve ningún cambio; su `/dashboard/sales` sigue igual.
- `/admin/my-sales` redirige a `/dashboard` si el usuario no es ADMIN.
