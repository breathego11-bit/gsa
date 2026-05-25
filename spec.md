# CRM de Ventas para Closers — Spec Técnico

## Estado actual (snapshot 2026-05-07)

Feature **completo en sus 4 fases principales** (todas las vistas mockupeadas implementadas + admin global + config de tiers). Quedan solo pulidos opcionales y cosas diferidas que el cliente no priorizó.

### ✅ Hecho — Fase 1 (Schema + admin toggle)

- **Schema + migración**: `User.closer_enabled`, `Sale`, `SaleInstallment`, enum `PaymentType`, `SiteSettings.commission_tiers` aplicados en [prisma/schema.prisma](prisma/schema.prisma) y [migration.sql](prisma/migrations/20260505000000_add_sales_crm/migration.sql)
- **Seed**: tiers default 9/11/13% en [prisma/seed.ts](prisma/seed.ts)
- **Auth**: `closer_enabled` propagado en JWT/session ([src/lib/auth.ts](src/lib/auth.ts), [src/types/next-auth.d.ts](src/types/next-auth.d.ts))
- **Toggle admin**: endpoint [POST /api/admin/students/[id]/closer](src/app/api/admin/students/[id]/closer/route.ts)
- **Sidebars condicionales**: [Sidebar](src/components/layout/Sidebar.tsx) y [MobileSidebar](src/components/layout/MobileSidebar.tsx) con prop `closerEnabled`; layouts pasan el flag

### ✅ Hecho — Fase 2 (CRUD + dashboard del closer)

- **Helpers**: [sales-period](src/lib/sales-period.ts), [commission](src/lib/commission.ts) (flat al tier, Opción A), [sales](src/lib/sales.ts) (tipos)
- **API closer**:
  - [GET/POST /api/sales](src/app/api/sales/route.ts)
  - [GET/PATCH/DELETE /api/sales/[id]](src/app/api/sales/[id]/route.ts)
  - [POST /api/sales/[id]/installments/[iid]/collect](src/app/api/sales/[id]/installments/[iid]/collect/route.ts) + `/uncollect`
- **Vistas closer**:
  - [/dashboard/sales](src/app/dashboard/sales/page.tsx) — dashboard completo (KPIs + tier bar + lista + modal de nueva venta) basado en mockup `redesign/sales-dashboard.jsx`
  - [/dashboard/sales/[id]](src/app/dashboard/sales/[id]/page.tsx) — detalle (header + paquete + cuotas con toggle + captura con modal + timeline computada) basado en mockup `redesign/sale-detail.jsx`
- **Componentes reusables**: [PeriodSelector](src/components/sales/PeriodSelector.tsx), [KpiCard](src/components/sales/KpiCard.tsx), [TierScaleBar](src/components/sales/TierScaleBar.tsx), [SalesList](src/components/sales/SalesList.tsx), [SaleFormModal](src/components/sales/SaleFormModal.tsx)

### ✅ Hecho — Fase 3 (Vista admin del estudiante)

- **Endpoint nuevo**: [DELETE /api/admin/students/[id]](src/app/api/admin/students/[id]/route.ts) — eliminar estudiante con cascade
- **UI alineada al mockup `redesign/student-admin.jsx`** ([StudentDetailClient.tsx](src/app/admin/students/[id]/StudentDetailClient.tsx)):
  - Breadcrumb + header con pills BLOQUEADO/CLOSER inline
  - Stats card con progreso global, ventas, última conexión derivada
  - Info card con togglesGroup (Switch animado para Bloqueado y Closer)
  - closerInfoBox condicional (cuando closer = ON)
  - Activity timeline computada (5 eventos reales: inscripción + lecciones + pagos + ventas)
  - Danger zone con botón "Eliminar estudiante" + ConfirmDialog
  - Toast notifications + ConfirmDialog tono cyan/amber/red
  - Secciones de Pagos y Cursos preservadas debajo

### ✅ Hecho — Fase 4 (Admin global + config tiers)

