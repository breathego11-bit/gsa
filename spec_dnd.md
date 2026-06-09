# Drag-and-Drop en Course Builder — Spec Técnico

## Contexto

El [course builder](src/app/admin/courses/[id]/builder/CourseBuilderClient.tsx) ya tiene íconos visuales `drag_indicator` decorativos junto a cada módulo y lección, pero **no están funcionales**. Para reordenar hoy el admin no tiene forma — la única salida es eliminar y recrear en el orden correcto, lo cual destruye contenido. El cliente quiere poder **arrastrar módulos** para cambiar su orden dentro de un curso, y **arrastrar lecciones** para reorganizarlas dentro de su módulo (y opcionalmente moverlas entre módulos).

El campo `Module.order` y `Lesson.order` ya existen en el schema y se respetan en todas las queries que renderizan el contenido — no hace falta migración.

## Decisiones clave

- **Librería**: [`@dnd-kit`](https://dndkit.com/) (core + sortable + utilities). Es el estándar en 2026: ~10 kB, accesible (teclado), funciona en touch, SSR-ready, mantenida activamente. Descartado `react-beautiful-dnd` (abandonado) y `react-dnd` (más boilerplate sin ventajas para este caso).
- **Patrón**: dos contextos sortables anidados, uno para módulos y uno por módulo para sus lecciones. Permite drag inter-módulo de lecciones si los unimos bajo un mismo `DndContext`.
- **Drag handle dedicado**: el ícono `drag_indicator` actual se mantiene como handle (solo se puede iniciar drag desde ahí) → evita que el click en el resto de la card dispare drag accidental. Mejora UX y respeta los click handlers existentes (editar, eliminar, etc.).
- **Optimistic updates**: el estado local se actualiza al instante al soltar, y la persistencia va en background. Si la API falla, se hace rollback con toast de error.
- **Persistencia en batch**: un solo POST con la lista ordenada de IDs en vez de N PATCHes individuales. Atómico vía transaction de Prisma.
- **Scope v1**: reorder dentro de su mismo contenedor (módulos en el curso, lecciones en su módulo).
- **Scope v2** (incluido en esta misma fase si es factible): mover lecciones entre módulos arrastrándolas. Es la UX esperada en cualquier builder serio (Notion, Linear, Trello). Si complica mucho el código, se difiere a una segunda iteración.

## Schema

**No hay cambios.** `Module.order` y `Lesson.order` ya existen como `Int`. La librería los respeta y reescribe la columna en cada drop.

## API

### Nuevos endpoints

**`POST /api/modules/reorder`**
- Body: `{ course_id: string, ordered_ids: string[] }`
- Verifica que todos los `ordered_ids` pertenezcan a ese `course_id` (autorización + integridad).
- Ejecuta un `prisma.$transaction(updates)` con un `prisma.module.update` por cada id asignándole su nuevo `order` según la posición en el array.
- Responde `{ success: true }` o 400 si algún id no coincide.

**`POST /api/lessons/reorder`**
- Body: `{ updates: Array<{ lesson_id: string, module_id: string, order: number }> }`
- Acepta el formato más general: cada update puede cambiar tanto `order` como `module_id`. Eso cubre **reorder dentro del módulo** y **movimiento inter-módulo** en una sola llamada.
- Validación: todas las lecciones deben pertenecer al mismo curso (verificado vía joins). Los target `module_id` deben ser módulos del mismo curso.
- Ejecuta todos los updates en transaction.

### Endpoints existentes que NO se tocan

- `POST /api/modules`, `PATCH /api/modules/[id]`, `DELETE /api/modules/[id]` — siguen igual.
- `POST /api/lessons`, `PATCH /api/lessons/[id]`, `DELETE /api/lessons/[id]` — siguen igual.

El nuevo endpoint de reorder es aditivo, no reemplaza nada.

## UI

### Dependencias

```bash
npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```

### Cambios en [CourseBuilderClient.tsx](src/app/admin/courses/[id]/builder/CourseBuilderClient.tsx)

1. **Wrapper único `<DndContext>`** alrededor de todo el árbol de módulos, con sensors para mouse + keyboard + touch.
2. **`<SortableContext>`** para módulos con `items={modules.map(m => m.id)}` y strategy vertical.
3. Cada módulo se convierte en un componente sortable (`useSortable({ id: module.id })`). El handle es el `<span>drag_indicator</span>` actual — se le aplica `{...listeners}` solo a ese span, no a toda la card.
4. **`<SortableContext>` anidado por módulo** para sus lecciones, con strategy vertical.
5. Cada lección igual: sortable con drag desde el `drag_indicator`.
6. **`handleDragEnd`** (top-level):
   - Si el item arrastrado es un módulo → reordena el array de modules y persiste via `/api/modules/reorder`.
   - Si es una lección y `over` está en el mismo módulo → reordena dentro del array de lecciones y persiste `/api/lessons/reorder` con un solo cambio de `order`.
   - Si es una lección y `over` está en otro módulo (v2) → quita la lección del array origen, insértala en el destino en la posición correspondiente, persiste con `/api/lessons/reorder` con los updates de ambos módulos.
7. **Visual feedback**:
   - Ítem siendo arrastrado: `transform: CSS.Transform.toString(transform)` + opacidad reducida.
   - Drop zone: subtle ring/border cyan cuando hay un `over` activo.
   - Cursor `grab` en el handle, `grabbing` al arrastrar.
8. **Estado de "guardando"**: pequeño indicador en el top bar ("Reordenando...") mientras la persistencia está en vuelo. Si falla, toast rojo + revert del estado local al snapshot pre-drag.

### NO se rompe lo existente

- Click en el título del módulo / chevron sigue colapsando.
- Click en la lección sigue abriendo el panel de edición.
- Botones de añadir / eliminar siguen funcionando.
- Drag solo se inicia desde el handle (`drag_indicator`).

## Edge cases

- **Curso vacío** (0 módulos): no hay nada que arrastrar, sin cambios.
- **Módulo vacío** (0 lecciones): se puede arrastrar el módulo entero, y se puede usar como drop target para mover lecciones a él.
- **Mover el único módulo**: no debería pasar nada (queda en posición 0).
- **Drop fuera de cualquier zona válida**: no hace nada, sin error.
- **API falla** mid-drag: revert con toast.
- **Multi-tab**: si dos admins reordenan al mismo tiempo, el último gana (sin lock). Acceptable para uso interno.

## Archivos a crear / modificar

### Crear
- [src/app/api/modules/reorder/route.ts](src/app/api/modules/reorder/route.ts) — POST endpoint
- [src/app/api/lessons/reorder/route.ts](src/app/api/lessons/reorder/route.ts) — POST endpoint

### Modificar
- [package.json](package.json) — añadir las 3 dependencias de @dnd-kit
- [src/app/admin/courses/[id]/builder/CourseBuilderClient.tsx](src/app/admin/courses/[id]/builder/CourseBuilderClient.tsx) — wireado completo (DndContext + SortableContext × 2 + handleDragEnd + estados optimistas)

### NO se toca
- Prisma schema
- Otros componentes admin
- Estructura de visualización del estudiante (lo único que ve es el orden, ya respetado)

## Verificación

1. **Reorder módulos**: arrastrar Módulo 2 arriba de Módulo 1 → la UI se actualiza inmediatamente → recargar la página → el orden persiste.
2. **Reorder lecciones en su módulo**: dentro de un módulo, mover lección 3 a posición 1 → persiste.
3. **Mover lección entre módulos** (v2): arrastrar lección de Módulo A a Módulo B → desaparece de A, aparece en B en la posición correspondiente → recarga → persiste con el nuevo `module_id`.
4. **Acceso por teclado**: enfoca el handle con Tab → Space para "agarrar" → flechas para mover → Enter para soltar. Verificar accesibilidad.
5. **Touch**: probar en mobile (long-press en el handle inicia el drag).
6. **Rollback en error**: simular caída de la API (DevTools → network → throttle / fail) → drop debe revertir y mostrar toast.
7. **Vista del estudiante**: después de reordenar, entrar a `/dashboard/courses/[id]` como estudiante → ver el nuevo orden en el accordion del curriculum.
8. **`npx tsc --noEmit`** pasa limpio.

## Estimación

| Tarea | Tiempo |
|---|---|
| Instalación + setup base de DndContext en módulos | ~30 min |
| Endpoint /api/modules/reorder + integración | ~30 min |
| Sortable de lecciones dentro de módulo | ~40 min |
| Endpoint /api/lessons/reorder + integración | ~30 min |
| Cross-module drag (v2) | ~45 min |
| Polish visual + estados de guardado + rollback | ~45 min |
| Testing manual + edge cases | ~30 min |

**Total estimado: ~4 horas** para v1 + v2 incluidos.

## Fuera de scope

- **Reordenar cursos** entre sí en la lista `/admin/courses` (no fue pedido, pero el patrón quedaría establecido para añadirlo después).
- **Undo/redo** de reordenamientos.
- **Histórico** de quién reordenó qué (audit log).
- **Drag de bullets / opciones** dentro del FormSchemaBuilder o ExamSchemaBuilder (ya tienen su propio sistema de "subir/bajar" con botones).
