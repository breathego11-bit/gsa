'use client'

import { useState, useEffect } from 'react'
import { MaterialIcon } from '@/components/ui/MaterialIcon'

interface Admin {
    id: string
    name: string
    last_name: string
    email: string
    profile_image: string | null
    title: string | null
    created_at: string
    _count: { instructed_courses: number }
}

function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })
}

export function TeamClient() {
    const [admins, setAdmins] = useState<Admin[]>([])
    const [loading, setLoading] = useState(true)
    const [showForm, setShowForm] = useState(false)
    const [creating, setCreating] = useState(false)
    const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null)

    // Form state
    const [name, setName] = useState('')
    const [lastName, setLastName] = useState('')
    const [username, setUsername] = useState('')
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')

    useEffect(() => { fetchAdmins() }, [])

    async function fetchAdmins() {
        const res = await fetch('/api/admin/team')
        if (res.ok) setAdmins(await res.json())
        setLoading(false)
    }

    async function handleCreate(e: React.FormEvent) {
        e.preventDefault()
        setCreating(true)
        setMessage(null)
        try {
            const res = await fetch('/api/admin/team', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, last_name: lastName, username, email, password }),
            })
            if (res.ok) {
                setMessage({ text: 'Administrador creado exitosamente', type: 'success' })
                setShowForm(false)
                setName(''); setLastName(''); setUsername(''); setEmail(''); setPassword('')
                fetchAdmins()
            } else {
                const data = await res.json()
                setMessage({ text: data.error || 'Error al crear', type: 'error' })
            }
        } catch {
            setMessage({ text: 'Error de conexión', type: 'error' })
        } finally {
            setCreating(false)
            setTimeout(() => setMessage(null), 4000)
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="section-title">Equipo</h1>
                    <p className="section-subtitle">Administradores e instructores de la academia</p>
                </div>
                <button
                    onClick={() => setShowForm(!showForm)}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-primary-container to-secondary-container text-white font-bold text-sm hover:shadow-lg active:scale-95 transition-all"
                >
                    <MaterialIcon name="person_add" size="text-lg" />
                    Nuevo admin
                </button>
            </div>

            {/* Create form */}
            {showForm && (
                <div className="bg-surface-container-low rounded-2xl p-6 border border-outline-variant/15">
                    <h3 className="text-sm font-bold text-on-surface mb-4">Crear administrador</h3>
                    <form onSubmit={handleCreate} className="space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Nombre</label>
                                <input
                                    type="text" required value={name} onChange={e => setName(e.target.value)}
                                    className="w-full bg-surface-container-lowest border-none rounded-xl focus:ring-1 focus:ring-blue-500 text-sm py-3 px-4 text-on-surface"
                                    placeholder="Juan"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Apellido</label>
                                <input
                                    type="text" required value={lastName} onChange={e => setLastName(e.target.value)}
                                    className="w-full bg-surface-container-lowest border-none rounded-xl focus:ring-1 focus:ring-blue-500 text-sm py-3 px-4 text-on-surface"
                                    placeholder="Pérez"
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Usuario</label>
                                <input
                                    type="text" required value={username} onChange={e => setUsername(e.target.value)}
                                    className="w-full bg-surface-container-lowest border-none rounded-xl focus:ring-1 focus:ring-blue-500 text-sm py-3 px-4 text-on-surface"
                                    placeholder="juanperez"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Email</label>
                                <input
                                    type="email" required value={email} onChange={e => setEmail(e.target.value)}
                                    className="w-full bg-surface-container-lowest border-none rounded-xl focus:ring-1 focus:ring-blue-500 text-sm py-3 px-4 text-on-surface"
                                    placeholder="juan@email.com"
                                />
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Contraseña</label>
                            <input
                                type="password" required value={password} onChange={e => setPassword(e.target.value)}
                                className="w-full bg-surface-container-lowest border-none rounded-xl focus:ring-1 focus:ring-blue-500 text-sm py-3 px-4 text-on-surface"
                                placeholder="••••••••"
                            />
                            <p className="text-xs text-on-surface-variant">El admin podrá cambiarla después desde su perfil</p>
                        </div>
                        <div className="flex gap-3 pt-2">
                            <button type="button" onClick={() => setShowForm(false)}
                                className="flex-1 py-3 rounded-xl border border-outline-variant/20 text-on-surface-variant font-bold text-sm hover:bg-white/5 transition-all">
                                Cancelar
                            </button>
                            <button type="submit" disabled={creating}
                                className="flex-1 py-3 rounded-xl bg-primary text-on-primary font-bold text-sm hover:brightness-110 transition-all disabled:opacity-50">
                                {creating ? 'Creando...' : 'Crear administrador'}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Message */}
            {message && (
                <div className={`text-sm rounded-xl p-3 ${message.type === 'success' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                    {message.text}
                </div>
            )}

            {/* Admins list */}
            {loading ? (
                <p className="text-sm text-on-surface-variant text-center py-8">Cargando...</p>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {admins.map((admin) => (
                        <div key={admin.id} className="bg-surface-container-low rounded-2xl p-6 border border-outline-variant/15 space-y-4">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-full bg-surface-container-high flex items-center justify-center overflow-hidden border border-white/10">
                                    {admin.profile_image ? (
                                        <img src={admin.profile_image} alt="" className="w-full h-full object-cover" />
                                    ) : (
                                        <MaterialIcon name="person" size="text-xl" className="text-on-surface-variant" />
                                    )}
                                </div>
                                <div className="min-w-0">
                                    <p className="font-bold text-on-surface truncate">{admin.name} {admin.last_name}</p>
                                    <p className="text-xs text-on-surface-variant truncate">{admin.email}</p>
                                </div>
                            </div>
                            {admin.title && (
                                <p className="text-xs text-on-surface-variant">{admin.title}</p>
                            )}
                            <div className="flex items-center justify-between text-xs text-on-surface-variant">
                                <div className="flex items-center gap-1.5">
                                    <MaterialIcon name="school" size="text-sm" className="text-blue-400" />
                                    <span>{admin._count.instructed_courses} {admin._count.instructed_courses === 1 ? 'curso' : 'cursos'}</span>
                                </div>
                                <span>Desde {formatDate(admin.created_at)}</span>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
