import { Heading, Link, Section, Text } from '@react-email/components'
import type { CloserType } from '@prisma/client'
import { EmailLayout } from './_layout'

interface Props {
    inviteeName?: string | null
    inviteUrl: string
    closerType: CloserType | null
    isFree: boolean
    logoUrl?: string
}

export function InvitationEmail({
    inviteeName,
    inviteUrl,
    closerType,
    isFree,
    logoUrl,
}: Props) {
    const greeting = inviteeName ? `Hola, ${inviteeName}` : 'Hola'

    const COPY = {
        student: {
            kicker: '● TE INVITAMOS',
            title: 'Te damos la bienvenida a Growth Sales Academy',
            body: (
                <>
                    Has sido invitado a unirte a <strong style={brandStrong}>Growth Sales Academy</strong>,
                    la academia donde formamos closers conscientes con ingresos reales y transformación real.
                    Al completar el registro tendrás acceso inmediato a tu plan de formación.
                </>
            ),
        },
        crm_only: {
            kicker: '● INVITACIÓN COMO CLOSER',
            title: 'Te invitamos a unirte como Closer del equipo',
            body: (
                <>
                    Has sido invitado a integrarte al equipo de closers de{' '}
                    <strong style={brandStrong}>Growth Sales Academy</strong>. Tendrás acceso al CRM de
                    ventas para registrar tus deals, gestionar comisiones y a la sección del Método.
                </>
            ),
        },
        crm_and_courses: {
            kicker: '● INVITACIÓN COMO CLOSER',
            title: 'Te invitamos a unirte como Closer del equipo',
            body: (
                <>
                    Has sido invitado a integrarte al equipo de closers de{' '}
                    <strong style={brandStrong}>Growth Sales Academy</strong>, con acceso completo a la
                    formación de la academia y al CRM de ventas para registrar tus deals y gestionar
                    tus comisiones.
                </>
            ),
        },
    } as const

    const variant: keyof typeof COPY =
        closerType === 'CRM_ONLY' ? 'crm_only' :
        closerType === 'CRM_AND_COURSES' ? 'crm_and_courses' :
        'student'
    const copy = COPY[variant]

    return (
        <EmailLayout
            preview={`Has sido invitado a Growth Sales Academy`}
            logoUrl={logoUrl}
        >
            {/* Banner */}
            <Section style={banner}>
                <Text style={bannerKicker}>{copy.kicker}</Text>
                <Heading style={bannerTitle}>{copy.title}</Heading>
            </Section>

            {/* Card */}
            <Section style={card}>
                <Heading as="h2" style={h2}>{greeting}</Heading>
                <Text style={p}>{copy.body}</Text>

                <Text style={p}>
                    Para activar tu cuenta y empezar, completa tu registro con tu nombre y contraseña
                    desde el botón de abajo.
                </Text>

                {/* CTA */}
                <Section style={ctaWrap}>
                    <Link href={inviteUrl} style={ctaButton}>
                        Activar mi cuenta →
                    </Link>
                </Section>

                {isFree && (
                    <Text style={pInfo}>
                        Esta es una invitación de cortesía: no se te cobrará nada al activar tu cuenta.
                    </Text>
                )}

                <Text style={pMuted}>
                    Si el botón no funciona, copia este enlace en tu navegador:
                    <br />
                    <Link href={inviteUrl} style={link}>{inviteUrl}</Link>
                </Text>

                <Text style={pSmall}>
                    Este enlace es único y de un solo uso. Si recibiste este correo por error,
                    puedes ignorarlo con tranquilidad.
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
    fontSize: 24,
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
    margin: '0 0 16px',
    fontSize: 15,
    lineHeight: 1.65,
    color: '#c4c5d5',
}

const pInfo: React.CSSProperties = {
    margin: '4px 0 12px',
    padding: '10px 14px',
    fontSize: 13,
    lineHeight: 1.55,
    color: '#fbbf24',
    backgroundColor: 'rgba(245,158,11,0.06)',
    border: '1px solid rgba(245,158,11,0.25)',
    borderRadius: 10,
}

const pMuted: React.CSSProperties = {
    margin: '20px 0 0',
    fontSize: 12,
    lineHeight: 1.55,
    color: '#7a8094',
}

const pSmall: React.CSSProperties = {
    margin: '14px 0 0',
    fontSize: 11.5,
    lineHeight: 1.55,
    color: '#5a6178',
}

const ctaWrap: React.CSSProperties = {
    textAlign: 'center',
    padding: '12px 0 4px',
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

const brandStrong: React.CSSProperties = {
    color: '#38bdf8',
    fontWeight: 600,
}
