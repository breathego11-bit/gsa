'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Plus, Pencil, Trash2, ToggleLeft, ToggleRight, Layers, Users, Wrench, GripVertical } from 'lucide-react'
import {
    DndContext,
    type DragEndEvent,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
} from '@dnd-kit/core'
import {
    SortableContext,
    useSortable,
    arrayMove,
    verticalListSortingStrategy,
    sortableKeyboardCoordinates,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { CourseFormModal } from '@/components/admin/CourseFormModal'
import { ConfirmDeleteModal } from '@/components/admin/ConfirmDeleteModal'

type Course = {
    id: string
    title: string
    description: string
    thumbnail: string | null
    hero_image: string | null
    price: number | null
    published: boolean
    order: number
    created_at: Date
    _count: { modules: number; enrollments: number }
    instructor_ids?: string[]
    included_items?: string[]
    tagline?: string | null
    level?: string | null
    language?: string | null
    certificate?: boolean | null
    rating?: number | null
    requirements?: string[]
}

export function AdminCoursesClient({ courses: initialCourses }: { courses: Course[] }) {
    const [courses, setCourses] = useState(initialCourses)
    const [createOpen, setCreateOpen] = useState(false)
    const [editTarget, setEditTarget] = useState<Course | null>(null)
    const [deleteTarget, setDeleteTarget] = useState<Course | null>(null)
    const [deletingId, setDeletingId] = useState<string | null>(null)
    const [togglingId, setTogglingId] = useState<string | null>(null)
    const [reorderError, setReorderError] = useState<string | null>(null)

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
    )

    async function handleDragEnd(event: DragEndEvent) {
        const { active, over } = event
        if (!over || active.id === over.id) return

        const oldIdx = courses.findIndex((c) => c.id === active.id)
        const newIdx = courses.findIndex((c) => c.id === over.id)
        if (oldIdx === -1 || newIdx === -1) return

        const snapshot = courses
        const next = arrayMove(courses, oldIdx, newIdx)
        setCourses(next) // optimista

        const res = await fetch('/api/courses/reorder', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ordered_ids: next.map((c) => c.id) }),
        })
        if (!res.ok) {
            setCourses(snapshot) // rollback
            setReorderError('No se pudo reordenar los cursos. Reintenta.')
            setTimeout(() => setReorderError(null), 4000)
        }
    }

    async function handleTogglePublish(course: Course) {
        setTogglingId(course.id)
        const res = await fetch(`/api/courses/${course.id}/publish`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ published: !course.published }),
        })
        if (res.ok) {
            setCourses((prev) =>
                prev.map((c) => (c.id === course.id ? { ...c, published: !c.published } : c))
            )
        }
        setTogglingId(null)
    }

    async function handleDelete() {
        if (!deleteTarget) return
        setDeletingId(deleteTarget.id)
        const res = await fetch(`/api/courses/${deleteTarget.id}`, { method: 'DELETE' })
        if (res.ok) {
            setCourses((prev) => prev.filter((c) => c.id !== deleteTarget.id))
            setDeleteTarget(null)
        }
        setDeletingId(null)
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="section-title">Gestión de cursos</h1>
                    <p className="section-subtitle">
                        {courses.length} {courses.length === 1 ? 'curso' : 'cursos'} en total
                    </p>
                </div>
                <Button onClick={() => setCreateOpen(true)} icon={<Plus size={16} />}>
                    Nuevo curso
                </Button>
            </div>

            {/* Reorder hint — el orden define qué curso se desbloquea con cada cuota */}
            {courses.length > 1 && (
                <div
                    className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs"
                    style={{ background: 'var(--bg-raised)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
                >
                    <GripVertical size={14} />
                    Arrastra las filas para ordenar el catálogo. El orden determina qué curso se
                    desbloquea con cada cuota (el primero se desbloquea con la cuota 1).
                </div>
            )}
            {reorderError && (
                <div
                    className="rounded-xl px-4 py-2.5 text-xs"
                    style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: 'var(--error)' }}
                >
                    {reorderError}
                </div>
            )}

            {/* Table */}
            <div
                className="overflow-hidden rounded-2xl border"
                style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}
            >
                {courses.length === 0 ? (
                    <div className="flex flex-col items-center py-16 text-center">
                        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                            No hay cursos aún. Crea el primero.
                        </p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                        <table className="w-full text-sm">
                            <thead>
                                <tr style={{ background: 'var(--bg-raised)', borderBottom: '1px solid var(--border)' }}>
                                    <th className="w-10 px-2 py-3.5" aria-label="Reordenar" />
                                    <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
                                        Título
                                    </th>
                                    <th className="hidden sm:table-cell px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
                                        Módulos
                                    </th>
                                    <th className="hidden sm:table-cell px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
                                        Inscritos
                                    </th>
                                    <th className="hidden md:table-cell px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
                                        Estado
                                    </th>
                                    <th className="px-5 py-3.5 text-right text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
                                        Acciones
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                <SortableContext items={courses.map((c) => c.id)} strategy={verticalListSortingStrategy}>
                                    {courses.map((course) => (
                                        <SortableCourseRow
                                            key={course.id}
                                            course={course}
                                            togglingId={togglingId}
                                            onTogglePublish={handleTogglePublish}
                                            onEdit={setEditTarget}
                                            onDelete={setDeleteTarget}
                                        />
                                    ))}
                                </SortableContext>
                            </tbody>
                        </table>
                      </DndContext>
                    </div>
                )}
            </div>

            {/* Modals */}
            <CourseFormModal
                open={createOpen}
                onClose={() => setCreateOpen(false)}
                onSuccess={(created) => {
                    setCourses((prev) => [...prev, { ...created, _count: { modules: 0, enrollments: 0 } }])
                    setCreateOpen(false)
                }}
            />
            <CourseFormModal
                open={!!editTarget}
                onClose={() => setEditTarget(null)}
                onSuccess={(updated) => {
                    setCourses((prev) => prev.map((c) => c.id === updated.id ? { ...c, ...updated } : c))
                    setEditTarget(null)
                }}
                initial={editTarget ?? undefined}
            />
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

