import {
    Body,
    Container,
    Head,
    Hr,
    Html,
    Img,
    Link,
    Preview,
    Section,
    Text,
} from '@react-email/components'
import type { ReactNode } from 'react'

interface Props {
    preview: string
    children: ReactNode
    logoUrl?: string
    supportEmail?: string
}

function shouldUseImageLogo(url?: string): boolean {
    if (!url) return false
    return !url.includes('localhost') && !url.includes('127.0.0.1')
}

/**
 * Shared dark-themed wrapper for GSA transactional emails.
 *
 * Provides:
 *  - dark body matching the landing palette
 *  - logo header (image when running on a public URL, brand-gradient "GS" badge as
 *    fallback in localhost — Gmail can't reach the dev machine to render the image)
 *  - footer with support email + brand line
 *
 * Inline styles only — most email clients ignore stylesheets.
 */
export function EmailLayout({
    preview,
    children,
    logoUrl,
    supportEmail = 'soporte@growthsalessacademy.com',
}: Props) {
    const useImage = shouldUseImageLogo(logoUrl)

    return (
        <Html lang="es">
            <Head />
            <Preview>{preview}</Preview>
            <Body style={body}>
                <Container style={container}>
                    {/* Header */}
                    <Section style={header}>
                        {useImage ? (
                            <Img
                                src={logoUrl}
                                alt="Growth Sales Academy"
                                width="56"
                                height="56"
                                style={logoImage}
                            />
                        ) : (
                            <Text style={logoBadge}>GS</Text>
                        )}
                        <Text style={brandName}>
                            <span style={brandPrimary}>Growth Sales</span>
                            {' '}
                            <span style={brandAccent}>ACADEMY</span>
                        </Text>
                    </Section>

                    {/* Content (banner + card provided by the email itself) */}
                    {children}

                    {/* Footer */}
                    <Hr style={divider} />
                    <Section style={footer}>
                        <Text style={footerStrong}>¿Tienes alguna duda?</Text>
                        <Text style={footerText}>
                            Escríbenos a{' '}
                            <Link href={`mailto:${supportEmail}`} style={footerLink}>{supportEmail}</Link>
                            {' '}y te ayudamos.
                        </Text>
                        <Text style={footerMuted}>
                            Growth Sales Academy · Correo transaccional automático
                        </Text>
                    </Section>
                </Container>
            </Body>
        </Html>
    )
}

const body: React.CSSProperties = {
    backgroundColor: '#080d18',
    fontFamily:
        '-apple-system, BlinkMacSystemFont, "Segoe UI", "Inter", Roboto, "Helvetica Neue", Arial, sans-serif',
    margin: 0,
    padding: '32px 0',
    color: '#dee2f2',
}

const container: React.CSSProperties = {
    maxWidth: 600,
    margin: '0 auto',
    padding: '0 16px',
}

const header: React.CSSProperties = {
    textAlign: 'center',
    padding: '8px 0 24px',
}

const logoImage: React.CSSProperties = {
    display: 'inline-block',
    height: 56,
    width: 'auto',
    margin: '0 auto 8px',
}

const logoBadge: React.CSSProperties = {
    display: 'inline-block',
    width: 56,
    height: 56,
    lineHeight: '56px',
    textAlign: 'center',
    margin: '0 auto 8px',
    borderRadius: 12,
    background: 'linear-gradient(135deg, #38bdf8, #818cf8)',
    color: '#0a1020',
    fontSize: 22,
    fontWeight: 800,
    letterSpacing: -1,
}

const brandName: React.CSSProperties = {
    margin: 0,
    fontSize: 13,
    letterSpacing: 0.3,
    color: '#9ca3b8',
}

const brandPrimary: React.CSSProperties = {
    color: '#dee2f2',
    fontWeight: 600,
}

const brandAccent: React.CSSProperties = {
    color: '#38bdf8',
    fontWeight: 600,
    fontSize: 11,
    letterSpacing: 1.5,
    fontFamily: '"JetBrains Mono", ui-monospace, monospace',
}

const divider: React.CSSProperties = {
    borderColor: 'rgba(129,140,248,0.12)',
    margin: '28px 0 16px',
}

const footer: React.CSSProperties = {
    textAlign: 'center',
}

const footerStrong: React.CSSProperties = {
    margin: '0 0 4px',
    fontSize: 13,
    color: '#dee2f2',
    fontWeight: 600,
}

const footerText: React.CSSProperties = {
    margin: '0 0 14px',
    fontSize: 13,
    color: '#9ca3b8',
    lineHeight: 1.5,
}

const footerLink: React.CSSProperties = {
    color: '#38bdf8',
    textDecoration: 'underline',
}

const footerMuted: React.CSSProperties = {
    margin: '8px 0 0',
    fontSize: 11,
    color: '#5a6178',
    fontFamily: '"JetBrains Mono", ui-monospace, monospace',
    letterSpacing: 0.4,
}
