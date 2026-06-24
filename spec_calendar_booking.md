# Spec — Agendamiento Google Calendar + asignación round-robin (FASE 1 del CRM de Leads)

> Estado: **propuesta para implementar** · Stack: Next.js 15 (App Router) + Prisma + NextAuth (este repo).
>
> **Esta es la Fase 1 del motor de agendamiento.** Single-tenant (Iván + un segundo
> miembro), pero con la arquitectura preparada para multi-tenant / SaaS (Fase 2).

---

## 0. Qué ya existe (NO rehacer)

El CRM de leads ya está implementado en este repo:

- `model Lead` + enums (`LeadStatus`, `LeadSituation`, `LeadUrgency`, `LeadInvestment`) en `prisma/schema.prisma` (migración `20260616000000_add_leads_crm`). **Ya incluye los campos de reunión**: `meeting_at`, `meeting_tz_iana`, `google_event_id`, `google_event_url`, `meeting_link`, `assigned_to`, `assigned_at`, `status`.
- `POST /api/leads` (Paso A — crea lead NUEVO) y `PATCH /api/leads/[id]` (Paso B actual).
- `src/lib/leads/auth.ts` (`leadsAuthOk`) y `src/lib/leads/options.ts` (validadores de enum).
- UI del CRM en `src/app/admin/leads/*`.
- Helpers de acceso en `src/lib/access.ts` (`canAccessCRM`, `isCloser`, …).
- Closers vía `User.closer_enabled` + `closer_type`.

Fase 1 **reutiliza el `Lead`** (la cita se guarda en el propio lead) y **solo agrega** la
capa de Google Calendar + disponibilidad + booking con round-robin + la vista por asignado.

---

## 1. ⚠️ Cambio de arquitectura respecto a `CRM_Leads_Spec.md`

`CRM_Leads_Spec.md` (secciones 7, 8 y 10) decía: *"la landing crea el evento de Google y
reenvía los datos; el LMS no maneja credenciales de Google; asignación lead→closer
manual"*. **Esto se reemplaza por:**

| Antes (CRM_Leads_Spec) | Ahora (este spec, Fase 1) |
|---|---|
| La **landing** crea el evento de Google | **El LMS** crea el evento (OAuth por miembro) |
| El LMS no maneja credenciales de Google | El LMS **guarda los tokens** (refresh) por miembro |
| Asignación **manual** lead→closer | **Round-robin automático** al agendar |
| Paso B = `PATCH /api/leads/[id]` con datos del evento | Paso B = `POST /api/leads/[id]/book` con el **slot** |

**Por qué el cambio:** las cuentas son **Gmail normales** → para crear eventos con Google
Meet hace falta **OAuth con refresh token**, que debe persistir en una BD. La landing es
*stateless*; el LMS tiene la BD y el CRM → **Google vive en el LMS**.

> **`PATCH /api/leads/[id]` (decidido):** la landing deja de usarlo (lo reemplaza `/book`).
> Se **conserva pero re-enfocado a edición manual del CRM por admin**: cambiar `status`,
> reasignar manualmente (`assigned_to`), marcar `CONTACTADO/DESCARTADO`, etc. → cambiar su
> auth de `x-api-key` a **sesión NextAuth + `canAccessCRM`** y su body a campos editables.

---

## 2. Objetivo de la Fase 1

1. Un lead reserva → el LMS **asigna** a Iván o al segundo miembro (**round-robin**,
   respetando disponibilidad real) y **crea el evento en el Google Calendar del asignado**
   con **Google Meet**, invitando al lead.
2. El LMS guarda la cita en el `Lead` (`meeting_*`, `assigned_to`, `status=AGENDADO`).
3. En `/admin/leads` puedo **ver las reuniones filtradas por asignado** (Todos / Iván / Yo).

