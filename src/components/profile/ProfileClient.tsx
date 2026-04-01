'use client'

import { useState, useRef } from 'react'
import { MaterialIcon } from '@/components/ui/MaterialIcon'

interface UserData {
    id: string
    name: string
    last_name: string
    username: string
    email: string
    phone: string | null
    profile_image: string | null
    bio: string | null
    title: string | null
    location: string | null
    role: string
    created_at: Date
}

interface AdminStats {
    publishedCourses: number
    totalStudents: number
    totalLessons: number
    mostPopularCourse: { title: string; enrollments: number } | null
}

interface ProfileClientProps {
    user: UserData
    stats: { enrollmentCount: number; completedLessons: number }
    adminStats?: AdminStats
}

export function ProfileClient({ user, stats, adminStats }: ProfileClientProps) {
    // Form state
    const [name, setName] = useState(user.name)
    const [lastName, setLastName] = useState(user.last_name)
    const [email, setEmail] = useState(user.email)
    const [bio, setBio] = useState(user.bio || '')
    const [title, setTitle] = useState(user.title || '')
    const [avatarUrl, setAvatarUrl] = useState(user.profile_image)
    const [avatarUploading, setAvatarUploading] = useState(false)

    // Password state
    const [currentPassword, setCurrentPassword] = useState('')
    const [newPassword, setNewPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')

    // UI state
    const [saving, setSaving] = useState(false)
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

    // Notification toggles (decorative)
    const [notifCourses, setNotifCourses] = useState(true)
    const [notifNews, setNotifNews] = useState(true)
    const [notifAchievements, setNotifAchievements] = useState(false)

    const fileRef = useRef<HTMLInputElement>(null)

    const joinDate = new Date(user.created_at).toLocaleDateString('es-ES', {
        month: 'long',
        year: 'numeric',
    })

    async function handleAvatarUpload(file: File) {
        setAvatarUploading(true)
        try {
            const formData = new FormData()
            formData.append('file', file)
            const res = await fetch('/api/users/me/avatar', { method: 'POST', body: formData })
            if (res.ok) {
                const data = await res.json()
                setAvatarUrl(data.url)
            } else {
                const data = await res.json()
                setMessage({ type: 'error', text: data.error || 'Error al subir imagen' })
            }
        } catch {
            setMessage({ type: 'error', text: 'Error al subir imagen' })
        } finally {
            setAvatarUploading(false)
        }
    }

    async function handleSave(e: React.FormEvent) {
        e.preventDefault()
        setSaving(true)
        setMessage(null)

        try {
            // Update profile
            const profileRes = await fetch('/api/users/me', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, last_name: lastName, email, bio: bio || null, title: title || null }),
            })

            if (!profileRes.ok) {
                const data = await profileRes.json()
                setMessage({ type: 'error', text: data.error || 'Error al guardar' })
                setSaving(false)
                return
            }

            // Update password if filled
            if (newPassword || confirmPassword || currentPassword) {
                const pwRes = await fetch('/api/users/me/password', {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        current_password: currentPassword,
                        new_password: newPassword,
                        confirm_password: confirmPassword,
                    }),
                })
                if (!pwRes.ok) {
                    const data = await pwRes.json()
                    setMessage({ type: 'error', text: data.error || 'Error al cambiar contraseña' })
                    setSaving(false)
                    return
                }
                setCurrentPassword('')
                setNewPassword('')
                setConfirmPassword('')
            }

            setMessage({ type: 'success', text: 'Cambios guardados correctamente' })
        } catch {
            setMessage({ type: 'error', text: 'Error al guardar' })
        } finally {
            setSaving(false)
        }
    }

    return (
        <div className="space-y-12">
            {/* ── Profile Hero ─────────────────────────────── */}
            <section className="relative group">
                <div className="absolute -inset-1 bg-gradient-to-r from-primary-container to-secondary-container rounded-[2rem] blur opacity-20 group-hover:opacity-30 transition duration-1000" />
                <div className="relative bg-surface-container-low rounded-[2rem] p-8 md:p-12 flex flex-col md:flex-row items-center gap-8 border border-white/5">
                    {/* Avatar */}
                    <div className="relative">
                        <div className="w-32 h-32 md:w-40 md:h-40 rounded-full p-1 bg-gradient-to-tr from-primary to-tertiary">
                            <div className="w-full h-full rounded-full border-4 border-surface-container-low overflow-hidden bg-surface-container">
                                {avatarUrl ? (
                                    <img
                                        src={avatarUrl}
                                        alt="Avatar"
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center">
                                        <MaterialIcon name="person" size="text-5xl" className="text-on-surface-variant" />
                                    </div>
                                )}
                            </div>
                        </div>
                        <button
                            onClick={() => fileRef.current?.click()}
                            disabled={avatarUploading}
                            className="absolute bottom-2 right-2 bg-primary-container text-on-primary-container p-2 rounded-full shadow-lg border-2 border-surface-container-low hover:scale-110 transition-transform"
                        >
                            {avatarUploading ? (
                                <span className="spinner" />
                            ) : (
                                <MaterialIcon name="edit" size="text-sm" />
                            )}
                        </button>
                        <input
                            ref={fileRef}
                            type="file"
                            accept="image/jpeg,image/png,image/webp,image/gif"
                            className="hidden"
                            onChange={(e) => {
                                const file = e.target.files?.[0]
                                if (file) handleAvatarUpload(file)
                            }}
                        />
                    </div>

                    {/* Info */}
                    <div className="text-center md:text-left space-y-2">
                        <div className="flex flex-col md:flex-row md:items-center gap-3">
                            <h2 className="text-3xl md:text-5xl font-bold tracking-tight text-on-surface">
                                {name} {lastName}
                            </h2>
                            <span className="inline-flex items-center px-3 py-1 rounded-full bg-secondary-container/20 text-secondary text-xs font-bold tracking-widest uppercase">
                                {user.role === 'ADMIN' ? 'Instructor' : 'Miembro Elite'}
                            </span>
                        </div>
                        <p className="text-on-surface-variant text-lg font-medium">{email}</p>
                        <div className="pt-4 flex flex-wrap justify-center md:justify-start gap-4">
                            {user.location && (
                                <div className="flex items-center gap-2 text-sm text-on-surface-variant">
                                    <MaterialIcon name="location_on" size="text-lg" className="text-primary" />
                                    <span>{user.location}</span>
                                </div>
                            )}
                            <div className="flex items-center gap-2 text-sm text-on-surface-variant">
                                <MaterialIcon name="calendar_today" size="text-lg" className="text-primary" />
                                <span>Se unió en {joinDate}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ── Stats Grid ──────────────────────────────── */}
            {adminStats ? (
                <section className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <StatCard
                        icon="menu_book"
                        iconColor="text-primary"
                        value={adminStats.publishedCourses.toString()}
                        label="Cursos Publicados"
                    />
                    <StatCard
                        icon="groups"
                        iconColor="text-secondary"
                        value={adminStats.totalStudents.toString()}
                        label="Estudiantes Totales"
                    />
                    <StatCard
                        icon="play_lesson"
                        iconColor="text-tertiary"
                        value={adminStats.totalLessons.toString()}
                        label="Lecciones Creadas"
                    />
                    <StatCard
                        icon="star"
                        iconColor="text-primary-container"
                        value={adminStats.mostPopularCourse ? adminStats.mostPopularCourse.enrollments.toString() : '--'}
                        label="Curso Más Popular"
                        badge={adminStats.mostPopularCourse?.title}
                    />
                </section>
            ) : (
                <section className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <StatCard
                        icon="school"
                        iconColor="text-primary"
                        value={stats.enrollmentCount.toString()}
                        label="Cursos Inscritos"
                    />
                    <StatCard
                        icon="task_alt"
                        iconColor="text-secondary"
                        value={stats.completedLessons.toString()}
                        label="Lecciones Completadas"
                    />
                    <StatCard
                        icon="bolt"
                        iconColor="text-tertiary"
                        value="--"
                        label="Racha de Estudio"
                        badge="Próximamente"
                    />
                    <StatCard
                        icon="trending_up"
                        iconColor="text-primary-container"
                        value="--"
                        label="Ranking Global"
                        badge="Próximamente"
                    />
                </section>
            )}

            {/* ── Settings ────────────────────────────────── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
                {/* Account form */}
                <div className="lg:col-span-2">
                    <div className="glass-panel rounded-[2rem] p-8 border border-white/10">
                        <h3 className="text-2xl font-bold mb-8 text-on-surface">Configuración de cuenta</h3>
                        <form onSubmit={handleSave} className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-[12px] font-bold uppercase tracking-widest text-on-surface-variant px-1">
                                        Nombre
                                    </label>
                                    <input
                                        type="text"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        className="w-full bg-surface-container-lowest border-none rounded-xl focus:ring-2 focus:ring-secondary/50 text-on-surface px-4 py-3"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[12px] font-bold uppercase tracking-widest text-on-surface-variant px-1">
                                        Apellido
                                    </label>
                                    <input
                                        type="text"
                                        value={lastName}
                                        onChange={(e) => setLastName(e.target.value)}
                                        className="w-full bg-surface-container-lowest border-none rounded-xl focus:ring-2 focus:ring-secondary/50 text-on-surface px-4 py-3"
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[12px] font-bold uppercase tracking-widest text-on-surface-variant px-1">
                                    Correo Electrónico
                                </label>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full bg-surface-container-lowest border-none rounded-xl focus:ring-2 focus:ring-secondary/50 text-on-surface px-4 py-3"
                                />
                            </div>

                            {/* Instructor fields (ADMIN only) */}
                            {user.role === 'ADMIN' && (
                                <div className="pt-8 border-t border-white/5">
                                    <h4 className="text-lg font-bold mb-6 text-on-surface">Perfil de Instructor</h4>
                                    <div className="space-y-6">
                                        <div className="space-y-2">
                                            <label className="text-[12px] font-bold uppercase tracking-widest text-on-surface-variant px-1">
                                                Título profesional
                                            </label>
                                            <input
                                                type="text"
                                                value={title}
                                                onChange={(e) => setTitle(e.target.value)}
                                                placeholder="Ej: Sales Coach, Closer Senior, Fundador"
                                                className="w-full bg-surface-container-lowest border-none rounded-xl focus:ring-2 focus:ring-secondary/50 text-on-surface px-4 py-3"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[12px] font-bold uppercase tracking-widest text-on-surface-variant px-1">
                                                Descripción / Bio
                                            </label>
                                            <textarea
                                                value={bio}
                                                onChange={(e) => setBio(e.target.value)}
                                                rows={4}
                                                placeholder="Cuéntale a tus estudiantes sobre tu experiencia, logros y enfoque de enseñanza..."
                                                className="w-full bg-surface-container-lowest border-none rounded-xl focus:ring-2 focus:ring-secondary/50 text-on-surface px-4 py-3 resize-none"
                                            />
                                            <p className="text-xs text-on-surface-variant px-1">
                                                Esta información se mostrará en los cursos donde seas instructor.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Security */}
                            <div className="pt-8 border-t border-white/5">
                                <h4 className="text-lg font-bold mb-6 text-on-surface">Seguridad</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2 md:col-span-2">
                                        <label className="text-[12px] font-bold uppercase tracking-widest text-on-surface-variant px-1">
                                            Contraseña actual
                                        </label>
                                        <input
                                            type="password"
                                            value={currentPassword}
                                            onChange={(e) => setCurrentPassword(e.target.value)}
                                            placeholder="••••••••"
                                            className="w-full bg-surface-container-lowest border-none rounded-xl focus:ring-2 focus:ring-secondary/50 text-on-surface px-4 py-3"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[12px] font-bold uppercase tracking-widest text-on-surface-variant px-1">
                                            Nueva contraseña
                                        </label>
                                        <input
                                            type="password"
                                            value={newPassword}
                                            onChange={(e) => setNewPassword(e.target.value)}
                                            placeholder="••••••••"
                                            className="w-full bg-surface-container-lowest border-none rounded-xl focus:ring-2 focus:ring-secondary/50 text-on-surface px-4 py-3"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[12px] font-bold uppercase tracking-widest text-on-surface-variant px-1">
                                            Confirmar contraseña
                                        </label>
                                        <input
                                            type="password"
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                            placeholder="••••••••"
                                            className="w-full bg-surface-container-lowest border-none rounded-xl focus:ring-2 focus:ring-secondary/50 text-on-surface px-4 py-3"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Feedback */}
                            {message && (
                                <div
                                    className={`text-sm rounded-xl p-3 ${
                                        message.type === 'success'
                                            ? 'bg-emerald-500/10 text-emerald-400'
                                            : 'bg-red-500/10 text-red-400'
                                    }`}
                                >
                                    {message.text}
                                </div>
                            )}

                            {/* Actions */}
                            <div className="pt-6 flex justify-end gap-4">
                                <button
                                    type="button"
                                    className="px-6 py-3 rounded-full text-primary font-bold hover:bg-white/5 transition-all uppercase tracking-widest text-[12px]"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="px-8 py-3 rounded-full bg-gradient-to-r from-primary-container to-secondary-container text-on-primary-container font-bold shadow-lg hover:scale-105 active:scale-95 transition-all uppercase tracking-widest text-[12px] disabled:opacity-50"
                                >
                                    {saving ? 'Guardando...' : 'Guardar cambios'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>

                {/* Sidebar */}
                <div className="space-y-8">
                    {/* Notifications */}
                    <div className="bg-surface-container-high rounded-[2rem] p-8 border border-white/5">
                        <h3 className="text-xl font-bold mb-6 text-on-surface">Notificaciones</h3>
                        <div className="space-y-6">
                            <ToggleRow
                                label="Actualizaciones de cursos"
                                description="Nuevas lecciones y materiales"
                                checked={notifCourses}
                                onChange={setNotifCourses}
                            />
                            <ToggleRow
                                label="Noticias de la academia"
                                description="Resumen semanal y eventos"
                                checked={notifNews}
                                onChange={setNotifNews}
                            />
                            <ToggleRow
                                label="Alertas de logros"
                                description="Hitos y recompensas"
                                checked={notifAchievements}
                                onChange={setNotifAchievements}
                            />
                        </div>
                    </div>

                    {/* Upgrade CTA */}
                    <div className="bg-gradient-to-br from-primary-container/20 to-tertiary-container/20 rounded-[2rem] p-8 border border-white/5">
                        <MaterialIcon name="verified_user" size="text-4xl" className="text-secondary mb-4" />
                        <h3 className="text-xl font-bold mb-2 text-on-surface">Mejora tu cuenta</h3>
                        <p className="text-on-surface-variant text-sm mb-6 leading-relaxed">
                            Desbloquea analíticas avanzadas de ventas, sesiones de coaching 1 a 1 y contenido exclusivo de masterclass.
                        </p>
                        <button className="w-full py-4 rounded-xl bg-white text-surface-dim font-black uppercase tracking-tighter text-sm hover:bg-slate-200 transition-colors">
                            Ir a Platinum
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}

