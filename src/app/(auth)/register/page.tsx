'use client'

import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useState } from 'react'
import { UserPlus } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

export default function RegisterPage() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const invite = searchParams.get('invite')
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault()
        setError('')
        setLoading(true)

        const form = e.currentTarget
        const password = (form.elements.namedItem('password') as HTMLInputElement).value
        const confirm = (form.elements.namedItem('confirm') as HTMLInputElement).value

        if (password !== confirm) {
            setError('Las contraseñas no coinciden')
            setLoading(false)
            return
        }

        const res = await fetch('/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: (form.elements.namedItem('name') as HTMLInputElement).value,
                last_name: (form.elements.namedItem('last_name') as HTMLInputElement).value,
                username: (form.elements.namedItem('username') as HTMLInputElement).value,
                email: (form.elements.namedItem('email') as HTMLInputElement).value,
                phone: (form.elements.namedItem('phone') as HTMLInputElement).value,
                password,
                ...(invite ? { invite } : {}),
            }),
        })

        const data = await res.json()

        if (!res.ok) {
            setError(data.error || 'Algo salió mal. Intenta de nuevo.')
            setLoading(false)
            return
        }

        router.push('/login?registered=1')
    }

    return (
        <div
            className="min-h-screen flex items-center justify-center px-4 py-12"
            style={{ background: 'var(--bg-base)' }}
        >
            <div className="w-full max-w-lg">
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
                    {invite && (
                        <div className="mb-6 flex items-center gap-3 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
                            <span className="material-symbols-outlined text-emerald-400 text-xl shrink-0" style={{ fontVariationSettings: "'FILL' 1" }}>verified</span>
                            <p className="text-sm text-emerald-400 font-medium">
                                Has sido invitado a Growth Sales Academy
                            </p>
                        </div>
                    )}

                    <div className="mb-7">
                        <h2 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
                            {invite ? 'Completa tu registro' : 'Únete a la Academia'}
                        </h2>
                        <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
                            {invite ? 'Crea tu cuenta para acceder a los cursos' : 'Crea tu cuenta gratuita y empieza a aprender'}
                        </p>
                    </div>

                    <form className="space-y-4" onSubmit={handleSubmit}>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <Input label="Nombre" name="name" type="text" required placeholder="Juan" />
                            <Input label="Apellido" name="last_name" type="text" required placeholder="Pérez" />
                        </div>

                        <Input
                            label="Usuario"
                            name="username"
                            type="text"
                            required
                            placeholder="juanperez"
                            autoComplete="username"
                        />

                        <Input
                            label="Email"
                            name="email"
                            type="email"
                            required
                            placeholder="juan@email.com"
                            autoComplete="email"
                        />

                        <Input
                            label="Teléfono"
                            name="phone"
                            type="tel"
                            placeholder="+1 234 567 8900"
                        />

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <Input
                                label="Contraseña"
                                name="password"
                                type="password"
                                required
                                placeholder="••••••••"
                                autoComplete="new-password"
                            />
                            <Input
                                label="Confirmar"
                                name="confirm"
                                type="password"
                                required
                                placeholder="••••••••"
                                autoComplete="new-password"
                            />
                        </div>

                        {error && (
                            <p className="text-sm text-center rounded-xl p-3"
                                style={{ color: 'var(--error)', background: 'rgba(239,68,68,0.08)' }}>
                                {error}
                            </p>
                        )}

                        <Button
                            type="submit"
                            loading={loading}
                            className="w-full justify-center mt-2"
                            icon={!loading ? <UserPlus size={16} /> : undefined}
                        >
                            {loading ? 'Creando cuenta...' : 'Crear cuenta'}
                        </Button>
                    </form>

                    <p className="mt-6 text-center text-sm" style={{ color: 'var(--text-secondary)' }}>
                        ¿Ya tienes cuenta?{' '}
                        <Link
                            href="/login"
                            className="font-semibold transition-colors"
                            style={{ color: 'var(--blue-accent)' }}
                        >
                            Ingresar
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