### Fuera de alcance Fase 1 (van en Fase 2 / siguientes)
- Multi-tenant (`org_id`) y venta a otras empresas.
- Verificación OAuth de Google para público externo (ahora va en **Testing**).
- Microsoft 365 / Outlook (la capa de calendario queda abstraída para añadirlo).
- Reprogramar/cancelar desde el panel, recordatorios, tabla dedicada de `Meeting` para
  múltiples reuniones por lead (hoy: 1 cita por lead, guardada en el `Lead`).

---

## 3. Flujo end-to-end

```
LANDING (repo aparte, stateless)            LMS (este repo)
 A) POST /api/leads ───────────────────▶  crea Lead (NUEVO)  → { id }
 B) GET /api/leads/availability ───────▶  free/busy de Iván + miembro 2 (+working hours)
        ◀── slots reales (en tz del lead)
 C) POST /api/leads/[id]/book ─────────▶  { start_at, tz_iana, duration }
        ◀── { assignee, meet_link }        ├─ elige asignado (round-robin entre libres)
                                           ├─ crea evento Google (Meet) en SU calendario
                                           └─ Lead: meeting_*, assigned_to, status=AGENDADO

ADMIN (Iván / yo, sesión NextAuth):
  /admin/leads  → filtro por asignado (Todos | Iván | Yo) + agenda de reuniones
```

Auth de A/B/C = `x-api-key` (la landing reenvía con `LEADS_API_KEY`, igual que hoy).

---

## 4. Modelo de datos

### 4.1 Nuevo: `CalendarConnection` (tokens OAuth por miembro)

Convención del repo: `cuid()`, `snake_case`, `@db.Text`. **Sin `org_id`** (el codebase es
single-tenant; `org_id` se añade en bloque en Fase 2, no antes).

```prisma
enum CalendarProvider {
  GOOGLE
  // MICROSOFT  // Fase 2
}

model CalendarConnection {
  id             String           @id @default(cuid())
  user_id        String
  provider       CalendarProvider @default(GOOGLE)
  account_email  String                          // email de la cuenta conectada
  calendar_id    String           @default("primary")
  refresh_token  String           @db.Text       // CIFRADO en reposo (AES-256-GCM, §6.3)
  access_token   String?          @db.Text       // cache; se renueva con el refresh
  token_expiry   DateTime?
  scopes         String           @db.Text
  status         String           @default("active")  // active | error | revoked
  connected_at   DateTime         @default(now())
  updated_at     DateTime         @updatedAt

  user           User             @relation("UserCalendars", fields: [user_id], references: [id], onDelete: Cascade)

  @@unique([user_id, provider])
  @@index([status])
}
```

### 4.2 `User` — añadir relación + config de agenda (per-member)

```prisma
model User {
  // ... existente
  lead_booking_enabled Boolean              @default(false)        // entra al round-robin de leads
  booking_timezone     String               @default("America/Bogota")  // zona FIJA de su disponibilidad
  working_hours        Json?                // ventana de atención por día (ver §6.6); null → default
  calendars            CalendarConnection[] @relation("UserCalendars")
}
```

> **Decisión (per-member):** cada miembro tiene **su zona** (`booking_timezone`) y **sus
> horas** (`working_hours`). En Fase 1: Iván y yo (ambos `ADMIN`, `lead_booking_enabled=true`,
> `booking_timezone='America/Bogota'`, L–V 09:00–18:00) y cada uno conecta su Google.
>
> **Viaje de Iván:** su disponibilidad queda **anclada a `booking_timezone`** (Colombia),
> independiente de dónde esté físicamente — igual que GHL/Calendly. Su free/busy son
> instantes absolutos, así que se respetan estés donde estés; lo único fijo es la ventana
> de horas. (Si algún día quisiera que siga su viaje, sería un toggle futuro.)

> **Pool de miembros bookables** = `User.lead_booking_enabled = true` **con** una
> `CalendarConnection` `status='active'`.

### 4.3 `Lead` — se reutiliza tal cual

