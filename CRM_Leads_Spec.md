# CRM de Leads — Especificación de integración Landing ↔ LMS

> Estado: **propuesta / pendiente de aprobación** · Última edición: 2026-06-16

Integración de la landing de captación (proyecto Next.js aparte) con el LMS GSA, para que
los leads aterricen en un **CRM dentro de este LMS** que Ivan y su equipo gestionan.

---

## 1. Decisión de arquitectura

**No se fusionan los códigos.** Quedan como **dos proyectos / dos repos** separados:

- **Landing** (Next.js, repo aparte): front delgado de captación. No tiene base de datos propia.
- **LMS GSA** (este repo): dueño único del CRM y de la tabla de leads.

La landing **manda** los leads al LMS por API; el LMS es la **única fuente de verdad**.

### Por qué no fusionar
- El LMS ya está en producción (`growthsalessacademy.com`) con Stripe, Bunny, Resend y cron de pagos. Meter una landing de marketing dentro añade riesgo a algo que ya funciona.
- La landing cambia seguido (copy, A/B, píxeles de ads); no se quiere redesplegar todo el LMS por eso.
- **Regla crítica:** una sola app es dueña de la tabla de leads y de sus migraciones Prisma. Dos apps escribiendo/migrando la misma base se pelean y rompen el esquema. Por eso la landing solo llama a un endpoint; no toca la base.

---

## 2. Despliegue (mismo VPS)

Ambos proyectos conviven en el mismo VPS sin fusionarse:

- La landing se agrega como **otro servicio** en `docker/docker-compose.yml`.
- Caddy enruta por subdominio (TLS automático por dominio) en `docker/caddy/Caddyfile`:

```
growthsalessacademy.com       → landing      (a definir con Ivan)
app.growthsalessacademy.com   → LMS GSA       (o al revés)
```

---

## 3. Ciclo de vida del lead

```
Landing (Next.js)  ──  agenda la cita vía Google Calendar API
   │  submit del form (+ datos del evento agendado)
   ▼
[server de la landing]  ── POST/PATCH /api/leads (API key) ──►  LMS
                                                                 │
                                                                 ▼
                                       Lead { NUEVO → AGENDADO al confirmar la cita }
                                                                 │
                                     Ivan / equipo lo asignan a un closer (manual)
                                                                 │
                                     cuando cierra → se registra como Sale (módulo ya existente)
```

Una sola base (`gsa_db`): lead → asignación → venta, todo trazable.

---

## 4. Modelo de datos (`prisma/schema.prisma`)

Sigue la convención del codebase: `cuid()`, `snake_case`, `@db.Text`. (No `uuid/serial`.)

```prisma
enum LeadStatus     { NUEVO  CONTACTADO  AGENDADO  DESCARTADO }
enum LeadSituation  { NO_TRABAJANDO  MAS_INGRESOS  QUIERE_REMOTO  EMPRENDE_INESTABLE  VENDE_PROFESIONALIZAR  YA_CLOSER  OTRA }
enum LeadUrgency    { AHORA  EN_3_MESES  EN_6_MESES_O_MAS  NO_SE  SOLO_INFORMARSE }
enum LeadInvestment { SIN_RECURSOS  DE_500_A_1000  DE_1000_A_2000  SIN_IMPEDIMENTO }

model Lead {
  id              String         @id @default(cuid())

  // Contacto
  full_name       String
  whatsapp        String         // SIEMPRE string (prefijos +, espacios, ceros a la izquierda)
  email           String
  instagram       String
  country         String

  // Cualificación
  situation       LeadSituation
  desired_change  String         @db.Text   // "cambio"
  objectives      String         @db.Text   // "objetivos como closer"
  cafe_vision     String         @db.Text   // "café 6 meses después…"
  urgency         LeadUrgency
  investment      LeadInvestment

  // Reunión (agendada vía Google Calendar conectada a la landing)
  meeting_at        DateTime?               // start del evento (RFC3339 → timestamptz): instante absoluto
  meeting_tz_iana   String?                 // start.timeZone del evento: "America/Bogota" (IANA limpio)
  google_event_id   String?  @unique        // id del evento en Google Calendar (enlazar / evitar duplicados)
  google_event_url  String?                 // htmlLink del evento
  meeting_link      String?                 // Google Meet (hangoutLink / conferenceData)

  // CRM
  status          LeadStatus     @default(NUEVO)
  source          String         @default("landing-survey")
  assigned_to     String?
  assigned_at     DateTime?

  // Metadatos
  submitted_at    DateTime?                 // "enviado_en" del cliente (epoch ms del navegador)
  created_at      DateTime       @default(now())
  updated_at      DateTime       @updatedAt

  assignee        User?          @relation("LeadAssignee", fields: [assigned_to], references: [id], onDelete: SetNull)

  @@index([status, created_at])
  @@index([assigned_to])
  @@index([email])
}
```

