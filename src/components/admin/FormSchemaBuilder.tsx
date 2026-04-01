'use client'

import { MaterialIcon } from '@/components/ui/MaterialIcon'

interface FormField {
    id: string
    type: 'text' | 'textarea' | 'select' | 'checkbox' | 'radio' | 'email' | 'number'
    label: string
    placeholder?: string
    required: boolean
    options?: string[]
}

interface FormSchemaBuilderProps {
    value: FormField[]
    onChange: (fields: FormField[]) => void
}

const FIELD_TYPES: { value: FormField['type']; label: string }[] = [
    { value: 'text', label: 'Texto corto' },
    { value: 'textarea', label: 'Texto largo' },
    { value: 'select', label: 'Selección' },
    { value: 'checkbox', label: 'Casillas' },
    { value: 'radio', label: 'Opción múltiple' },
    { value: 'email', label: 'Email' },
    { value: 'number', label: 'Número' },
]

const TYPES_WITH_OPTIONS: FormField['type'][] = ['select', 'checkbox', 'radio']

export function FormSchemaBuilder({ value, onChange }: FormSchemaBuilderProps) {

    function addField() {
        const newField: FormField = {
            id: `field_${Date.now()}`,
            type: 'text',
            label: '',
            placeholder: '',
            required: false,
            options: [],
        }
        onChange([...value, newField])
    }

    function updateField(index: number, patch: Partial<FormField>) {
        const updated = value.map((f, i) => (i === index ? { ...f, ...patch } : f))
        onChange(updated)
    }

    function removeField(index: number) {
        onChange(value.filter((_, i) => i !== index))
    }

    function moveField(index: number, direction: -1 | 1) {
        const target = index + direction
        if (target < 0 || target >= value.length) return
        const updated = [...value]
        const temp = updated[index]
        updated[index] = updated[target]
        updated[target] = temp
        onChange(updated)
    }

    function addOption(fieldIndex: number) {
        const field = value[fieldIndex]
        updateField(fieldIndex, { options: [...(field.options || []), ''] })
    }

    function updateOption(fieldIndex: number, optIndex: number, text: string) {
        const field = value[fieldIndex]
        const opts = [...(field.options || [])]
        opts[optIndex] = text
        updateField(fieldIndex, { options: opts })
    }

    function removeOption(fieldIndex: number, optIndex: number) {
        const field = value[fieldIndex]
        const opts = (field.options || []).filter((_, i) => i !== optIndex)
        updateField(fieldIndex, { options: opts })
    }

    return (
        <div className="space-y-3">
            <label className="form-label">Campos del formulario</label>

            {value.length === 0 && (
                <p className="text-sm py-4 text-center rounded-xl border" style={{ color: 'var(--text-secondary)', borderColor: 'var(--border)', background: 'var(--bg-raised)' }}>
                    No hay campos. Haz clic en &quot;Agregar campo&quot; para empezar.
                </p>
            )}

            {value.map((field, index) => (
                <div
                    key={field.id}
                    className="rounded-xl border p-4 space-y-3"
                    style={{ background: 'var(--bg-raised)', borderColor: 'var(--border)' }}
                >
                    {/* Header row: field number + actions */}
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>
                            Campo {index + 1}
                        </span>
                        <div className="flex items-center gap-1">
                            <button
                                type="button"
                                onClick={() => moveField(index, -1)}
                                disabled={index === 0}
                                className="btn-ghost p-1 disabled:opacity-30"
                                title="Mover arriba"
                            >
                                <MaterialIcon name="arrow_upward" size="text-lg" />
                            </button>
                            <button
                                type="button"
                                onClick={() => moveField(index, 1)}
                                disabled={index === value.length - 1}
                                className="btn-ghost p-1 disabled:opacity-30"
                                title="Mover abajo"
                            >
                                <MaterialIcon name="arrow_downward" size="text-lg" />
                            </button>
                            <button
                                type="button"
                                onClick={() => removeField(index)}
                                className="btn-ghost p-1 hover:!text-red-400"
                                title="Eliminar campo"
                            >
                                <MaterialIcon name="delete" size="text-lg" />
                            </button>
                        </div>
                    </div>

                    {/* Type + Label row */}
                    <div className="grid grid-cols-[140px_1fr] gap-3">
                        <div className="flex flex-col gap-1">
                            <label className="text-xs" style={{ color: 'var(--text-secondary)' }}>Tipo</label>
                            <select
                                value={field.type}
                                onChange={(e) => {
                                    const newType = e.target.value as FormField['type']
                                    const patch: Partial<FormField> = { type: newType }
                                    // Initialize options when switching to a type that needs them
                                    if (TYPES_WITH_OPTIONS.includes(newType) && (!field.options || field.options.length === 0)) {
                                        patch.options = ['', '']
                                    }
                                    updateField(index, patch)
                                }}
                                className="form-input text-sm"
                            >
                                {FIELD_TYPES.map((t) => (
                                    <option key={t.value} value={t.value}>{t.label}</option>
                                ))}
                            </select>
                        </div>
                        <div className="flex flex-col gap-1">
                            <label className="text-xs" style={{ color: 'var(--text-secondary)' }}>Etiqueta</label>
                            <input
                                type="text"
                                value={field.label}
                                onChange={(e) => updateField(index, { label: e.target.value })}
                                placeholder="Ej: Nombre completo"
                                className="form-input text-sm"
                            />
                        </div>
                    </div>

                    {/* Placeholder */}
                    <div className="flex flex-col gap-1">
                        <label className="text-xs" style={{ color: 'var(--text-secondary)' }}>Placeholder (opcional)</label>
                        <input
                            type="text"
                            value={field.placeholder || ''}
                            onChange={(e) => updateField(index, { placeholder: e.target.value })}
                            placeholder="Texto de ayuda..."
                            className="form-input text-sm"
                        />
                    </div>

                    {/* Required toggle */}
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                        <input
                            type="checkbox"
                            checked={field.required}
                            onChange={(e) => updateField(index, { required: e.target.checked })}
                            className="rounded"
                        />
                        <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>Obligatorio</span>
                    </label>

                    {/* Options editor for select / checkbox / radio */}
                    {TYPES_WITH_OPTIONS.includes(field.type) && (
                        <div className="space-y-2 pt-1">
                            <label className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
                                Opciones
                            </label>
                            {(field.options || []).map((opt, optIndex) => (
                                <div key={optIndex} className="flex items-center gap-2">
                                    <input
                                        type="text"
                                        value={opt}
                                        onChange={(e) => updateOption(index, optIndex, e.target.value)}
                                        placeholder={`Opción ${optIndex + 1}`}
                                        className="form-input text-sm flex-1"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => removeOption(index, optIndex)}
                                        className="btn-ghost p-1 hover:!text-red-400"
                                        title="Eliminar opción"
                                    >
                                        <MaterialIcon name="close" size="text-base" />
                                    </button>
                                </div>
                            ))}
                            <button
                                type="button"
                                onClick={() => addOption(index)}
                                className="btn-ghost text-xs gap-1"
                            >
                                <MaterialIcon name="add" size="text-base" />
                                Agregar opción
                            </button>
                        </div>
                    )}
                </div>
            ))}

            <button
                type="button"
                onClick={addField}
                className="btn-secondary w-full justify-center gap-2"
            >
                <MaterialIcon name="add" size="text-lg" />
                Agregar campo
            </button>
        </div>
    )
}