function SortableCourseRow({
    course,
    togglingId,
    onTogglePublish,
    onEdit,
    onDelete,
}: {
    course: Course
    togglingId: string | null
    onTogglePublish: (c: Course) => void
    onEdit: (c: Course) => void
    onDelete: (c: Course) => void
}) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: course.id })
    const style: React.CSSProperties = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.6 : 1,
        position: 'relative',
        zIndex: isDragging ? 10 : undefined,
    }

    return (
        <tr ref={setNodeRef} style={style} className="table-row-base">
            <td className="w-10 px-2 py-4">
                <button
                    type="button"
                    className="btn-ghost cursor-grab active:cursor-grabbing px-1.5 py-1.5 touch-none"
                    title="Arrastrar para reordenar"
                    aria-label="Arrastrar para reordenar"
                    {...attributes}
                    {...listeners}
                >
                    <GripVertical size={15} style={{ color: 'var(--text-secondary)' }} />
                </button>
            </td>
            <td className="px-5 py-4">
                <p className="font-medium" style={{ color: 'var(--text-primary)' }}>
                    {course.title}
                </p>
                <p className="text-xs mt-0.5 max-w-xs truncate" style={{ color: 'var(--text-secondary)' }}>
                    {course.description}
                </p>
            </td>
            <td className="hidden sm:table-cell px-5 py-4">
                <span className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--text-secondary)' }}>
                    <Layers size={13} />
                    {course._count.modules}
                </span>
            </td>
            <td className="hidden sm:table-cell px-5 py-4">
                <span className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--text-secondary)' }}>
                    <Users size={13} />
                    {course._count.enrollments}
                </span>
            </td>
            <td className="hidden md:table-cell px-5 py-4">
                <Badge variant={course.published ? 'published' : 'draft'}>
                    {course.published ? 'Publicado' : 'Borrador'}
                </Badge>
            </td>
            <td className="px-5 py-4">
                <div className="flex items-center justify-end gap-1">
                    <Link
                        href={`/admin/courses/${course.id}/builder`}
                        className="btn-ghost px-2 py-1.5 text-xs"
                        title="Course Builder"
                    >
                        <Wrench size={14} style={{ color: 'var(--blue-accent)' }} />
                    </Link>
                    <button
                        onClick={() => onTogglePublish(course)}
                        disabled={togglingId === course.id}
                        className="btn-ghost px-2 py-1.5 text-xs"
                        title={course.published ? 'Despublicar' : 'Publicar'}
                    >
                        {course.published ? (
                            <ToggleRight size={16} style={{ color: 'var(--success)' }} />
                        ) : (
                            <ToggleLeft size={16} style={{ color: 'var(--text-secondary)' }} />
                        )}
                    </button>
                    <button
                        onClick={() => onEdit(course)}
                        className="btn-ghost px-2 py-1.5 text-xs"
                        title="Editar"
                    >
                        <Pencil size={14} style={{ color: 'var(--blue-accent)' }} />
                    </button>
                    <button
                        onClick={() => onDelete(course)}
                        className="btn-ghost px-2 py-1.5 text-xs"
                        title="Eliminar"
                    >
                        <Trash2 size={14} style={{ color: 'var(--error)' }} />
                    </button>
                </div>
            </td>
        </tr>
    )
}