En `model User` se agrega la relación inversa:

```prisma
assigned_leads  Lead[]  @relation("LeadAssignee")
```

---

## 5. Mapeo del form de la landing → BD

### Contacto
| Campo (landing) | Tipo input | Pregunta | Req. | Columna BD |
|---|---|---|---|---|
| `nombre` | texto | Nombre y apellidos | sí | `full_name` (text) |
| `whatsapp` | tel | Número de WhatsApp (con prefijo) | sí | `whatsapp` (**text**, nunca numérico) |
| `email` | email | Correo electrónico | sí | `email` (text) |
| `instagram` | texto | Usuario de Instagram | sí | `instagram` (text) |
| `pais` | texto | ¿Desde qué país nos contactas? | sí | `country` (text) |

### Cualificación
| Campo (landing) | Tipo | Pregunta | Req. | Columna BD |
|---|---|---|---|---|
| `situacion` | opción única (7) | Situación actual | sí | `situation` (enum `LeadSituation`) |
| `cambio` | texto largo | Qué le gustaría cambiar | sí | `desired_change` (text) |
| `objetivos` | texto largo | Objetivos como closer | sí | `objectives` (text) |
| `cafe` | texto largo | "Café 6 meses después…" | sí | `cafe_vision` (text) |
| `urgencia` | opción única (5) | Urgencia para empezar | sí | `urgency` (enum `LeadUrgency`) |
| `inversion` | opción única (4) | Inversión dispuesta | sí | `investment` (enum `LeadInvestment`) |

### Reunión (agendada vía Google Calendar — no es un campo del form)
| Dato | Origen (evento de Google Calendar) | Ejemplo | Columna BD |
|---|---|---|---|
| Inicio de la cita | `start.dateTime` (RFC3339) | `2026-06-20T09:00:00-05:00` | `meeting_at` (timestamptz) |
| Zona horaria | `start.timeZone` (IANA) | `"America/Bogota"` | `meeting_tz_iana` |
| ID del evento | `event.id` | `abc123def456...` | `google_event_id` |
| Link al evento | `event.htmlLink` | `https://calendar.google.com/...` | `google_event_url` |
| Google Meet | `event.hangoutLink` / `conferenceData` | `https://meet.google.com/...` | `meeting_link` |

### Metadatos
| Campo (landing) | Origen | Columna BD |
|---|---|---|
| `enviado_en` | `ts` (epoch ms) | `submitted_at` |
| `fuente` | fijo `"landing-survey"` | `source` (default) |
| `estado` | — | `status` (default `NUEVO`) |
| `id`, `creado_en` | — | generados en BD (`id`, `created_at`) |

---

## 6. Catálogo de opciones (enum ↔ etiqueta)

Se centraliza en un **módulo compartido** (`src/lib/leads/options.ts`) para que landing y LMS
usen exactamente los mismos valores y nunca se desincronicen.

**`situation` → `LeadSituation`**
| Etiqueta (UI) | Enum |
|---|---|
| No trabajando | `NO_TRABAJANDO` |
| Tiene trabajo, quiere más ingresos | `MAS_INGRESOS` |
| Tiene trabajo, quiere remoto | `QUIERE_REMOTO` |
| Emprende, ingresos inestables | `EMPRENDE_INESTABLE` |
| Vende, quiere profesionalizarse | `VENDE_PROFESIONALIZAR` |
| Ya closer, quiere mejorar | `YA_CLOSER` |
| Otra situación | `OTRA` |

**`urgencia` → `LeadUrgency`**
| Etiqueta (UI) | Enum |
|---|---|
| Ahora | `AHORA` |
| Próximos 3 meses | `EN_3_MESES` |
| 6 meses o más | `EN_6_MESES_O_MAS` |
| No sé cuándo | `NO_SE` |
| Solo informarme | `SOLO_INFORMARSE` |

**`inversion` → `LeadInvestment`**
| Etiqueta (UI) | Enum |
|---|---|
| Sin recursos | `SIN_RECURSOS` |
| 500–1.000 € | `DE_500_A_1000` |
| 1.000–2.000 € | `DE_1000_A_2000` |
| Sin impedimento | `SIN_IMPEDIMENTO` |

**Trade-off enum:** si Ivan cambia el texto de una opción, hace falta migración. A cambio, el CRM
filtra y segmenta limpio. El módulo compartido mantiene UI ↔ enum en un solo lugar.

---

## 7. Reunión / zona horaria

La cita se agenda vía **Google Calendar API conectada a la landing**. Esto **resuelve** el problema
de zona horaria que teníamos con el form manual:

- Google entrega `start.dateTime` como **RFC3339 con offset** (instante absoluto) → va directo a
  `meeting_at` (`timestamptz`). No hay que combinar fecha + hora + zona a mano.
