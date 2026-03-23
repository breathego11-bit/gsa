import '../globals.css';
import { Inter } from 'next/font/google';

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
    title: 'Growth Sales Academy',
    description: 'Premium Sales Training & Personal Development',
}

export default function RootLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <html lang="en">
            <body className={`${inter.className} min-h-screen bg-black text-white antialiased`}>
                {children}
            </body>
        </html>
    )
}