- **Endpoint** [GET /api/admin/sales](src/app/api/admin/sales/route.ts) — filtros por closer + periodo + búsqueda; calcula comisiones correctamente (flat al tier por closer-periodo)
- **Vista** [/admin/sales](src/app/admin/sales/page.tsx) — basada en mockup `redesign/admin-sales.jsx`:
  - Breadcrumb + header con tono naranja admin
  - Filtros: dropdown de closer (con avatares de color hash), period tabs + custom dates, búsqueda inline (debounced)
  - 4 KPIs: cobrado del equipo, comisiones a pagar, ventas, closer top
  - Tabla sortable (closer, cliente, total, cobrado, fecha) con avatares y mini barras de progreso
  - Footer con totales agregados
  - Item "Ventas" re-agregado al sidebar admin
- **Endpoint** [GET/PUT /api/admin/commission-tiers](src/app/api/admin/commission-tiers/route.ts) — valida orden ascendente, no duplicados, % 0-100
- **Sección "Escala de comisiones"** ([CommissionTiersSection.tsx](src/app/admin/settings/CommissionTiersSection.tsx)) integrada en `/admin/settings`:
  - ScaleBar visual con bandas de colores por tier + marker amarillo (cursor)
  - Lista de tiers editables (badge T1..Tn, input "Desde €", static "Hasta", input "%", botón eliminar)
  - Validación inline + banner global cuando hay errores
  - Botón "Agregar tier"
  - Simulador con slider €0–€150k que muestra el cálculo en tiempo real
  - Sticky save bar con animación que aparece solo cuando hay cambios sin guardar

### ⏳ Pendiente (opcional)

#### Edición de venta — único pendiente "core" del spec
- El botón "Editar" en `/dashboard/sales/[id]` muestra un **modal placeholder**.
- La API `PATCH /api/sales/[id]` ya existe pero falta el form de edición completo:
  - Editar datos del cliente (nombre, email, teléfono)
  - Editar paquete (nombre, descripción)
  - Cambiar fecha de venta
  - Reemplazar la captura de pantalla
  - **NO editar montos ni reestructurar cuotas** (eso requiere lógica especial — propuesto: solo via "eliminar venta + crear de nuevo")

#### Feature flag (conversación lateral, no del spec original)
- Variable de entorno `NEXT_PUBLIC_CLOSER_CRM_ENABLED` para esconder TODO el feature en prod hasta que el cliente decida lanzarlo.
- Cuando esté en `false`:
  - Sección "Rol de Closer" en admin no se renderiza
  - Rutas `/dashboard/sales` y `/admin/sales` devuelven 404
  - Sidebar nunca muestra "Ventas"
  - Toggle endpoint rechaza con 404
- Es ~10 min de trabajo cuando se decida implementarlo.

#### Otros nice-to-haves (de la sección "Consideraciones diferidas")
- Refunds / cancelaciones (no decidido por el cliente)
- Cierre de periodo (congelar comisión al final del mes)
- Reuniones / tasa de cierre (cliente nunca aclaró el modelo)
- Leaderboard entre closers
- Notificaciones de cruce de tier
- Export CSV / PDF (botones placeholder en admin/sales)
- Auditoría (tabla de log para ver historial de cambios)
- Multi-currency
- Sidebar de tabs en `/admin/settings` (Comisiones / Productos / Integraciones, etc. del mockup) — solo la sección de Comisiones se implementó

#### Verificación pendiente
- Aún no se ha corrido `npx prisma migrate deploy` en el VPS — se aplica automáticamente en el siguiente deploy de CI/CD
- No se ha hecho prueba E2E manual con un closer real porque el deploy SSH al VPS estaba bloqueado en algún momento (issue de firewall, sin relación con este feature)

---

## Contexto

El cliente pidió una nueva sección dentro del LMS para que los alumnos que se vuelven *closers* (vendedores) puedan registrar sus ventas y ver un dashboard de métricas y comisiones. La sección **se activa por usuario** desde admin (Pau y el cliente).

Cada closer sube ventas con captura de pantalla y datos del cliente; el sistema acumula el **cash collected** (lo cobrado, no lo facturado) en el periodo seleccionado y calcula la comisión según una **escala configurable** (default: 9% / 11% / 13% según monto acumulado).

Resultado esperado: closers operativos pueden gestionar ventas y ver su comisión en tiempo real; admins controlan quién es closer, configuran la escala y ven el panel global del equipo.

---

## Decisiones del cliente (confirmadas)