No cambia. El booking escribe en sus campos existentes: `meeting_at`, `meeting_tz_iana`,
`google_event_id`, `google_event_url`, `meeting_link`, `assigned_to`, `assigned_at`,
`status='AGENDADO'`. (1 cita por lead en Fase 1.)

### 4.4 Round-robin sin tabla extra

No se agrega tabla de cursor. La asignación elige, entre los miembros **libres** en el
slot, al de **menor carga** (menos reuniones futuras), desempatando por el `assigned_at`
más antiguo. (Determinista, sin estado mutable adicional.)

---

## 5. Migración Prisma

Una sola migración `add_calendar_connections`:
```sql
CREATE TYPE "CalendarProvider" AS ENUM ('GOOGLE');

CREATE TABLE "CalendarConnection" ( ... );  -- según §4.1
ALTER TABLE "User" ADD COLUMN "lead_booking_enabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN "booking_timezone"     TEXT NOT NULL DEFAULT 'America/Bogota';
ALTER TABLE "User" ADD COLUMN "working_hours"        JSONB;
```
Aplicar con el patrón del repo (Docker):
```bash
docker compose exec app npx prisma migrate dev --name add_calendar_connections   # local
docker compose exec app npx prisma migrate deploy                                # prod
```
Seed/ajuste: marcar a Iván y al segundo miembro con `lead_booking_enabled=true`.

---

## 6. Integración Google

### 6.1 Credencial y consentimiento
- **OAuth 2.0 Client ID** (tipo *Web application*) en GCP (no service account).
- **Scopes:** `https://www.googleapis.com/auth/calendar.events` (crear eventos) **+** `https://www.googleapis.com/auth/calendar.freebusy` (consultar disponibilidad — `calendar.events` solo NO permite `freebusy.query`). Más `openid email` (no sensibles).
- Consent screen en **"Testing"** con Iván y yo como *test users* → **sin verificación**.
- `access_type=offline` + `prompt=consent` para obtener `refresh_token`.
- Dependencia: `npm i googleapis`.

### 6.2 Capa de calendario abstraída — `src/lib/calendar/`
Para que Fase 2 pueda añadir Microsoft sin tocar la lógica de asignación:

```
src/lib/calendar/
  types.ts        // interface CalendarProvider { createEvent, freeBusy }
  crypto.ts       // encrypt()/decrypt() AES-256-GCM con CALENDAR_TOKEN_ENC_KEY
  google.ts       // OAuth client + createEvent + freeBusy + refreshAccessToken
  tokens.ts       // get/save CalendarConnection, refresca access_token si venció
  availability.ts // combina working_hours + freeBusy → slots
  assignment.ts   // round-robin entre miembros libres
```

### 6.3 Tokens cifrados en reposo
`refresh_token` (y `access_token`) se guardan cifrados con **AES-256-GCM**, clave
`CALENDAR_TOKEN_ENC_KEY` (32 bytes base64) usando el módulo `crypto` de Node. Nunca en
texto plano ni en logs.

### 6.4 Crear evento (con Meet) — `events.insert`
```jsonc
{
  "summary": "Proceso de admisión - {lead.full_name} - {closer.name}",
  "description": "Lead desde landing GSA.\nWhatsApp: {whatsapp}\nObjetivos: {objectives}",
  "start": { "dateTime": "2026-06-20T09:00:00", "timeZone": "{lead.tz_iana}" },
  "end":   { "dateTime": "2026-06-20T09:45:00", "timeZone": "{lead.tz_iana}" },
  "attendees": [ { "email": "{lead.email}" } ],
  "conferenceData": { "createRequest": {
      "requestId": "{cuid}", "conferenceSolutionKey": { "type": "hangoutsMeet" } } }
}
// insert con conferenceDataVersion=1, calendarId = connection.calendar_id
```
Se lee de la respuesta: `id`→`google_event_id`, `hangoutLink`→`meeting_link`,
`htmlLink`→`google_event_url`, `start.dateTime`→`meeting_at`, `start.timeZone`→`meeting_tz_iana`.

