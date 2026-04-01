'use client'

import { useState } from 'react'
import { MaterialIcon } from '@/components/ui/MaterialIcon'

interface FormField {
    id: string
    type: 'text' | 'textarea' | 'select' | 'checkbox' | 'radio' | 'email' | 'number'
    label: string
    placeholder?: string
    required: boolean
    options?: string[]
}

interface FormContentProps {
    lessonId: string
    schema: FormField[]
    existingSubmission: Record<string, any> | null
}

export function FormContent({ lessonId, schema, existingSubmission }: FormContentProps) {
    const [formData, setFormData] = useState<Record<string, any>>({})
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [submitted, setSubmitted] = useState(false)

    // ── Read-only mode: submission already exists ──
    if (existingSubmission) {
        return (
            <div className="space-y-6">
                <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-3">
                    <MaterialIcon name="check_circle" size="text-lg" className="text-emerald-400" />
                    <span className="text-sm font-semibold text-emerald-400">Formulario enviado</span>
                </div>

                <div className="space-y-5">
                    {schema.map((field) => (
                        <div key={field.id} className="space-y-1.5">
                            <label className="block text-sm font-medium text-on-surface-variant">
                                {field.label}
                            </label>
                            <div className="bg-surface-container-lowest border border-outline-variant rounded-xl px-4 py-2.5 text-sm text-on-surface">
                                {existingSubmission[field.id] !== undefined
                                    ? String(existingSubmission[field.id])
                                    : <span className="text-on-surface-variant italic">Sin respuesta</span>
                                }
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        )
    }

    // ── Success state after submit ──
    if (submitted) {
        return (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
                <div className="w-16 h-16 rounded-full bg-emerald-500/15 flex items-center justify-center">
                    <MaterialIcon name="check_circle" size="text-4xl" className="text-emerald-400" />
                </div>
                <h3 className="text-lg font-bold text-on-surface">Formulario enviado correctamente</h3>
                <p className="text-sm text-on-surface-variant">Tu respuesta ha sido registrada.</p>
            </div>
        )
    }

    // ── Helpers ──
    function updateField(fieldId: string, value: any) {
        setFormData((prev) => ({ ...prev, [fieldId]: value }))
    }

    function handleCheckboxChange(fieldId: string, option: string, checked: boolean) {
        const current: string[] = formData[fieldId]
            ? formData[fieldId].split(',').map((s: string) => s.trim()).filter(Boolean)
            : []

        const updated = checked
            ? [...current, option]
            : current.filter((v: string) => v !== option)

        updateField(fieldId, updated.join(', '))
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        setError(null)
        setLoading(true)

        try {
            const res = await fetch('/api/forms/submit', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ lesson_id: lessonId, data: formData }),
            })

            if (!res.ok) {
                const body = await res.json().catch(() => null)
                throw new Error(body?.error || 'Error al enviar el formulario')
            }

            setSubmitted(true)
            setTimeout(() => window.location.reload(), 1500)
        } catch (err: any) {
            setError(err.message || 'Error al enviar el formulario')
        } finally {
            setLoading(false)
        }
    }

    // ── Field renderers ──
    function renderField(field: FormField) {
        const inputClasses =
            'w-full rounded-xl border border-outline-variant bg-surface-container-lowest px-4 py-2.5 text-sm text-on-surface placeholder:text-on-surface-variant/60 outline-none transition-all duration-200 focus:border-blue-accent focus:shadow-[0_0_0_3px_rgba(59,130,246,0.12)]'

        switch (field.type) {
            case 'text':
            case 'email':
            case 'number':
                return (
                    <input
                        type={field.type}
                        placeholder={field.placeholder}
                        required={field.required}
                        value={formData[field.id] ?? ''}
                        onChange={(e) => updateField(field.id, e.target.value)}
                        className={inputClasses}
                    />
                )

            case 'textarea':
                return (
                    <textarea
                        placeholder={field.placeholder}
                        required={field.required}
                        value={formData[field.id] ?? ''}
                        onChange={(e) => updateField(field.id, e.target.value)}
                        rows={4}
                        className={`${inputClasses} resize-none`}
                    />
                )

            case 'select':
                return (
                    <select
                        required={field.required}
                        value={formData[field.id] ?? ''}
                        onChange={(e) => updateField(field.id, e.target.value)}
                        className={inputClasses}
                    >
                        <option value="" disabled>
                            {field.placeholder || 'Selecciona una opcion'}
                        </option>
                        {field.options?.map((opt) => (
                            <option key={opt} value={opt}>
                                {opt}
                            </option>
                        ))}
                    </select>
                )

            case 'radio':
                return (
                    <div className="space-y-2">
                        {field.options?.map((opt) => (
                            <label
                                key={opt}
                                className="flex items-center gap-3 cursor-pointer rounded-xl border border-outline-variant bg-surface-container-lowest px-4 py-3 transition-colors hover:border-blue-accent/50"
                            >
                                <input
                                    type="radio"
                                    name={field.id}
                                    value={opt}
                                    required={field.required}
                                    checked={formData[field.id] === opt}
                                    onChange={() => updateField(field.id, opt)}
                                    className="accent-blue-accent"
                                />
                                <span className="text-sm text-on-surface">{opt}</span>
                            </label>
                        ))}
                    </div>
                )

            case 'checkbox':
                return (
                    <div className="space-y-2">
                        {field.options?.map((opt) => {
                            const current: string[] = formData[field.id]
                                ? formData[field.id].split(',').map((s: string) => s.trim()).filter(Boolean)
                                : []
                            const isChecked = current.includes(opt)

                            return (
                                <label
                                    key={opt}
                                    className="flex items-center gap-3 cursor-pointer rounded-xl border border-outline-variant bg-surface-container-lowest px-4 py-3 transition-colors hover:border-blue-accent/50"
                                >
                                    <input
                                        type="checkbox"
                                        checked={isChecked}
                                        onChange={(e) => handleCheckboxChange(field.id, opt, e.target.checked)}
                                        className="accent-blue-accent"
                                    />
                                    <span className="text-sm text-on-surface">{opt}</span>
                                </label>
                            )
                        })}
                    </div>
                )

            default:
                return null
        }
    }

    // ── Render ──
    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
                <div className="flex items-center gap-2 bg-error/10 border border-error/20 rounded-xl px-4 py-3">
                    <MaterialIcon name="error" size="text-lg" className="text-error" />
                    <span className="text-sm text-error">{error}</span>
                </div>
            )}

            {schema.map((field) => (
                <div key={field.id} className="space-y-1.5">
                    <label className="block text-sm font-medium text-on-surface-variant">
                        {field.label}
                        {field.required && <span className="text-error ml-1">*</span>}
                    </label>
                    {renderField(field)}
                </div>
            ))}

            <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full py-3"
            >
                {loading ? (
                    <>
                        <span className="spinner" />
                        Enviando...
                    </>
                ) : (
                    <>
                        <MaterialIcon name="send" size="text-base" />
                        Enviar Formulario
                    </>
                )}
            </button>
        </form>
    )
}