1. **Lógica de %**: **Flat al tier alcanzado** (Opción A). Si el closer llega a 25.000€ acumulados, los 25.000€ enteros pagan 11%. Cuando cruza 40.000€, todo recalcula al 13%.
2. **Periodo**: Default mensual; el dashboard del closer y del admin debe permitir **anual / mensual / semanal / diario / custom (rango personalizable)**.
3. **Captura de pantalla**: Solo evidencia. La venta cuenta inmediato al subirla — no requiere aprobación de admin.
4. **Paquetes**: **Editable libre por venta** — no hay catálogo. El closer escribe el nombre/descripción del paquete a mano cada vez.
5. **Comisión**: Solo sobre **cash collected** (lo cobrado). En ventas a cuotas, cada cuota se marca como cobrada cuando entra y solo entonces aporta a la comisión.

---

## Modelo de datos

### Cambio en `User`

```prisma
model User {
  // ... campos existentes ...
  closer_enabled  Boolean   @default(false)
  sales           Sale[]
}
```

### Modelos nuevos

```prisma
enum PaymentType {
  SINGLE
  INSTALLMENTS
}

model Sale {
  id                    String    @id @default(cuid())
  closer_id             String
  closer                User      @relation(fields: [closer_id], references: [id], onDelete: Cascade)

  // Cliente
  customer_first_name   String
  customer_last_name    String
  customer_email        String
  customer_phone        String

  // Producto (texto libre)
  package_name          String
  package_description   String?

  // Monto y modalidad
  total_amount          Int          // cents
  payment_type          PaymentType

  // Evidencia
  screenshot_url        String       // path de /api/upload

  // Timing
  sale_date             DateTime     // fecha de la venta (la indica el closer)
  created_at            DateTime  @default(now())
  updated_at            DateTime  @updatedAt

  installments          SaleInstallment[]

  @@index([closer_id])
  @@index([sale_date])
}

model SaleInstallment {
  id            String    @id @default(cuid())
  sale_id       String
  sale          Sale      @relation(fields: [sale_id], references: [id], onDelete: Cascade)

  order         Int       // 1, 2, 3...
  amount        Int       // cents
  due_date      DateTime?

  // Cash collected
  collected     Boolean   @default(false)
  collected_at  DateTime? // cuándo se marcó como cobrada

  @@index([sale_id])
  @@index([collected_at])
}
```

**Para pagos `SINGLE`**: se crea 1 sola installment con `amount = total_amount`, `collected = true`, `collected_at = sale_date`.

**Para pagos `INSTALLMENTS`**: el closer indica cuántas cuotas, monto 1ª, monto cuotas restantes. Se crean N installments. La 1ª se marca `collected = true` por defecto (asumiendo que se cobra al firmar). Las demás quedan pendientes hasta que el closer las marque manualmente.

### Escala de comisión en `SiteSettings`

Siguiendo el patrón existente de `SiteSettings.pricing` (JSON):

```prisma
model SiteSettings {
  id                String   @id @default("singleton")
  pricing           Json
  commission_tiers  Json     // NUEVO
  updated_at        DateTime @updatedAt
}
```

Estructura del JSON:

```ts
type CommissionTier = { min_amount: number; percentage: number }
type CommissionTiers = CommissionTier[]
```

Default seed (en cents):

```json
[
  { "min_amount": 0,       "percentage": 9 },
  { "min_amount": 2000000, "percentage": 11 },
  { "min_amount": 4000000, "percentage": 13 }
]
```

---

## Lógica de negocio

### Cálculo del cash collected en un periodo `[from, to]`

```ts
cash_collected = sum(installments where
    sale.closer_id = userId AND
    installment.collected = true AND
    installment.collected_at >= from AND
    installment.collected_at <= to
)
```

### Cálculo de comisión (flat al tier)

```ts
function commission(cashCollected: number, tiers: CommissionTier[]): {
  pct: number; amount: number; tier_idx: number
} {
  const sorted = [...tiers].sort((a, b) => a.min_amount - b.min_amount)
  let active = sorted[0]
  let idx = 0
  for (let i = 0; i < sorted.length; i++) {
    if (cashCollected >= sorted[i].min_amount) {
      active = sorted[i]
      idx = i
    }
  }
  return {
    pct: active.percentage,
    amount: Math.round(cashCollected * active.percentage / 100),
    tier_idx: idx,
  }
}
```

### Periodos del dashboard

Selector con presets + custom:

