'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Pencil, Trash2, Clock } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { MaterialIcon } from '@/components/ui/MaterialIcon'
import { LessonFormModal } from '@/components/admin/LessonFormModal'
import { ConfirmDeleteModal } from '@/components/admin/ConfirmDeleteModal'
import type { LessonType } from '@/types'

type CourseOption = { id: string; title: string }
type ModuleOption = { id: string; title: string; order: number }
type LessonRow = {
    id: string
    title: string
    description: string | null
    type: LessonType
    video_url: string | null
    thumbnail: string | null
    order: number
    duration: number | null
    module_id: string
    created_at: Date
    updated_at: Date
}

const typeConfig: Record<LessonType, { icon: string; label: string }> = {
    VIDEO: { icon: 'play_circle', label: 'Video' },
    TEXT: { icon: 'article', label: 'Texto' },
    FORM: { icon: 'assignment', label: 'Formulario' },
    EXAM: { icon: 'quiz', label: 'Examen' },
}

interface Props {
    courses: CourseOption[]
    modules: ModuleOption[]
    lessons: LessonRow[]
    selectedCourseId: string | null
    selectedModuleId: string | null
}

function fmtDuration(minutes: number | null) {
    if (!minutes) return '—'
    if (minutes >= 60) {
        const h = Math.floor(minutes / 60)
        const m = minutes % 60
        return m > 0 ? `${h}h ${m}m` : `${h}h`
    }
    return `${minutes} min`
}

