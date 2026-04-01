'use client'

import { useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { MaterialIcon } from '@/components/ui/MaterialIcon'
import { FormSchemaBuilder } from '@/components/admin/FormSchemaBuilder'
import { ExamSchemaBuilder } from '@/components/admin/ExamSchemaBuilder'
import type { FormField, ExamQuestion, LessonType, LessonResource } from '@/types'

interface LessonData {
    id?: string
    title?: string
    description?: string | null
    type?: LessonType
    video_url?: string | null
    thumbnail?: string | null
    content?: string | null
    form_schema?: FormField[] | null
    exam_schema?: ExamQuestion[] | null
    passing_score?: number | null
    max_attempts?: number | null
    is_final_exam?: boolean
    order?: number
    duration?: number | null
    resources?: LessonResource[] | null
}

interface LessonFormModalProps {
    open: boolean
    onClose: () => void
    onSuccess?: (lesson: any) => void
    moduleId: string
    initial?: LessonData
    nextOrder?: number
}

const typeOptions: { value: LessonType; label: string; icon: string }[] = [
    { value: 'VIDEO', label: 'Video', icon: 'play_circle' },
    { value: 'TEXT', label: 'Texto', icon: 'article' },
    { value: 'FORM', label: 'Formulario', icon: 'assignment' },
    { value: 'EXAM', label: 'Examen', icon: 'quiz' },
]

export function LessonFormModal({ open, onClose, onSuccess, moduleId, initial, nextOrder = 1 }: LessonFormModalProps) {
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    // Controlled state
    const [type, setType] = useState<LessonType>(initial?.type || 'VIDEO')
    const [title, setTitle] = useState(initial?.title || '')
    const [description, setDescription] = useState(initial?.description || '')
    const [videoUrl, setVideoUrl] = useState(initial?.video_url || '')
    const [thumbnail, setThumbnail] = useState(initial?.thumbnail || '')
    const [order, setOrder] = useState(String(initial?.order ?? nextOrder))
    const [duration, setDuration] = useState(String(initial?.duration ?? ''))
    const [content, setContent] = useState(initial?.content || '')
    const [formSchema, setFormSchema] = useState<FormField[]>(initial?.form_schema || [])
    const [examSchema, setExamSchema] = useState<ExamQuestion[]>(initial?.exam_schema || [])
    const [passingScore, setPassingScore] = useState(String(initial?.passing_score ?? 70))
    const [maxAttempts, setMaxAttempts] = useState(String(initial?.max_attempts ?? ''))
    const [isFinalExam, setIsFinalExam] = useState(initial?.is_final_exam || false)
    const [resources, setResources] = useState<LessonResource[]>(initial?.resources || [])
    const [uploadingResource, setUploadingResource] = useState(false)
    const [newLinkName, setNewLinkName] = useState('')
    const [newLinkUrl, setNewLinkUrl] = useState('')

    const isEdit = !!initial?.id

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        setError('')
        setLoading(true)

        const body: Record<string, any> = {
            module_id: moduleId,
            title,
            description: description || null,
            type,
            order: Number(order),
            duration: Number(duration) || null,
            resources: resources.length > 0 ? resources : null,
        }

        if (type === 'VIDEO') {
            body.video_url = videoUrl || null
            body.thumbnail = thumbnail || null
        } else if (type === 'TEXT') {
            body.content = content || null
        } else if (type === 'FORM') {
            body.content = content || null
            body.form_schema = formSchema
        } else if (type === 'EXAM') {
            body.content = content || null
            body.exam_schema = examSchema
            body.passing_score = Number(passingScore) || 70
            body.max_attempts = maxAttempts ? Number(maxAttempts) : null
            body.is_final_exam = isFinalExam
        }

        const url = isEdit ? `/api/lessons/${initial!.id}` : '/api/lessons'
        const method = isEdit ? 'PATCH' : 'POST'

        const res = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        })

        if (!res.ok) {
            const data = await res.json()
            setError(data.error || 'Error al guardar')
            setLoading(false)
            return
        }

        const data = await res.json()
        onSuccess?.(data)
        onClose()
        setLoading(false)
    }

    const modalSize = type === 'FORM' || type === 'EXAM' ? 'xl' : 'md'

    return (
        <Modal open={open} onClose={onClose} title={isEdit ? 'Editar lección' : 'Nueva lección'} size={modalSize}>
            <form onSubmit={handleSubmit} className="space-y-4">
                {/* Type selector */}
                <div className="flex flex-col gap-1.5">
                    <label className="form-label">Tipo de lección</label>
                    <div className="grid grid-cols-4 gap-2">
                        {typeOptions.map((opt) => (
                            <button
                                key={opt.value}
                                type="button"
                                onClick={() => setType(opt.value)}
                                className={`flex flex-col items-center gap-1 px-3 py-3 rounded-xl border text-xs font-medium transition-all ${
                                    type === opt.value
                                        ? 'border-blue-500 bg-blue-500/10 text-blue-400'
                                        : 'border-transparent bg-white/5 hover:bg-white/10'
                                }`}
                                style={{ color: type === opt.value ? undefined : 'var(--text-secondary)' }}
                            >
                                <MaterialIcon name={opt.icon} size="text-xl" />
                                {opt.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Common fields */}
                <Input
                    label="Título *"
                    name="title"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Nombre de la lección"
                />
                <div className="flex flex-col gap-1.5">
                    <label className="form-label">Descripción</label>
                    <textarea
                        name="description"
                        rows={2}
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Descripción breve..."
                        className="form-input resize-none"
                    />
                </div>

                {/* VIDEO fields */}
                {type === 'VIDEO' && (
                    <>
                        <Input
                            label="URL del video"
                            name="video_url"
                            type="url"
                            value={videoUrl}
                            onChange={(e) => setVideoUrl(e.target.value)}
                            placeholder="https://... (próximamente)"
                            helpText="Se configurará cuando el servicio de video esté disponible"
                        />
                        <Input
                            label="URL de thumbnail"
                            name="thumbnail"
                            type="url"
                            value={thumbnail}
                            onChange={(e) => setThumbnail(e.target.value)}
                            placeholder="https://..."
                        />
                    </>
                )}

                {/* TEXT fields */}
                {type === 'TEXT' && (
                    <div className="flex flex-col gap-1.5">
                        <label className="form-label">Contenido (HTML)</label>
                        <textarea
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            rows={10}
                            placeholder="Escribe el contenido de la lección... Puedes usar HTML."
                            className="form-input resize-none font-mono text-xs"
                        />
                    </div>
                )}

                {/* FORM fields */}
                {type === 'FORM' && (
                    <>
                        <div className="flex flex-col gap-1.5">
                            <label className="form-label">Texto introductorio (opcional)</label>
                            <textarea
                                value={content}
                                onChange={(e) => setContent(e.target.value)}
                                rows={3}
                                placeholder="Instrucciones para el formulario..."
                                className="form-input resize-none"
                            />
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <label className="form-label">Campos del formulario</label>
                            <FormSchemaBuilder value={formSchema} onChange={setFormSchema} />
                        </div>
                    </>
                )}

                {/* EXAM fields */}
                {type === 'EXAM' && (
                    <>
                        <div className="flex flex-col gap-1.5">
                            <label className="form-label">Instrucciones del examen (opcional)</label>
                            <textarea
                                value={content}
                                onChange={(e) => setContent(e.target.value)}
                                rows={3}
                                placeholder="Lee con atención cada pregunta..."
                                className="form-input resize-none"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <Input
                                label="Puntaje mínimo (%)"
                                name="passing_score"
                                type="number"
                                min="1"
                                max="100"
                                value={passingScore}
                                onChange={(e) => setPassingScore(e.target.value)}
                            />
                            <Input
                                label="Máx. intentos"
                                name="max_attempts"
                                type="number"
                                min="1"
                                value={maxAttempts}
                                onChange={(e) => setMaxAttempts(e.target.value)}
                                placeholder="Ilimitados"
                                helpText="Dejar vacío = ilimitados"
                            />
                        </div>
                        <label className="flex items-center gap-3 cursor-pointer px-1">
                            <input
                                type="checkbox"
                                checked={isFinalExam}
                                onChange={(e) => setIsFinalExam(e.target.checked)}
                                className="w-4 h-4 rounded border-gray-500 bg-transparent text-blue-500 focus:ring-blue-500"
                            />
                            <span className="text-sm" style={{ color: 'var(--text-primary)' }}>
                                Examen final del curso
                            </span>
                        </label>
                        <div className="flex flex-col gap-1.5">
                            <label className="form-label">Preguntas</label>
                            <ExamSchemaBuilder value={examSchema} onChange={setExamSchema} />
                        </div>
                    </>
                )}

                {/* Resources */}
                <div className="flex flex-col gap-1.5">
                    <label className="form-label">Recursos adjuntos</label>
                    <div className="space-y-2">
                        {resources.map((r) => (
                            <div
                                key={r.id}
                                className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs"
                                style={{ background: 'var(--bg-raised, rgba(255,255,255,0.05))' }}
                            >
                                <MaterialIcon
                                    name={r.type === 'link' ? 'link' : 'description'}
                                    size="text-sm"
                                    className="text-blue-400 shrink-0"
                                />
                                <span className="flex-1 truncate" style={{ color: 'var(--text-primary, #dee2f2)' }}>
                                    {r.name}
                                </span>
                                <button
                                    type="button"
                                    onClick={() => setResources((prev) => prev.filter((x) => x.id !== r.id))}
                                    className="text-red-400 hover:text-red-300 shrink-0"
                                >
                                    <MaterialIcon name="close" size="text-sm" />
                                </button>
                            </div>
                        ))}

                        {/* Add link */}
                        <div className="space-y-2">
                            <input
                                type="text"
                                value={newLinkName}
                                onChange={(e) => setNewLinkName(e.target.value)}
                                placeholder="Nombre del enlace"
                                className="form-input w-full text-xs"
                            />
                            <div className="flex gap-2">
                                <input
                                    type="url"
                                    value={newLinkUrl}
                                    onChange={(e) => setNewLinkUrl(e.target.value)}
                                    placeholder="https://..."
                                    className="form-input flex-1 min-w-0 text-xs"
                                />
                                <button
                                    type="button"
                                    disabled={!newLinkName.trim() || !newLinkUrl.trim()}
                                    onClick={() => {
                                        setResources((prev) => [
                                            ...prev,
                                            { id: crypto.randomUUID(), name: newLinkName.trim(), url: newLinkUrl.trim(), type: 'link' },
                                        ])
                                        setNewLinkName('')
                                        setNewLinkUrl('')
                                    }}
                                    className="px-3 py-1.5 rounded-lg text-xs font-medium bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 transition-colors disabled:opacity-40 shrink-0"
                                >
                                    <MaterialIcon name="add_link" size="text-sm" />
                                </button>
                            </div>
                        </div>

                        {/* Upload file */}
                        <label className="flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer text-xs font-medium transition-colors hover:bg-white/5"
                            style={{ color: 'var(--text-secondary, #c4c5d5)' }}
                        >
                            <MaterialIcon name="upload_file" size="text-sm" />
                            {uploadingResource ? 'Subiendo...' : 'Subir documento (PDF, DOC, XLS, PPT)'}
                            <input
                                type="file"
                                className="hidden"
                                accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
                                disabled={uploadingResource}
                                onChange={async (e) => {
                                    const file = e.target.files?.[0]
                                    if (!file) return
                                    setUploadingResource(true)
                                    try {
                                        const fd = new FormData()
                                        fd.append('file', file)
                                        const res = await fetch('/api/upload', { method: 'POST', body: fd })
                                        if (res.ok) {
                                            const { url } = await res.json()
                                            setResources((prev) => [
                                                ...prev,
                                                { id: crypto.randomUUID(), name: file.name, url, type: 'file' },
                                            ])
                                        } else {
                                            const data = await res.json()
                                            setError(data.error || 'Error al subir archivo')
                                        }
                                    } catch {
                                        setError('Error al subir archivo')
                                    } finally {
                                        setUploadingResource(false)
                                        e.target.value = ''
                                    }
                                }}
                            />
                        </label>
                    </div>
                </div>

                {/* Common: order + duration */}
                <div className="grid grid-cols-2 gap-4">
                    <Input
                        label="Orden"
                        name="order"
                        type="number"
                        min="1"
                        required
                        value={order}
                        onChange={(e) => setOrder(e.target.value)}
                    />
                    <Input
                        label="Duración (minutos)"
                        name="duration"
                        type="number"
                        min="0"
                        value={duration}
                        onChange={(e) => setDuration(e.target.value)}
                        placeholder="10"
                        helpText="Ej: 10 = 10 min"
                    />
                </div>

                {error && (
                    <p className="text-sm rounded-xl p-3" style={{ color: 'var(--error)', background: 'rgba(239,68,68,0.08)' }}>
                        {error}
                    </p>
                )}

                <div className="flex gap-3 pt-2">
                    <Button type="button" variant="secondary" onClick={onClose} className="flex-1 justify-center">
                        Cancelar
                    </Button>
                    <Button type="submit" loading={loading} className="flex-1 justify-center">
                        {isEdit ? 'Guardar' : 'Crear lección'}
                    </Button>
                </div>
            </form>
        </Modal>
    )
}