- `today`: `[hoy 00:00, hoy 23:59]`
- `week`: `[lunes 00:00, domingo 23:59]` (semana actual)
- `month`: `[día 1 mes actual, último día mes actual]` (default)
- `year`: `[1 enero año actual, 31 diciembre año actual]`
- `custom`: rango libre con date pickers

Helper: `src/lib/sales-period.ts` con función `getPeriodRange(preset, customFrom?, customTo?)`.

---

## API endpoints

### Closer

| Método | Ruta | Body / Query | Descripción |
|---|---|---|---|
| `POST` | `/api/sales` | `{ customer_*, package_*, total_amount, payment_type, screenshot_url, sale_date, installments? }` | Crear venta. Genera `SaleInstallment[]` automáticamente |
| `GET` | `/api/sales?period=month&from=&to=` | — | Lista las ventas del closer (filtrable por periodo). Incluye `metrics` calculadas |
| `GET` | `/api/sales/[id]` | — | Detalle de venta + cuotas |
| `PATCH` | `/api/sales/[id]` | parcial | Editar venta (solo del propio closer) |
| `DELETE` | `/api/sales/[id]` | — | Eliminar venta (solo del propio closer; admin también) |
| `POST` | `/api/sales/[id]/installments/[iid]/collect` | `{ collected_at? }` | Marca cuota como cobrada (default `now()`) |
| `POST` | `/api/sales/[id]/installments/[iid]/uncollect` | — | Desmarca cuota |

Auth: `getServerSession`, valida `session.user.closer_enabled = true` o `role = ADMIN`. Toda venta es del closer logueado salvo que sea admin operando sobre cualquiera.

### Admin

| Método | Ruta | Body / Query | Descripción |
|---|---|---|---|
| `PATCH` | `/api/admin/students/[id]/closer` | `{ closer_enabled: boolean }` | Toggle del flag |
| `GET` | `/api/admin/sales?closer_id=&period=&from=&to=` | — | Vista global de todas las ventas con filtros |
| `GET` | `/api/admin/commission-tiers` | — | Lee la escala actual |
| `PUT` | `/api/admin/commission-tiers` | `{ tiers: CommissionTier[] }` | Reemplaza la escala completa |

Auth: todas requieren `role = ADMIN`.

### Reutilización
- `/api/upload` ya acepta imágenes (JPG/PNG/WebP/GIF) — la captura usa este mismo endpoint
- Patrón de toggle boolean: copiar de [src/app/api/admin/students/[id]/block/route.ts](src/app/api/admin/students/[id]/block/route.ts)
- Patrón JSON en SiteSettings: copiar de [src/app/api/admin/settings/route.ts](src/app/api/admin/settings/route.ts)

---

## Páginas / rutas

### Closer

| Ruta | Descripción |
|---|---|
| `/dashboard/sales` | Dashboard principal: KPIs + gráfico de tier + lista de ventas con filtros. Botón "Nueva venta" abre modal |
| `/dashboard/sales/[id]` | Detalle de venta + lista de cuotas con toggle cobrada/pendiente |

### Admin

| Ruta | Descripción |
|---|---|
| `/admin/students/[id]` | (Existente, extender) — agregar toggle "Es closer" arriba en la card de info |
| `/admin/sales` | Vista global: filtros por closer + periodo, tabla con todas las ventas, totales del equipo |
| `/admin/settings` | (Existente, extender) — agregar tab/sección "Escala de comisiones" con CRUD de tiers |

### Sidebar

| Rol | Cuándo se muestra "Ventas" | Ruta |
|---|---|---|
| STUDENT con `closer_enabled = true` | Sí | `/dashboard/sales` |
| STUDENT con `closer_enabled = false` | No | — |
| ADMIN | Siempre | `/admin/sales` |

Modificar [src/components/layout/Sidebar.tsx](src/components/layout/Sidebar.tsx) y [src/components/layout/MobileSidebar.tsx](src/components/layout/MobileSidebar.tsx) para aceptar prop `closerEnabled?: boolean`. Las layouts ([dashboard/layout.tsx](src/app/dashboard/layout.tsx) y [admin/layout.tsx](src/app/admin/layout.tsx)) consultan el flag en la query de sesión y lo pasan.

---

## Plan de desarrollo (4 fases)

### Fase 1 — Schema + admin toggle (foundational)

