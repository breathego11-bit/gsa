# Desbloqueo de contenido por cuotas — Spec Técnico

## Contexto

Hoy un alumno que paga en cuotas obtiene **acceso completo** a toda la formación en cuanto
paga la **primera** cuota (`payment_status = 'active'`). El cliente quiere que el acceso al
contenido crezca **proporcionalmente a las cuotas pagadas**: si el plan es de 3 cuotas, la
formación se divide en 3 tramos y con cada cuota pagada se desbloquea el siguiente tramo.

> Ejemplo del cliente: *"si un estudiante paga en 3 cuotas, los cursos y sus secciones se
> dividen en 3 y solo se muestra la primera sección y el primer curso"*.

## Decisiones (cerradas)

1. **Dos niveles de división**: se divide **el catálogo de cursos** (en N tramos) **y** los
   **módulos/secciones dentro de cada curso** (en N tramos). Con `k` cuotas pagadas de `N`,
   se desbloquean los primeros `k` tramos en ambos niveles.
2. **Redondeo a favor del alumno (ceil)**: el tamaño de cada tramo es `ceil(L / N)` donde `L`
   es el número de ítems (cursos o módulos). Con 5 módulos y 3 cuotas → tramos `2,2,1`; pagar
   1 cuota desbloquea 2 módulos.
3. **N = número total de cuotas del plan del alumno** (`Payment` con `payment_type='installment'`).
   Varía por alumno (Stripe usa `SiteSettings.pricing.installmentCount`; invitaciones usan el
   array `pendingInstallments` que arma el admin).
4. **A quién NO aplica** (acceso completo, sin gating):
   - `ADMIN`.
   - Closers `CRM_AND_COURSES` (acceso universal, `hasUniversalCourseAccess`).
   - Alumnos con **pago único** (`one_time`, sin filas de cuota).
   - Alumnos `complimentary` / invitación gratuita (no generan `Payment`).
   - Alumnos con el plan **totalmente pagado** (`paid >= total`).
5. **"Pagada"** = `Payment.status = 'completed'`. El gating depende del **conteo de cuotas
   completadas**, no de las fechas de vencimiento.
6. **Se ordena por**: cursos por nuevo campo `Course.order` (asc, desempate `created_at` asc);
   módulos por `Module.order` (ya existe).
7. **Composición con lo existente**: un módulo queda inaccesible si el admin lo bloqueó
   (`Module.locked`, "PRÓXIMAMENTE") **o** si está en un tramo de cuota aún no pagado. El
   gating por cuotas es una restricción **adicional** sobre el gate de pago/enrolamiento actual.

## Modelo de datos

```prisma
model Course {
  // ... existente
  order  Int  @default(0)   // NUEVO — orden global del catálogo (para la división por tramos)
  // @@index([order])
}
```

- Migración: agrega la columna, **backfill** de los cursos existentes por `created_at` asc
  (0,1,2,…), y crea el índice.
- `POST /api/courses` asigna `order = max(order)+1` al crear (los nuevos van al final).
- Reordenamiento de cursos: `POST /api/courses/reorder` (admin) + **UI de arrastrar/soltar**
  (dnd-kit) en `/admin/courses` — cada fila tiene un asa de arrastre; el orden se persiste
  optimista con rollback si falla.

`Payment` **no cambia**: `total = count(payment_type='installment')`,
`paid = count(... status='completed')`.

## Lógica central — `src/lib/installments.ts`

```ts
export interface InstallmentGate { applies: boolean; total: number; paid: number }

// Cuántos ítems líderes de una lista ordenada de longitud L están desbloqueados.
unlockedCount(L, gate): number
  = (!applies || total<=0 || paid>=total) ? L : min(L, paid * ceil(L/total))

isItemLocked(index, L, gate): boolean       // index >= unlockedCount(L, gate)
itemUnlockInstallment(index, L, gate): number // nº de cuota que lo desbloquea (0 = siempre)

loadInstallmentGate(userId, user): Promise<InstallmentGate>
  // universal access → {applies:false}; si no, cuenta Payment de cuotas.

isCourseModuleUnlocked(userId, user, courseId, moduleId?): Promise<boolean>
  // gate de curso (posición en catálogo) + gate de módulo (posición en el curso).
```

## Puntos de aplicación (server-side = seguridad, no solo UI)

### Enforcement (crítico — evita el bypass por URL directa)
- **`/lesson/[lessonId]/page.tsx`**: tras el gate de pago/enrolamiento, si el curso o el módulo
  de la lección están bloqueados por cuota → `redirect('/dashboard/courses/{courseId}')`.
- **`GET /api/lessons/[id]`**, **`POST /api/progress`**, **`POST /api/exams/submit`**,
  **`POST /api/forms/submit`**: 403 si la lección está en curso/módulo bloqueado (no se puede
  ver ni completar por API).

### UI (muestra el candado)
- **`dashboard/courses/[id]/page.tsx` + `CourseDetailClient.tsx`**: cada módulo lleva
  `installmentLocked` + `unlockAtInstallment`; se pinta un pill **"DISPONIBLE AL PAGAR CUOTA X"**
  (reutiliza el mecanismo de bloqueo de `Module.locked`). La "siguiente lección"/CTA "Continuar"
  salta los módulos bloqueados. Si el curso completo está bloqueado → redirect a la lista.
- **`dashboard/courses/page.tsx` + `DashboardCoursesClient.tsx`**: los cursos en tramos no
  pagados se muestran con candado, no clicables, con "Disponible al pagar cuota X".
- **`course/[courseId]/page.tsx` + `CourseModuleAccordion.tsx`** (página pública/preview): para
  un alumno con plan de cuotas, los módulos bloqueados se pintan con candado y **dejan de ser
  clicables aunque esté inscrito**; el CTA "Continuar aprendiendo" salta los módulos bloqueados.

## Casos borde
- Plan de 1 cuota o pago único → `applies=false` → todo desbloqueado.
- Alumno a mitad de plan tiene `payment_status='active'`: pasa el gate base y el gate de cuotas
  limita cuánto ve. Al completar la última cuota, `paid>=total` → todo desbloqueado.
- Curso no publicado / desconocido en el gate → se trata como no-gated (no rompe admin/preview).
- La navegación prev/next dentro de la lección puede apuntar a una lección bloqueada; el
  enforcement server-side la intercepta y redirige (mejora futura: filtrar prev/next).
