import './globals.css'
import type { Metadata, Viewport } from 'next'
import { Inter, Instrument_Serif, JetBrains_Mono } from 'next/font/google'
import { Providers } from '@/components/layout/Providers'

const inter = Inter({ subsets: ['latin'] })
const instrumentSerif = Instrument_Serif({
    subsets: ['latin'],
    weight: '400',
    style: ['normal', 'italic'],
    variable: '--font-instrument-serif',
})
const jetbrainsMono = JetBrains_Mono({
    subsets: ['latin'],
    variable: '--font-jetbrains-mono',
})

export const metadata: Metadata = {
    metadataBase: new URL(process.env.NEXTAUTH_URL ?? 'http://localhost:3000'),
    title: 'GSA — Growth Sales Academy',
    description: 'Plataforma de formación en ventas de alto rendimiento.',
}

/*
 * `viewportFit: 'cover'` es lo que hace que `env(safe-area-inset-*)` deje de
 * resolver a 0px en iPhone con notch. Sin esto, las utilidades `.pb-bottom-nav`
 * y `.bottom-above-nav` de globals.css no protegen el home indicator.
 * No se define `maximumScale` ni `userScalable`: el zoom debe seguir permitido.
 */
export const viewport: Viewport = {
    width: 'device-width',
    initialScale: 1,
    viewportFit: 'cover',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="es" className={`${instrumentSerif.variable} ${jetbrainsMono.variable}`}>
            <head>
                <link
                    href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
                    rel="stylesheet"
                />
            </head>
            <body className={`${inter.className} min-h-screen antialiased`} style={{ background: 'var(--bg-base)', color: 'var(--text-primary)' }}>
                <Providers>{children}</Providers>
            </body>
        </html>
    )
}