- Migración Prisma:
  - Agregar `closer_enabled Boolean @default(false)` a `User`
  - Crear `Sale`, `SaleInstallment`, enum `PaymentType`
  - Agregar `commission_tiers Json` a `SiteSettings`
- Seed: actualizar `prisma/seed.ts` para que `SiteSettings` traiga los tiers default
- API: `PATCH /api/admin/students/[id]/closer` (clonar el patrón de `/block`)
- UI: agregar toggle "Es closer" en [src/app/admin/students/[id]/StudentDetailClient.tsx](src/app/admin/students/[id]/StudentDetailClient.tsx)
- Extender `Sidebar` y `MobileSidebar` con prop `closerEnabled`
- Actualizar layouts para leer y pasar el flag
- Item "Ventas" en sidebars (condicional para closer, siempre para admin)

**Verificación**: admin puede activar/desactivar el flag; al activarlo, el item "Ventas" aparece en el sidebar del estudiante.

### Fase 2 — CRUD de ventas (closer)

- Helper `src/lib/sales.ts` con tipos y mappers
- Helper `src/lib/sales-period.ts` con `getPeriodRange()`
- API: `POST/GET /api/sales`
- API: `GET/PATCH/DELETE /api/sales/[id]`
- API: `POST /api/sales/[id]/installments/[iid]/collect` y `/uncollect`
- Página `/dashboard/sales` (lista + filtros básicos, sin métricas todavía)
- Modal `SaleFormModal` (clonar patrón de `LessonFormModal`):
  - Datos cliente, paquete, monto, tipo de pago
  - Si `INSTALLMENTS`: campos para 1ª cuota, monto resto, número de cuotas
  - Upload de captura (reutilizar patrón de `LessonFormModal:276-310`)
- Página `/dashboard/sales/[id]` con detalle + cuotas

**Verificación**: closer puede crear, ver, editar, eliminar ventas; marcar cuotas como cobradas.

### Fase 3 — Dashboard de métricas + cálculo comisión

