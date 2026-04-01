'use client'

import { useState, useCallback } from 'react'
import Link from 'next/link'
import { FormSchemaBuilder } from '@/components/admin/FormSchemaBuilder'
import { ExamSchemaBuilder } from '@/components/admin/ExamSchemaBuilder'
import type { LessonResource } from '@/types'

/* ── Types ─────────────────────────────────────────── */

interface Instructor { id: string; name: string; last_name: string }

interface LessonData {
    id: string; title: string; description: string | null; type: 'VIDEO' | 'TEXT' | 'FORM' | 'EXAM'
    video_url: string | null; thumbnail: string | null; content: string | null
    form_schema: any; exam_schema: any; passing_score: number | null
    max_attempts: number | null; is_final_exam: boolean; order: number; duration: number | null
    resources?: LessonResource[] | null
}

interface ModuleData { id: string; title: string; order: number; lessons: LessonData[] }

interface CourseData {
    id: string; title: string; description: string; thumbnail: string | null; hero_image: string | null
    price: number | null; published: boolean; instructor_id: string | null
    instructor: { id: string; name: string; last_name: string; profile_image: string | null } | null
    modules: ModuleData[]
}

interface Props {
    course: CourseData
    instructors: Instructor[]
    stats: { totalModules: number; totalLessons: number; totalDuration: number; hasFinalExam: boolean }
}

const TYPE_ICON: Record<string, string> = { VIDEO: 'videocam', TEXT: 'article', FORM: 'assignment', EXAM: 'quiz' }
const TYPE_LABEL: Record<string, string> = { VIDEO: 'Video', TEXT: 'Texto', FORM: 'Formulario', EXAM: 'Examen' }

function fmtDuration(min: number) {
    if (!min) return '0m'
    const h = Math.floor(min / 60); const m = min % 60
    if (h > 0 && m > 0) return `${h}h ${m}m`; if (h > 0) return `${h}h`; return `${m}m`
}

/* ── Component ─────────────────────────────────────── */

