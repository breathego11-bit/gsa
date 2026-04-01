'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Pencil, Trash2, PlaySquare } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { ModuleFormModal } from '@/components/admin/ModuleFormModal'
import { ConfirmDeleteModal } from '@/components/admin/ConfirmDeleteModal'

type CourseOption = { id: string; title: string }
type ModuleRow = {
    id: string
    title: string
    order: number
    course_id: string
    _count: { lessons: number }
}

interface Props {
    courses: CourseOption[]
    selectedCourseId: string | null
    modules: ModuleRow[]
}

export function AdminModulesClient({ courses, selectedCourseId, modules: initialModules }: Props) {
    const router = useRouter()
    const [modules, setModules] = useState(initialModules)
    const [createOpen, setCreateOpen] = useState(false)
    const [editTarget, setEditTarget] = useState<ModuleRow | null>(null)
    const [deleteTarget, setDeleteTarget] = useState<ModuleRow | null>(null)
    const [deletingId, setDeletingId] = useState<string | null>(null)

    function handleCourseChange(e: React.ChangeEvent<HTMLSelectElement>) {
        const val = e.target.value
        router.push(val ? `/admin/modules?courseId=${val}` : '/admin/modules')
    }

    async function handleDelete() {
        if (!deleteTarget) return
        setDeletingId(deleteTarget.id)
        const res = await fetch(`/api/modules/${deleteTarget.id}`, { method: 'DELETE' })
        if (res.ok) {
            setModules((prev) => prev.filter((m) => m.id !== deleteTarget.id))
            setDeleteTarget(null)
        }
        setDeletingId(null)
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="section-title">Gestión de módulos</h1>
                    <p className="section-subtitle">Organiza el contenido de cada curso</p>
                </div>
                {selectedCourseId && (
                    <Button onClick={() => setCreateOpen(true)} icon={<Plus size={16} />}>
                        Nuevo módulo
                    </Button>
                )}
            </div>

            {/* Course selector */}
            <div
                className="rounded-2xl border p-5"
                style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}
            >
                <label className="form-label">Selecciona un curso</label>
                <select
                    value={selectedCourseId ?? ''}
                    onChange={handleCourseChange}
                    className="form-input mt-1 max-w-sm"
                >
                    <option value="">— Elige un curso —</option>
                    {courses.map((c) => (
                        <option key={c.id} value={c.id}>
                            {c.title}
                        </option>
                    ))}
                </select>
            </div>

            {/* Modules table */}
            {selectedCourseId && (
                <div
                    className="overflow-hidden rounded-2xl border"
                    style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}
                >
                    {modules.length === 0 ? (
                        <div className="flex flex-col items-center py-16 text-center">
                            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                                Este curso no tiene módulos aún.
                            </p>
                        </div>
                    ) : (
                        <table className="w-full text-sm">
                            <thead>
                                <tr style={{ background: 'var(--bg-raised)', borderBottom: '1px solid var(--border)' }}>
                                    <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider w-16" style={{ color: 'var(--text-secondary)' }}>#</th>
                                    <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>Módulo</th>
                                    <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>Lecciones</th>
                                    <th className="px-5 py-3.5 text-right text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {modules.map((mod) => (
                                    <tr key={mod.id} className="table-row-base">
                                        <td className="px-5 py-4 font-mono text-xs" style={{ color: 'var(--text-secondary)' }}>
                                            {mod.order}
                                        </td>
                                        <td className="px-5 py-4 font-medium" style={{ color: 'var(--text-primary)' }}>
                                            {mod.title}
                                        </td>
                                        <td className="px-5 py-4">
                                            <span className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--text-secondary)' }}>
                                                <PlaySquare size={13} />
                                                {mod._count.lessons}
                                            </span>
                                        </td>
                                        <td className="px-5 py-4">
                                            <div className="flex items-center justify-end gap-1">
                                                <button
                                                    onClick={() => setEditTarget(mod)}
                                                    className="btn-ghost px-2 py-1.5"
                                                >
                                                    <Pencil size={14} style={{ color: 'var(--blue-accent)' }} />
                                                </button>
                                                <button
                                                    onClick={() => setDeleteTarget(mod)}
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

            {selectedCourseId && (
                <>
                    <ModuleFormModal
                        open={createOpen}
                        onClose={() => setCreateOpen(false)}
                        onSuccess={(created) => {
                            setModules((prev) => [...prev, { ...created, _count: { lessons: 0 } }])
                            setCreateOpen(false)
                        }}
                        courseId={selectedCourseId}
                        nextOrder={modules.length + 1}
                    />
                    <ModuleFormModal
                        open={!!editTarget}
                        onClose={() => setEditTarget(null)}
                        onSuccess={(updated) => {
                            setModules((prev) => prev.map((m) => m.id === updated.id ? { ...m, ...updated } : m))
                            setEditTarget(null)
                        }}
                        courseId={selectedCourseId}
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
