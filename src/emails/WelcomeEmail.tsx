import { Heading, Link, Section, Text } from '@react-email/components'
import { EmailLayout } from './_layout'

interface Props {
    firstName: string
    dashboardUrl: string
    logoUrl?: string
}

export function WelcomeEmail({ firstName, dashboardUrl, logoUrl }: Props) {
    const greeting = firstName ? `Hola, ${firstName}` : 'Hola'

    return (
        <EmailLayout preview="Bienvenido a Growth Sales Academy" logoUrl={logoUrl}>
            {/* Banner */}
            <Section style={banner}>
                <Text style={bannerKicker}>● BIENVENIDO A GROWTH SALES ACADEMY</Text>
                <Heading style={bannerTitle}>Aquí comienza tu transformación</Heading>
            </Section>

            {/* Card */}
            <Section style={card}>
                <Heading as="h2" style={h2}>{greeting}</Heading>
                <Text style={p}>
                    Bienvenido a <strong style={strong}>Growth Sales Academy</strong>.
                </Text>
                <Text style={p}>
                    Acabas de dar el primer paso para desarrollar una de las habilidades más importantes
                    para tu vida profesional: aprender a vender con claridad, estructura y confianza.
                </Text>
                <Text style={p}>
                    Tu cuenta ya está activa y lista para empezar.
                </Text>
                <Text style={p}>
                    Dentro de la academia podrás acceder a tus módulos, ver el vídeo de bienvenida,
                    completar tu perfil y comenzar con las primeras clases del programa.
                </Text>
                <Text style={p}>
                    Mi recomendación es que no consumas esta formación como simple contenido. Entra con
                    mentalidad de práctica, toma notas y aplica cada clase a conversaciones reales.
                </Text>

                <Section style={ctaWrap}>
                    <Link href={dashboardUrl} style={ctaButton}>
                        Entrar a la academia →
                    </Link>
                </Section>

                <Text style={pMuted}>
                    Si el botón no funciona, copia este enlace en tu navegador:
                    <br />
                    <Link href={dashboardUrl} style={link}>{dashboardUrl}</Link>
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
    margin: '0 0 14px',
    fontSize: 15,
    lineHeight: 1.6,
    color: '#c4c5d5',
}

const strong: React.CSSProperties = {
    color: '#38bdf8',
    fontWeight: 600,
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

const pMuted: React.CSSProperties = {
    margin: '24px 0 0',
    fontSize: 12,
    lineHeight: 1.55,
    color: '#7a8094',
}

const link: React.CSSProperties = {
    color: '#38bdf8',
    wordBreak: 'break-all',
    textDecoration: 'underline',
}