export function AdminLessonsClient({ courses, modules, lessons: initialLessons, selectedCourseId, selectedModuleId }: Props) {
    const router = useRouter()
    const [lessons, setLessons] = useState(initialLessons)
    const [createOpen, setCreateOpen] = useState(false)
    const [editTarget, setEditTarget] = useState<LessonRow | null>(null)
    const [deleteTarget, setDeleteTarget] = useState<LessonRow | null>(null)
    const [deletingId, setDeletingId] = useState<string | null>(null)

    function buildUrl(courseId: string | null, moduleId: string | null) {
        const params = new URLSearchParams()
        if (courseId) params.set('courseId', courseId)
        if (moduleId) params.set('moduleId', moduleId)
        return `/admin/lessons?${params.toString()}`
    }

    function handleCourseChange(e: React.ChangeEvent<HTMLSelectElement>) {
        router.push(buildUrl(e.target.value || null, null))
    }

    function handleModuleChange(e: React.ChangeEvent<HTMLSelectElement>) {
        router.push(buildUrl(selectedCourseId, e.target.value || null))
    }

    async function handleDelete() {
        if (!deleteTarget) return
        setDeletingId(deleteTarget.id)
        const res = await fetch(`/api/lessons/${deleteTarget.id}`, { method: 'DELETE' })
        if (res.ok) {
            setLessons((prev) => prev.filter((l) => l.id !== deleteTarget.id))
            setDeleteTarget(null)
        }
        setDeletingId(null)
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="section-title">Gestión de lecciones</h1>
                    <p className="section-subtitle">Administra el contenido de cada módulo</p>
                </div>
                {selectedModuleId && (
                    <Button onClick={() => setCreateOpen(true)} icon={<Plus size={16} />}>
                        Nueva lección
                    </Button>
                )}
            </div>

            {/* Selectors */}
            <div
                className="rounded-2xl border p-5 grid sm:grid-cols-2 gap-4"
                style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}
            >
                <div>
                    <label className="form-label">Curso</label>
                    <select
                        value={selectedCourseId ?? ''}
                        onChange={handleCourseChange}
                        className="form-input mt-1"
                    >
                        <option value="">— Elige un curso —</option>
                        {courses.map((c) => (
                            <option key={c.id} value={c.id}>{c.title}</option>
                        ))}
                    </select>
                </div>
                {selectedCourseId && (
                    <div>
                        <label className="form-label">Módulo</label>
                        <select
                            value={selectedModuleId ?? ''}
                            onChange={handleModuleChange}
                            className="form-input mt-1"
                        >
                            <option value="">— Elige un módulo —</option>
                            {modules.map((m) => (
                                <option key={m.id} value={m.id}>
                                    {m.order}. {m.title}
                                </option>
                            ))}
                        </select>
                    </div>
                )}
            </div>

            {/* Lessons table */}
            {selectedModuleId && (
                <div
                    className="overflow-hidden rounded-2xl border"
                    style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}
                >
                    {lessons.length === 0 ? (
                        <div className="flex flex-col items-center py-16 text-center">
                            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                                Este módulo no tiene lecciones aún.
                            </p>
                        </div>
                    ) : (
                        <table className="w-full text-sm">
                            <thead>
                                <tr style={{ background: 'var(--bg-raised)', borderBottom: '1px solid var(--border)' }}>
                                    <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider w-12" style={{ color: 'var(--text-secondary)' }}>#</th>
                                    <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>Lección</th>
                                    <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>Tipo</th>
                                    <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>Duración</th>
                                    <th className="px-5 py-3.5 text-right text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {lessons.map((lesson) => (
                                    <tr key={lesson.id} className="table-row-base">
                                        <td className="px-5 py-4 font-mono text-xs" style={{ color: 'var(--text-secondary)' }}>
                                            {lesson.order}
                                        </td>
                                        <td className="px-5 py-4">
                                            <p className="font-medium" style={{ color: 'var(--text-primary)' }}>
                                                {lesson.title}
                                            </p>
                                            {lesson.description && (
                                                <p className="text-xs mt-0.5 max-w-xs truncate" style={{ color: 'var(--text-secondary)' }}>
                                                    {lesson.description}
                                                </p>
                                            )}
                                        </td>
                                        <td className="px-5 py-4">
                                            <span className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--text-secondary)' }}>
                                                <MaterialIcon name={typeConfig[lesson.type]?.icon || 'play_circle'} size="text-sm" />
                                                {typeConfig[lesson.type]?.label || 'Video'}
                                            </span>
                                        </td>
                                        <td className="px-5 py-4">
                                            <span className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--text-secondary)' }}>
                                                <Clock size={13} />
                                                {fmtDuration(lesson.duration)}
                                            </span>
                                        </td>
                                        <td className="px-5 py-4">
                                            <div className="flex items-center justify-end gap-1">
                                                <button
                                                    onClick={() => setEditTarget(lesson)}
                                                    className="btn-ghost px-2 py-1.5"
                                                >
                                                    <Pencil size={14} style={{ color: 'var(--blue-accent)' }} />
                                                </button>
                                                <button
                                                    onClick={() => setDeleteTarget(lesson)}
                                                    className="btn-ghost px-2 py-1.5"
                                                >
                                                    <Trash2 size={14} style={{ color: 'var(--error)' }} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            )}

            {selectedModuleId && (
                <>
                    <LessonFormModal
                        open={createOpen}
                        onClose={() => setCreateOpen(false)}
                        onSuccess={(created) => {
                            setLessons((prev) => [...prev, created])
                            setCreateOpen(false)
                        }}
                        moduleId={selectedModuleId}
                        nextOrder={lessons.length + 1}
                    />
                    <LessonFormModal
                        open={!!editTarget}
                        onClose={() => setEditTarget(null)}
                        onSuccess={(updated) => {
                            setLessons((prev) => prev.map((l) => l.id === updated.id ? { ...l, ...updated } : l))
                            setEditTarget(null)
                        }}
                        moduleId={selectedModuleId}
                        initial={editTarget ?? undefined}
                    />
                </>
            )}
            <ConfirmDeleteModal
                open={!!deleteTarget}
                onClose={() => setDeleteTarget(null)}
                onConfirm={handleDelete}
                loading={!!deletingId}
                resource={deleteTarget?.title ?? ''}
            />
        </div>
    )
}