### 6.5 Disponibilidad — `freebusy.query`
Por cada miembro bookable (su `calendar_id`) en el rango → intervalos ocupados; se restan
de su ventana de atención (working hours) para producir slots libres.

### 6.6 Ventana de atención (working hours) — per-member

**Decisión: per-member** (como GHL). Cada `User` bookable tiene `booking_timezone` (IANA,
fija) y `working_hours` (JSON por día de la semana). La disponibilidad se calcula en la
zona del miembro y luego se expresa en la zona del lead.

```jsonc
// User.working_hours — horas locales del miembro (0=domingo … 6=sábado). Fase 1 Iván y yo:
{ "1": [["09:00","18:00"]], "2": [["09:00","18:00"]], "3": [["09:00","18:00"]],
  "4": [["09:00","18:00"]], "5": [["09:00","18:00"]] }   // L–V 09–18, fin de semana cerrado
```
- Si `working_hours` es `null`, usar un default global (L–V 09–18).
- Duración 45 min, sin solapes; un slot ocupa `[start, start+45)`.
- El cálculo combina, por cada miembro: su ventana (en `booking_timezone`) menos su
  `freeBusy` (instantes absolutos de Google) → slots libres; la unión define lo ofrecible.

---

## 7. Endpoints (este repo)

> Patrón existente: route handlers en `src/app/api/...`, `export const dynamic='force-dynamic'`,
> `prisma` desde `@/lib/prisma`. Para `x-api-key` reusar `leadsAuthOk` de `@/lib/leads/auth`.
> Para sesión admin, `getServerSession(authOptions)` + `canAccessCRM` de `@/lib/access`.

### 7.1 OAuth — conectar el Google de cada miembro (sesión admin)
```
GET /api/integrations/google/connect
   → valida sesión + canAccessCRM; genera `state` firmado (anti-CSRF) con el user_id;
     redirige a Google (scope calendar.events, access_type=offline, prompt=consent).

GET /api/integrations/google/callback?code&state
   → valida state; intercambia code→tokens; upsert CalendarConnection
     (refresh_token cifrado, calendar_id='primary', account_email, status='active').
```
Archivos: `src/app/api/integrations/google/connect/route.ts`, `.../callback/route.ts`.
UI: un botón **"Conectar Google Calendar"** en `/admin` (o `/admin/leads`) por miembro.

### 7.2 Disponibilidad (la landing la consulta vía x-api-key)
```
GET /api/leads/availability?from=2026-06-18&days=14&tz_iana=America/Bogota&duration=45
   (auth: leadsAuthOk)
→ 200 { "tz_iana":"America/Bogota",
        "slots":["2026-06-20T09:00:00-05:00", "2026-06-20T10:00:00-05:00", ...] }
```
Un slot se ofrece si **≥1 miembro bookable está libre** (la landing no elige persona).
Archivo: `src/app/api/leads/availability/route.ts`.

### 7.3 Reserva (Paso B nuevo)
```
POST /api/leads/[id]/book        (auth: leadsAuthOk)
{ "start_at":"2026-06-20T09:00:00-05:00", "tz_iana":"America/Bogota", "duration":45 }
→ 200 { "assignee": {"id","name"}, "meeting_at":"…", "meeting_link":"https://meet.google.com/…" }
→ 409 { "error":"slot_taken" }   // nadie libre al confirmar (carrera)
→ 404 lead inexistente · 401 api key
```
Lógica (en orden, lo más atómico posible):
1. Cargar lead; si ya tiene `google_event_id` → idempotencia (devolver el existente).
2. Miembros bookables **libres** en `start_at` (re-chequeo `freeBusy` en vivo).
3. Si 0 → `409 slot_taken`.
4. Elegir asignado (round-robin §4.4).
5. `createEvent` en el calendario del asignado (Meet, lead como attendee).
6. `prisma.lead.update`: `meeting_at, meeting_tz_iana, google_event_id, google_event_url,
   meeting_link, assigned_to=asignado.id, assigned_at=now, status='AGENDADO'`.
