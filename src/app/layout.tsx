import './globals.css'
import type { Metadata } from 'next'
import { Inter, Instrument_Serif } from 'next/font/google'
import { Providers } from '@/components/layout/Providers'

const inter = Inter({ subsets: ['latin'] })
const instrumentSerif = Instrument_Serif({
    subsets: ['latin'],
    weight: '400',
    style: ['normal', 'italic'],
    variable: '--font-instrument-serif',
})

export const metadata: Metadata = {
    metadataBase: new URL(process.env.NEXTAUTH_URL ?? 'http://localhost:3000'),
    title: 'GSA — Growth Sales Academy',
    description: 'Plataforma de formación en ventas de alto rendimiento.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="es" className={instrumentSerif.variable}>
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