- Google entrega `start.timeZone` como **IANA limpio** (`America/Bogota`) → `meeting_tz_iana`. Se
  elimina la etiqueta sucia tipo `"GMT-5 · America/Bogota"` y el campo `meeting_tz` ya no hace falta.
- Se guardan además `google_event_id`, el link al evento (`google_event_url`) y el de Google Meet
  (`meeting_link`).

**Fuente de verdad de la cita: Google Calendar.** El LMS guarda un *snapshot* + el `google_event_id`/link.
- **v1:** snapshot al momento de agendar. Si reprograman/cancelan en Calendar, el LMS queda con el
  snapshot; el link al evento siempre muestra el estado real.
- **v2 (opcional):** suscripción push (Calendar `watch`) o re-fetch para mantener `meeting_at`/estado en sync.

**Quién crea el evento:** lo natural es que la **landing** (que ya tiene la conexión con Google) cree
el evento y reenvíe al LMS los datos resultantes. **El LMS no maneja credenciales de Google.**

---

## 8. Endpoint de ingestión

- **Auth:** API key en header secreto (p. ej. `x-api-key`), validada contra una env var del LMS.
- **Seguridad (importante):** el form de la landing **no llama al LMS desde el navegador**.
  El submit va a un route handler / server action **de la landing**, y ese servidor reenvía al LMS
  con el secreto. Así la key nunca queda expuesta en el cliente. (Ahí mismo es donde la landing habla
  con Google Calendar; el LMS no maneja credenciales de Google.)
- **Validación:** requeridos presentes + coerción de enums + honeypot anti-spam (endpoint público).
- **Flujo de ingestión (recomendado: two-step):**
  - `POST /api/leads` — al enviar el form (contacto + cualificación) → crea `Lead { NUEVO }`.
    Así no se pierden leads que no llegan a agendar.
  - `PATCH /api/leads/:id` — al confirmarse el evento de Google Calendar → setea `meeting_at`,
    `meeting_tz_iana`, `google_event_id`, `google_event_url`, `meeting_link` y pasa `status` a `AGENDADO`.
  - *Alternativa one-shot:* un único `POST` después de agendar — más simple, pero pierde a quien no agenda.
- **Body (JSON):** los campos de la sección 5 (contacto + cualificación en el POST; datos del evento en el PATCH).
- **Respuesta:** `201 { id }` en éxito; `400` validación; `401` API key inválida.

---

## 9. Roles y accesos

- **Ahora:** la vista del CRM de leads se gatea a `ADMIN` (Ivan).
- **Futuro (a definir por Ivan):** nacerá un **rol nuevo** que combine *CRM de closers* + *sección
  CRM de leads*. El modelo ya lo soporta porque los leads se asignan a un `User` (`assigned_to`);
  cuando exista el rol, solo se ajusta el control de acceso.
- Ivan, como dueño, debe tener acceso **tanto** al CRM de leads **como** al módulo de Ventas
  (hoy gateado solo a closers vía `closer_enabled`).

---

## 10. Decisiones tomadas / pendientes

**Tomadas**
- No fusionar códigos; integración por API. ✅
- Landing en Next.js, sin BD propia. ✅
- Asignación lead→closer **manual** (sin round-robin por ahora). ✅
- `whatsapp` como string; opción única como enum; `meeting_at` como `timestamptz`. ✅
- Reunión agendada vía **Google Calendar** (conectado a la landing); IANA limpio resuelto. ✅

**Pendientes**
- [ ] Confirmar que la **landing** (no el LMS) crea el evento de Google Calendar y reenvía `event.id`, `start`, Meet link.
- [ ] Flujo de ingestión: two-step (recomendado) vs one-shot (sección 8).
- [ ] Sync ante reprogramación/cancelación en Calendar: v1 snapshot vs v2 push `watch` (sección 7).
- [ ] Definición del rol nuevo (CRM closers + CRM leads) — lo define Ivan.
- [ ] Subdominios definitivos landing vs LMS en Caddy (sección 2).
- [ ] ¿El closer asignado necesita ver/editar sus leads, o el CRM de leads es solo admin en v1?

---

## 11. Fases de implementación

1. **Base de datos + ingestión**
   - Modelo `Lead` + enums + relación en `User`.
   - Migración Prisma.
   - Módulo compartido de opciones (`src/lib/leads/options.ts`).
   - Endpoint `POST /api/leads` con API key, validación y honeypot.
2. **Conexión de la landing**
   - Server action en la landing que reenvía al LMS con el secreto.
   - Integración Google Calendar en la landing: crear el evento y mapear `event.id` / `start` / Meet link al payload.
3. **CRM de leads (UI)**
   - Listado/bandeja con filtros por `status`, asignación manual a closer, detalle del lead.
4. **Roles**
   - Crear el rol definido por Ivan y gatear las vistas.
5. **(Futuro) Lead → Venta**
   - Vincular un `Lead` cerrado con su `Sale`.
