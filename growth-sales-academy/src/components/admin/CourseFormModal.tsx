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
    instructor_id?: string | null
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
    const [instructorId, setInstructorId] = useState<string | null>(initial?.instructor_id ?? null)
    const [admins, setAdmins] = useState<Array<{ id: string; name: string; last_name: string }>>([])

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
            price: (form.elements.namedItem('price') as HTMLInputElement).value
                ? Number((form.elements.namedItem('price') as HTMLInputElement).value)
                : null,
            instructor_id: instructorId,
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

                {/* Instructor dropdown */}
                <div className="flex flex-col gap-1.5">
                    <label className="form-label">Instructor (opcional)</label>
                    <select
                        value={instructorId || ''}
                        onChange={(e) => setInstructorId(e.target.value || null)}
                        className="form-input text-sm"
                    >
                        <option value="">Sin instructor asignado</option>
                        {admins.map((a) => (
                            <option key={a.id} value={a.id}>
                                {a.name} {a.last_name}
                            </option>
                        ))}
                    </select>
                </div>

                <Input
                    label="Precio (opcional)"
                    name="price"
                    type="number"
                    step="0.01"
                    defaultValue={initial?.price?.toString() ?? ''}
                    placeholder="0.00"
                />

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
