'use client'

import { useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'

interface ModuleData {
    id?: string
    title?: string
    order?: number
}

interface ModuleFormModalProps {
    open: boolean
    onClose: () => void
    onSuccess?: (mod: any) => void
    courseId: string
    initial?: ModuleData
    nextOrder?: number
}

export function ModuleFormModal({ open, onClose, onSuccess, courseId, initial, nextOrder = 1 }: ModuleFormModalProps) {
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    const isEdit = !!initial?.id

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault()
        setError('')
        setLoading(true)

        const form = e.currentTarget
        const body = {
            course_id: courseId,
            title: (form.elements.namedItem('title') as HTMLInputElement).value,
            order: Number((form.elements.namedItem('order') as HTMLInputElement).value),
        }

        const url = isEdit ? `/api/modules/${initial!.id}` : '/api/modules'
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
        <Modal open={open} onClose={onClose} title={isEdit ? 'Editar módulo' : 'Nuevo módulo'} size="sm">
            <form onSubmit={handleSubmit} className="space-y-4">
                <Input
                    label="Título *"
                    name="title"
                    required
                    defaultValue={initial?.title}
                    placeholder="Nombre del módulo"
                />
                <Input
                    label="Orden"
                    name="order"
                    type="number"
                    min="1"
                    required
                    defaultValue={String(initial?.order ?? nextOrder)}
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
                    <Button type="submit" loading={loading} className="flex-1 justify-center">
                        {isEdit ? 'Guardar' : 'Crear módulo'}
                    </Button>
                </div>
            </form>
        </Modal>
    )
}
