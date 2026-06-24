import { Heading, Link, Section, Text } from '@react-email/components'
import { EmailLayout } from './_layout'

interface Props {
    firstName: string
    installmentNumber: number
    amountEur: string   // pre-formatted, e.g. "€333,33"
    dueDate: Date
    paymentUrl: string
    logoUrl?: string
}

function formatDateEs(d: Date): string {
    return d.toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' })
}

export function PaymentReminderEmail({
    firstName,
    installmentNumber,
    amountEur,
    dueDate,
    paymentUrl,
    logoUrl,
}: Props) {
    const greeting = firstName ? `Hola, ${firstName}` : 'Hola'
    const dueLabel = formatDateEs(dueDate)

    return (
        <EmailLayout
            preview="Puedes completar el pago desde tu panel antes de la fecha límite."
            logoUrl={logoUrl}
        >
            {/* Banner */}
            <Section style={banner}>
                <Text style={bannerKicker}>● RECORDATORIO DE PAGO</Text>
                <Heading style={bannerTitle}>Tu cuota vence en 7 días</Heading>
            </Section>

            {/* Card */}
            <Section style={card}>
                <Heading as="h2" style={h2}>{greeting}</Heading>
                <Text style={p}>
                    Te escribimos para recordarte que tu próxima cuota de{' '}
                    <strong style={strong}>Growth Sales Academy</strong> está próxima a vencer.
                </Text>
                <Text style={p}>
                    Para mantener tu acceso activo al programa y continuar avanzando sin interrupciones,
                    puedes completar el pago desde tu panel antes de la fecha límite.
                </Text>
                <Text style={p}>
                    A continuación tienes el resumen de tu cuota:
                </Text>

                {/* Resumen de la cuota */}
                <Section style={summary}>
                    <table style={summaryTable} cellPadding={0} cellSpacing={0}>
                        <tbody>
                            <tr>
                                <td style={summaryKey}>Cuota</td>
                                <td style={summaryVal}>#{installmentNumber}</td>
                            </tr>
                            <tr>
                                <td style={summaryKey}>Monto</td>
                                <td style={summaryValHighlight}>{amountEur}</td>
                            </tr>
                            <tr>
                                <td style={summaryKey}>Fecha límite</td>
                                <td style={summaryVal}>{dueLabel}</td>
                            </tr>
                        </tbody>
                    </table>
                </Section>

                {/* CTA */}
                <Section style={ctaWrap}>
                    <Link href={paymentUrl} style={ctaButton}>
                        Pagar ahora →
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
                    Si tienes alguna duda con tu pago, responde a este correo y te ayudaremos a revisarlo.
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
