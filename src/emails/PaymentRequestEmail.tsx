import { Heading, Link, Section, Text } from '@react-email/components'
import { EmailLayout } from './_layout'

/**
 * Correo de cobro de un pago pendiente, en tres momentos (spec_invitation_payment.md):
 *   - `request` — el admin pulsa "Enviar enlace de pago" en la ficha del alumno.
 *   - `overdue` — la cuota venció: se avisa de la fecha en que se pausará el acceso.
 *   - `paused`  — pasó la gracia sin pagar: el acceso a los cursos queda pausado.
 * El enlace lleva siempre a /payment de GSA, no a Stripe (las sesiones caducan a las 24 h).
 */
export type PaymentRequestVariant = 'request' | 'overdue' | 'paused'

interface Props {
    variant: PaymentRequestVariant
    firstName: string
    concept: string     // "Cuota 2" / "Pago completo"
    amountEur: string   // pre-formatted, e.g. "500,00 €"
    dueDate: Date | null
    /** Solo `overdue`: día en que se pausa el acceso si no paga. */
    pauseDate?: Date | null
    paymentUrl: string
    logoUrl?: string
}

function formatDateEs(d: Date): string {
    // Las fechas de pausa son 00:00 UTC; en UTC se leen como el día correcto.
    return d.toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric', timeZone: 'UTC' })
}

