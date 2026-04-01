'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { signIn, getSession } from 'next-auth/react'
import { useState } from 'react'
import { ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

export default function LoginPage() {
    const router = useRouter()
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault()
        setError('')
        setLoading(true)

        const form = e.currentTarget
        const email = (form.elements.namedItem('email') as HTMLInputElement).value
        const password = (form.elements.namedItem('password') as HTMLInputElement).value

        const res = await signIn('credentials', { email, password, redirect: false })

        if (res?.error) {
            setError('Email o contraseña incorrectos')
            setLoading(false)
            return
        }

        // Redirect based on role
        const session = await getSession()
        router.push(session?.user?.role === 'ADMIN' ? '/admin' : '/dashboard')
        router.refresh()
    }

    return (
        <div
            className="min-h-screen flex items-center justify-center px-4"
            style={{ background: 'var(--bg-base)' }}
        >
            <div className="w-full max-w-md">
                {/* Logo */}
                <div className="flex flex-col items-center mb-8">
                    <img
                        src="/logo_dark.png"
                        alt="Growth Sales Academy"
                        className="h-16 w-auto mb-4"
                    />
                    <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
                        GSA
                    </h1>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                        Growth Sales Academy
                    </p>
                </div>

                {/* Card */}
                <div
                    className="rounded-2xl border p-8 shadow-2xl"
                    style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}
                >
                    <div className="mb-7">
                        <h2 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
                            Bienvenido de vuelta
                        </h2>
                        <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
                            Ingresa tus credenciales para acceder a tus cursos
                        </p>
                    </div>

                    <form className="space-y-5" onSubmit={handleSubmit}>
                        <Input
                            label="Email"
                            name="email"
                            type="email"
                            required
                            placeholder="tu@email.com"
                            autoComplete="email"
                        />
                        <Input
                            label="Contraseña"
                            name="password"
                            type="password"
                            required
                            placeholder="••••••••"
                            autoComplete="current-password"
                        />

                        {error && (
                            <p className="text-sm text-center rounded-xl p-3"
                                style={{ color: 'var(--error)', background: 'rgba(239,68,68,0.08)' }}>
                                {error}
                            </p>
                        )}

                        <Button
                            type="submit"
                            loading={loading}
                            className="w-full justify-center"
                            icon={!loading ? <ArrowRight size={16} /> : undefined}
                        >
                            {loading ? 'Ingresando...' : 'Ingresar'}
                        </Button>
                    </form>

                    <p className="mt-6 text-center text-sm" style={{ color: 'var(--text-secondary)' }}>
                        ¿No tienes cuenta?{' '}
                        <Link
                            href="/register"
                            className="font-semibold transition-colors"
                            style={{ color: 'var(--blue-accent)' }}
                        >
                            Regístrate
                        </Link>
                    </p>
                </div>

                <p className="mt-6 text-center text-xs" style={{ color: 'var(--text-secondary)' }}>
                    <Link href="/" style={{ color: 'var(--text-secondary)' }} className="hover:underline">
                        ← Volver al inicio
                    </Link>
                </p>
            </div>
        </div>
    )
}