- Helper `src/lib/commission.ts` con `commission()` y `getCloserCashCollected()`
- Componente `<PeriodSelector>` (presets + custom) — reutilizable en closer y admin
- Componente `<CommissionTierBar>` — visualización lineal con marcadores de los tiers + indicador del progreso actual
- Componente `<KpiCard>` (extraer del patrón de [src/app/admin/page.tsx:119-191](src/app/admin/page.tsx#L119-L191))
- Header del `/dashboard/sales` con KPIs:
  - Cash collected del periodo
  - Comisión estimada
  - Tier actual (% y nombre)
  - # ventas del periodo
- `<CommissionTierBar>` visible en el dashboard

**Verificación**: el closer ve sus métricas actualizadas en tiempo real al cambiar de periodo; al cruzar un umbral, el tier visualmente se actualiza.

### Fase 4 — Admin global view + config tiers

- Página `/admin/sales`: filtros (closer + periodo), tabla con todas las ventas, totales
- API: `GET /api/admin/sales`
- API: `GET/PUT /api/admin/commission-tiers`
- UI en `/admin/settings`: nueva sección "Escala de comisiones" con CRUD de tiers (agregar/editar/eliminar/reordenar; validación: min_amounts ascendentes, percentages numéricos 0-100)
- Item "Ventas" en sidebar admin → `/admin/sales`

**Verificación**: admin ve todas las ventas del equipo; puede cambiar la escala y los closers ven el cálculo actualizado.

---

## Archivos críticos

### Crear
- `prisma/migrations/{timestamp}_add_sales_crm/migration.sql`
- `src/lib/sales.ts` — tipos + mappers
- `src/lib/sales-period.ts` — `getPeriodRange()`
- `src/lib/commission.ts` — `commission()`, `getCloserCashCollected()`
- `src/app/dashboard/sales/page.tsx`
- `src/app/dashboard/sales/[id]/page.tsx`
- `src/components/sales/SaleFormModal.tsx`
- `src/components/sales/SalesList.tsx`
- `src/components/sales/CommissionTierBar.tsx`
- `src/components/sales/PeriodSelector.tsx`
- `src/components/ui/KpiCard.tsx`
- `src/app/admin/sales/page.tsx`
- `src/app/api/sales/route.ts`
- `src/app/api/sales/[id]/route.ts`
- `src/app/api/sales/[id]/installments/[iid]/collect/route.ts`
- `src/app/api/sales/[id]/installments/[iid]/uncollect/route.ts`
- `src/app/api/admin/students/[id]/closer/route.ts`
- `src/app/api/admin/sales/route.ts`
- `src/app/api/admin/commission-tiers/route.ts`

### Modificar
- `prisma/schema.prisma` — extender `User`, agregar `Sale`, `SaleInstallment`, `PaymentType`, extender `SiteSettings`
- `prisma/seed.ts` — seed de `commission_tiers` default
- `src/app/admin/students/[id]/StudentDetailClient.tsx` — toggle closer
- `src/components/layout/Sidebar.tsx` — prop `closerEnabled`
- `src/components/layout/MobileSidebar.tsx` — prop `closerEnabled`
- `src/app/dashboard/layout.tsx` — leer `closer_enabled` de la sesión y pasarlo al sidebar
- `src/app/admin/layout.tsx` — agregar item "Ventas" al admin sidebar
- `src/app/admin/settings/SettingsClient.tsx` — sección de tiers de comisión
- `src/types/next-auth.d.ts` — agregar `closer_enabled: boolean` a `Session.user`
- `src/lib/auth.ts` — incluir `closer_enabled` en JWT y session callbacks

---

## Patrones a reutilizar

| Necesidad | Patrón existente | Ubicación |
|---|---|---|
| Toggle boolean en User | Block/unblock student | [src/app/api/admin/students/[id]/block/route.ts](src/app/api/admin/students/[id]/block/route.ts) |
| Upload de imagen | Lesson thumbnail | [src/components/admin/LessonFormModal.tsx:276-310](src/components/admin/LessonFormModal.tsx#L276-L310) |
| Modal de formulario | LessonFormModal / CourseFormModal | [src/components/admin/LessonFormModal.tsx](src/components/admin/LessonFormModal.tsx) |
| JSON config en singleton | SiteSettings.pricing | [src/app/api/admin/settings/route.ts](src/app/api/admin/settings/route.ts) |
| Card de KPI | Inline en admin/page.tsx | [src/app/admin/page.tsx:119-191](src/app/admin/page.tsx#L119-L191) |
| Charts mensuales | GrowthCharts | [src/components/charts/GrowthCharts.tsx](src/components/charts/GrowthCharts.tsx) |

---

## Verificación end-to-end (post-implementación)

1. **Activación del flag**:
   - Login como admin → `/admin/students/[id]` de un alumno → toggle "Es closer" → ON
   - Login como ese alumno → ver "VENTAS" en el sidebar (sí debe aparecer)
   - Volver a admin → toggle OFF → confirmar que el item desaparece tras refresh del alumno

2. **Crear venta single**:
   - Como closer → `/dashboard/sales` → "Nueva venta" → llenar form, pago único, subir captura → Guardar
   - Aparece en la lista; `cash_collected` aumenta por el `total_amount`
   - El KPI "Comisión estimada" se actualiza al cruzar tiers

3. **Crear venta a cuotas**:
   - Mismo flujo, seleccionar "Cuotas", indicar 1ª cuota = 1000€, resto = 500€ × 5 cuotas → Guardar
   - En `/dashboard/sales/[id]`: 6 cuotas listadas; la 1ª aparece como cobrada
   - Marcar 2ª como cobrada → `cash_collected` suma 500€ → comisión recalcula

4. **Cambio de periodo**:
   - Selector → cambiar a "diario" → solo se muestran ventas/cuotas cobradas hoy
   - Cambiar a "custom" → fechas del mes pasado → ver datos históricos

5. **Cruce de tier**:
   - Acumular 19.000€ en cobros del mes → tier 9% activo, barra muestra progreso hacia el 11%
   - Marcar una cuota más que lleve el total a 20.500€ → tier 11% se activa; comisión = 20.500 × 0.11

6. **Config de tiers**:
   - Admin → `/admin/settings` → cambiar 9% a 10% → Guardar
   - Closer recarga `/dashboard/sales` → cálculo actualizado al 10%

7. **Admin global**:
   - `/admin/sales` → filtrar por closer X, periodo "este mes" → ver solo sus ventas
   - Sin filtro → tabla con todo el equipo, totales abajo

8. **TypeScript / build**:
   - `npx tsc --noEmit` → 0 errores
   - `npm run build` → pasa
   - `npx prisma migrate dev` → aplica limpio

---

## Consideraciones / decisiones diferidas

Estas no entran en este sprint pero conviene tenerlas en mente:

- **Refunds / cancelaciones**: si un cliente devuelve, ¿la venta se elimina, se marca como cancelada, o se compensa con monto negativo? **No incluido** — pendiente de definición con el cliente.
- **Cierre de periodo**: ¿se "congela" la comisión al final del mes para evitar que ediciones tardías la cambien? **No incluido** — el cálculo es siempre dinámico contra los datos actuales.
- **Reuniones agendadas / tasa de cierre**: el cliente las mencionó al pasar pero no respondió detalles. **Fuera de scope** hasta que aclare.
- **Leaderboard entre closers**: solicitado al pasar; no implementado.
- **Notificaciones (cruzaste de tier!)**: no implementado.
- **Export CSV / PDF de ventas o de comisión a pagar**: no implementado, fácil de agregar después.
- **Auditoría**: todas las ediciones del closer son inmediatas y sin log. Si se necesita historial de cambios, agregar tabla `SaleAuditLog` después.
- **Validación de moneda**: el spec asume EUR. Si en el futuro hay otras monedas, agregar `currency` a `Sale`.

Vista 1 — Dashboard del closer (/dashboard/sales)
Objetivo: que el closer vea sus métricas del periodo, su comisión estimada y la lista de ventas, y pueda crear una venta nueva.

Layout sugerido (top-down):

Header de página

Título: "Ventas"
Subtítulo: "Registra tus ventas y sigue tu comisión"
Botón principal a la derecha: "+ Nueva venta" (CTA destacado)
Selector de periodo (sticky o destacado)

Tabs/segmented control con opciones: Hoy · Semana · Mes · Año · Custom
Default: "Mes"
"Custom" abre dos date pickers (Desde / Hasta)
Etiqueta clara del rango actual ("01 May – 31 May 2026")
Fila de KPIs (3-4 cards)

Card 1: Cash collected → monto grande (ej. "€18.500"), label "Cobrado este mes"
Card 2: Comisión estimada → monto + % aplicado (ej. "€1.665 · 9%"), label "Tu comisión"
Card 3: Ventas registradas → número, label "Ventas del periodo"
Card 4 (opcional): Tier actual → ej. "Tier 1 · 9%", con micro-progress al siguiente tier
Visualización de la escala de comisión (la pieza clave)

Barra horizontal larga que muestra los 3 umbrales con sus %: 0–20.000€ (9%) | 20.000–40.000€ (11%) | 40.000+€ (13%)
Marcadores verticales en cada umbral con el valor (€20.000, €40.000)
Indicador de progreso: una línea/punto que muestra dónde está el closer ahora ("Estás aquí: €18.500")
Cambio de color por sección (gradiente sutil de un color a otro, ej. azul claro → azul → azul intenso)
Tooltip al hover sobre cada sección: "Tier 2 · 11% · desde €20.001"
Lista de ventas del periodo

Tabla o lista de cards con cada venta
Columnas (desktop): Cliente · Paquete · Total · Cobrado · % cobrado · Fecha · Acciones
Indicador visual de completitud por venta: barra horizontal pequeña mostrando cuánto de la venta ya se cobró (ej. 60% si se cobraron 3 de 5 cuotas)
Click en una fila → detalle de la venta (Vista 2)
Mobile: cards apiladas con info esencial
Estado vacío

Cuando no hay ventas en el periodo: ilustración + texto "Aún no has registrado ventas este periodo" + botón "Registrar primera venta"
Vista 2 — Detalle de venta (/dashboard/sales/[id])
Objetivo: que el closer vea todos los datos de una venta y pueda marcar cuotas como cobradas.

Layout:

Breadcrumb / botón volver → "← Volver a ventas"

Header de la venta

Nombre del cliente grande (ej. "Juan Pérez")
Email + teléfono debajo en menor tamaño
Chips/tags: tipo de pago ("Pago único" o "5 cuotas"), fecha de venta
Botones acción: Editar · Eliminar (con confirm)
Card de paquete

Nombre del paquete grande
Descripción debajo
Monto total destacado (ej. "€3.500")
Card de captura de pantalla

Thumbnail de la captura
Click → modal con la imagen en grande
Sección "Cuotas" (si pago a cuotas)

Lista de cuotas con:
N° de cuota
Monto
Fecha de vencimiento (si la hay)
Estado: Cobrada (con checkmark verde + fecha en que se cobró) / Pendiente (gris)
Botón inline para alternar estado (toggle "Marcar como cobrada" / "Marcar como pendiente")
Total cobrado vs total venta arriba de la lista
Si pago único: solo un row "Pago único · cobrado el [fecha]"
Vista 3 — Modal de nueva venta
Objetivo: formulario para registrar una venta. Modal centrado tipo dialog.

Secciones del form (orden recomendado):

Datos del cliente (group)

Nombre · Apellido (en una fila side-by-side en desktop)
Email · Teléfono (en una fila)
Producto vendido

Nombre del paquete (input) — placeholder "Ej. Mentoría 3 meses"
Descripción / notas (textarea opcional, 2-3 líneas)
Pago

Monto total (input numérico con prefijo "€")
Tipo de pago: Toggle/segmented "Pago único · Cuotas"
Si cuotas (aparece desplegado al elegir):
Número de cuotas (input numérico)
Monto 1ª cuota (input)
Monto cuotas restantes (input) — texto auxiliar: "Cada una de las N-1 cuotas restantes"
Mini-resumen automático: "Total: 1×€500 + 4×€750 = €3.500" (validación visual contra el total)
Fecha de la venta

Date picker — default hoy
Captura de pantalla (campo importante)

Drop zone tipo upload con preview
Aceptar JPG/PNG/WebP
Texto: "Sube la captura del pago como evidencia"
Acciones

"Cancelar" (secundario) · "Registrar venta" (CTA primario)
Estado de loading: spinner en el botón mientras sube la captura y guarda.

Vista 4 — Toggle de "Es closer" en admin (/admin/students/[id])
Objetivo: que el admin active/desactive la feature por usuario.

Diseño:

En la card de información del estudiante, junto al toggle "Bloqueado" que ya existe, agregar un nuevo toggle:
Label: "Closer"
Helper text debajo: "Permite al alumno acceder al CRM de ventas"
Switch: ON / OFF
Cuando se activa, mostrar un confirm sutil tipo toast "Activado el módulo de ventas para [Nombre]".
Vista 5 — Vista global de ventas (admin) /admin/sales
Objetivo: que el admin vea todas las ventas del equipo y filtre por closer/periodo.

Layout:

Header: "Ventas del equipo"

Filtros (fila superior):

Selector de closer (dropdown): "Todos · [lista de closers activos]"
Mismo selector de periodo que el closer: Hoy/Semana/Mes/Año/Custom
KPIs globales (similar al closer, pero del equipo entero):

Total cobrado del equipo
Comisiones totales a pagar
Total ventas
Closer top del periodo (nombre + monto)
Tabla de ventas:

Columnas: Closer · Cliente · Paquete · Total · Cobrado · Tier · Fecha · Acciones (ver detalle)
Footer con sumas totales
Vista 6 — Configuración de tiers de comisión (en /admin/settings)
Objetivo: que el admin pueda ajustar los porcentajes y umbrales de la escala.

Diseño: agregar como nueva sección dentro de la página de settings existente (no es página aparte).

Encabezado de sección: "Escala de comisiones"
Lista de tiers como cards/rows editables:
Cada tier: input de "Desde €" + input de "Porcentaje %"
Botón "X" para eliminar un tier
Botón "Agregar tier" al final
Botón "Guardar cambios" al final, sticky o destacado
Validación visible: si los min_amount no están en orden ascendente, mostrar error rojo con texto "Los umbrales deben ir en orden ascendente"
Preview del cálculo (opcional pero útil): "Con esta escala, una venta acumulada de €30.000 paga 11% = €3.300"
Tono visual general
Paleta: respetar la dark theme actual del LMS (background base #080d18, surfaces más claras, acentos azul/cyan)
Iconografía: usar Lucide o Material Symbols (ya están en el LMS) — ej. trending-up para ventas, coins para comisión, target para tier
Animaciones: la barra de tiers debería tener una transición fluida cuando el cobrado cambia (ease-out, ~400ms)
Mobile: todas las vistas deben funcionar en mobile con priorización de info — los KPIs en columna, la barra de tiers se mantiene horizontal pero más compacta, las tablas se vuelven cards