/* ── Sub-components ─────────────────────────────── */

function StatCard({
    icon,
    iconColor,
    value,
    label,
    badge,
}: {
    icon: string
    iconColor: string
    value: string
    label: string
    badge?: string
}) {
    return (
        <div className="bg-surface-container rounded-xl p-6 border border-white/5 space-y-4">
            <div className="flex justify-between items-start">
                <span className={`${iconColor} bg-current/10 p-2 rounded-lg`}>
                    <MaterialIcon name={icon} size="text-xl" className={iconColor} />
                </span>
                {badge && (
                    <span className="text-on-surface-variant text-xs font-bold">{badge}</span>
                )}
            </div>
            <div>
                <p className="text-4xl font-black text-on-surface tracking-tighter">{value}</p>
                <p className="text-on-surface-variant text-xs font-bold uppercase tracking-widest">{label}</p>
            </div>
        </div>
    )
}

function ToggleRow({
    label,
    description,
    checked,
    onChange,
}: {
    label: string
    description: string
    checked: boolean
    onChange: (v: boolean) => void
}) {
    return (
        <div className="flex items-center justify-between">
            <div>
                <p className="text-on-surface font-semibold">{label}</p>
                <p className="text-on-surface-variant text-xs">{description}</p>
            </div>
            <button
                type="button"
                onClick={() => onChange(!checked)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    checked ? 'bg-secondary-container' : 'bg-surface-container-highest'
                }`}
            >
                <span
                    className={`inline-block h-4 w-4 transform rounded-full transition-transform ${
                        checked ? 'translate-x-6 bg-white' : 'translate-x-1 bg-slate-400'
                    }`}
                />
            </button>
        </div>
    )
}