export function PaymentRequestEmail({
    variant,
    firstName,
    concept,
    amountEur,
    dueDate,
    pauseDate,
    paymentUrl,
    logoUrl,
}: Props) {
    const greeting = firstName ? `Hola, ${firstName}` : 'Hola'

    const COPY = {
        request: {
            preview: 'Completa tu pago desde tu panel de Growth Sales Academy.',
            kicker: '● PAGO PENDIENTE',
            title: 'Tienes un pago pendiente',
            intro: (
                <Text style={p}>
                    Tienes un pago pendiente en <strong style={strong}>Growth Sales Academy</strong>. Puedes
                    completarlo de forma segura desde tu panel para acceder a los cursos.
                </Text>
            ),
            warning: null,
            cta: 'Pagar ahora →',
        },
        overdue: {
            preview: 'Tu cuota ha vencido. Págala para no perder el acceso a los cursos.',
            kicker: '● CUOTA VENCIDA',
            title: 'Tu cuota ha vencido',
            intro: (
                <Text style={p}>
                    No hemos recibido el pago de tu cuota de <strong style={strong}>Growth Sales Academy</strong>,
                    que ya ha vencido.
                </Text>
            ),
            warning: pauseDate ? (
                <Text style={pWarn}>
                    Si no la pagas antes del <strong>{formatDateEs(pauseDate)}</strong>, tu acceso a los cursos
                    se pausará. Tu progreso se conserva y lo recuperas en cuanto pagues.
                </Text>
            ) : null,
            cta: 'Pagar ahora →',
        },
        paused: {
            preview: 'Tu acceso a los cursos está pausado. Tu progreso se conserva.',
            kicker: '● ACCESO PAUSADO',
            title: 'Tu acceso está pausado',
            intro: (
                <Text style={p}>
                    Como la cuota sigue sin pagarse, hemos pausado tu acceso a los cursos de{' '}
                    <strong style={strong}>Growth Sales Academy</strong>.
                </Text>
            ),
            warning: (
                <Text style={pWarn}>
                    Tu progreso no se ha perdido: en cuanto pagues, recuperas el acceso y sigues exactamente
                    donde lo dejaste.
                </Text>
            ),
            cta: 'Pagar y recuperar el acceso →',
        },
    } as const
    const copy = COPY[variant]

    return (
        <EmailLayout preview={copy.preview} logoUrl={logoUrl}>
            {/* Banner */}
            <Section style={banner}>
                <Text style={bannerKicker}>{copy.kicker}</Text>
                <Heading style={bannerTitle}>{copy.title}</Heading>
            </Section>

            {/* Card */}
            <Section style={card}>
                <Heading as="h2" style={h2}>{greeting}</Heading>
                {copy.intro}
                {copy.warning}

                {/* Resumen del pago */}
                <Section style={summary}>
                    <table style={summaryTable} cellPadding={0} cellSpacing={0}>
                        <tbody>
                            <tr>
                                <td style={summaryKey}>Concepto</td>
                                <td style={summaryVal}>{concept}</td>
                            </tr>
                            <tr>
                                <td style={summaryKey}>Monto</td>
                                <td style={summaryValHighlight}>{amountEur}</td>
                            </tr>
                            {dueDate && (
                                <tr>
                                    <td style={summaryKey}>Vencimiento</td>
                                    <td style={summaryVal}>{formatDateEs(dueDate)}</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </Section>

                {/* CTA */}
                <Section style={ctaWrap}>
                    <Link href={paymentUrl} style={ctaButton}>
                        {copy.cta}
                    </Link>
                </Section>

                <Text style={pMuted}>
                    Al hacer clic entrarás a tu panel, donde podrás completar el pago de forma segura.
                    <br />
                    <br />
                    Si el botón no funciona, copia y pega este enlace en tu navegador:
                    <br />
                    <Link href={paymentUrl} style={link}>{paymentUrl}</Link>
                </Text>

                <Text style={pClosing}>
                    Si ya realizaste el pago o tienes alguna duda, responde a este correo y lo revisamos.
                </Text>
            </Section>
        </EmailLayout>
    )
}

/* ── Styles ─────────────────────────────────────────────────────────── */

const banner: React.CSSProperties = {
    background: 'linear-gradient(135deg, #38bdf8 0%, #3b82f6 50%, #818cf8 100%)',
    borderRadius: '16px 16px 0 0',
    padding: '28px 32px',
    textAlign: 'center',
}

const bannerKicker: React.CSSProperties = {
    margin: 0,
    fontSize: 11,
    letterSpacing: 2,
    color: '#ffffff',
    opacity: 0.9,
    fontWeight: 700,
    fontFamily: '"JetBrains Mono", ui-monospace, monospace',
}

const bannerTitle: React.CSSProperties = {
    margin: '8px 0 0',
    fontSize: 26,
    fontWeight: 700,
    color: '#ffffff',
    letterSpacing: -0.6,
    lineHeight: 1.2,
}

const card: React.CSSProperties = {
    backgroundColor: '#0e131e',
    border: '1px solid rgba(129,140,248,0.18)',
    borderTop: 'none',
    borderRadius: '0 0 16px 16px',
    padding: '32px 32px 28px',
    color: '#dee2f2',
}

const h2: React.CSSProperties = {
    margin: '0 0 12px',
    fontSize: 20,
    fontWeight: 600,
    color: '#dee2f2',
    letterSpacing: -0.4,
}

const p: React.CSSProperties = {
    margin: '0 0 18px',
    fontSize: 15,
    lineHeight: 1.6,
    color: '#c4c5d5',
}

const pMuted: React.CSSProperties = {
    margin: '24px 0 0',
    fontSize: 12,
    lineHeight: 1.55,
    color: '#7a8094',
}

const summary: React.CSSProperties = {
    backgroundColor: 'rgba(56,189,248,0.06)',
    border: '1px solid rgba(56,189,248,0.22)',
    borderRadius: 12,
    padding: '6px 18px',
    margin: '4px 0 24px',
}

const summaryTable: React.CSSProperties = {
    width: '100%',
    borderCollapse: 'collapse',
}

const summaryKey: React.CSSProperties = {
    padding: '12px 0',
    fontSize: 12,
    color: '#9ca3b8',
    letterSpacing: 0.3,
    fontFamily: '"JetBrains Mono", ui-monospace, monospace',
    textTransform: 'uppercase',
    textAlign: 'left',
    borderBottom: '1px dashed rgba(129,140,248,0.15)',
    width: '40%',
}

const summaryVal: React.CSSProperties = {
    padding: '12px 0',
    fontSize: 14,
    color: '#dee2f2',
    fontWeight: 600,
    textAlign: 'right',
    borderBottom: '1px dashed rgba(129,140,248,0.15)',
}

const summaryValHighlight: React.CSSProperties = {
    padding: '12px 0',
    fontSize: 18,
    color: '#38bdf8',
    fontWeight: 700,
    textAlign: 'right',
    borderBottom: '1px dashed rgba(129,140,248,0.15)',
    letterSpacing: -0.4,
}

const ctaWrap: React.CSSProperties = {
    textAlign: 'center',
    padding: '8px 0',
}

const ctaButton: React.CSSProperties = {
    display: 'inline-block',
    padding: '14px 32px',
    borderRadius: 12,
    background: 'linear-gradient(135deg, #38bdf8 0%, #3b82f6 50%, #818cf8 100%)',
    color: '#ffffff',
    fontSize: 15,
    fontWeight: 600,
    textDecoration: 'none',
    letterSpacing: 0.2,
}

const link: React.CSSProperties = {
    color: '#38bdf8',
    wordBreak: 'break-all',
    textDecoration: 'underline',
}

const strong: React.CSSProperties = {
    color: '#38bdf8',
    fontWeight: 600,
}

const pClosing: React.CSSProperties = {
    margin: '20px 0 0',
    paddingTop: 16,
    borderTop: '1px dashed rgba(129,140,248,0.15)',
    fontSize: 13,
    lineHeight: 1.55,
    color: '#9ca3b8',
}

const pWarn: React.CSSProperties = {
    margin: '0 0 18px',
    padding: '12px 16px',
    fontSize: 14,
    lineHeight: 1.55,
    color: '#fbbf24',
    backgroundColor: 'rgba(245,158,11,0.06)',
    border: '1px solid rgba(245,158,11,0.25)',
    borderRadius: 10,
}
