'use client'

import { useState, useRef, useEffect } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'

interface CourseData {
    id?: string
    title?: string
    description?: string
    thumbnail?: string | null
    hero_image?: string | null
    price?: number | null
    instructor_ids?: string[]
    included_items?: string[] | null
}

interface CourseFormModalProps {
    open: boolean
    onClose: () => void
    onSuccess?: (course: any) => void
    initial?: CourseData
}

async function uploadImage(file: File): Promise<string> {
    const formData = new FormData()
    formData.append('file', file)
    const res = await fetch('/api/upload', { method: 'POST', body: formData })
    if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Error al subir imagen')
    }
    const data = await res.json()
    return data.url
}

export function CourseFormModal({ open, onClose, onSuccess, initial }: CourseFormModalProps) {
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(initial?.thumbnail ?? null)
    const [heroImageUrl, setHeroImageUrl] = useState<string | null>(initial?.hero_image ?? null)
    const [thumbnailUploading, setThumbnailUploading] = useState(false)
    const [heroUploading, setHeroUploading] = useState(false)
    const [instructorIds, setInstructorIds] = useState<string[]>(initial?.instructor_ids ?? [])
    const [admins, setAdmins] = useState<Array<{ id: string; name: string; last_name: string }>>([])
    const [includedItems, setIncludedItems] = useState<string[]>(initial?.included_items ?? [])
    const [newItem, setNewItem] = useState('')

    // Sync state with `initial` when modal opens or course id changes
    // (modal stays mounted between edits — without this, state from the previous course bleeds into the new one)
    const initialId = initial?.id ?? null
    useEffect(() => {
        if (!open) return
        setThumbnailUrl(initial?.thumbnail ?? null)
        setHeroImageUrl(initial?.hero_image ?? null)
        setInstructorIds(initial?.instructor_ids ?? [])
        setIncludedItems(initial?.included_items ?? [])
        setNewItem('')
        setError('')
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [initialId, open])

    function addInstructor(id: string) {
        if (!id || instructorIds.includes(id)) return
        setInstructorIds((prev) => [...prev, id])
    }
    function removeInstructor(id: string) {
        setInstructorIds((prev) => prev.filter((x) => x !== id))
    }
    function moveInstructor(idx: number, dir: -1 | 1) {
        setInstructorIds((prev) => {
            const next = [...prev]
            const target = idx + dir
            if (target < 0 || target >= next.length) return prev
            ;[next[idx], next[target]] = [next[target], next[idx]]
            return next
        })
    }

    function addIncludedItem() {
        const trimmed = newItem.trim()
        if (!trimmed) return
        setIncludedItems((prev) => [...prev, trimmed])
        setNewItem('')
    }
    function removeIncludedItem(idx: number) {
        setIncludedItems((prev) => prev.filter((_, i) => i !== idx))
    }
    function moveIncludedItem(idx: number, dir: -1 | 1) {
        setIncludedItems((prev) => {
            const next = [...prev]
            const target = idx + dir
            if (target < 0 || target >= next.length) return prev
            ;[next[idx], next[target]] = [next[target], next[idx]]
            return next
        })
    }
    function updateIncludedItem(idx: number, value: string) {
        setIncludedItems((prev) => prev.map((it, i) => (i === idx ? value : it)))
    }

    const thumbnailRef = useRef<HTMLInputElement>(null)
    const heroRef = useRef<HTMLInputElement>(null)

    const isEdit = !!initial?.id

    useEffect(() => {
        fetch('/api/admin/users?role=ADMIN')
            .then((res) => res.json())
            .then((data) => { if (Array.isArray(data)) setAdmins(data) })
            .catch(() => {})
    }, [])

    async function handleFileChange(
        file: File,
        setUrl: (url: string | null) => void,
        setUploading: (v: boolean) => void,
    ) {
        setUploading(true)
        setError('')
        try {
            const url = await uploadImage(file)
            setUrl(url)
        } catch (err: any) {
            setError(err.message)
        } finally {
            setUploading(false)
        }
    }

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault()
        setError('')
        setLoading(true)

        const form = e.currentTarget
        const body = {
            title: (form.elements.namedItem('title') as HTMLInputElement).value,
            description: (form.elements.namedItem('description') as HTMLTextAreaElement).value,
            thumbnail: thumbnailUrl,
            hero_image: heroImageUrl,
            instructor_ids: instructorIds,
            included_items: includedItems.filter((s) => s.trim().length > 0),
        }

        const url = isEdit ? `/api/courses/${initial!.id}` : '/api/courses'
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

    return (
        <Modal open={open} onClose={onClose} title={isEdit ? 'Editar curso' : 'Nuevo curso'} size="md">
            <form onSubmit={handleSubmit} className="space-y-4">
                <Input
                    label="Título *"
                    name="title"
                    required
                    defaultValue={initial?.title}
                    placeholder="Nombre del curso"
                />
                <div className="flex flex-col gap-1.5">
                    <label className="form-label">Descripción *</label>
                    <textarea
                        name="description"
                        required
                        rows={3}
                        defaultValue={initial?.description}
                        placeholder="Describe el contenido del curso..."
                        className="form-input resize-none"
                    />
                </div>

                {/* Thumbnail upload */}
                <ImageUploadField
                    label="Imagen del curso (thumbnail)"
                    currentUrl={thumbnailUrl}
                    uploading={thumbnailUploading}
                    inputRef={thumbnailRef}
                    onFileChange={(file) =>
                        handleFileChange(file, setThumbnailUrl, setThumbnailUploading)
                    }
                    onRemove={() => {
                        setThumbnailUrl(null)
                        if (thumbnailRef.current) thumbnailRef.current.value = ''
                    }}
                />

                {/* Hero image upload */}
                <ImageUploadField
                    label="Imagen hero (banner)"
                    currentUrl={heroImageUrl}
                    uploading={heroUploading}
                    inputRef={heroRef}
                    onFileChange={(file) =>
                        handleFileChange(file, setHeroImageUrl, setHeroUploading)
                    }
                    onRemove={() => {
                        setHeroImageUrl(null)
                        if (heroRef.current) heroRef.current.value = ''
                    }}
                />

                {/* Instructores (multi-select con orden) */}
                <div className="flex flex-col gap-1.5">
                    <label className="form-label">Instructores (opcional)</label>

                    {instructorIds.length > 0 && (
                        <div className="flex flex-col gap-2">
                            {instructorIds.map((id, idx) => {
                                const admin = admins.find((a) => a.id === id)
                                const label = admin ? `${admin.name} ${admin.last_name}` : id
                                return (
                                    <div
                                        key={id}
                                        className="flex items-center gap-2 px-3 py-2 rounded-xl"
                                        style={{ background: 'var(--bg-raised)', border: '1px solid var(--border)' }}
                                    >
                                        <span className="text-xs font-mono w-6 text-center" style={{ color: 'var(--text-secondary)' }}>
                                            {idx + 1}
                                        </span>
                                        <span className="flex-1 text-sm" style={{ color: 'var(--text-primary)' }}>
                                            {label}
                                        </span>
                                        <button
                                            type="button"
                                            onClick={() => moveInstructor(idx, -1)}
                                            disabled={idx === 0}
                                            className="w-7 h-7 rounded-lg text-sm disabled:opacity-30"
                                            style={{ background: 'var(--bg-surface)', color: 'var(--text-primary)' }}
                                            aria-label="Subir"
                                        >
                                            ↑
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => moveInstructor(idx, 1)}
                                            disabled={idx === instructorIds.length - 1}
                                            className="w-7 h-7 rounded-lg text-sm disabled:opacity-30"
                                            style={{ background: 'var(--bg-surface)', color: 'var(--text-primary)' }}
                                            aria-label="Bajar"
                                        >
                                            ↓
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => removeInstructor(id)}
                                            className="w-7 h-7 rounded-lg text-sm"
                                            style={{ background: 'rgba(239,68,68,0.12)', color: '#f87171' }}
                                            aria-label="Quitar"
                                        >
                                            ×
                                        </button>
                                    </div>
                                )
                            })}
                        </div>
                    )}

                    <select
                        value=""
                        onChange={(e) => {
                            addInstructor(e.target.value)
                            e.target.value = ''
                        }}
                        className="form-input text-sm"
                    >
                        <option value="">+ Agregar instructor</option>
                        {admins
                            .filter((a) => !instructorIds.includes(a.id))
                            .map((a) => (
                                <option key={a.id} value={a.id}>
                                    {a.name} {a.last_name}
                                </option>
                            ))}
                    </select>
                </div>

                {/* Sección "INCLUYE" del card público */}
                <div className="flex flex-col gap-1.5">
                    <label className="form-label">Sección &quot;INCLUYE&quot; del card público (opcional)</label>
                    <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                        Lista que sale en el card del curso en la landing. Si la dejas vacía, se muestran los primeros 3 módulos.
                    </p>

                    {includedItems.length > 0 && (
                        <div className="flex flex-col gap-2">
                            {includedItems.map((item, idx) => (
                                <div
                                    key={idx}
                                    className="flex items-center gap-2 px-3 py-2 rounded-xl"
                                    style={{ background: 'var(--bg-raised)', border: '1px solid var(--border)' }}
                                >
                                    <span
                                        className="text-xs font-mono w-6 text-center"
                                        style={{ color: 'var(--text-secondary)' }}
                                    >
                                        {String(idx + 1).padStart(2, '0')}
                                    </span>
                                    <input
                                        type="text"
                                        value={item}
                                        onChange={(e) => updateIncludedItem(idx, e.target.value)}
                                        className="flex-1 bg-transparent border-none outline-none text-sm"
                                        style={{ color: 'var(--text-primary)' }}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => moveIncludedItem(idx, -1)}
                                        disabled={idx === 0}
                                        className="w-7 h-7 rounded-lg text-sm disabled:opacity-30"
                                        style={{ background: 'var(--bg-surface)', color: 'var(--text-primary)' }}
                                        aria-label="Subir"
                                    >
                                        ↑
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => moveIncludedItem(idx, 1)}
                                        disabled={idx === includedItems.length - 1}
                                        className="w-7 h-7 rounded-lg text-sm disabled:opacity-30"
                                        style={{ background: 'var(--bg-surface)', color: 'var(--text-primary)' }}
                                        aria-label="Bajar"
                                    >
                                        ↓
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => removeIncludedItem(idx)}
                                        className="w-7 h-7 rounded-lg text-sm"
                                        style={{ background: 'rgba(239,68,68,0.12)', color: '#f87171' }}
                                        aria-label="Quitar"
                                    >
                                        ×
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}

                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={newItem}
                            onChange={(e) => setNewItem(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    e.preventDefault()
                                    addIncludedItem()
                                }
                            }}
                            placeholder="Ej. Mentoría grupal semanal"
                            className="form-input text-sm flex-1"
                        />
                        <button
                            type="button"
                            onClick={addIncludedItem}
                            disabled={!newItem.trim()}
                            className="px-4 rounded-xl text-sm font-medium disabled:opacity-50"
                            style={{ background: 'var(--bg-raised)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
                        >
                            + Agregar
                        </button>
                    </div>
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
                    <Button
                        type="submit"
                        loading={loading}
                        disabled={thumbnailUploading || heroUploading}
                        className="flex-1 justify-center"
                    >
                        {isEdit ? 'Guardar cambios' : 'Crear curso'}
                    </Button>
                </div>
            </form>
        </Modal>
    )
}

/* ── Image Upload Field ──────────────────────────── */

function ImageUploadField({
    label,
    currentUrl,
    uploading,
    inputRef,
    onFileChange,
    onRemove,
}: {
    label: string
    currentUrl: string | null
    uploading: boolean
    inputRef: React.RefObject<HTMLInputElement>
    onFileChange: (file: File) => void
    onRemove: () => void
}) {
    return (
        <div className="flex flex-col gap-1.5">
            <label className="form-label">{label}</label>

            {/* Preview */}
            {currentUrl && (
                <div className="relative rounded-lg overflow-hidden border" style={{ borderColor: 'var(--border)' }}>
                    <img
                        src={currentUrl}
                        alt="Preview"
                        className="w-full h-40 object-cover"
                    />
                    <button
                        type="button"
                        onClick={onRemove}
                        className="absolute top-2 right-2 bg-black/60 hover:bg-black/80 text-white text-xs px-2 py-1 rounded-md transition-colors"
                    >
                        Eliminar
                    </button>
                </div>
            )}

            {/* File input */}
            <div className="flex items-center gap-3">
                <input
                    ref={inputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    className="hidden"
                    onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (file) onFileChange(file)
                    }}
                />
                <button
                    type="button"
                    onClick={() => inputRef.current?.click()}
                    disabled={uploading}
                    className="form-input text-sm cursor-pointer hover:border-blue-500/40 transition-colors flex items-center gap-2 w-full"
                    style={{ color: 'var(--text-secondary)' }}
                >
                    {uploading ? (
                        <>
                            <span className="spinner" />
                            Subiendo...
                        </>
                    ) : currentUrl ? (
                        'Cambiar imagen'
                    ) : (
                        'Seleccionar imagen'
                    )}
                </button>
            </div>

            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                JPG, PNG, WebP o GIF. Máximo 5 MB.
            </p>
        </div>
    )
}
