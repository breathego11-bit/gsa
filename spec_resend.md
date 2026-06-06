# Resend — Spec Técnico

## Contexto

El cliente quiere enviar correos transaccionales desde la academia. Hoy no existe ninguna integración de email — ni librería, ni helpers, ni templates. Esta primera fase cubre dos casos concretos: **correo de bienvenida** al registrarse un usuario y **recordatorio de cuota** 7 días antes del vencimiento. La infra debe quedar lista para añadir más correos transaccionales sin tocar el wiring central.

## Decisiones clave

- **Proveedor**: [Resend](https://resend.com) — buen DX, free tier de 3k/mes, integración nativa con React Email.
- **Templates en código** (no en el dashboard de Resend) usando `@react-email/components`. Razón: las plantillas viajan con el deploy y el handoff al cliente no requiere recrearlas manualmente en su cuenta.
- **Helper centralizado** `src/lib/email.ts` que envuelve la SDK de Resend, lee env vars y expone `sendEmail()`. Todo el código llama a este helper, nunca importa `resend` directamente.
- **Cron de recordatorios via VPS**: el host (Ubuntu) tiene `cron` nativo. Configuraremos una entrada diaria que haga `curl` a un endpoint protegido (`POST /api/cron/payment-reminders`) con un header `Authorization: Bearer ${CRON_SECRET}`. Alternativa rechazada: `node-cron` en proceso — duplica timers en cada hot-reload y no sobrevive a reinicios sin tracking explícito.
- **Idempotencia** en el reminder: nuevo campo `Payment.reminder_sent_at` para no enviar el mismo recordatorio dos veces si el cron falla parcialmente o se ejecuta más de una vez por día.
- **Failure handling**: log estructurado (no rompe el flujo del request principal). Welcome email falla silenciosamente al crear el usuario — el registro completa exitoso aunque el email falle, y se loguea. El cron loguea por payment y devuelve un resumen.
- **Sandbox del dev**: usamos tu API key de Resend con tu dominio personal verificado. El handoff al cliente es solo cambiar `RESEND_API_KEY` y `EMAIL_FROM` en el `.env` del VPS.

## Schema

**Nueva migración**: `add_payment_reminder_sent_at`
- `Payment.reminder_sent_at DateTime?` — timestamp del último envío del recordatorio. `null` = nunca enviado. Sirve como flag de idempotencia.

## Variables de entorno (.env.example)

```env
# Resend
RESEND_API_KEY=re_xxx                           # API key con permiso "Sending access"
EMAIL_FROM="Growth Sales Academy <noreply@tu-dominio.com>"
EMAIL_REPLY_TO=soporte@tu-dominio.com           # opcional

# Cron protection
CRON_SECRET=<32-char random>                    # openssl rand -base64 32
```

## Dependencias

```bash
npm install resend @react-email/components @react-email/render
```

## Archivos

### Crear

- [src/lib/email.ts](src/lib/email.ts)
  ```ts
  // sendEmail({ to, subject, react, replyTo? }): Promise<{ ok: boolean; id?: string; error?: string }>
  // Lee RESEND_API_KEY, EMAIL_FROM, EMAIL_REPLY_TO. Renderiza el JSX con @react-email/render → HTML.
  // No lanza excepciones — devuelve { ok: false, error } para que el caller decida si seguir o no.
  ```

- [src/emails/_layout.tsx](src/emails/_layout.tsx) — wrapper común (header, footer, brand colors GSA — cyan/indigo).

- [src/emails/WelcomeEmail.tsx](src/emails/WelcomeEmail.tsx)
  - Props: `{ firstName: string; dashboardUrl: string }`
  - Contenido: saludo + "bienvenida a la academia" + CTA "Entrar a la academia" → `dashboardUrl`.

- [src/emails/PaymentReminderEmail.tsx](src/emails/PaymentReminderEmail.tsx)
  - Props: `{ firstName: string; installmentNumber: number; amountEur: string; dueDate: Date; paymentUrl: string }`
  - Contenido: recordatorio de cuota N · monto · fecha · CTA "Pagar ahora" → `paymentUrl`.

- [src/app/api/cron/payment-reminders/route.ts](src/app/api/cron/payment-reminders/route.ts)
  - `POST` protegido por `Authorization: Bearer ${CRON_SECRET}` (responde 401 si no coincide).
  - Busca `Payment` con: `payment_type = 'installment'`, `status = 'pending'`, `due_date` entre **hoy+6** y **hoy+8** (ventana de 48h por si el cron se atrasa), y `reminder_sent_at IS NULL`.
  - Para cada uno: envía el email vía helper, y si `ok` actualiza `reminder_sent_at = now()`.
  - Devuelve JSON: `{ checked: N, sent: M, failed: K, errors: [...] }`.

### Modificar

- [src/app/api/auth/register/route.ts](src/app/api/auth/register/route.ts) (línea 39, después del `prisma.user.create`)
  - Tras crear el usuario, llamar `sendEmail({ to: user.email, subject: 'Bienvenido a GSA', react: <WelcomeEmail firstName={user.name} dashboardUrl={`${NEXTAUTH_URL}/dashboard`} /> })`.
  - Envuelto en try/catch — si falla, log y continuar (no bloquea el registro).

- [src/app/api/admin/team/route.ts](src/app/api/admin/team/route.ts) (línea 50)
  - Cuando un admin crea un nuevo miembro del equipo (admin u otro rol), enviar también el welcome email con la misma plantilla. Mismo patrón.

- `.env.example` — añadir las 4 variables nuevas.

### NO se toca

- `prisma/schema.prisma` excepto la columna `reminder_sent_at`.
- Layouts, componentes UI, demás endpoints.

## Cron setup en el VPS

Una sola línea en `crontab -e` del usuario que corre Docker (root o `ubuntu`):

```cron
# Cada día a las 09:00 hora del servidor — recordatorios de cuotas (7 días antes)
0 9 * * * curl -s -X POST -H "Authorization: Bearer ${CRON_SECRET}" https://gsa.com/api/cron/payment-reminders >> /var/log/gsa-cron.log 2>&1
```

`CRON_SECRET` se exporta en `/etc/environment` o se hardcodea en la línea (con permisos restrictivos en el crontab).

Alternativa portable: añadir un servicio `cron` al `docker-compose.yml` con la misma línea — más reproducible pero un container más.

## Flujos end-to-end

### Welcome email

1. Usuario hace POST a `/api/auth/register` con sus datos.
2. Endpoint valida + crea `User` en DB.
3. Inmediatamente después, llama `sendEmail` con `WelcomeEmail`.
4. Email sale por Resend → llega al inbox del usuario en segundos.
5. Si Resend falla, se loguea y la respuesta al frontend igual es exitosa (el usuario ya quedó creado).

### Payment reminder

1. Cron del VPS dispara `POST /api/cron/payment-reminders` cada día 09:00.
2. Endpoint verifica `Authorization: Bearer ${CRON_SECRET}`.
3. Query: cuotas pendientes con `due_date` ∈ `[hoy+6, hoy+8]` y sin `reminder_sent_at`.
4. Para cada cuota: obtener el `User` dueño, calcular el `paymentUrl` (apunta a Stripe checkout o al portal interno), enviar `PaymentReminderEmail`.
5. Marcar `reminder_sent_at = now()` solo si el envío fue exitoso.
6. Responder con resumen JSON (también queda en `/var/log/gsa-cron.log`).

## Verificación

1. **Helper aislado**: `npm run dev` + visitar `http://localhost:3000/api/test-email?to=tu-correo@gmail.com` (endpoint temporal de debug, se borra antes de prod). Confirmar que llega el email.
2. **Welcome email end-to-end**: registrar un usuario de prueba desde `/register` con un email tuyo → verificar inbox en ~5s.
3. **Cron endpoint manual**: con curl + el `CRON_SECRET` correcto, hacer POST a `/api/cron/payment-reminders`. Crear una `Payment` de prueba en DB con `due_date` = hoy+7, status=pending. Verificar que llega el email y que `reminder_sent_at` queda poblado.
4. **Idempotencia**: ejecutar el curl 2 veces seguidas → el segundo no debe re-enviar (porque `reminder_sent_at IS NULL` ya no aplica).
5. **Cron del VPS**: `sudo crontab -l` para verificar la línea instalada. Esperar al día siguiente o forzar `cron` con `sudo systemctl restart cron` + ajustar a `* * * * *` temporalmente para probar.
6. **TypeScript**: `npx tsc --noEmit` debe pasar limpio.

## Handoff al cliente

Cuando el cliente esté listo:
1. Cliente crea cuenta en resend.com, verifica su dominio.
2. Cliente genera su API key (`Sending access` only).
3. Tú actualizas en el VPS: `RESEND_API_KEY` y `EMAIL_FROM` con el dominio del cliente. Reinicias el contenedor (`docker compose restart app`).
4. Tú revocas el API key dev en tu cuenta de Resend.
5. Las plantillas y la lógica siguen idénticas — solo cambia el remitente.

## Fuera de scope (siguientes correos posibles)

- Confirmación de pago exitoso (post-checkout Stripe).
- Notificación al closer cuando registra una nueva venta.
- Reseteo de contraseña.
- Recordatorio de lección incompleta (engagement).
- Cuota vencida (post due_date) — distinto al recordatorio previo.
- Notificación al admin de evento crítico (estudiante bloqueado, pago fallido).

Cualquiera de estos se añade con el mismo patrón: nueva plantilla en `src/emails/` + trigger en el flujo correspondiente + opcional flag de idempotencia.