export function CourseBuilderClient({ course: initial }: Props) {

    // Course state
    const [title, setTitle] = useState(initial.title)
    const [description, setDescription] = useState(initial.description)
    const [price, setPrice] = useState(initial.price != null ? String(initial.price) : '')
    const [published, setPublished] = useState(initial.published)
    const [modules, setModules] = useState<ModuleData[]>(initial.modules)
    const [saving, setSaving] = useState(false)
    const [saveMsg, setSaveMsg] = useState<string | null>(null)

    // UI state
    const [expanded, setExpanded] = useState<Set<string>>(() => new Set(initial.modules.length > 0 ? [initial.modules[0].id] : []))
    const [selectedLessonId, setSelectedLessonId] = useState<string | null>(null)
    const [editLesson, setEditLesson] = useState<LessonData | null>(null)
    const [lessonSaving, setLessonSaving] = useState(false)
    const [uploadingResource, setUploadingResource] = useState(false)
    const [newLinkName, setNewLinkName] = useState('')
    const [newLinkUrl, setNewLinkUrl] = useState('')

    // Computed stats
    const totalLessons = modules.reduce((s, m) => s + m.lessons.length, 0)
    const totalDuration = modules.reduce((s, m) => s + m.lessons.reduce((ls, l) => ls + (l.duration || 0), 0), 0)
    const hasFinalExam = modules.some(m => m.lessons.some(l => l.is_final_exam))

    // ── Helpers ──

    const toggleExpand = (id: string) => setExpanded(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })

    const selectLesson = (lesson: LessonData) => {
        setSelectedLessonId(lesson.id)
        setEditLesson({ ...lesson })
    }

    const deselectLesson = () => { setSelectedLessonId(null); setEditLesson(null) }

    // ── Course save ──

    const saveCourse = useCallback(async () => {
        setSaving(true); setSaveMsg(null)
        try {
            const res = await fetch(`/api/courses/${initial.id}`, {
                method: 'PATCH', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title, description, price: price ? Number(price) : null }),
            })
            setSaveMsg(res.ok ? 'Guardado' : 'Error al guardar')
            setTimeout(() => setSaveMsg(null), 2000)
        } finally { setSaving(false) }
    }, [initial.id, title, description, price])

    // ── Publish toggle ──

    const togglePublish = async () => {
        const res = await fetch(`/api/courses/${initial.id}/publish`, {
            method: 'PATCH', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ published: !published }),
        })
        if (res.ok) setPublished(!published)
    }

    // ── Module CRUD ──

    const addModule = async () => {
        const nextOrder = modules.length + 1
        const res = await fetch('/api/modules', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ course_id: initial.id, title: 'Nuevo módulo', order: nextOrder }),
        })
        if (res.ok) {
            const mod = await res.json()
            mod.lessons = []
            setModules(prev => [...prev, mod])
            setExpanded(prev => new Set(prev).add(mod.id))
        }
    }

    const deleteModule = async (modId: string) => {
        if (!confirm('¿Eliminar este módulo y todas sus lecciones?')) return
        const res = await fetch(`/api/modules/${modId}`, { method: 'DELETE' })
        if (res.ok) {
            setModules(prev => prev.filter(m => m.id !== modId))
            if (selectedLessonId && modules.find(m => m.id === modId)?.lessons.some(l => l.id === selectedLessonId)) {
                deselectLesson()
            }
        }
    }

    const renameModule = async (modId: string, newTitle: string) => {
        await fetch(`/api/modules/${modId}`, {
            method: 'PATCH', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title: newTitle }),
        })
        setModules(prev => prev.map(m => m.id === modId ? { ...m, title: newTitle } : m))
    }

    // ── Lesson CRUD ──

    const addLesson = async (modId: string) => {
        const mod = modules.find(m => m.id === modId)
        const nextOrder = (mod?.lessons.length ?? 0) + 1
        const res = await fetch('/api/lessons', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ module_id: modId, title: 'Nueva lección', type: 'VIDEO', order: nextOrder }),
        })
        if (res.ok) {
            const lesson = await res.json()
            setModules(prev => prev.map(m => m.id === modId ? { ...m, lessons: [...m.lessons, lesson] } : m))
        }
    }

    const deleteLesson = async (modId: string, lessonId: string) => {
        const res = await fetch(`/api/lessons/${lessonId}`, { method: 'DELETE' })
        if (res.ok) {
            setModules(prev => prev.map(m => m.id === modId ? { ...m, lessons: m.lessons.filter(l => l.id !== lessonId) } : m))
            if (selectedLessonId === lessonId) deselectLesson()
        }
    }

    const applyLessonChanges = async () => {
        if (!editLesson) return
        setLessonSaving(true)
        try {
            const body: any = {
                title: editLesson.title,
                description: editLesson.description || null,
                type: editLesson.type,
                video_url: editLesson.video_url || null,
                content: editLesson.content || null,
                form_schema: editLesson.form_schema || null,
                exam_schema: editLesson.exam_schema || null,
                duration: editLesson.duration ? Number(editLesson.duration) : null,
                resources: editLesson.resources && editLesson.resources.length > 0 ? editLesson.resources : null,
                passing_score: editLesson.passing_score != null ? Number(editLesson.passing_score) : null,
                max_attempts: editLesson.max_attempts != null ? Number(editLesson.max_attempts) : null,
                is_final_exam: editLesson.is_final_exam,
            }
            const res = await fetch(`/api/lessons/${editLesson.id}`, {
                method: 'PATCH', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            })
            if (res.ok) {
                const updated = await res.json()
                setModules(prev => prev.map(m => ({
                    ...m,
                    lessons: m.lessons.map(l => l.id === updated.id ? { ...l, ...updated } : l),
                })))
            }
        } finally { setLessonSaving(false) }
    }

    const discardLessonChanges = () => {
        // Find original lesson from modules state
        for (const m of modules) {
            const found = m.lessons.find(l => l.id === selectedLessonId)
            if (found) { setEditLesson({ ...found }); break }
        }
    }

    // ── Render ──

    return (
        <div className="flex flex-col min-h-screen">
            {/* ── Top Bar ──────────────────────────────────── */}
            <header className="sticky top-0 z-40 h-14 flex items-center justify-between px-8 border-b border-white/5"
                style={{ background: 'rgba(14,19,30,0.6)', backdropFilter: 'blur(16px)' }}>
                <div className="flex items-center gap-6">
                    <Link href="/admin/courses" className="flex items-center gap-2 text-on-surface-variant hover:text-on-surface transition-colors text-sm">
                        <span className="material-symbols-outlined text-lg">arrow_back</span>
                        Cursos
                    </Link>
                    <span className="text-lg font-bold text-on-surface">Course Builder</span>
                </div>
                <div className="flex items-center gap-3">
                    {saveMsg && (
                        <span className="text-xs text-emerald-400 flex items-center gap-1">
                            <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                            {saveMsg}
                        </span>
                    )}
                    <Link href={`/course/${initial.id}`} target="_blank"
                        className="px-4 py-1.5 rounded-lg border border-outline-variant text-on-surface text-sm hover:bg-surface-container-high transition-colors">
                        Vista previa
                    </Link>
                    <button onClick={saveCourse} disabled={saving}
                        className="px-4 py-1.5 rounded-lg bg-primary-container text-on-primary-container font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-50">
                        {saving ? 'Guardando...' : 'Guardar Cambios'}
                    </button>
                </div>
            </header>

            {/* ── Main Workspace ───────────────────────────── */}
            <div className="flex-1 flex gap-8 p-8 pb-24">

                {/* Left Column: Course Tree */}
                <div className="flex-1 space-y-8 min-w-0">

                    {/* Course Header */}
                    <section className="bg-surface-container-low p-8 rounded-3xl space-y-4">
                        <div className="flex justify-between items-start">
                            <div className="flex-1 mr-4">
                                <input type="text" value={title} onChange={e => setTitle(e.target.value)} onBlur={saveCourse}
                                    className="bg-transparent border-none text-3xl font-bold text-on-surface p-0 focus:ring-0 w-full mb-2" />
                                <div className="flex items-center gap-6 text-sm text-on-surface-variant">
                                    {initial.instructor && (
                                        <span className="flex items-center gap-1">
                                            <span className="material-symbols-outlined text-sm">person</span>
                                            {initial.instructor.name} {initial.instructor.last_name}
                                        </span>
                                    )}
                                    <span className="flex items-center gap-1">
                                        <span className="material-symbols-outlined text-sm">payments</span>
                                        <input type="number" value={price} onChange={e => setPrice(e.target.value)} onBlur={saveCourse}
                                            placeholder="Gratis" className="bg-transparent border-none p-0 w-20 text-sm font-bold text-secondary focus:ring-0" />
                                    </span>
                                </div>
                            </div>
                            {/* Publish toggle */}
                            <button onClick={togglePublish} className="flex items-center gap-2 bg-surface-container-high p-1 rounded-full px-3">
                                <span className={`text-xs font-semibold px-1 ${!published ? 'text-on-surface' : 'text-on-surface-variant'}`}>Borrador</span>
                                <div className={`w-10 h-5 rounded-full relative transition-colors ${published ? 'bg-secondary-container' : 'bg-surface-container-highest'}`}>
                                    <div className={`absolute top-0.5 w-4 h-4 bg-on-primary-container rounded-full shadow-sm transition-all ${published ? 'right-0.5' : 'left-0.5'}`} />
                                </div>
                                <span className={`text-xs font-semibold px-1 ${published ? 'text-blue-400' : 'text-on-surface-variant'}`}>Publicado</span>
                            </button>
                        </div>
                        <textarea value={description} onChange={e => setDescription(e.target.value)} onBlur={saveCourse}
                            placeholder="Descripción del curso..."
                            className="bg-transparent border-none text-on-surface-variant p-0 focus:ring-0 w-full resize-none h-12 leading-relaxed text-sm" />
                    </section>

                    {/* Modules Tree */}
                    <div className="space-y-6">
                        {modules.map((mod, modIdx) => {
                            const isOpen = expanded.has(mod.id)
                            const modLessons = mod.lessons
                            const modDuration = modLessons.reduce((s, l) => s + (l.duration || 0), 0)

                            return (
                                <div key={mod.id} className="bg-surface-container-low rounded-3xl overflow-hidden">
                                    {/* Module header */}
                                    <div className="p-6 flex items-center justify-between border-b border-white/5">
                                        <div className="flex items-center gap-4 flex-1 min-w-0 cursor-pointer" onClick={() => toggleExpand(mod.id)}>
                                            <span className="material-symbols-outlined text-on-surface-variant">drag_indicator</span>
                                            <span className="material-symbols-outlined text-on-surface-variant transition-transform"
                                                style={{ transform: isOpen ? 'rotate(0)' : 'rotate(-90deg)' }}>
                                                expand_more
                                            </span>
                                            <div className="min-w-0 flex-1">
                                                <span className="text-xs font-bold text-blue-400 uppercase tracking-widest block mb-0.5">
                                                    Módulo {modIdx + 1}
                                                </span>
                                                <input type="text" value={mod.title}
                                                    onChange={e => setModules(prev => prev.map(m => m.id === mod.id ? { ...m, title: e.target.value } : m))}
                                                    onBlur={e => renameModule(mod.id, e.target.value)}
                                                    onClick={e => e.stopPropagation()}
                                                    className="bg-transparent border-none text-lg font-semibold text-on-surface p-0 focus:ring-0 w-full" />
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 shrink-0">
                                            {!isOpen && (
                                                <span className="text-xs text-on-surface-variant font-medium mr-2">
                                                    {modLessons.length} {modLessons.length === 1 ? 'Lección' : 'Lecciones'}{modDuration > 0 ? ` • ${fmtDuration(modDuration)}` : ''}
                                                </span>
                                            )}
                                            <button onClick={() => addLesson(mod.id)} title="Agregar lección"
                                                className="p-2 hover:bg-surface-container-high rounded-lg text-on-surface-variant transition-colors">
                                                <span className="material-symbols-outlined">add_circle</span>
                                            </button>
                                            <button onClick={() => deleteModule(mod.id)} title="Eliminar módulo"
                                                className="p-2 hover:bg-surface-container-high rounded-lg text-on-surface-variant hover:!text-red-400 transition-colors">
                                                <span className="material-symbols-outlined">delete</span>
                                            </button>
                                        </div>
                                    </div>

                                    {/* Lessons */}
                                    {isOpen && (
                                        <div className="p-4 space-y-3">
                                            {modLessons.length === 0 && (
                                                <p className="text-center text-sm text-on-surface-variant py-6">
                                                    Sin lecciones aún. Haz clic en <span className="material-symbols-outlined text-sm align-middle">add_circle</span> para agregar.
                                                </p>
                                            )}
                                            {modLessons.map(rawLesson => {
                                                // Use editLesson for the selected lesson so changes reflect live
                                                const lesson = (editLesson && rawLesson.id === editLesson.id) ? editLesson : rawLesson
                                                const isSelected = selectedLessonId === lesson.id
                                                return (
                                                    <div key={lesson.id}
                                                        onClick={() => selectLesson(lesson)}
                                                        className={`flex items-center justify-between p-4 rounded-2xl cursor-pointer transition-all group ${
                                                            isSelected
                                                                ? 'bg-surface-container-high border-l-4 border-blue-500 shadow-xl'
                                                                : 'bg-surface-container hover:bg-surface-container-high'
                                                        }`}>
                                                        <div className="flex items-center gap-4 min-w-0">
                                                            <span className="material-symbols-outlined text-on-surface-variant/40 group-hover:text-on-surface-variant transition-colors">drag_indicator</span>
                                                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                                                                isSelected ? 'bg-primary-container/20 text-blue-400' : 'bg-surface-container-highest text-on-surface-variant'
                                                            }`}>
                                                                <span className="material-symbols-outlined">{TYPE_ICON[lesson.type] || 'videocam'}</span>
                                                            </div>
                                                            <div className="min-w-0">
                                                                <h4 className={`font-medium truncate ${isSelected ? 'text-blue-400' : 'text-on-surface'}`}>
                                                                    {lesson.title}
                                                                </h4>
                                                                <p className="text-xs text-on-surface-variant">
                                                                    {TYPE_LABEL[lesson.type] || 'Video'}
                                                                    {lesson.duration ? ` • ${fmtDuration(lesson.duration)}` : ''}
                                                                    {lesson.is_final_exam ? ' • Examen Final' : ''}
                                                                </p>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                                                            <button onClick={e => { e.stopPropagation(); deleteLesson(mod.id, lesson.id) }}
                                                                className="p-2 hover:bg-surface-container-highest rounded-lg text-on-surface-variant hover:!text-red-400 transition-colors">
                                                                <span className="material-symbols-outlined text-sm">delete</span>
                                                            </button>
                                                        </div>
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    )}
                                </div>
                            )
                        })}

                        {/* Add Module */}
                        <button onClick={addModule}
                            className="w-full py-4 rounded-3xl border-2 border-dashed border-outline-variant text-on-surface-variant hover:border-blue-500 hover:text-blue-400 transition-all flex items-center justify-center gap-2 group">
                            <span className="material-symbols-outlined group-hover:scale-110 transition-transform">add_circle</span>
                            <span className="font-semibold uppercase tracking-wider text-sm">Agregar Nuevo Módulo</span>
                        </button>
                    </div>
                </div>

                {/* Right Column: Edit Lesson Panel */}
                {editLesson && (
                    <aside className={`shrink-0 transition-all ${editLesson.type === 'FORM' || editLesson.type === 'EXAM' ? 'w-[540px]' : 'w-96'}`}>
                        <div className="glass-panel sticky top-20 rounded-3xl p-6 border border-white/5 space-y-6">
                            <div className="flex items-center justify-between">
                                <h2 className="text-xl font-bold text-on-surface">Editar Lección</h2>
                                <button onClick={deselectLesson}
                                    className="p-2 bg-surface-container-high rounded-xl text-on-surface-variant hover:text-on-surface transition-colors">
                                    <span className="material-symbols-outlined">close</span>
                                </button>
                            </div>

                            <div className="space-y-4">
                                {/* Title */}
                                <div className="space-y-2">
                                    <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Título</label>
                                    <input type="text" value={editLesson.title}
                                        onChange={e => setEditLesson({ ...editLesson, title: e.target.value })}
                                        className="w-full bg-surface-container-lowest border-none rounded-xl focus:ring-1 focus:ring-blue-500 text-sm py-3 px-4 text-on-surface" />
                                </div>

                                {/* Type */}
                                <div className="space-y-2">
                                    <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Tipo</label>
                                    <select value={editLesson.type}
                                        onChange={e => setEditLesson({ ...editLesson, type: e.target.value as any })}
                                        className="w-full bg-surface-container-lowest border-none rounded-xl focus:ring-1 focus:ring-blue-500 text-sm py-3 px-4 text-on-surface">
                                        <option value="VIDEO">Video</option>
                                        <option value="TEXT">Texto</option>
                                        <option value="FORM">Formulario</option>
                                        <option value="EXAM">Examen</option>
                                    </select>
                                </div>

                                {/* Description */}
                                <div className="space-y-2">
                                    <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Descripción</label>
                                    <textarea value={editLesson.description || ''} rows={3}
                                        onChange={e => setEditLesson({ ...editLesson, description: e.target.value })}
                                        placeholder="Descripción de la lección..."
                                        className="w-full bg-surface-container-lowest border-none rounded-xl focus:ring-1 focus:ring-blue-500 text-sm py-3 px-4 text-on-surface resize-none" />
                                </div>

                                {/* VIDEO fields */}
                                {editLesson.type === 'VIDEO' && (
                                    <>
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">URL del Video</label>
                                            <div className="relative">
                                                <span className="material-symbols-outlined absolute left-3 top-3 text-on-surface-variant text-sm">link</span>
                                                <input type="url" value={editLesson.video_url || ''}
                                                    onChange={e => setEditLesson({ ...editLesson, video_url: e.target.value })}
                                                    placeholder="https://..."
                                                    className="w-full bg-surface-container-lowest border-none rounded-xl focus:ring-1 focus:ring-blue-500 text-sm py-3 pl-10 pr-4 text-on-surface" />
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Duración (minutos)</label>
                                            <input type="number" value={editLesson.duration || ''}
                                                onChange={e => setEditLesson({ ...editLesson, duration: Number(e.target.value) || null })}
                                                placeholder="10"
                                                className="w-full bg-surface-container-lowest border-none rounded-xl focus:ring-1 focus:ring-blue-500 text-sm py-3 px-4 text-on-surface" />
                                        </div>
                                    </>
                                )}

                                {/* TEXT fields */}
                                {editLesson.type === 'TEXT' && (
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Contenido (HTML)</label>
                                        <textarea value={editLesson.content || ''} rows={8}
                                            onChange={e => setEditLesson({ ...editLesson, content: e.target.value })}
                                            placeholder="Contenido de la lección..."
                                            className="w-full bg-surface-container-lowest border-none rounded-xl focus:ring-1 focus:ring-blue-500 text-xs py-3 px-4 text-on-surface resize-none font-mono" />
                                    </div>
                                )}

                                {/* FORM fields */}
                                {editLesson.type === 'FORM' && (
                                    <>
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Texto introductorio</label>
                                            <textarea value={editLesson.content || ''} rows={3}
                                                onChange={e => setEditLesson({ ...editLesson, content: e.target.value })}
                                                placeholder="Instrucciones para el formulario..."
                                                className="w-full bg-surface-container-lowest border-none rounded-xl focus:ring-1 focus:ring-blue-500 text-sm py-3 px-4 text-on-surface resize-none" />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Campos del formulario</label>
                                            <FormSchemaBuilder
                                                value={editLesson.form_schema || []}
                                                onChange={fields => setEditLesson({ ...editLesson, form_schema: fields })}
                                            />
                                        </div>
                                    </>
                                )}

                                {/* EXAM fields */}
                                {editLesson.type === 'EXAM' && (
                                    <>
                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="space-y-2">
                                                <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Puntaje mín. (%)</label>
                                                <input type="number" min="1" max="100" value={editLesson.passing_score ?? 70}
                                                    onChange={e => setEditLesson({ ...editLesson, passing_score: Number(e.target.value) })}
                                                    className="w-full bg-surface-container-lowest border-none rounded-xl focus:ring-1 focus:ring-blue-500 text-sm py-3 px-4 text-on-surface" />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Máx. intentos</label>
                                                <input type="number" min="1" value={editLesson.max_attempts ?? ''}
                                                    onChange={e => setEditLesson({ ...editLesson, max_attempts: e.target.value ? Number(e.target.value) : null })}
                                                    placeholder="Ilimitados"
                                                    className="w-full bg-surface-container-lowest border-none rounded-xl focus:ring-1 focus:ring-blue-500 text-sm py-3 px-4 text-on-surface" />
                                            </div>
                                        </div>
                                        <label className="flex items-center gap-3 cursor-pointer">
                                            <input type="checkbox" checked={editLesson.is_final_exam}
                                                onChange={e => setEditLesson({ ...editLesson, is_final_exam: e.target.checked })}
                                                className="w-4 h-4 rounded border-gray-500 bg-transparent text-blue-500 focus:ring-blue-500" />
                                            <span className="text-sm text-on-surface">Examen final del curso</span>
                                        </label>
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Preguntas del examen</label>
                                            <ExamSchemaBuilder
                                                value={editLesson.exam_schema || []}
                                                onChange={questions => setEditLesson({ ...editLesson, exam_schema: questions })}
                                            />
                                        </div>
                                    </>
                                )}

                                {/* Resources (all lesson types) */}
                                <div className="space-y-2">
                                    <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Recursos adjuntos</label>
                                    {(editLesson.resources || []).map((r) => (
                                        <div key={r.id} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-surface-container-lowest text-xs">
                                            <span className="material-symbols-outlined text-sm text-blue-400 shrink-0">
                                                {r.type === 'link' ? 'link' : 'description'}
                                            </span>
                                            <span className="flex-1 truncate text-on-surface">{r.name}</span>
                                            <button type="button"
                                                onClick={() => setEditLesson({ ...editLesson, resources: (editLesson.resources || []).filter(x => x.id !== r.id) })}
                                                className="text-red-400 hover:text-red-300 shrink-0">
                                                <span className="material-symbols-outlined text-sm">close</span>
                                            </button>
                                        </div>
                                    ))}
                                    {/* Add link */}
                                    <div className="space-y-2">
                                        <input type="text" value={newLinkName} onChange={e => setNewLinkName(e.target.value)}
                                            placeholder="Nombre del enlace" className="w-full bg-surface-container-lowest border-none rounded-lg text-xs py-2 px-3 text-on-surface focus:ring-1 focus:ring-blue-500" />
                                        <div className="flex gap-2">
                                            <input type="url" value={newLinkUrl} onChange={e => setNewLinkUrl(e.target.value)}
                                                placeholder="https://..." className="flex-1 min-w-0 bg-surface-container-lowest border-none rounded-lg text-xs py-2 px-3 text-on-surface focus:ring-1 focus:ring-blue-500" />
                                            <button type="button" disabled={!newLinkName.trim() || !newLinkUrl.trim()}
                                                onClick={() => {
                                                    setEditLesson({ ...editLesson, resources: [...(editLesson.resources || []), { id: crypto.randomUUID(), name: newLinkName.trim(), url: newLinkUrl.trim(), type: 'link' }] })
                                                    setNewLinkName(''); setNewLinkUrl('')
                                                }}
                                                className="p-2 rounded-lg bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 transition-colors disabled:opacity-40 shrink-0">
                                                <span className="material-symbols-outlined text-sm">add_link</span>
                                            </button>
                                        </div>
                                    </div>
                                    {/* Upload file */}
                                    <label className="flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer text-xs font-medium text-on-surface-variant hover:bg-white/5 transition-colors">
                                        <span className="material-symbols-outlined text-sm">upload_file</span>
                                        {uploadingResource ? 'Subiendo...' : 'Subir documento'}
                                        <input type="file" className="hidden" accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
                                            disabled={uploadingResource}
                                            onChange={async (e) => {
                                                const file = e.target.files?.[0]
                                                if (!file) return
                                                setUploadingResource(true)
                                                try {
                                                    const fd = new FormData(); fd.append('file', file)
                                                    const res = await fetch('/api/upload', { method: 'POST', body: fd })
                                                    if (res.ok) {
                                                        const { url } = await res.json()
                                                        setEditLesson({ ...editLesson, resources: [...(editLesson.resources || []), { id: crypto.randomUUID(), name: file.name, url, type: 'file' }] })
                                                    }
                                                } finally { setUploadingResource(false); e.target.value = '' }
                                            }} />
                                    </label>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="pt-2 flex gap-3">
                                <button onClick={discardLessonChanges}
                                    className="flex-1 bg-surface-container-high py-3 rounded-xl font-bold text-xs uppercase tracking-wider text-on-surface hover:bg-surface-variant transition-colors">
                                    Descartar
                                </button>
                                <button onClick={applyLessonChanges} disabled={lessonSaving}
                                    className="flex-1 bg-blue-600 py-3 rounded-xl font-bold text-xs uppercase tracking-wider text-white hover:bg-blue-500 transition-colors disabled:opacity-50">
                                    {lessonSaving ? 'Guardando...' : 'Aplicar Cambios'}
                                </button>
                            </div>
                        </div>
                    </aside>
                )}
            </div>

            {/* ── Footer Status Bar ────────────────────────── */}
            <footer className="sticky bottom-0 z-40 h-16 border-t border-white/5 flex items-center justify-between px-8"
                style={{ background: '#0e131e' }}>
                <div className="flex items-center gap-8">
                    <div>
                        <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest block">Progreso del curso</span>
                        <div className="flex items-center gap-3">
                            <span className="text-sm font-semibold text-on-surface">
                                {modules.length} {modules.length === 1 ? 'Módulo' : 'Módulos'}, {totalLessons} {totalLessons === 1 ? 'Lección' : 'Lecciones'}
                            </span>
                            <span className="w-1 h-1 bg-on-surface-variant rounded-full" />
                            <span className="text-sm font-semibold text-on-surface">{fmtDuration(totalDuration)} Total</span>
                        </div>
                    </div>
                    {hasFinalExam ? (
                        <div className="flex items-center gap-2 text-emerald-400">
                            <span className="material-symbols-outlined text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                            <span className="text-xs font-bold uppercase tracking-widest">Listo para publicar</span>
                        </div>
                    ) : (
                        <div className="flex items-center gap-2 text-amber-400">
                            <span className="material-symbols-outlined text-lg">warning</span>
                            <span className="text-xs font-bold uppercase tracking-widest">Falta examen final</span>
                        </div>
                    )}
                </div>
                <button onClick={togglePublish}
                    className="px-8 py-2.5 rounded-full bg-gradient-to-r from-primary-container to-secondary-container text-on-primary-container font-bold text-sm hover:opacity-90 transition-all shadow-lg shadow-blue-900/20">
                    {published ? 'Despublicar Curso' : 'Publicar Curso'}
                </button>
            </footer>
        </div>
    )
}
