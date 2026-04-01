import './globals.css'
import { Inter } from 'next/font/google'
import { Providers } from '@/components/layout/Providers'

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
    title: 'GSA — Growth Sales Academy',
    description: 'Plataforma de formación en ventas de alto rendimiento.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="es">
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