Archivo: `src/app/api/leads/[id]/book/route.ts`.

---

## 8. Vista de admin — "ver reuniones por asignado" (lo pedido)

Extender `src/app/admin/leads`:
- **Filtro por asignado:** `Todos | Iván | Yo` (lista de `User` con `lead_booking_enabled`).
- **Vista Agenda/Reuniones:** leads con `meeting_at != null`, ordenados por `meeting_at`,
  mostrando: fecha/hora (en tz del viewer), lead (nombre + WhatsApp + email), **asignado**,
  estado, **link de Meet** y link al evento.
- Query (server component, patrón del repo):
  ```ts
  prisma.lead.findMany({
    where: { meeting_at: { not: null }, ...(assignee ? { assigned_to: assignee } : {}) },
    orderBy: { meeting_at: 'asc' },
    include: { assignee: { select: { id: true, name: true, last_name: true } } },
  })
  ```
- **Gate:** `canAccessCRM` (`@/lib/access`). En Fase 1 Iván y yo somos `ADMIN` → vemos
  todo + filtramos. (Futuro: un closer ve solo sus `assigned_to`.)

---

## 9. Round-robin (detalle) y carreras

- `candidatos` = `User.lead_booking_enabled=true` con `CalendarConnection.status='active'`
  **y libres** en el slot (chequeo `freeBusy` en vivo, no confiar en el de §7.2 que pudo
  quedar viejo).
- Elегir: menor nº de reuniones futuras (`meeting_at >= now`); empate → `assigned_at` más
  antiguo (o `null` primero). Interface `assignment.ts: pick(candidates, ctx)` para cambiar
  la regla sin tocar el endpoint.
- **Carrera / doble-booking:** si dos reservas compiten por el mismo slot, la 2.ª recibe
  `409 slot_taken`. Robustez extra (Fase 1.5): lock por slot o `@@unique` lógico.
- **Token vencido/revocado:** `tokens.ts` refresca con el refresh; si falla →
  `connection.status='error'`, excluir al miembro de disponibilidad y avisar al admin para
  reconectar.

---

## 10. Seguridad

- `x-api-key` (`LEADS_API_KEY`) para A/B/C — ya implementado (`leadsAuthOk`).
- `refresh_token`/`access_token` **cifrados** (AES-256-GCM, `CALENDAR_TOKEN_ENC_KEY`).
- OAuth callback con **`state` firmado** (anti-CSRF) que incluye el `user_id`.
- Endpoints de conexión y vistas detrás de **sesión NextAuth + `canAccessCRM`**.
- Cumplir *Google API Services User Data Policy* (uso limitado de datos).

---

## 11. Variables de entorno (este repo) — añadir a `.env` / `.env.example`

```
# Google Calendar (OAuth Client ID tipo Web app)
GOOGLE_OAUTH_CLIENT_ID=
GOOGLE_OAUTH_CLIENT_SECRET=
GOOGLE_OAUTH_REDIRECT_URI=https://app.growthsalessacademy.com/api/integrations/google/callback

# Cifrado de tokens de calendario en reposo (32 bytes base64: openssl rand -base64 32)
CALENDAR_TOKEN_ENC_KEY=

# (ya existe) clave compartida con la landing
LEADS_API_KEY=
```

---

## 12. Cambios en la LANDING (repo `gsa-landing`, los aplico yo)

- **Quitar** `lib/google-calendar.ts` y las env `GOOGLE_*` (Google ya no vive en la landing).
- **Paso B**: en vez de `PATCH /api/leads/[id]` con datos de Google, llamar
  `POST {LMS}/api/leads/[id]/book { start_at, tz_iana, duration }`.
- **Disponibilidad real**: `getAvailableSlots()` (hoy mockup en `lib/survey-calendar.ts`)
  pasa a `GET {LMS}/api/leads/availability`.
- La pantalla de éxito muestra el `meeting_link` que devuelve `/book`.
- La landing mantiene solo `LMS_API_URL` + `LEADS_API_KEY`.

> Lo aplico en cuanto el LMS exponga `/api/leads/availability` y `/api/leads/[id]/book`,
> cuadrando nombres de campo.

---

## 13. Sub-fases de implementación (orden, con archivos reales)

| # | Alcance | Archivos |
|---|---|---|
| **1.0** | Schema + migración | `prisma/schema.prisma` (CalendarConnection + User), `prisma/migrations/<ts>_add_calendar_connections/` |
| **1.1** | Cripto + tokens | `src/lib/calendar/crypto.ts`, `tokens.ts`, `types.ts` |
| **1.2** | Proveedor Google | `src/lib/calendar/google.ts` (OAuth client, createEvent, freeBusy, refresh) |
| **1.3** | OAuth connect/callback + botón | `src/app/api/integrations/google/connect/route.ts`, `.../callback/route.ts`, botón en `/admin` |
| **1.4** | Disponibilidad | `src/lib/calendar/availability.ts`, `src/app/api/leads/availability/route.ts` |
| **1.5** | Booking + round-robin | `src/lib/calendar/assignment.ts`, `src/app/api/leads/[id]/book/route.ts` |
| **1.6** | Vista por asignado | `src/app/admin/leads/*` (filtro + agenda) |
| **1.7** | Env + cablear landing | `.env(.example)`; (landing) `actions.ts` + `survey-calendar.ts` |

---

## 14. Verificación

1. `npx tsc --noEmit` limpio.
2. Iván y yo conectamos cada uno nuestro Google (`CalendarConnection.status='active'`).
3. `GET /api/leads/availability` devuelve slots reales (respeta free/busy de ambos).
4. Reservar 2 veces seguidas → se **alternan** los asignados (round-robin) y cada evento
   aparece en el **calendario del asignado** con Meet y con el lead invitado.
5. `/admin/leads` muestra las reuniones; el filtro **Iván / Yo / Todos** funciona.
6. Slot ocupado por ambos → `409 slot_taken`.
7. Token revocado de un miembro → se excluye de disponibilidad y se avisa.

---

## 15. Preparación para Fase 2 (no construir ahora)

- **Multi-tenant:** añadir `org_id` a `User/Lead/CalendarConnection` y filtrar por tenant.
- **Verificación OAuth** de Google (scope sensible) al abrir a empresas externas.
- **Microsoft 365/Outlook:** implementar `CalendarProvider` para `MICROSOFT` (Graph) — la
  abstracción de `src/lib/calendar/types.ts` ya lo permite.
- **Tabla `Meeting` dedicada** (multireuniones por lead, reprogramaciones, historial) en vez
  de los campos inline del `Lead`.
- **Estrategias de asignación** por org (prioridad, equipos, skills).

---

## 16. Decisiones — RESUELTAS

1. ✅ **Horarios:** per-member; Iván y yo = `America/Bogota`, **L–V 09:00–18:00**. La
   disponibilidad de Iván queda anclada a Colombia aunque viaje (su free/busy es absoluto).
2. ✅ **Duración:** 45 min.
3. ✅ **"Yo"** soy `ADMIN` igual que Iván → ambos `role=ADMIN`, `lead_booking_enabled=true`.
   Mi `User` admin: **`devtest.ao2021@gmail.com`**. (El de Iván: confirmar su email del LMS.)
4. ✅ **`PATCH /api/leads/[id]`:** se conserva, **re-enfocado a edición manual del CRM por
   admin** (auth NextAuth + `canAccessCRM`); la landing ya no lo usa.
5. ✅ **Working hours:** **per-member** (`User.booking_timezone` + `User.working_hours`).

Seed Fase 1: marcar `lead_booking_enabled=true`, `booking_timezone='America/Bogota'` y
`working_hours` (L–V 09–18) a `devtest.ao2021@gmail.com` y al `User` de Iván; luego cada
uno conecta su Google desde `/admin`.
